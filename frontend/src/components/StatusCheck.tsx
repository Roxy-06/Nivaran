import { useState, useRef } from "react";
import { API } from "../services/api";
import {
  SearchIcon,
  VolumeIcon,
  MicrophoneIcon,
  SchoolIcon,
  HospitalIcon,
  ResidentialIcon,
  LightningIcon,
  WaterIcon,
  RoadIcon,
  CleanIcon,
  AlertIcon
} from "./Icons";

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

  const getDepartmentIcon = (dept: string) => {
    const dLower = (dept || "").toLowerCase();
    if (dLower.includes("electric")) return <LightningIcon size={16} />;
    if (dLower.includes("water")) return <WaterIcon size={16} />;
    if (dLower.includes("road")) return <RoadIcon size={16} />;
    if (dLower.includes("municipal") || dLower.includes("sanitation")) return <CleanIcon size={16} />;
    return <AlertIcon size={16} />;
  };

  const renderAreaImpactElements = () => {
    if (!data?.areaImpact) return <div style={{ fontSize: "14px", color: "var(--text-muted)" }}>No sensitive infrastructure affected.</div>;

    const items = [];
    if (data.areaImpact.schools > 0) {
      items.push(
        <div key="schools" style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", padding: "6px 12px", background: "rgba(15, 32, 66, 0.05)", border: "1px solid var(--border-gold)", borderRadius: "6px", color: "var(--indigo-deep)" }}>
          <SchoolIcon size={16} color="var(--terracotta-red)" />
          <span>Schools nearby: {data.areaImpact.schools}</span>
        </div>
      );
    }
    if (data.areaImpact.hospitals > 0) {
      items.push(
        <div key="hospitals" style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", padding: "6px 12px", background: "rgba(15, 32, 66, 0.05)", border: "1px solid var(--border-gold)", borderRadius: "6px", color: "var(--indigo-deep)" }}>
          <HospitalIcon size={16} color="var(--terracotta-red)" />
          <span>Medical centers nearby: {data.areaImpact.hospitals}</span>
        </div>
      );
    }
    if (data.areaImpact.residential > 0) {
      items.push(
        <div key="residential" style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", padding: "6px 12px", background: "rgba(15, 32, 66, 0.05)", border: "1px solid var(--border-gold)", borderRadius: "6px", color: "var(--indigo-deep)" }}>
          <ResidentialIcon size={16} color="var(--terracotta-red)" />
          <span>Residential settlement affected</span>
        </div>
      );
    }

    if (items.length === 0) {
      return <div style={{ fontSize: "14px", color: "var(--text-muted)" }}>Standard impact level. No sensitive zones nearby.</div>;
    }

    return (
      <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", marginTop: "6px" }}>
        {items}
      </div>
    );
  };

  return (
    <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "0 24px" }}>
      <audio ref={ttsAudioRef} style={{ display: "none" }} />

      {/* SEARCH CARD */}
      <section className="card-jali" style={{ marginBottom: "32px", display: "flex", flexDirection: "column", gap: "16px" }}>
        <div className="corner-accent corner-top-left"></div>
        <div className="corner-accent corner-top-right"></div>
        <div className="corner-accent corner-bottom-left"></div>
        <div className="corner-accent corner-bottom-right"></div>

        <h3 style={{ fontFamily: "Marcellus, serif", color: "var(--indigo-deep)", margin: 0 }}>
          Grievance Audit
        </h3>

        <p style={{ margin: 0, fontSize: "14px", color: "var(--text-muted)" }}>
          Provide the unique tracking reference key generated upon report filing. You may listen to official status logs translated audio-linguistically in real time.
        </p>

        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
          <input
            className="input-text"
            style={{ flex: 3, minWidth: "220px" }}
            placeholder="Reference Serial Key (e.g. CP-2026-XXXX)"
            value={serial}
            onChange={(e) => setSerial(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && checkStatus()}
          />
          <button
            type="button"
            onClick={checkStatus}
            disabled={loading}
            className="btn-heritage-primary"
            style={{ width: "auto", flex: 1, minWidth: "160px" }}
          >
            {loading ? (
              <span className="spinner-gold" style={{ borderColor: "rgba(255,255,255,0.2)", borderTopColor: "#fff" }}></span>
            ) : (
              <>
                <SearchIcon size={16} />
                Audit Issue
              </>
            )}
          </button>
        </div>
      </section>

      {error && (
        <div className="location-alert-err" style={{ marginBottom: "32px" }}>
          <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <AlertIcon size={18} />
            {error}
          </span>
        </div>
      )}

      {/* RESULT DETAILS */}
      {data && (
        <section className="card-jali" style={{ marginBottom: "32px" }}>
          <div className="corner-accent corner-top-left"></div>
          <div className="corner-accent corner-top-right"></div>
          <div className="corner-accent corner-bottom-left"></div>
          <div className="corner-accent corner-bottom-right"></div>
          <div className="jali-lattice"></div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px", borderBottom: "1.5px solid var(--border-gold)", paddingBottom: "16px", marginBottom: "24px" }}>
            <h3 style={{ fontFamily: "Marcellus, serif", color: "var(--indigo-deep)", margin: 0 }}>
              Remediation Action Log
            </h3>

            {/* TTS SPEECH VOICE READOUT */}
            <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
              <select
                value={ttsLang}
                onChange={(e) => setTtsLang(e.target.value)}
                style={{ padding: "8px 12px", borderRadius: "6px", border: "1px solid var(--border-gold)", background: "var(--sandstone-light)", fontSize: "13px", outline: "none", color: "var(--indigo-deep)" }}
              >
                {TTS_LANGUAGES.map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className={`btn-heritage-secondary ${isPlayingTts ? "playing" : ""}`}
                style={{
                  width: "auto",
                  padding: "8px 16px",
                  borderColor: isPlayingTts ? "var(--terracotta-red)" : "var(--heritage-gold)",
                  color: isPlayingTts ? "var(--terracotta-red)" : "var(--indigo-deep)",
                  animation: isPlayingTts ? "wavePulse 1.5s infinite" : "none"
                }}
                onClick={playStatusVoice}
                disabled={isPlayingTts}
              >
                <VolumeIcon size={15} color={isPlayingTts ? "var(--terracotta-red)" : "currentColor"} />
                {isPlayingTts ? "Reciting Status..." : "Audible Triage Status"}
              </button>
            </div>
          </div>

          {/* ATTRIBUTE GRID */}
          <div className="status-grid">
            <div className="status-grid-item">
              <span style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", color: "var(--text-muted)" }}>
                Reference Serial Key
              </span>
              <strong style={{ fontSize: "16px", color: "var(--indigo-deep)", fontFamily: "Marcellus, serif" }}>
                {data.serial}
              </strong>
            </div>

            <div className="status-grid-item">
              <span style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", color: "var(--text-muted)" }}>
                Resolution Stage
              </span>
              <span className={`tag-badge`} style={{
                width: "fit-content",
                background: data.status === "Resolved" ? "rgba(26, 77, 46, 0.1)" : data.status === "In Progress" ? "rgba(197, 160, 89, 0.15)" : "rgba(15, 32, 66, 0.08)",
                border: data.status === "Resolved" ? "1px solid rgba(26, 77, 46, 0.2)" : data.status === "In Progress" ? "1px solid var(--border-gold)" : "1px solid rgba(15, 32, 66, 0.15)",
                color: data.status === "Resolved" ? "var(--forest-green)" : data.status === "In Progress" ? "#8a6524" : "var(--indigo-light)"
              }}>
                {data.status}
              </span>
            </div>

            <div className="status-grid-item">
              <span style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", color: "var(--text-muted)" }}>
                Assigned Municipal Unit
              </span>
              <strong style={{ fontSize: "14px", color: "var(--indigo-deep)", display: "flex", alignItems: "center", gap: "6px" }}>
                {getDepartmentIcon(data.department)}
                {data.department}
              </strong>
            </div>

            <div className="status-grid-item">
              <span style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", color: "var(--text-muted)" }}>
                Urgency Priority
              </span>
              <span className={`tag-badge priority-${data.priority?.toLowerCase()}`} style={{ width: "fit-content" }}>
                {data.priority}
              </span>
            </div>

            <div className="status-grid-item">
              <span style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", color: "var(--text-muted)" }}>
                Lodge Date
              </span>
              <span style={{ fontSize: "13px", fontWeight: 500, color: "var(--text-main)" }}>
                {new Date(data.reportedAt).toLocaleDateString()} {new Date(data.reportedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>

            <div className="status-grid-item">
              <span style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", color: "var(--text-muted)" }}>
                Linguistic Source
              </span>
              <span className="tag-badge dept" style={{ width: "fit-content" }}>
                {data.detected_language ? data.detected_language.toUpperCase() : "EN"}
              </span>
            </div>
          </div>

          {/* CITIZEN ORIGINAL AUDIO PLAYBACK */}
          {data.voice_audio && (
            <div style={{ marginTop: "24px", padding: "16px", background: "rgba(15, 32, 66, 0.04)", border: "1px solid var(--border-gold)", borderRadius: "8px" }}>
              <h4 style={{ fontFamily: "Marcellus, serif", margin: "0 0 10px 0", color: "var(--indigo-deep)", display: "flex", alignItems: "center", gap: "8px" }}>
                <MicrophoneIcon size={16} color="var(--terracotta-red)" />
                Citizen Voice Archive
              </h4>
              <div className="audio-preview-row">
                <audio
                  src={`http://localhost:8000/${data.voice_audio.replace(/\\/g, "/")}`}
                  controls
                />
              </div>
            </div>
          )}

          {/* TEXTUAL TRANSCRIPTS */}
          {data.transcript && data.transcript !== data.translation && (
            <div style={{ marginTop: "24px", padding: "16px", background: "rgba(197, 160, 89, 0.05)", borderLeft: "3.5px solid var(--heritage-gold)", borderRadius: "0 8px 8px 0" }}>
              <strong style={{ fontSize: "12px", color: "var(--heritage-gold-dark)", textTransform: "uppercase", letterSpacing: "0.5px", display: "block", marginBottom: "4px" }}>
                Original Language Transcript ({data.detected_language?.toUpperCase()})
              </strong>
              <p style={{ margin: 0, fontSize: "14px", color: "var(--indigo-deep)", fontStyle: "italic", fontWeight: 500 }}>
                "{data.transcript}"
              </p>
            </div>
          )}

          <div style={{ marginTop: "24px" }}>
            <strong style={{ fontSize: "12px", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px", display: "block", marginBottom: "6px" }}>
              Remediation Target Narrative (English Translation)
            </strong>
            <p style={{ margin: 0, fontSize: "15px", color: "var(--text-main)", background: "rgba(15, 32, 66, 0.02)", border: "1px solid rgba(197, 160, 89, 0.15)", padding: "16px", borderRadius: "8px", lineHeight: "1.6" }}>
              {data.translation || data.message}
            </p>
          </div>

          <div style={{ marginTop: "24px" }}>
            <strong style={{ fontSize: "12px", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px", display: "block", marginBottom: "6px" }}>
              Sensitive Infrastructure Impact Assessment
            </strong>
            {renderAreaImpactElements()}
          </div>

          {data.media && (
            <div style={{ marginTop: "24px" }}>
              <strong style={{ fontSize: "12px", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px", display: "block", marginBottom: "6px" }}>
                Civic Proof Artifact
              </strong>
              <div className="media-preview-container">
                {data.media.endsWith(".mp4") || data.media.endsWith(".webm") ? (
                  <video
                    src={`http://localhost:8000/uploads/${data.media.split("/").pop()}`}
                    controls
                  />
                ) : (
                  <img
                    src={`http://localhost:8000/uploads/${data.media.split("/").pop()}`}
                    alt="Civic issue verification photo"
                  />
                )}
              </div>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
