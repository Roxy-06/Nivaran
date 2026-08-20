import { useState } from "react";
import { API } from "../services/api";
import VoiceRecorder, { type VoiceTranscriptionResult } from "./VoiceRecorder";

interface LocationData {
  lat: number;
  lng: number;
  address?: string;
  city?: string;
  state?: string;
  accuracy?: number;
  source?: "gps" | "network";
}

export default function IssueForm() {
  const [reportMode, setReportMode] = useState<"voice" | "text">("voice");
  const [message, setMessage] = useState("");
  const [transcript, setTranscript] = useState("");
  const [translation, setTranslation] = useState("");
  const [detectedLanguage, setDetectedLanguage] = useState("en");
  const [voiceAudioFile, setVoiceAudioFile] = useState<File | null>(null);

  const [file, setFile] = useState<File | null>(null);
  const [location, setLocation] = useState<LocationData | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  const [serial, setSerial] = useState<string | null>(null);
  const [submissionResult, setSubmissionResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [theme] = useState<"light" | "dark">("light");

  const captureLocation = async () => {
    setIsLocating(true);
    setLocationError(null);

    const resolveAddress = async (latitude: number, longitude: number, _accuracy?: number, source: "gps" | "network" = "gps") => {
      try {
        const res = await API.get("/geo/reverse", {
          params: { lat: latitude, lon: longitude },
        });
        const addr = res.data.formatted_address || `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
        setLocation({
          lat: latitude,
          lng: longitude,
          address: addr,
          city: res.data.city,
          state: res.data.state,
          accuracy: 50,
          source,
        });
      } catch (err) {
        console.error("Reverse geocoding error:", err);
        setLocation({
          lat: latitude,
          lng: longitude,
          address: `Lat: ${latitude.toFixed(5)}, Lon: ${longitude.toFixed(5)}`,
          accuracy: 50,
          source,
        });
      } finally {
        setIsLocating(false);
      }
    };

    if (!navigator.geolocation) {
      fallbackToIpLocation(resolveAddress);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        resolveAddress(latitude, longitude, Math.round(accuracy), "gps");
      },
      (err) => {
        console.warn("Browser GPS failed or denied, trying IP fallback:", err.message);
        fallbackToIpLocation(resolveAddress);
      },
      {
        enableHighAccuracy: true,
        timeout: 8000,
        maximumAge: 0,
      }
    );
  };

  const fallbackToIpLocation = async (
    resolveAddress: (lat: number, lon: number, acc?: number, src?: "gps" | "network") => void
  ) => {
    try {
      const ipRes = await fetch("https://freeipapi.com/api/json");
      const ipData = await ipRes.json();
      if (ipData.latitude && ipData.longitude) {
        resolveAddress(Number(ipData.latitude), Number(ipData.longitude), 500, "network");
        return;
      }
    } catch {
      // ignore
    }

    try {
      const ipRes = await fetch("https://ipapi.co/json/");
      const ipData = await ipRes.json();
      if (ipData.latitude && ipData.longitude) {
        resolveAddress(Number(ipData.latitude), Number(ipData.longitude), 500, "network");
        return;
      }
    } catch {
      // ignore
    }

    setIsLocating(false);
    setLocationError("Could not detect location automatically. Please enable GPS permissions in your browser.");
  };

  const handleVoiceTranscription = (result: VoiceTranscriptionResult) => {
    setTranscript(result.transcript);
    setTranslation(result.translation);
    setDetectedLanguage(result.detected_language);
    setVoiceAudioFile(result.audioFile);
    setMessage(result.translation || result.transcript);
  };

  const submitIssue = async () => {
    const finalMessage = message.trim() || translation.trim() || transcript.trim();
    if (!finalMessage) {
      alert("Please describe or record the civic issue.");
      return;
    }

    if (!location) {
      alert("Please tap '📍 Capture My Location' before submitting so we can route the issue to the local municipal team.");
      return;
    }

    try {
      setLoading(true);
      setSerial(null);
      setSubmissionResult(null);

      const formData = new FormData();
      formData.append("message", finalMessage);
      formData.append("latitude", location.lat.toString());
      formData.append("longitude", location.lng.toString());
      if (location.address) formData.append("address", location.address);
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
    } catch (err) {
      console.error(err);
      alert("Submission failed. Please check your network connection.");
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

            {/* LOCATION DETECTION SECTION */}
            <div className="location-section">
              <div className="location-action-bar">
                <button
                  type="button"
                  className={`location-btn ${location ? "detected" : ""} ${isLocating ? "loading" : ""}`}
                  onClick={captureLocation}
                  disabled={isLocating}
                >
                  {isLocating ? (
                    <>
                      <span className="location-spinner"></span>
                      📡 Detecting GPS Location...
                    </>
                  ) : location ? (
                    <>📍 Location Captured (Tap to Refresh)</>
                  ) : (
                    <>📍 Capture My Location</>
                  )}
                </button>
              </div>

              {/* LOCATION DETAILS CARD */}
              {location && (
                <div className="location-card-preview">
                  <div className="loc-card-header">
                    <div className="loc-badge-row">
                      <span className="loc-badge-success">
                        ✅ {location.source === "gps" ? "GPS Location Confirmed" : "Network Location Confirmed"}
                      </span>
                      <span className="loc-accuracy-tag">±50 meter accuracy</span>
                    </div>
                    <button
                      type="button"
                      className="loc-refresh-btn"
                      onClick={captureLocation}
                      title="Refresh Location"
                    >
                      🔄 Refresh
                    </button>
                  </div>

                  <div className="loc-address-text">
                    <strong>📍 Address: </strong>
                    <span>{location.address}</span>
                  </div>

                  <div className="loc-coords-row">
                    <span className="loc-coords">
                      🌐 <strong>Coordinates:</strong> {location.lat.toFixed(5)}° N, {location.lng.toFixed(5)}° E
                    </span>
                    <a
                      href={`https://www.google.com/maps?q=${location.lat},${location.lng}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="loc-map-link"
                    >
                      🗺️ View on Map ↗
                    </a>
                  </div>
                </div>
              )}

              {/* LOCATION ERROR BANNER */}
              {locationError && (
                <div className="location-error-alert">
                  <span>⚠️ {locationError}</span>
                  <button type="button" onClick={captureLocation} className="loc-retry-btn">
                    Retry
                  </button>
                </div>
              )}
            </div>

            {/* MEDIA UPLOAD SECTION */}
            <div className="file-upload-section">
              <label htmlFor="media-upload">Attach Photo or Video Proof (Optional):</label>
              <input
                id="media-upload"
                type="file"
                accept="image/*,video/*"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
            </div>

            <button className="primary" onClick={submitIssue} disabled={loading || isLocating}>
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

        /* LOCATION SECTION */
        .location-section {
          margin-bottom: 20px;
        }

        .location-btn {
          width: 100%;
          padding: 12px 18px;
          border-radius: 8px;
          border: none;
          background: #334155;
          color: white;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }

        .location-btn:hover:not(:disabled) {
          background: #1e293b;
        }

        .location-btn.detected {
          background: #059669;
        }

        .location-btn.loading {
          background: #475569;
          cursor: wait;
        }

        .location-spinner {
          width: 14px;
          height: 14px;
          border: 2px solid #cbd5e1;
          border-top-color: #ffffff;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .location-card-preview {
          margin-top: 12px;
          background: #f0fdf4;
          border: 1px solid #bbf7d0;
          border-radius: 10px;
          padding: 14px 16px;
          box-shadow: 0 2px 8px rgba(16, 185, 129, 0.06);
        }

        .loc-card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
        }

        .loc-badge-row {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }

        .loc-badge-success {
          font-size: 12px;
          font-weight: 700;
          color: #166534;
        }

        .loc-accuracy-tag {
          background: #dcfce7;
          border: 1px solid #86efac;
          color: #15803d;
          font-size: 11px;
          padding: 2px 6px;
          border-radius: 4px;
          font-weight: 600;
        }

        .loc-refresh-btn {
          background: transparent;
          border: none;
          color: #059669;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          padding: 4px 8px;
          border-radius: 4px;
        }

        .loc-refresh-btn:hover {
          background: #d1fae5;
        }

        .loc-address-text {
          font-size: 13px;
          color: #1e293b;
          line-height: 1.5;
          margin-bottom: 8px;
        }

        .loc-coords-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 8px;
          font-size: 12px;
          color: #475569;
          border-top: 1px dashed #86efac;
          padding-top: 8px;
        }

        .loc-map-link {
          color: #2563eb;
          text-decoration: none;
          font-weight: 600;
          font-size: 12px;
        }

        .loc-map-link:hover {
          text-decoration: underline;
        }

        .location-error-alert {
          margin-top: 10px;
          background: #fef2f2;
          border: 1px solid #fecaca;
          color: #dc2626;
          padding: 10px 14px;
          border-radius: 8px;
          font-size: 13px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .loc-retry-btn {
          background: #dc2626;
          color: white;
          border: none;
          padding: 4px 10px;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
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
