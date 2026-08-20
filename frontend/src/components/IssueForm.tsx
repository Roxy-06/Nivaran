import { useState } from "react";
import { API } from "../services/api";
import VoiceRecorder, { type VoiceTranscriptionResult } from "./VoiceRecorder";

export default function IssueForm() {
  const [reportMode, setReportMode] = useState<"voice" | "text">("voice");
  const [message, setMessage] = useState("");
  const [transcript, setTranscript] = useState("");
  const [translation, setTranslation] = useState("");
  const [detectedLanguage, setDetectedLanguage] = useState("en");
  const [voiceAudioFile, setVoiceAudioFile] = useState<File | null>(null);

  const [file, setFile] = useState<File | null>(null);
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [serial, setSerial] = useState<string | null>(null);
  const [submissionResult, setSubmissionResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [theme] = useState<"light" | "dark">("light");
  const [locationReady, setLocationReady] = useState(false);

  const useMyLocation = () => {
    if (locationReady) return;

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude);
        setLng(pos.coords.longitude);
        setLocationReady(true);
      },
      () => alert("Location permission denied")
    );
  };

  const handleVoiceTranscription = (result: VoiceTranscriptionResult) => {
    setTranscript(result.transcript);
    setTranslation(result.translation);
    setDetectedLanguage(result.detected_language);
    setVoiceAudioFile(result.audioFile);
    // Populate message with translation or transcript
    setMessage(result.translation || result.transcript);
  };

  const submitIssue = async () => {
    const finalMessage = message.trim() || translation.trim() || transcript.trim();
    if (!finalMessage || lat === null || lng === null) {
      alert("Please describe or record the issue and allow location access");
      return;
    }

    try {
      setLoading(true);
      setSerial(null);
      setSubmissionResult(null);

      const formData = new FormData();
      formData.append("message", finalMessage);
      formData.append("latitude", lat.toString());
      formData.append("longitude", lng.toString());
      if (file) formData.append("file", file);
      if (voiceAudioFile) formData.append("voice_audio_file", voiceAudioFile);
      if (transcript) formData.append("transcript", transcript);
      if (translation) formData.append("translation", translation);
      if (detectedLanguage) formData.append("detected_language", detectedLanguage);

      const res = await API.post("/issues", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (res.data.notPublicIssue) {
        alert("This issue does not appear to be a civic public issue.");
        return;
      }

      setSerial(res.data.serial);
      setSubmissionResult(res.data);

      setMessage("");
      setTranscript("");
      setTranslation("");
      setVoiceAudioFile(null);
      setFile(null);
      setLocationReady(false);
      setLat(null);
      setLng(null);
    } catch (err) {
      console.error(err);
      alert("Submission failed. Please check network connection.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`app ${theme}`}>
      {/* NAVBAR */}
      <header className="navbar">
        <div className="nav-content">
          <div className="brand">
            <h1>Nivaran</h1>
            <span className="badge-voice">✨ Multilingual Voice AI</span>
          </div>
        </div>
      </header>

      {/* MAIN */}
      <main className="main">
        <div className="layout">
          {/* LEFT */}
          <aside className="info">
            <h2>Civic Issue Reporting</h2>
            <p className="intro-text">
              Speak or write in your regional language. Our AI automatically classifies the issue,
              determines department routing, and assigns priority based on real-world impact.
            </p>

            <div className="supported-langs-card">
              <h4>🗣️ Supported Regional Languages</h4>
              <div className="lang-chips">
                <span>हिन्दी (Hindi)</span>
                <span>தமிழ் (Tamil)</span>
                <span>తెలుగు (Telugu)</span>
                <span>বাংলা (Bengali)</span>
                <span>मराठी (Marathi)</span>
                <span>ಕನ್ನಡ (Kannada)</span>
                <span>മലയാളം (Malayalam)</span>
                <span>ગુજરાતી (Gujarati)</span>
                <span>English</span>
              </div>
            </div>

            <ul>
              <li>Clearly describe the problem or public hazard</li>
              <li>Include photo or video proof for faster resolution</li>
              <li>Your identity is anonymous & securely tracked via serial</li>
            </ul>

            <div className="note">
              Every voice report generates both original audio archives and instant bilingual transcripts.
            </div>
          </aside>

          {/* RIGHT */}
          <section className="form">
            <h2>Report a Public Issue</h2>

            {/* TAB SELECTOR */}
            <div className="mode-toggle">
              <button
                type="button"
                className={`mode-btn ${reportMode === "voice" ? "active" : ""}`}
                onClick={() => setReportMode("voice")}
              >
                🎙️ Voice Report (Multilingual)
              </button>
              <button
                type="button"
                className={`mode-btn ${reportMode === "text" ? "active" : ""}`}
                onClick={() => setReportMode("text")}
              >
                ✍️ Text Description
              </button>
            </div>

            {/* VOICE INPUT */}
            {reportMode === "voice" && (
              <VoiceRecorder
                onTranscriptionComplete={handleVoiceTranscription}
                disabled={loading}
              />
            )}

            {/* TEXT INPUT / EDITABLE TRANSCRIPTION */}
            <div className="input-group">
              <label htmlFor="issue-description">
                {reportMode === "voice" ? "Transcribed Description (Editable):" : "Describe the public issue:"}
              </label>
              <textarea
                id="issue-description"
                placeholder={
                  reportMode === "voice"
                    ? "Your voice transcription will appear here automatically..."
                    : "Describe the civic issue in detail (any language)..."
                }
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
            </div>

            <div className="action-row">
              <button
                type="button"
                className={`secondary ${locationReady ? "disabled" : ""}`}
                onClick={useMyLocation}
                disabled={locationReady}
              >
                {locationReady ? "📍 Location Detected" : "📍 Capture My Location"}
              </button>
            </div>

            <div className="file-upload-section">
              <label htmlFor="media-upload">Attach Photo or Video Proof (Optional):</label>
              <input
                id="media-upload"
                type="file"
                accept="image/*,video/*"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
            </div>

            <button className="primary" onClick={submitIssue} disabled={loading}>
              {loading ? "Processing with Multilingual AI..." : "🚀 Submit Civic Report"}
            </button>

            {serial && (
              <div className="success">
                <h3>🎉 Issue Submitted Successfully</h3>
                <p className="serial">{serial}</p>
                {submissionResult && (
                  <div className="ai-summary">
                    <span className="ai-tag">
                      🏢 Department: <strong>{submissionResult.department}</strong>
                    </span>
                    <span className={`priority-tag ${submissionResult.priority?.toLowerCase()}`}>
                      ⚡ Priority: <strong>{submissionResult.priority}</strong>
                    </span>
                  </div>
                )}
                <p className="hint">
                  Save this serial number to track the issue status below.
                </p>
              </div>
            )}
          </section>
        </div>
      </main>

      {/* STYLES */}
      <style>{`
        * { box-sizing: border-box; }

        html, body {
          margin: 0;
          padding: 0;
          width: 100%;
        }

        .app {
          min-height: 100vh;
          width: 100vw;
          font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        }

        .app.light {
          background: #f8fafc;
          color: #0f172a;
        }

        /* NAVBAR */
        .navbar {
          width: 100%;
          background: #ffffff;
          border-bottom: 1px solid #e2e8f0;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
        }

        .nav-content {
          max-width: 1400px;
          margin: 0 auto;
          padding: 16px 32px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .brand {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .brand h1 {
          margin: 0;
          font-size: 24px;
          color: #1e3a8a;
          font-weight: 800;
        }

        .badge-voice {
          background: #dbeafe;
          color: #1d4ed8;
          padding: 4px 10px;
          border-radius: 999px;
          font-size: 12px;
          font-weight: 600;
        }

        .layout {
          max-width: 1400px;
          margin: 36px auto;
          padding: 0 32px;
          display: grid;
          grid-template-columns: 1fr 1.3fr;
          gap: 36px;
        }

        .info, .form {
          background: #ffffff;
          padding: 32px;
          border-radius: 14px;
          border: 1px solid #e2e8f0;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.03);
        }

        .intro-text {
          color: #475569;
          font-size: 14px;
          line-height: 1.6;
          margin-bottom: 20px;
        }

        .supported-langs-card {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          padding: 16px;
          margin-bottom: 20px;
        }

        .supported-langs-card h4 {
          margin: 0 0 10px 0;
          font-size: 13px;
          color: #334155;
        }

        .lang-chips {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }

        .lang-chips span {
          background: #ffffff;
          border: 1px solid #cbd5e1;
          padding: 3px 8px;
          border-radius: 6px;
          font-size: 11px;
          color: #334155;
          font-weight: 500;
        }

        .mode-toggle {
          display: flex;
          gap: 10px;
          margin-bottom: 20px;
          background: #f1f5f9;
          padding: 6px;
          border-radius: 10px;
        }

        .mode-btn {
          flex: 1;
          padding: 10px 14px;
          border-radius: 8px;
          border: none;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          background: transparent;
          color: #64748b;
          transition: all 0.2s ease;
        }

        .mode-btn.active {
          background: #ffffff;
          color: #2563eb;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
        }

        .input-group {
          margin-bottom: 16px;
        }

        .input-group label {
          display: block;
          font-size: 13px;
          font-weight: 600;
          color: #334155;
          margin-bottom: 6px;
        }

        textarea {
          width: 100%;
          min-height: 120px;
          padding: 14px;
          border-radius: 8px;
          border: 1px solid #cbd5e1;
          background: #f8fafc;
          color: #0f172a;
          font-size: 14px;
          font-family: inherit;
          line-height: 1.5;
        }

        textarea:focus {
          outline: 2px solid #2563eb;
          background: #ffffff;
        }

        .file-upload-section {
          margin-bottom: 18px;
        }

        .file-upload-section label {
          display: block;
          font-size: 13px;
          font-weight: 600;
          color: #334155;
          margin-bottom: 6px;
        }

        input[type="file"] {
          width: 100%;
          padding: 10px;
          background: #f8fafc;
          border: 1px dashed #cbd5e1;
          border-radius: 8px;
          font-size: 13px;
        }

        button {
          width: 100%;
          padding: 13px;
          border-radius: 8px;
          border: none;
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.2s ease;
        }

        .primary {
          background: #2563eb;
          color: white;
          margin-top: 10px;
        }

        .primary:hover:not(:disabled) {
          background: #1d4ed8;
        }

        .secondary {
          background: #334155;
          color: white;
          margin-bottom: 14px;
        }

        .secondary.disabled {
          background: #16a34a;
          cursor: default;
        }

        .success {
          margin-top: 24px;
          padding: 20px;
          background: #f0fdf4;
          border: 1px solid #86efac;
          border-radius: 12px;
          text-align: center;
        }

        .success h3 {
          margin: 0 0 8px 0;
          color: #166534;
        }

        .serial {
          font-size: 24px;
          font-weight: 800;
          color: #15803d;
          letter-spacing: 1px;
          margin: 8px 0;
        }

        .ai-summary {
          display: flex;
          justify-content: center;
          gap: 12px;
          margin: 12px 0;
          flex-wrap: wrap;
        }

        .ai-tag, .priority-tag {
          padding: 6px 12px;
          border-radius: 999px;
          font-size: 13px;
        }

        .ai-tag {
          background: #dbeafe;
          color: #1e40af;
        }

        .priority-tag.high { background: #fee2e2; color: #991b1b; }
        .priority-tag.medium { background: #fef3c7; color: #92400e; }
        .priority-tag.low { background: #e0f2fe; color: #0369a1; }

        @media (max-width: 900px) {
          .layout {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
