import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { CrownIcon, LandmarkIcon, RoadIcon, WaterIcon, LightningIcon } from "../components/Icons";

function IndiaHeritageScene() {
  return (
    <div className="login-heritage-scene" aria-hidden="true">
      <div className="flag-pole"></div>
      <svg className="india-flag-art" viewBox="0 0 360 240" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="flagSaffron" x1="0" x2="1"><stop stopColor="#FF9933" /><stop offset="1" stopColor="#F07B24" /></linearGradient>
          <linearGradient id="flagGreen" x1="0" x2="1"><stop stopColor="#138808" /><stop offset="1" stopColor="#0D6F08" /></linearGradient>
          <filter id="flagShadow" x="-20%" y="-20%" width="140%" height="150%"><feDropShadow dx="0" dy="12" stdDeviation="8" floodColor="#0F2042" floodOpacity="0.18" /></filter>
        </defs>
        <g filter="url(#flagShadow)">
          <path className="flag-saffron" d="M18 18C82 5 126 31 180 18s101-3 162 4v66c-62-7-108-17-162-4S81 71 18 84V18Z" fill="url(#flagSaffron)" />
          <path className="flag-white" d="M18 84c63-13 108 13 162 0s100-3 162 4v64c-62-7-108-17-162-4S81 137 18 150V84Z" fill="#FFFFFF" />
          <path className="flag-green" d="M18 150c63-13 108 13 162 0s100-3 162 4v66c-62-7-108-17-162-4S81 203 18 216v-66Z" fill="url(#flagGreen)" />
        </g>
        <g className="flag-chakra" transform="translate(180 120)">
          <circle r="27" fill="none" stroke="#000080" strokeWidth="3" />
          <circle r="3" fill="#000080" />
          {Array.from({ length: 24 }).map((_, index) => <line key={index} x1="0" y1="0" x2="0" y2="25" stroke="#000080" strokeWidth="1.5" transform={`rotate(${index * 15})`} />)}
        </g>
      </svg>
      <div className="scene-caption"><strong>NIVARAN</strong><span>One civic pulse across Bharat</span></div>
    </div>
  );
}

export default function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (loginEmail?: string, loginPwd?: string) => {
    const finalEmail = loginEmail || email;
    const finalPassword = loginPwd || password;

    if (!finalEmail || !finalPassword) {
      setError("Email and password are required");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const res = await axios.post(
        "http://localhost:8000/auth/login",
        {
          email: finalEmail,
          password: finalPassword,
        },
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      const { token, role, department } = res.data;

      // Store auth data
      localStorage.setItem("token", token);
      localStorage.setItem("role", role);
      localStorage.setItem("email", finalEmail);
      if (department) {
        localStorage.setItem("department", department);
      }

      // Role-based redirect
      if (role === "admin") {
        navigate("/admin", { replace: true });
      } else {
        navigate("/department", { replace: true });
      }
    } catch (err: any) {
      if (err.response?.status === 401) {
        setError("Invalid credentials. Please verify password.");
      } else {
        setError("Server error. Please verify backend is active.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-shell" style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "var(--sandstone-light)",
      padding: "20px"
    }}>
      <div className="login-layout">
        <div className="scene-kicker">Civic intelligence, rooted in heritage</div>
        <IndiaHeritageScene />
        <div className="login-card" style={{ maxWidth: "420px", width: "100%", padding: "36px 30px" }}>
        <div className="corner-accent corner-top-left"></div>
        <div className="corner-accent corner-top-right"></div>
        <div className="corner-accent corner-bottom-left"></div>
        <div className="corner-accent corner-bottom-right"></div>

        <div style={{ textAlign: "center", marginBottom: "28px" }}>
          <div className="brand-wrapper" style={{ justifyContent: "center", marginBottom: "6px" }}>
            <div className="brand-pillar"></div>
            <h1 className="brand-title" style={{ fontSize: "26px" }}>
              NIVARAN <span className="brand-subtitle-sanskrit">निवारण</span>
            </h1>
          </div>
          <span style={{ fontSize: "12px", color: "var(--text-muted)", letterSpacing: "1px", textTransform: "uppercase", fontWeight: 600 }}>
            Official Governance & Triage Portal
          </span>
        </div>

        {error && (
          <div style={{
            background: "rgba(168, 63, 44, 0.08)",
            border: "1px solid rgba(168, 63, 44, 0.3)",
            borderRadius: "6px",
            padding: "10px",
            color: "var(--terracotta-red)",
            fontSize: "13px",
            marginBottom: "16px"
          }}>
            {error}
          </div>
        )}

        <div className="form-group">
          <label className="form-label" style={{ fontSize: "13px" }}>Official Officer Email:</label>
          <input
            type="email"
            placeholder="admin@nivaran.in"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="input-text"
          />
        </div>

        <div className="form-group">
          <label className="form-label" style={{ fontSize: "13px" }}>Password:</label>
          <input
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="input-text"
            onKeyDown={(e) => e.key === "Enter" && handleLogin()}
          />
        </div>

        <button
          onClick={() => handleLogin()}
          disabled={loading}
          className="btn-heritage-primary"
          style={{ width: "100%", marginBottom: "20px" }}
        >
          {loading ? "Authenticating..." : "Access Control Center"}
        </button>

        {/* QUICK TEST CREDENTIAL CHIPS FOR HACKATHON JURORS */}
        <div style={{ borderTop: "1px dashed var(--border-gold)", paddingTop: "16px" }}>
          <span className="quick-label" style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px", display: "flex", alignItems: "center", gap: "5px", marginBottom: "8px" }}>
            <LightningIcon size={14} /> 1-Click Test Credentials (For Juror Evaluation):
          </span>
          <div className="credential-grid" style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
            <button
              type="button"
              className="lang-chip"
              style={{ cursor: "pointer", border: "1px solid var(--border-gold)" }}
              onClick={() => { setEmail("admin@nivaran.in"); setPassword("admin123"); handleLogin("admin@nivaran.in", "admin123"); }}
            >
              <><CrownIcon size={14} /> Global Admin</>
            </button>
            <button
              type="button"
              className="lang-chip"
              style={{ cursor: "pointer", border: "1px solid var(--border-gold)" }}
              onClick={() => { setEmail("water@nivaran.in"); setPassword("department123"); handleLogin("water@nivaran.in", "department123"); }}
            >
              <><WaterIcon size={14} /> Water Board</>
            </button>
            <button
              type="button"
              className="lang-chip"
              style={{ cursor: "pointer", border: "1px solid var(--border-gold)" }}
              onClick={() => { setEmail("electricity@nivaran.in"); setPassword("department123"); handleLogin("electricity@nivaran.in", "department123"); }}
            >
              <><LightningIcon size={14} /> Electricity Board</>
            </button>
            <button
              type="button"
              className="lang-chip"
              style={{ cursor: "pointer", border: "1px solid var(--border-gold)" }}
              onClick={() => { setEmail("roads@nivaran.in"); setPassword("department123"); handleLogin("roads@nivaran.in", "department123"); }}
            >
              <><RoadIcon size={14} /> Roads Dept</>
            </button>
            <button
              type="button"
              className="lang-chip"
              style={{ cursor: "pointer", border: "1px solid var(--border-gold)" }}
              onClick={() => { setEmail("municipality@nivaran.in"); setPassword("department123"); handleLogin("municipality@nivaran.in", "department123"); }}
            >
              <><LandmarkIcon size={14} /> Municipality</>
            </button>
          </div>
        </div>
        </div>
      </div>
    </div>
  );
}
