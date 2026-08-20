import { useState, useRef } from "react";
import { API } from "../services/api";

const TTS_LANGUAGES = [
  { code: "en", name: "English" },
  { code: "hi", name: "Hindi (हिन्दी)" },
  { code: "ta", name: "Tamil (தமிழ்)" },
  { code: "te", name: "Telugu (తెలుగు)" },
  { code: "bn", name: "Bengali (বাংলা)" },
  { code: "mr", name: "Marathi (मराठी)" },
  { code: "kn", name: "Kannada (ಕನ್ನಡ)" },
  { code: "ml", name: "Malayalam (മലയാളം)" },
  { code: "gu", name: "Gujarati (ગુજરાતી)" },
];

export default function StatusCheck() {
  const [serial, setSerial] = useState("");
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [ttsLang, setTtsLang] = useState("en");
  const [isPlayingTts, setIsPlayingTts] = useState(false);

  const ttsAudioRef = useRef<HTMLAudioElement | null>(null);

  const checkStatus = async () => {
    if (!serial.trim()) {
      setError("Please enter a valid serial number");
      setData(null);
      return;
    }

    try {
      setLoading(true);
      setError("");
      setData(null);

      const res = await API.get(`/issues/${serial.trim()}`);
      setData(res.data);
      if (res.data.detected_language && res.data.detected_language !== "auto") {
        setTtsLang(res.data.detected_language);
      }
    } catch {
      setError("Issue not found or server error");
    } finally {
      setLoading(false);
    }
  };

  const playStatusVoice = async () => {
    if (!data) return;

    const summaryText = `Civic Issue ${data.serial}. Status is ${data.status}. Assigned to ${data.department} with ${data.priority} priority. Issue description: ${data.translation || data.message}`;

    try {
      setIsPlayingTts(true);

      const response = await API.post(
        "/voice/synthesize",
        { text: summaryText, language: ttsLang },
        { responseType: "blob" }
      );

      const audioBlob = new Blob([response.data], { type: "audio/mpeg" });
      const audioUrl = URL.createObjectURL(audioBlob);

      if (ttsAudioRef.current) {
        ttsAudioRef.current.src = audioUrl;
        ttsAudioRef.current.play();
        ttsAudioRef.current.onended = () => setIsPlayingTts(false);
      }
    } catch (err) {
      console.error("Backend TTS failed, trying browser Web Speech API:", err);
      // Browser SpeechSynthesis fallback
      if ("speechSynthesis" in window) {
        const utterance = new SpeechSynthesisUtterance(summaryText);
        utterance.onend = () => setIsPlayingTts(false);
        window.speechSynthesis.speak(utterance);
      } else {
        setIsPlayingTts(false);
        alert("Voice synthesis is currently unavailable.");
      }
    }
  };

  const renderAreaImpact = () => {
    if (!data?.areaImpact) return "No sensitive areas detected";

    const impacts: string[] = [];
    if (data.areaImpact.schools > 0) impacts.push("🏫 Schools nearby");
    if (data.areaImpact.hospitals > 0) impacts.push("🏥 Hospitals nearby");
    if (data.areaImpact.residential > 0) impacts.push("🏘️ Residential area");

    return impacts.length ? impacts.join(", ") : "No sensitive areas detected";
  };

  return (
    <div className="status-page">
      <audio ref={ttsAudioRef} style={{ display: "none" }} />
      <div className="container">
        <div className="status-header">
          <h1>Track Civic Issue Status</h1>
          <p className="subtitle">
            Enter your serial number to check real-time progress and listen to spoken audio status updates.
          </p>
        </div>

        <div className="card">
          <input
            placeholder="Enter Serial Number (e.g. CP-2026-XXXX)"
            value={serial}
            onChange={(e) => setSerial(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && checkStatus()}
          />

          <button onClick={checkStatus} disabled={loading} className="check-btn">
            {loading ? "Checking..." : "🔍 Check Status"}
          </button>
        </div>

        {error && <p className="error-box">{error}</p>}

        {data && (
          <div className="details">
            <div className="details-header">
              <h2>Issue Details & Resolution Status</h2>

              {/* VOICE READOUT CONTROL */}
              <div className="voice-readout-bar">
                <select
                  value={ttsLang}
                  onChange={(e) => setTtsLang(e.target.value)}
                  className="tts-lang-select"
                >
                  {TTS_LANGUAGES.map((l) => (
                    <option key={l.code} value={l.code}>
                      {l.name}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className={`listen-btn ${isPlayingTts ? "playing" : ""}`}
                  onClick={playStatusVoice}
                  disabled={isPlayingTts}
                >
                  {isPlayingTts ? "🔊 Reading aloud..." : "🔊 Read Status Aloud"}
                </button>
              </div>
            </div>

            <div className="grid">
              <div className="stat-item">
                <span className="stat-label">Serial Number</span>
                <strong className="serial-num">{data.serial}</strong>
              </div>

              <div className="stat-item">
                <span className="stat-label">Current Status</span>
                <span className={`status-badge ${data.status?.toLowerCase().replace(" ", "-")}`}>
                  {data.status}
                </span>
              </div>

              <div className="stat-item">
                <span className="stat-label">Assigned Department</span>
                <strong>{data.department}</strong>
              </div>

              <div className="stat-item">
                <span className="stat-label">Priority Level</span>
                <span className={`priority-badge ${data.priority?.toLowerCase()}`}>
                  {data.priority}
                </span>
              </div>

              <div className="stat-item">
                <span className="stat-label">Reported On</span>
                <span>{new Date(data.reportedAt).toLocaleString()}</span>
              </div>

              <div className="stat-item">
                <span className="stat-label">Language</span>
                <span className="lang-tag">
                  {data.detected_language ? data.detected_language.toUpperCase() : "EN"}
                </span>
              </div>
            </div>

            {/* CITIZEN ORIGINAL VOICE RECORDING */}
            {data.voice_audio && (
              <div className="voice-playback-card">
                <h4>🎙️ Citizen Voice Recording</h4>
                <audio
                  src={`http://localhost:8000/${data.voice_audio}`}
                  controls
                  className="voice-audio-element"
                />
              </div>
            )}

            {/* BILINGUAL TRANSCRIPTS */}
            {data.transcript && data.transcript !== data.translation && (
              <div className="block transcript-box">
                <strong className="block-title">Original Voice Transcript ({data.detected_language?.toUpperCase()}):</strong>
                <p className="transcript-text">{data.transcript}</p>
              </div>
            )}

            <div className="block">
              <strong className="block-title">Description (English Standardization):</strong>
              <p className="desc-text">{data.translation || data.message}</p>
            </div>

            <div className="block">
              <strong className="block-title">Surrounding Civic Impact:</strong>
              <p>{renderAreaImpact()}</p>
            </div>

            {data.media && (
              <div className="block">
                <strong className="block-title">Attached Media Proof:</strong>
                <div className="media">
                  {data.media.endsWith(".mp4") || data.media.endsWith(".webm") ? (
                    <video
                      src={`http://localhost:8000/uploads/${data.media.split("/").pop()}`}
                      controls
                    />
                  ) : (
                    <img
                      src={`http://localhost:8000/uploads/${data.media.split("/").pop()}`}
                      alt="Proof"
                    />
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* STYLES */}
      <style>{`
        .status-page {
          min-height: 100vh;
          width: 100%;
          background: #f8fafc;
          color: #0f172a;
          font-family: system-ui, -apple-system, sans-serif;
        }

        .container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 48px 32px;
        }

        .status-header h1 {
          font-size: 28px;
          font-weight: 800;
          color: #1e293b;
          margin: 0 0 8px 0;
        }

        .subtitle {
          color: #64748b;
          margin: 0 0 28px 0;
          font-size: 14px;
        }

        .card {
          background: white;
          padding: 20px;
          border-radius: 12px;
          display: flex;
          gap: 14px;
          align-items: center;
          border: 1px solid #e2e8f0;
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.04);
        }

        input {
          flex: 3;
          padding: 14px 16px;
          border-radius: 8px;
          border: 1px solid #cbd5e1;
          font-size: 15px;
          outline: none;
        }

        input:focus {
          border-color: #2563eb;
        }

        .check-btn {
          flex: 1;
          padding: 14px 20px;
          border-radius: 8px;
          border: none;
          background: #2563eb;
          color: white;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          white-space: nowrap;
          transition: background 0.2s;
        }

        .check-btn:hover:not(:disabled) {
          background: #1d4ed8;
        }

        .error-box {
          margin-top: 16px;
          padding: 12px 16px;
          background: #fef2f2;
          border: 1px solid #fecaca;
          color: #dc2626;
          border-radius: 8px;
          font-size: 14px;
        }

        .details {
          margin-top: 36px;
          background: white;
          padding: 32px;
          border-radius: 14px;
          border: 1px solid #e2e8f0;
          box-shadow: 0 8px 30px rgba(0, 0, 0, 0.04);
        }

        .details-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 16px;
          margin-bottom: 24px;
          border-bottom: 1px solid #f1f5f9;
          padding-bottom: 18px;
        }

        .details-header h2 {
          margin: 0;
          font-size: 20px;
          color: #0f172a;
        }

        .voice-readout-bar {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .tts-lang-select {
          padding: 8px 12px;
          border-radius: 8px;
          border: 1px solid #cbd5e1;
          font-size: 13px;
          background: #f8fafc;
          color: #0f172a;
        }

        .listen-btn {
          padding: 8px 16px;
          border-radius: 8px;
          border: none;
          background: #0284c7;
          color: white;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .listen-btn.playing {
          background: #0369a1;
          animation: pulseListen 1s infinite alternate;
        }

        @keyframes pulseListen {
          from { opacity: 1; }
          to { opacity: 0.7; }
        }

        .grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
          gap: 18px;
          margin-bottom: 24px;
        }

        .stat-item {
          background: #f8fafc;
          padding: 14px;
          border-radius: 10px;
          border: 1px solid #f1f5f9;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .stat-label {
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: #64748b;
          font-weight: 600;
        }

        .serial-num {
          color: #1e40af;
          font-size: 15px;
        }

        .status-badge {
          display: inline-block;
          padding: 3px 10px;
          border-radius: 999px;
          font-size: 12px;
          font-weight: 600;
          width: fit-content;
        }

        .status-badge.reported { background: #dbeafe; color: #1e40af; }
        .status-badge.in-progress { background: #fef3c7; color: #92400e; }
        .status-badge.resolved { background: #dcfce7; color: #166534; }

        .priority-badge {
          display: inline-block;
          padding: 3px 10px;
          border-radius: 999px;
          font-size: 12px;
          font-weight: 600;
          width: fit-content;
        }

        .priority-badge.high { background: #fee2e2; color: #991b1b; }
        .priority-badge.medium { background: #fef3c7; color: #92400e; }
        .priority-badge.low { background: #e0f2fe; color: #0369a1; }

        .lang-tag {
          display: inline-block;
          background: #e2e8f0;
          color: #334155;
          padding: 2px 8px;
          border-radius: 4px;
          font-size: 12px;
          font-weight: 600;
          width: fit-content;
        }

        .voice-playback-card {
          background: #eff6ff;
          border: 1px solid #bfdbfe;
          border-radius: 10px;
          padding: 14px 18px;
          margin-bottom: 20px;
        }

        .voice-playback-card h4 {
          margin: 0 0 10px 0;
          color: #1e40af;
          font-size: 13px;
        }

        .voice-audio-element {
          width: 100%;
          height: 38px;
        }

        .block {
          margin-bottom: 20px;
        }

        .block-title {
          font-size: 13px;
          color: #475569;
          display: block;
          margin-bottom: 6px;
        }

        .transcript-box {
          background: #fdf4ff;
          border: 1px solid #f5d0fe;
          padding: 14px;
          border-radius: 8px;
        }

        .transcript-text {
          margin: 0;
          color: #86198f;
          font-weight: 500;
        }

        .desc-text {
          margin: 0;
          color: #0f172a;
          line-height: 1.6;
        }

        .media img, .media video {
          max-width: 440px;
          border-radius: 10px;
          margin-top: 8px;
          border: 1px solid #e2e8f0;
        }

        @media (max-width: 900px) {
          .card {
            flex-direction: column;
            align-items: stretch;
          }

          .check-btn {
            width: 100%;
          }

          .details-header {
            flex-direction: column;
            align-items: flex-start;
          }
        }
      `}</style>
    </div>
  );
}
