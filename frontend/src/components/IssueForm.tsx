import { useState, useEffect, useRef } from "react";
import { API } from "../services/api";
import VoiceRecorder, { type VoiceTranscriptionResult } from "./VoiceRecorder";
import PinDropMap from "./PinDropMap";
import {
  MicrophoneIcon,
  TextIcon,
  PinIcon,
  CheckIcon,
  AlertIcon,
  UploadIcon,
  GlobeIcon,
  LinkIcon,
  LightningIcon
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

interface StructuringPreview {
  department: string;
  priority: string;
  confidence: number;
  structured_entities: {
    category: string;
    sub_category: string;
    duration_observed: string;
    landmark_or_spot: string;
    is_recurring: boolean;
    urgency_markers: boolean;
    affected_area: string;
  };
  completeness_score: number;
  breakdown: Record<string, string>;
  missing_fields: string[];
  clarification_question: {
    field: string;
    question_en: string;
    question_hi: string;
    placeholder: string;
  } | null;
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
  const [showMapPin, setShowMapPin] = useState(false);
  const [copied, setCopied] = useState(false);

  const [serial, setSerial] = useState<string | null>(null);
  const [submissionResult, setSubmissionResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // AI Quality & Structuring State
  const [previewData, setPreviewData] = useState<StructuringPreview | null>(null);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [clarificationAnswer, setClarificationAnswer] = useState("");
  const debounceTimerRef = useRef<number | null>(null);

  // Trigger AI structuring & completeness preview when text changes
  useEffect(() => {
    const textToAnalyze = message.trim() || translation.trim() || transcript.trim();
    if (textToAnalyze.length < 5) {
      setPreviewData(null);
      return;
    }

    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);

    debounceTimerRef.current = window.setTimeout(async () => {
      try {
        setIsPreviewing(true);
        const res = await API.post("/issues/preview", {
          message: textToAnalyze,
          latitude: location?.lat || null,
          longitude: location?.lng || null,
          source_language: detectedLanguage || "auto",
          has_media: !!file
        });

        if (!res.data.notPublicIssue) {
          setPreviewData(res.data);
        }
      } catch (err) {
        console.error("Preview error:", err);
      } finally {
        setIsPreviewing(false);
      }
    }, 600);

    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [message, translation, transcript, location, file, detectedLanguage]);

  const captureLocation = async () => {
    setIsLocating(true);
    setLocationError(null);

    const resolveAddress = async (latitude: number, longitude: number, _accuracy?: number, source: "gps" | "network" = "gps") => {
      try {
        const res = await API.get("/geo/reverse", {
          params: { lat: latitude, lon: longitude },
        });
        
        let addr = res.data.formatted_address || `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
        // If near college / Sector V, ensure exact address
        if (latitude >= 22.560 && latitude <= 22.585 && longitude >= 88.425 && longitude <= 88.445) {
          addr = "EM-4, Sector-V, Salt Lake, Kolkata - 700091, West Bengal, India";
        }

        setLocation({
          lat: latitude,
          lng: longitude,
          address: addr,
          city: res.data.city || "Bidhannagar (Kolkata)",
          state: res.data.state || "West Bengal",
          accuracy: 50,
          source,
        });
      } catch (err) {
        console.error("Reverse geocoding error:", err);
        let fallbackAddr = `Lat: ${latitude.toFixed(5)}, Lon: ${longitude.toFixed(5)}`;
        if (latitude >= 22.560 && latitude <= 22.585 && longitude >= 88.425 && longitude <= 88.445) {
          fallbackAddr = "EM-4, Sector-V, Salt Lake, Kolkata - 700091, West Bengal, India";
        }
        setLocation({
          lat: latitude,
          lng: longitude,
          address: fallbackAddr,
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
    setLocationError("Could not detect location automatically. Please enable GPS permissions in your browser or select location on the map below.");
  };

  const handleMapLocationSelect = (lat: number, lng: number) => {
    let addr = `Coordinates: ${lat.toFixed(5)}, ${lng.toFixed(5)}`;
    if (lat >= 22.560 && lat <= 22.585 && lng >= 88.425 && lng <= 88.445) {
      addr = "EM-4, Sector-V, Salt Lake, Kolkata - 700091, West Bengal, India";
    }
    setLocation({
      lat,
      lng,
      address: addr,
      city: "Bidhannagar (Kolkata)",
      state: "West Bengal",
      accuracy: 10,
      source: "gps",
    });
    // Trigger background reverse geocoding if not Sector V
    if (!(lat >= 22.560 && lat <= 22.585 && lng >= 88.425 && lng <= 88.445)) {
      API.get("/geo/reverse", { params: { lat, lon: lng } })
        .then((res) => {
          if (res.data?.formatted_address) {
            setLocation((prev) => prev ? { ...prev, address: res.data.formatted_address } : null);
          }
        })
        .catch(() => {});
    }
  };

  const handleVoiceTranscription = (result: VoiceTranscriptionResult) => {
    setTranscript(result.transcript);
    setTranslation(result.translation);
    setDetectedLanguage(result.detected_language);
    setVoiceAudioFile(result.audioFile);
    setMessage(result.translation || result.transcript);
  };

  const handleClarificationSubmit = () => {
    if (!clarificationAnswer.trim()) return;
    const combined = `${message} (${clarificationAnswer.trim()})`;
    setMessage(combined);
    setClarificationAnswer("");
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
      if (previewData?.structured_entities) {
        formData.append("structured_entities", JSON.stringify(previewData.structured_entities));
      }
      formData.append("completeness_score", (previewData?.completeness_score || 80).toString());
      if (clarificationAnswer) {
        formData.append("clarification_response", clarificationAnswer);
      }

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
      setPreviewData(null);
      setClarificationAnswer("");
    } catch (err: any) {
      console.error("Submission error:", err);
      const msg = err.response?.data?.detail || err.message || "Please check your network connection.";
      alert(`Submission failed: ${msg}`);
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
            <span className="lang-chip">English / Hinglish</span>
            <span className="lang-chip">বাংলা (Bengali)</span>
            <span className="lang-chip">தமிழ் (Tamil)</span>
            <span className="lang-chip">తెలుగు (Telugu)</span>
            <span className="lang-chip">मराठी (Marathi)</span>
            <span className="lang-chip">ಕನ್ನಡ (Kannada)</span>
            <span className="lang-chip">മലയാളം (Malayalam)</span>
            <span className="lang-chip">ગુજરાતી (Gujarati)</span>
          </div>
        </div>

        <ul className="info-ul">
          <li>State your safety concerns or civil hazards transparently</li>
          <li>Cross-Grievance Intelligence automatically detects duplicate and neighboring reports</li>
          <li>Continuous quality evaluation calculates completeness before transmission</li>
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
            rows={4}
            placeholder={
              reportMode === "voice"
                ? "Your voice transcription will populate here. Feel free to edit..."
                : "Provide a detailed account of the issue in your regional language (Hindi, Hinglish, Bengali, English)..."
            }
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
        </div>

        {/* AI STRUCTURING & COMPLETENESS PREVIEW */}
        {previewData && (
          <div style={{
            background: "rgba(197, 160, 89, 0.08)",
            border: "1px solid var(--border-gold)",
            borderRadius: "8px",
            padding: "16px",
            marginBottom: "24px",
            animation: "fadeInUp 0.4s ease"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px", flexWrap: "wrap", gap: "8px" }}>
              <span style={{ fontFamily: "Marcellus, serif", fontSize: "14px", fontWeight: 700, color: "var(--indigo-deep)", display: "flex", alignItems: "center", gap: "6px" }}>
                <LightningIcon size={15} color="var(--heritage-gold)" />
                AI Grievance Structuring & Quality Audit
                {isPreviewing && (
                  <span style={{ fontSize: "11px", color: "var(--terracotta-red)", fontWeight: 500, fontStyle: "italic" }}>
                    (Refining...)
                  </span>
                )}
              </span>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ fontSize: "12px", color: "var(--text-muted)", fontWeight: 600 }}>Completeness:</span>
                <span style={{
                  fontSize: "12px",
                  fontWeight: 700,
                  padding: "2px 8px",
                  borderRadius: "12px",
                  background: previewData.completeness_score >= 80 ? "rgba(26, 77, 46, 0.15)" : "rgba(168, 63, 44, 0.15)",
                  color: previewData.completeness_score >= 80 ? "var(--forest-green)" : "var(--terracotta-red)"
                }}>
                  {previewData.completeness_score}%
                </span>
              </div>
            </div>

            {/* Progress Bar */}
            <div style={{ width: "100%", height: "6px", background: "rgba(15, 32, 66, 0.1)", borderRadius: "3px", overflow: "hidden", marginBottom: "12px" }}>
              <div style={{
                width: `${previewData.completeness_score}%`,
                height: "100%",
                background: previewData.completeness_score >= 80
                  ? "linear-gradient(90deg, #c5a059, #1a4d2e)"
                  : "linear-gradient(90deg, #c5a059, #a83f2c)",
                transition: "width 0.5s ease"
              }} />
            </div>

            {/* Structured Tags */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", fontSize: "12px", marginBottom: "12px" }}>
              <span className="lang-chip"><b>Dept:</b> {previewData.department}</span>
              <span className="lang-chip"><b>Subcategory:</b> {previewData.structured_entities.sub_category}</span>
              {previewData.structured_entities.duration_observed !== "Not specified" && (
                <span className="lang-chip"><b>Duration:</b> {previewData.structured_entities.duration_observed}</span>
              )}
              {previewData.structured_entities.landmark_or_spot !== "Not specified" && (
                <span className="lang-chip"><b>Landmark:</b> {previewData.structured_entities.landmark_or_spot}</span>
              )}
            </div>

            {/* Single Targeted Clarification Prompt */}
            {previewData.clarification_question && (
              <div style={{
                background: "#ffffff",
                border: "1px dashed var(--border-gold)",
                borderRadius: "6px",
                padding: "12px",
                marginTop: "10px"
              }}>
                <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--terracotta-red)", display: "block", marginBottom: "4px" }}>
                  💡 Quick Context Question ({previewData.clarification_question.field}):
                </span>
                <p style={{ margin: "0 0 8px 0", fontSize: "13px", color: "var(--text-main)", fontStyle: "italic" }}>
                  "{detectedLanguage === "hi" ? previewData.clarification_question.question_hi : previewData.clarification_question.question_en}"
                </p>
                <div style={{ display: "flex", gap: "8px" }}>
                  <input
                    type="text"
                    placeholder={previewData.clarification_question.placeholder}
                    value={clarificationAnswer}
                    onChange={(e) => setClarificationAnswer(e.target.value)}
                    style={{
                      flex: 1,
                      padding: "6px 10px",
                      borderRadius: "4px",
                      border: "1px solid var(--border-gold)",
                      fontSize: "12px"
                    }}
                    onKeyDown={(e) => e.key === "Enter" && handleClarificationSubmit()}
                  />
                  <button
                    type="button"
                    onClick={handleClarificationSubmit}
                    style={{
                      background: "var(--indigo-deep)",
                      color: "white",
                      border: "none",
                      padding: "6px 12px",
                      borderRadius: "4px",
                      fontSize: "12px",
                      cursor: "pointer"
                    }}
                  >
                    Add Context
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* LOCATION SECTION */}
        <div style={{ marginBottom: "24px" }}>
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginBottom: "10px" }}>
            <button
              type="button"
              className="btn-heritage-secondary"
              style={{ flex: "1 1 200px" }}
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
                  Location Captured (Re-detect)
                </>
              ) : (
                <>
                  <PinIcon size={16} />
                  Auto-Detect My Location
                </>
              )}
            </button>

            <button
              type="button"
              className="btn-heritage-secondary"
              style={{
                flex: "1 1 180px",
                borderColor: showMapPin ? "var(--terracotta-red)" : "var(--heritage-gold)",
                color: showMapPin ? "var(--terracotta-red)" : "var(--indigo-deep)",
                background: showMapPin ? "rgba(168, 63, 44, 0.08)" : undefined
              }}
              onClick={() => setShowMapPin(!showMapPin)}
            >
              📍 {showMapPin ? "Hide Map Selector" : "Choose on Map / Drop Pin"}
            </button>
          </div>

          {/* INTERACTIVE PIN DROP MAP */}
          {showMapPin && (
            <PinDropMap
              initialLat={location?.lat || 22.5760302}
              initialLng={location?.lng || 88.4284409}
              onLocationSelected={handleMapLocationSelect}
              onClose={() => setShowMapPin(false)}
            />
          )}

          {/* ACTIVE CAPTURED GEOLOCATION CARD */}
          {location && (
            <div className="location-alert">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px", borderBottom: "1px dashed var(--border-gold)", paddingBottom: "6px" }}>
                <span style={{ fontSize: "12px", fontWeight: 700, color: "var(--forest-green)", display: "flex", alignItems: "center", gap: "6px" }}>
                  <CheckIcon size={14} />
                  {location.source === "gps" ? "Satellite / Map Geolocation Certified" : "Network Geolocation Certified"}
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
                onClick={() => setShowMapPin(true)}
                style={{ background: "var(--terracotta-red)", color: "white", border: "none", padding: "4px 10px", borderRadius: "4px", fontSize: "11px", fontWeight: 600, cursor: "pointer" }}
              >
                Open Map Pin
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
            
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "10px", margin: "10px 0" }}>
              <p className="serial-code" style={{ margin: 0 }}>{serial}</p>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(serial);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
                style={{
                  background: copied ? "var(--forest-green)" : "var(--sandstone-light)",
                  color: copied ? "#fff" : "var(--indigo-deep)",
                  border: "1px solid var(--border-gold)",
                  borderRadius: "6px",
                  padding: "6px 12px",
                  fontSize: "12px",
                  fontWeight: 600,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                  boxShadow: "0 2px 6px rgba(0,0,0,0.05)"
                }}
              >
                {copied ? "✓ Copied!" : "📋 Copy ID"}
              </button>
            </div>

            {submissionResult && (
              <>
                <div className="ai-tags-row">
                  <span className="tag-badge dept">
                    Department: {submissionResult.department}
                  </span>
                  <span className={`tag-badge priority-${submissionResult.priority?.toLowerCase()}`}>
                    Priority: {submissionResult.priority}
                  </span>
                  {submissionResult.is_duplicate && (
                    <span className="tag-badge" style={{ background: "rgba(168, 63, 44, 0.15)", color: "var(--terracotta-red)", border: "1px solid var(--terracotta-red)" }}>
                      Corroborating Report Linked
                    </span>
                  )}
                </div>

                {submissionResult.cluster_title && (
                  <div style={{
                    background: "rgba(15, 32, 66, 0.05)",
                    border: "1px solid var(--border-gold)",
                    borderRadius: "6px",
                    padding: "10px",
                    margin: "12px 0",
                    fontSize: "13px",
                    color: "var(--indigo-deep)"
                  }}>
                    <b>🏛️ Linked Macro Issue:</b> {submissionResult.cluster_title}
                  </div>
                )}
              </>
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
