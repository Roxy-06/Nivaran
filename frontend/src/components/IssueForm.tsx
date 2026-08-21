import { useState } from "react";
import { API } from "../services/api";
import VoiceRecorder, { type VoiceTranscriptionResult } from "./VoiceRecorder";
import {
  MicrophoneIcon,
  TextIcon,
  PinIcon,
  CheckIcon,
  AlertIcon,
  UploadIcon,
  GlobeIcon,
  LinkIcon
} from "./Icons";

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
      alert("Please capture your location before submitting so we can route the issue to the local municipal team.");
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
    <div className="portal-layout">
      {/* LEFT SECTION - HERITAGE INFORMATION */}
      <aside className="card-jali">
        <div className="corner-accent corner-top-left"></div>
        <div className="corner-accent corner-top-right"></div>
        <div className="corner-accent corner-bottom-left"></div>
        <div className="corner-accent corner-bottom-right"></div>
        <div className="jali-lattice"></div>

        <h2 style={{ fontFamily: "Marcellus, serif", color: "var(--indigo-deep)", marginTop: 0 }}>
          Grievance Submission
        </h2>
        <p style={{ fontSize: "14px", color: "var(--text-muted)", marginBottom: "24px" }}>
          This portal connects citizens directly to local government councils. Express your concern verbally or in writing in any regional tongue. Our AI translator organizes it immediately for targeted municipal remediation.
        </p>

        <div style={{ background: "rgba(197, 160, 89, 0.07)", border: "1px solid var(--border-gold)", borderRadius: "8px", padding: "16px", marginBottom: "24px" }}>
          <h4 style={{ fontFamily: "Marcellus, serif", margin: "0 0 12px 0", color: "var(--indigo-deep)", display: "flex", alignItems: "center", gap: "8px" }}>
            <GlobeIcon size={18} color="var(--terracotta-red)" />
            Supported Dialects
          </h4>
          <div className="lang-chip-container">
            <span className="lang-chip">हिन्दी (Hindi)</span>
            <span className="lang-chip">தமிழ் (Tamil)</span>
            <span className="lang-chip">తెలుగు (Telugu)</span>
            <span className="lang-chip">বাংলা (Bengali)</span>
            <span className="lang-chip">मराठी (Marathi)</span>
            <span className="lang-chip">ಕನ್ನಡ (Kannada)</span>
            <span className="lang-chip">മലയാളം (Malayalam)</span>
            <span className="lang-chip">ગુજરાતી (Gujarati)</span>
            <span className="lang-chip">English</span>
          </div>
        </div>

        <ul className="info-ul">
          <li>State your safety concerns or civil hazards transparently</li>
          <li>Attach photographs or videos of the issue for accelerated review</li>
          <li>Anonymous verification ensures personal privacy protection</li>
        </ul>

        <div className="note-arch">
          Voice files are securely processed, generating direct bilingual transcript archives instantly.
        </div>
      </aside>

      {/* RIGHT SECTION - INPUT FORM */}
      <section className="card-jali">
        <div className="corner-accent corner-top-left"></div>
        <div className="corner-accent corner-top-right"></div>
        <div className="corner-accent corner-bottom-left"></div>
        <div className="corner-accent corner-bottom-right"></div>

        <h2 style={{ fontFamily: "Marcellus, serif", color: "var(--indigo-deep)", marginTop: 0 }}>
          Log Public Issue
        </h2>

        {/* INPUT MODE SELECTION */}
        <div className="inner-toggle">
          <button
            type="button"
            className={`inner-toggle-btn ${reportMode === "voice" ? "active" : ""}`}
            onClick={() => setReportMode("voice")}
          >
            <MicrophoneIcon size={15} color={reportMode === "voice" ? "var(--terracotta-red)" : "currentColor"} />
            Voice Report
          </button>
          <button
            type="button"
            className={`inner-toggle-btn ${reportMode === "text" ? "active" : ""}`}
            onClick={() => setReportMode("text")}
          >
            <TextIcon size={15} color={reportMode === "text" ? "var(--terracotta-red)" : "currentColor"} />
            Text Report
          </button>
        </div>

        {/* VOICE INPUT COMPONENT */}
        {reportMode === "voice" && (
          <VoiceRecorder
            onTranscriptionComplete={handleVoiceTranscription}
            disabled={loading}
          />
        )}

        {/* TRANSCRIPTION / TEXT FIELD */}
        <div className="form-group">
          <label className="form-label" htmlFor="issue-description">
            {reportMode === "voice" ? "Description (Parsed from transcription):" : "Describe the public issue:"}
          </label>
          <textarea
            id="issue-description"
            rows={5}
            placeholder={
              reportMode === "voice"
                ? "Your voice transcription will populate here. Feel free to edit..."
                : "Provide a detailed account of the issue in your regional language..."
            }
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
        </div>

        {/* LOCATION SECTION */}
        <div style={{ marginBottom: "24px" }}>
          <div>
            <button
              type="button"
              className="btn-heritage-secondary"
              onClick={captureLocation}
              disabled={isLocating}
            >
              {isLocating ? (
                <>
                  <span className="spinner-gold"></span>
                  Detecting Geo-Location...
                </>
              ) : location ? (
                <>
                  <PinIcon size={16} color="var(--terracotta-red)" />
                  Geographical Coordinates Captured (Click to Update)
                </>
              ) : (
                <>
                  <PinIcon size={16} />
                  Record My Current Location
                </>
              )}
            </button>
          </div>

          {/* ACTIVE CAPTURED GEOLOCATION CARD */}
          {location && (
            <div className="location-alert">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px", borderBottom: "1px dashed var(--border-gold)", paddingBottom: "6px" }}>
                <span style={{ fontSize: "12px", fontWeight: 700, color: "var(--forest-green)", display: "flex", alignItems: "center", gap: "6px" }}>
                  <CheckIcon size={14} />
                  {location.source === "gps" ? "Satellite Geolocation Certified" : "Network Geolocation Certified"}
                </span>
                <span style={{ fontSize: "11px", background: "rgba(26, 77, 46, 0.1)", color: "var(--forest-green)", padding: "2px 6px", borderRadius: "4px", fontWeight: 600 }}>
                  High Accuracy
                </span>
              </div>

              <div style={{ fontSize: "13px", color: "var(--text-main)", marginBottom: "8px", lineHeight: "1.4" }}>
                <strong>Address: </strong>
                <span>{location.address}</span>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px", fontSize: "12px", color: "var(--text-muted)" }}>
                <span>
                  <strong>Pinpoint:</strong> {location.lat.toFixed(5)}° N, {location.lng.toFixed(5)}° E
                </span>
                <a
                  href={`https://www.google.com/maps?q=${location.lat},${location.lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: "var(--indigo-light)", textDecoration: "none", fontWeight: 600, display: "flex", alignItems: "center", gap: "4px" }}
                >
                  <LinkIcon size={12} />
                  Visual Map Context
                </a>
              </div>
            </div>
          )}

          {/* GEOLOCATION ERROR ALERT */}
          {locationError && (
            <div className="location-alert-err">
              <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <AlertIcon size={16} />
                {locationError}
              </span>
              <button
                type="button"
                onClick={captureLocation}
                style={{ background: "var(--terracotta-red)", color: "white", border: "none", padding: "4px 10px", borderRadius: "4px", fontSize: "11px", fontWeight: 600, cursor: "pointer" }}
              >
                Retry
              </button>
            </div>
          )}
        </div>

        {/* MEDIA UPLOAD SECTION */}
        <div className="form-group">
          <label className="form-label" htmlFor="media-upload">
            Attach Photographic or Video Proof (Optional):
          </label>
          <div style={{ position: "relative" }}>
            <input
              id="media-upload"
              type="file"
              accept="image/*,video/*"
              style={{ display: "none" }}
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
            <button
              type="button"
              className="btn-heritage-secondary"
              onClick={() => document.getElementById("media-upload")?.click()}
            >
              <UploadIcon size={16} />
              {file ? `Selected file: ${file.name}` : "Upload Photo / Video Proof"}
            </button>
          </div>
        </div>

        {/* SUBMIT BUTTON */}
        <button
          className="btn-heritage-primary"
          onClick={submitIssue}
          disabled={loading || isLocating}
        >
          {loading ? (
            <>
              <span className="spinner-gold" style={{ borderColor: 'rgba(255,255,255,0.2)', borderTopColor: '#fff' }}></span>
              Analyzing Grievance...
            </>
          ) : (
            "Transmit Report to Council"
          )}
        </button>

        {/* SUCCESS SUMMARY */}
        {serial && (
          <div className="success-card">
            <div style={{ display: "flex", justifyContent: "center", marginBottom: "8px" }}>
              <span style={{ color: "var(--forest-green)", background: "rgba(26, 77, 46, 0.1)", borderRadius: "50%", padding: "8px" }}>
                <CheckIcon size={24} />
              </span>
            </div>
            <h3>Grievance Lodged Successfully</h3>
            <p className="serial-code">{serial}</p>
            {submissionResult && (
              <div className="ai-tags-row">
                <span className="tag-badge dept">
                  Department: {submissionResult.department}
                </span>
                <span className={`tag-badge priority-${submissionResult.priority?.toLowerCase()}`}>
                  Priority: {submissionResult.priority}
                </span>
              </div>
            )}
            <p style={{ fontSize: "12px", color: "var(--text-muted)", margin: "8px 0 0 0" }}>
              Please record this tracking key to monitor remediation updates below.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
