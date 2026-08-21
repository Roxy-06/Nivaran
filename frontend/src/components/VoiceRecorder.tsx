import { useState, useRef, useEffect } from "react";
import { API } from "../services/api";
import {
  MicrophoneIcon,
  StopIcon,
  RefreshIcon,
  AlertIcon,
  GlobeIcon
} from "./Icons";

export interface VoiceTranscriptionResult {
  transcript: string;
  translation: string;
  detected_language: string;
  language_name?: string;
  audioBlob: Blob | null;
  audioFile: File | null;
}

interface VoiceRecorderProps {
  onTranscriptionComplete: (result: VoiceTranscriptionResult) => void;
  disabled?: boolean;
}

const LANGUAGES = [
  { code: "auto", name: "Auto Detect", native: "स्वचालित / தானியங்கி", speechLocale: "hi-IN" },
  { code: "hi", name: "Hindi", native: "हिन्दी", speechLocale: "hi-IN" },
  { code: "ta", name: "Tamil", native: "தமிழ்", speechLocale: "ta-IN" },
  { code: "te", name: "Telugu", native: "తెలుగు", speechLocale: "te-IN" },
  { code: "bn", name: "Bengali", native: "বাংলা", speechLocale: "bn-IN" },
  { code: "mr", name: "Marathi", native: "मराठी", speechLocale: "mr-IN" },
  { code: "kn", name: "Kannada", native: "ಕನ್ನಡ", speechLocale: "kn-IN" },
  { code: "ml", name: "Malayalam", native: "മലയാളം", speechLocale: "ml-IN" },
  { code: "gu", name: "Gujarati", native: "ગુજરાતી", speechLocale: "gu-IN" },
  { code: "pa", name: "Punjabi", native: "ਪੰਜਾਬੀ", speechLocale: "pa-IN" },
  { code: "ur", name: "Urdu", native: "اردو", speechLocale: "ur-IN" },
  { code: "en", name: "English", native: "English", speechLocale: "en-IN" },
];

/**
 * Encodes audio samples to standard 16-bit PCM WAV format
 */
function encodeWAV(samples: Float32Array, sampleRate: number): Blob {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);

  const writeString = (offset: number, string: string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  };

  /* RIFF identifier */
  writeString(0, "RIFF");
  /* file length */
  view.setUint32(4, 36 + samples.length * 2, true);
  /* RIFF type */
  writeString(8, "WAVE");
  /* format chunk identifier */
  writeString(12, "fmt ");
  /* format chunk length */
  view.setUint32(16, 16, true);
  /* sample format (raw PCM) */
  view.setUint16(20, 1, true);
  /* channel count (1 for mono) */
  view.setUint16(22, 1, true);
  /* sample rate */
  view.setUint32(24, sampleRate, true);
  /* byte rate (sampleRate * 1 * 2) */
  view.setUint32(28, sampleRate * 2, true);
  /* block align (1 * 2) */
  view.setUint16(32, 2, true);
  /* bits per sample (16) */
  view.setUint16(34, 16, true);
  /* data chunk identifier */
  writeString(36, "data");
  /* data chunk length */
  view.setUint32(40, samples.length * 2, true);

  /* Write 16-bit PCM samples */
  let offset = 44;
  for (let i = 0; i < samples.length; i++, offset += 2) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }

  return new Blob([view], { type: "audio/wav" });
}

