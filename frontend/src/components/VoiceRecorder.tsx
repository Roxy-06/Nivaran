import { useState, useRef, useEffect } from "react";
import { API } from "../services/api";

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

      const barWidth = (canvas.width / bufferLength) * 2.5;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const barHeight = (dataArray[i] / 255) * canvas.height;

        const gradient = ctx.createLinearGradient(0, canvas.height, 0, 0);
        gradient.addColorStop(0, "#2563eb");
        gradient.addColorStop(1, "#f43f5e");

        ctx.fillStyle = gradient;
        ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);

        x += barWidth + 1;
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

      // AudioContext for pure PCM WAV recording + Visualizer
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
        sampleRate: 16000,
      });
      audioContextRef.current = audioContext;

      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 64;
      analyserRef.current = analyser;

      // ScriptProcessor for raw PCM float samples
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

      // Optional Browser Live Speech Recognition for instant feedback
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

    // Merge Float32Array chunks into single continuous buffer
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

    // Encode to standard 16-bit PCM WAV
    const wavBlob = encodeWAV(mergedSamples, sampleRate);
    setAudioBlob(wavBlob);

    const url = URL.createObjectURL(wavBlob);
    setAudioUrl(url);

    // Auto transcribe
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
      // If live transcript was captured by browser, fallback gracefully
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
    <div className="voice-recorder-card">
      <div className="vr-header">
        <div className="vr-title">
          <span className="vr-icon">🎙️</span>
          <div>
            <h3>Multilingual Voice Report</h3>
            <p className="vr-subtitle">Speak in Hindi, Tamil, Telugu, Bengali, Marathi, or English</p>
          </div>
        </div>

        {/* LANGUAGE SELECTOR */}
        <div className="vr-lang-picker">
          <label htmlFor="voice-lang-select">Language:</label>
          <select
            id="voice-lang-select"
            value={selectedLanguage}
            onChange={(e) => setSelectedLanguage(e.target.value)}
            disabled={isRecording || isTranscribing}
          >
            {LANGUAGES.map((lang) => (
              <option key={lang.code} value={lang.code}>
                {lang.name} ({lang.native})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* WAVEFORM CANVAS */}
      <div className={`vr-visualizer-container ${isRecording ? "active" : ""}`}>
        <canvas
          ref={canvasRef}
          width={360}
          height={60}
          className="vr-waveform-canvas"
          style={{ display: isRecording ? "block" : "none" }}
        />
        {!isRecording && !audioUrl && (
          <div className="vr-placeholder">
            <span className="pulse-circle"></span>
            <span>Click the microphone button and describe the issue</span>
          </div>
        )}
        {audioUrl && !isRecording && (
          <div className="vr-audio-preview">
            <audio src={audioUrl} controls className="vr-audio-player" />
          </div>
        )}
      </div>

      {/* LIVE CAPTION PREVIEW WHILE SPEAKING */}
      {isRecording && liveTranscript && (
        <div className="vr-live-caption">
          <span className="live-dot"></span>
          <span>"{liveTranscript}"</span>
        </div>
      )}

      {/* CONTROLS */}
      <div className="vr-controls">
        {!isRecording ? (
          <button
            type="button"
            className="vr-btn vr-record-btn"
            onClick={startRecording}
            disabled={disabled || isTranscribing}
          >
            🎤 Start Speaking
          </button>
        ) : (
          <button
            type="button"
            className="vr-btn vr-stop-btn"
            onClick={stopRecording}
          >
            ⏹️ Done Speaking ({formatTime(recordingDuration)})
          </button>
        )}

        {audioBlob && !isRecording && (
          <button
            type="button"
            className="vr-btn vr-retranscribe-btn"
            onClick={() => handleAutoTranscribe(audioBlob)}
            disabled={isTranscribing}
          >
            {isTranscribing ? "Transcribing..." : "🔄 Re-transcribe Audio"}
          </button>
        )}
      </div>

      {/* STATUS INDICATOR */}
      {isTranscribing && (
        <div className="vr-transcribing-banner">
          <div className="spinner"></div>
          <span>Transcribing voice and translating to English with AI...</span>
        </div>
      )}

      {/* ERROR MESSAGE */}
      {errorMessage && (
        <div className="vr-error-alert">
          <span>⚠️ {errorMessage}</span>
        </div>
      )}

      {/* TRANSCRIPTION & TRANSLATION PREVIEW */}
      {transcription && (
        <div className="vr-results-panel">
          <div className="vr-result-badge">
            <span>Detected Language:</span>
            <strong>
              {transcription.language_name || transcription.detected_language.toUpperCase()}
            </strong>
          </div>

          <div className="vr-transcript-box">
            <div className="vr-field-label">Original Speech (Transcribed):</div>
            <div className="vr-text-content original">{transcription.transcript}</div>
          </div>

          <div className="vr-translation-box">
            <div className="vr-field-label">Standardized English Translation (for Civic Action):</div>
            <div className="vr-text-content translated">{transcription.translation}</div>
          </div>
        </div>
      )}

      {/* STYLES */}
      <style>{`
        .voice-recorder-card {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 20px;
          margin-bottom: 20px;
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.04);
        }

        .vr-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 12px;
          margin-bottom: 16px;
        }

        .vr-title {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .vr-icon {
          font-size: 26px;
          background: #eff6ff;
          padding: 8px;
          border-radius: 10px;
        }

        .vr-title h3 {
          margin: 0;
          font-size: 16px;
          font-weight: 700;
          color: #0f172a;
        }

        .vr-subtitle {
          margin: 2px 0 0 0;
          font-size: 12px;
          color: #64748b;
        }

        .vr-lang-picker {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .vr-lang-picker label {
          font-size: 13px;
          font-weight: 600;
          color: #475569;
        }

        .vr-lang-picker select {
          padding: 6px 10px;
          border-radius: 8px;
          border: 1px solid #cbd5e1;
          font-size: 13px;
          background: #f8fafc;
          color: #0f172a;
          outline: none;
          cursor: pointer;
        }

        .vr-visualizer-container {
          min-height: 70px;
          background: #f8fafc;
          border: 1px dashed #cbd5e1;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 10px;
          margin-bottom: 14px;
          position: relative;
          overflow: hidden;
        }

        .vr-visualizer-container.active {
          border-color: #ef4444;
          background: #fef2f2;
        }

        .vr-waveform-canvas {
          width: 100%;
          height: 50px;
        }

        .vr-placeholder {
          display: flex;
          align-items: center;
          gap: 10px;
          color: #64748b;
          font-size: 13px;
        }

        .pulse-circle {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: #3b82f6;
          box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.7);
          animation: pulseRing 1.8s infinite;
        }

        @keyframes pulseRing {
          0% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.7); }
          70% { box-shadow: 0 0 0 10px rgba(59, 130, 246, 0); }
          100% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0); }
        }

        .vr-live-caption {
          background: #eff6ff;
          border: 1px solid #bfdbfe;
          color: #1e40af;
          padding: 8px 12px;
          border-radius: 8px;
          font-size: 13px;
          margin-bottom: 12px;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .live-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #ef4444;
          animation: blink 1s infinite alternate;
        }

        @keyframes blink {
          from { opacity: 1; }
          to { opacity: 0.3; }
        }

        .vr-audio-preview {
          width: 100%;
        }

        .vr-audio-player {
          width: 100%;
          height: 38px;
        }

        .vr-controls {
          display: flex;
          gap: 12px;
          margin-bottom: 14px;
        }

        .vr-btn {
          flex: 1;
          padding: 12px 18px;
          border-radius: 8px;
          border: none;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }

        .vr-record-btn {
          background: #2563eb;
          color: white;
        }

        .vr-record-btn:hover:not(:disabled) {
          background: #1d4ed8;
        }

        .vr-stop-btn {
          background: #dc2626;
          color: white;
          animation: pulseRecord 1s infinite alternate;
        }

        @keyframes pulseRecord {
          from { opacity: 1; }
          to { opacity: 0.85; }
        }

        .vr-retranscribe-btn {
          background: #f1f5f9;
          color: #334155;
          border: 1px solid #cbd5e1;
        }

        .vr-retranscribe-btn:hover:not(:disabled) {
          background: #e2e8f0;
        }

        .vr-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .vr-transcribing-banner {
          background: #eff6ff;
          border: 1px solid #bfdbfe;
          color: #1e40af;
          padding: 10px 14px;
          border-radius: 8px;
          font-size: 13px;
          margin-bottom: 14px;
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .spinner {
          width: 16px;
          height: 16px;
          border: 2px solid #93c5fd;
          border-top-color: #1d4ed8;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .vr-error-alert {
          background: #fef2f2;
          border: 1px solid #fecaca;
          color: #dc2626;
          padding: 10px 14px;
          border-radius: 8px;
          font-size: 13px;
          margin-bottom: 14px;
        }

        .vr-results-panel {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          padding: 14px;
        }

        .vr-result-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: #e0f2fe;
          color: #0369a1;
          padding: 4px 10px;
          border-radius: 999px;
          font-size: 12px;
          margin-bottom: 12px;
        }

        .vr-transcript-box, .vr-translation-box {
          margin-bottom: 10px;
        }

        .vr-field-label {
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: #64748b;
          margin-bottom: 4px;
        }

        .vr-text-content {
          padding: 10px 12px;
          border-radius: 6px;
          font-size: 14px;
          line-height: 1.5;
        }

        .vr-text-content.original {
          background: #ffffff;
          border: 1px solid #cbd5e1;
          color: #0f172a;
          font-weight: 500;
        }

        .vr-text-content.translated {
          background: #f0fdf4;
          border: 1px solid #bbf7d0;
          color: #166534;
        }
      `}</style>
    </div>
  );
}
