import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

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
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "var(--sandstone-light)",
      padding: "20px"
    }}>
      <div className="card-jali" style={{ maxWidth: "420px", width: "100%", padding: "36px 30px" }}>
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
          <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px", display: "block", marginBottom: "8px" }}>
            ⚡ 1-Click Test Credentials (For Juror Evaluation):
          </span>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
            <button
              type="button"
              className="lang-chip"
              style={{ cursor: "pointer", border: "1px solid var(--border-gold)" }}
              onClick={() => { setEmail("admin@nivaran.in"); setPassword("admin123"); handleLogin("admin@nivaran.in", "admin123"); }}
            >
              👑 Global Admin
            </button>
            <button
              type="button"
              className="lang-chip"
              style={{ cursor: "pointer", border: "1px solid var(--border-gold)" }}
              onClick={() => { setEmail("water@nivaran.in"); setPassword("department123"); handleLogin("water@nivaran.in", "department123"); }}
            >
              💧 Water Board
            </button>
            <button
              type="button"
              className="lang-chip"
              style={{ cursor: "pointer", border: "1px solid var(--border-gold)" }}
              onClick={() => { setEmail("electricity@nivaran.in"); setPassword("department123"); handleLogin("electricity@nivaran.in", "department123"); }}
            >
              ⚡ Electricity Board
            </button>
            <button
              type="button"
              className="lang-chip"
              style={{ cursor: "pointer", border: "1px solid var(--border-gold)" }}
              onClick={() => { setEmail("roads@nivaran.in"); setPassword("department123"); handleLogin("roads@nivaran.in", "department123"); }}
            >
              🛣️ Roads Dept
            </button>
            <button
              type="button"
              className="lang-chip"
              style={{ cursor: "pointer", border: "1px solid var(--border-gold)" }}
              onClick={() => { setEmail("municipality@nivaran.in"); setPassword("department123"); handleLogin("municipality@nivaran.in", "department123"); }}
            >
              🏛️ Municipality
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