export default function VoiceRecorder({
  onTranscriptionComplete,
  disabled = false,
}: VoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState("auto");
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState("");
  const [transcription, setTranscription] = useState<VoiceTranscriptionResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const processorNodeRef = useRef<ScriptProcessorNode | null>(null);
  const recordedSamplesRef = useRef<Float32Array[]>([]);
  const timerRef = useRef<number | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const speechRecognitionRef = useRef<any>(null);

  // Clean up timer and media streams on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      if (audioContextRef.current && audioContextRef.current.state !== "closed") {
        audioContextRef.current.close();
      }
      if (speechRecognitionRef.current) {
        try {
          speechRecognitionRef.current.stop();
        } catch {
          // ignore
        }
      }
    };
  }, []);

  const drawWaveform = () => {
    if (!analyserRef.current || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const analyser = analyserRef.current;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const render = () => {
      animationFrameRef.current = requestAnimationFrame(render);
      analyser.getByteFrequencyData(dataArray);

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const barWidth = (canvas.width / bufferLength) * 2.2;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const barHeight = (dataArray[i] / 255) * canvas.height;

        // Custom Gradient using Indian Heritage Color System: Saffron Sitar to Silk Indigo
        const gradient = ctx.createLinearGradient(0, canvas.height, 0, 0);
        gradient.addColorStop(0, "#1b365d"); // Silk Indigo
        gradient.addColorStop(0.5, "#a83f2c"); // Terracotta Saffron
        gradient.addColorStop(1, "#c5a059"); // Gold Accent

        ctx.fillStyle = gradient;
        ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);

        x += barWidth + 1.5;
      }
    };

    render();
  };

  const startRecording = async () => {
    try {
      setErrorMessage(null);
      setAudioUrl(null);
      setAudioBlob(null);
      setTranscription(null);
      setLiveTranscript("");
      recordedSamplesRef.current = [];

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });
      mediaStreamRef.current = stream;

      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
        sampleRate: 16000,
      });
      audioContextRef.current = audioContext;

      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 64;
      analyserRef.current = analyser;

      const processor = audioContext.createScriptProcessor(4096, 1, 1);
      processorNodeRef.current = processor;

      processor.onaudioprocess = (e) => {
        const inputData = e.inputBuffer.getChannelData(0);
        recordedSamplesRef.current.push(new Float32Array(inputData));
      };

      source.connect(analyser);
      analyser.connect(processor);
      processor.connect(audioContext.destination);

      drawWaveform();

      const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRec) {
        try {
          const rec = new SpeechRec();
          rec.continuous = true;
          rec.interimResults = true;
          const langObj = LANGUAGES.find((l) => l.code === selectedLanguage);
          rec.lang = langObj?.speechLocale || "hi-IN";

          rec.onresult = (event: any) => {
            let interim = "";
            for (let i = event.resultIndex; i < event.results.length; ++i) {
              interim += event.results[i][0].transcript;
            }
            if (interim) setLiveTranscript(interim);
          };

          rec.start();
          speechRecognitionRef.current = rec;
        } catch (e) {
          console.log("Browser SpeechRecognition initialization info:", e);
        }
      }

      setIsRecording(true);
      setRecordingDuration(0);

      timerRef.current = window.setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.error("Microphone access error:", err);
      setErrorMessage("Could not access microphone. Please grant permission in browser.");
    }
  };

  const stopRecording = () => {
    if (!isRecording) return;
    setIsRecording(false);

    if (timerRef.current) clearInterval(timerRef.current);
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);

    if (speechRecognitionRef.current) {
      try {
        speechRecognitionRef.current.stop();
      } catch {
        // ignore
      }
    }

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
    }

    if (processorNodeRef.current) {
      processorNodeRef.current.disconnect();
    }

    const chunks = recordedSamplesRef.current;
    let totalLength = 0;
    for (const chunk of chunks) {
      totalLength += chunk.length;
    }

    const mergedSamples = new Float32Array(totalLength);
    let offset = 0;
    for (const chunk of chunks) {
      mergedSamples.set(chunk, offset);
      offset += chunk.length;
    }

    const sampleRate = audioContextRef.current?.sampleRate || 16000;
    if (audioContextRef.current && audioContextRef.current.state !== "closed") {
      audioContextRef.current.close();
    }

    if (totalLength < 1600) {
      setErrorMessage("Audio recording was too short. Please speak for at least 1-2 seconds.");
      return;
    }

    const wavBlob = encodeWAV(mergedSamples, sampleRate);
    setAudioBlob(wavBlob);

    const url = URL.createObjectURL(wavBlob);
    setAudioUrl(url);

    handleAutoTranscribe(wavBlob);
  };

  const handleAutoTranscribe = async (blobToTranscribe: Blob) => {
    try {
      setIsTranscribing(true);
      setErrorMessage(null);

      const audioFile = new File(
        [blobToTranscribe],
        `citizen_voice_${Date.now()}.wav`,
        { type: "audio/wav" }
      );

      const formData = new FormData();
      formData.append("audio", audioFile);
      formData.append("language", selectedLanguage);

      const res = await API.post("/voice/transcribe", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      const data = res.data;
      const result: VoiceTranscriptionResult = {
        transcript: data.transcript || liveTranscript,
        translation: data.translation || data.transcript || liveTranscript,
        detected_language: data.detected_language,
        language_name: data.language_name,
        audioBlob: blobToTranscribe,
        audioFile: audioFile,
      };

      setTranscription(result);
      onTranscriptionComplete(result);
    } catch (err: any) {
      console.error("Transcription error:", err);
      if (liveTranscript && liveTranscript.trim()) {
        const fallbackResult: VoiceTranscriptionResult = {
          transcript: liveTranscript,
          translation: liveTranscript,
          detected_language: selectedLanguage === "auto" ? "hi" : selectedLanguage,
          language_name: LANGUAGES.find((l) => l.code === selectedLanguage)?.name || "Auto",
          audioBlob: blobToTranscribe,
          audioFile: new File([blobToTranscribe], `voice_${Date.now()}.wav`, { type: "audio/wav" }),
        };
        setTranscription(fallbackResult);
        onTranscriptionComplete(fallbackResult);
      } else {
        const detail =
          err.response?.data?.detail ||
          "Could not recognize speech clearly. Please speak closer to the microphone and try again.";
        setErrorMessage(detail);
      }
    } finally {
      setIsTranscribing(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="voice-panel">
      <div className="voice-panel-heading">
        <div className="voice-panel-title">
          <div className="voice-icon-box">
            <MicrophoneIcon size={18} />
          </div>
          <div>
            <h3>Voice Transcription Portal</h3>
            <p>Describe your issue in your regional Mother Tongue</p>
          </div>
        </div>

        {/* SELECT LANGUAGE BAR */}
        <div className="voice-select-box">
          <label htmlFor="voice-lang-select">Language:</label>
          <select
            id="voice-lang-select"
            value={selectedLanguage}
            onChange={(e) => setSelectedLanguage(e.target.value)}
            disabled={isRecording || isTranscribing}
          >
            {LANGUAGES.map((lang) => (
              <option key={lang.code} value={lang.code}>
                {lang.name} - {lang.native}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* WAVEFORM VISUALIZER */}
      <div className={`visualizer-wrapper ${isRecording ? "recording" : ""}`}>
        <canvas
          ref={canvasRef}
          width={360}
          height={60}
          className="waveform-canvas"
          style={{ display: isRecording ? "block" : "none" }}
        />
        {!isRecording && !audioUrl && (
          <div style={{ display: "flex", alignItems: "center", gap: "10px", color: "var(--text-muted)", fontSize: "13px" }}>
            <span className="visualizer-pulse"></span>
            <span>Tap start below and formulate your voice grievance</span>
          </div>
        )}
        {audioUrl && !isRecording && (
          <div className="audio-preview-row">
            <audio src={audioUrl} controls />
          </div>
        )}
      </div>

      {/* LIVE CAPTION POPUP */}
      {isRecording && liveTranscript && (
        <div className="live-caption-alert">
          <span className="live-indicator-dot"></span>
          <span>"{liveTranscript}"</span>
        </div>
      )}

      {/* CONTROLS */}
      <div style={{ display: "flex", gap: "12px", marginBottom: "16px" }}>
        {!isRecording ? (
          <button
            type="button"
            className="btn-heritage-primary"
            style={{ flex: 1 }}
            onClick={startRecording}
            disabled={disabled || isTranscribing}
          >
            <MicrophoneIcon size={16} color="#ffffff" />
            Begin Grievance Speech
          </button>
        ) : (
          <button
            type="button"
            className="btn-heritage-primary"
            style={{ flex: 1, background: "var(--terracotta-red)" }}
            onClick={stopRecording}
          >
            <StopIcon size={14} color="#ffffff" />
            Conclude Grievance Speech ({formatTime(recordingDuration)})
          </button>
        )}

        {audioBlob && !isRecording && (
          <button
            type="button"
            className="btn-heritage-secondary"
            style={{ width: "auto" }}
            onClick={() => handleAutoTranscribe(audioBlob)}
            disabled={isTranscribing}
          >
            <RefreshIcon size={15} />
            Re-transcribe Action
          </button>
        )}
      </div>

      {/* TRANSCRIBING STATUS DIALOG */}
      {isTranscribing && (
        <div className="status-loading-banner">
          <span className="spinner-gold"></span>
          <span>Decoding linguistics and preparing translation arrays...</span>
        </div>
      )}

      {/* DETECTED ERROR */}
      {errorMessage && (
        <div className="location-alert-err" style={{ marginTop: 0, marginBottom: "16px" }}>
          <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <AlertIcon size={16} />
            {errorMessage}
          </span>
        </div>
      )}

      {/* READOUT CARD */}
      {transcription && (
        <div style={{ background: "var(--sandstone-bg)", border: "1px solid var(--border-gold)", borderRadius: "8px", padding: "16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", background: "rgba(197, 160, 89, 0.15)", color: "var(--indigo-deep)", padding: "4px 10px", borderRadius: "20px", fontSize: "11px", fontWeight: 700, width: "fit-content", textTransform: "uppercase", marginBottom: "12px" }}>
            <GlobeIcon size={12} />
            <span>Detected tongue:</span>
            <strong>
              {transcription.language_name || transcription.detected_language.toUpperCase()}
            </strong>
          </div>

          <div style={{ marginBottom: "12px" }}>
            <div style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", color: "var(--text-muted)", marginBottom: "4px" }}>
              Original Narrative Transcribed:
            </div>
            <div style={{ padding: "8px 12px", background: "#ffffff", border: "1px solid var(--border-gold)", borderRadius: "4px", fontSize: "13.5px", color: "var(--text-main)", fontWeight: 500 }}>
              {transcription.transcript}
            </div>
          </div>

          <div>
            <div style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", color: "var(--text-muted)", marginBottom: "4px" }}>
              Remediation Target Translation:
            </div>
            <div style={{ padding: "8px 12px", background: "rgba(26, 77, 46, 0.05)", border: "1px solid rgba(26, 77, 46, 0.15)", borderRadius: "4px", fontSize: "13.5px", color: "var(--forest-green)", fontWeight: 500 }}>
              {transcription.translation}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
