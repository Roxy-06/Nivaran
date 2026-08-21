import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { CrownIcon, LandmarkIcon, RoadIcon, WaterIcon, LightningIcon } from "../components/Icons";

function MailIcon({ size = 18, color = "#94a3b8" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect width="20" height="16" x="2" y="4" rx="2" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </svg>
  );
}

function LockIcon({ size = 18, color = "#94a3b8" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

function IndiaHeritageScene() {
  return (
    <div className="heritage-left-column">
      {/* Top Kicker */}
      <div className="heritage-kicker">CIVIC INTELLIGENCE, ROOTED IN HERITAGE</div>

      {/* Single Clean Circular Medallion with Bharat Heritage Map Artwork */}
      <div className="heritage-medallion">
        <img
          src="/india-heritage-map.jpg"
          alt="Bharat Civic Intelligence Map"
          className="heritage-map-art"
        />

        {/* Minimalist Civic Pulse Animation Nodes */}
        <div className="civic-pulse-node node-delhi" title="Northern Hub"></div>
        <div className="civic-pulse-node node-mumbai" title="Western Hub"></div>
        <div className="civic-pulse-node node-bengaluru" title="Southern Hub"></div>
        <div className="civic-pulse-node node-kolkata" title="Eastern Hub"></div>
      </div>

      {/* Symmetrical Divider Line with Gold Diamond */}
      <div className="heritage-divider">
        <span className="divider-line"></span>
        <span className="divider-dot"></span>
        <span className="divider-line"></span>
      </div>

      {/* Brand Title and Subtitle */}
      <div className="heritage-branding">
        <h2 className="heritage-title">NIVARAN</h2>
        <p className="heritage-subtitle">One civic pulse across Bharat</p>
      </div>
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
    <div className="login-screen-wrapper">
      <div className="login-dual-layout">
        {/* LEFT COLUMN: HERITAGE SCENE & BRANDING */}
        <IndiaHeritageScene />

        {/* RIGHT COLUMN: LOGIN CONTROL CARD */}
        <div className="login-card-container">
          {/* Corner Brass Accents */}
          <div className="corner-bracket corner-tl"></div>
          <div className="corner-bracket corner-tr"></div>
          <div className="corner-bracket corner-bl"></div>
          <div className="corner-bracket corner-br"></div>

          {/* Card Header */}
          <div className="card-top-header">
            <div className="brand-logo-row">
              <div className="brand-pillar-icon">
                <span className="pillar-gold-left"></span>
                <span className="pillar-terracotta-center"></span>
                <span className="pillar-gold-right"></span>
              </div>
              <h1 className="brand-heading">
                NIVARAN <span className="brand-sanskrit-tag">निवारण</span>
              </h1>
            </div>
            <div className="card-subheading">
              OFFICIAL GOVERNANCE & TRIAGE PORTAL
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="login-error-alert">
              {error}
            </div>
          )}

          {/* Email Input */}
          <div className="field-group">
            <label className="field-label" htmlFor="officer-email">Official Officer Email</label>
            <div className="input-with-icon">
              <input
                id="officer-email"
                type="email"
                placeholder="admin@nivaran.in"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="text-input-field"
              />
              <span className="trailing-icon">
                <MailIcon size={18} />
              </span>
            </div>
          </div>

          {/* Password Input */}
          <div className="field-group">
            <label className="field-label" htmlFor="officer-password">Password</label>
            <div className="input-with-icon">
              <input
                id="officer-password"
                type="password"
                placeholder="••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="text-input-field"
                onKeyDown={(e) => e.key === "Enter" && handleLogin()}
              />
              <span className="trailing-icon">
                <LockIcon size={18} />
              </span>
            </div>
          </div>

          {/* Access Button */}
          <button
            type="button"
            onClick={() => handleLogin()}
            disabled={loading}
            className="btn-access-control"
          >
            {loading ? "Authenticating..." : "Access Control Center"}
          </button>

          {/* 1-Click Juror Credentials Section */}
          <div className="test-credentials-box">
            <div className="test-creds-title">
              <LightningIcon size={13} /> 1-CLICK TEST CREDENTIALS (FOR JUROR EVALUATION):
            </div>
            <div className="test-creds-grid">
              <button
                type="button"
                className="cred-btn"
                onClick={() => {
                  setEmail("admin@nivaran.in");
                  setPassword("admin123");
                  handleLogin("admin@nivaran.in", "admin123");
                }}
              >
                <CrownIcon size={15} /> Global Admin
              </button>
              <button
                type="button"
                className="cred-btn"
                onClick={() => {
                  setEmail("water@nivaran.in");
                  setPassword("department123");
                  handleLogin("water@nivaran.in", "department123");
                }}
              >
                <WaterIcon size={15} /> Water Board
              </button>
              <button
                type="button"
                className="cred-btn"
                onClick={() => {
                  setEmail("electricity@nivaran.in");
                  setPassword("department123");
                  handleLogin("electricity@nivaran.in", "department123");
                }}
              >
                <LightningIcon size={15} /> Electricity Board
              </button>
              <button
                type="button"
                className="cred-btn"
                onClick={() => {
                  setEmail("roads@nivaran.in");
                  setPassword("department123");
                  handleLogin("roads@nivaran.in", "department123");
                }}
              >
                <RoadIcon size={15} /> Roads Dept
              </button>
              <button
                type="button"
                className="cred-btn cred-btn-full"
                onClick={() => {
                  setEmail("municipality@nivaran.in");
                  setPassword("department123");
                  handleLogin("municipality@nivaran.in", "department123");
                }}
              >
                <LandmarkIcon size={15} /> Municipality
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* SCOPED STYLES */}
      <style>{`
        * { box-sizing: border-box; }

        .login-screen-wrapper {
          min-height: 100vh;
          width: 100vw;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #faf8f5;
          padding: 30px 20px;
          font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        }

        .login-dual-layout {
          width: 100%;
          max-width: 980px;
          display: grid;
          grid-template-columns: 1fr 1fr;
          align-items: center;
          gap: 60px;
          margin: 0 auto;
        }

        /* LEFT HERITAGE COLUMN */
        .heritage-left-column {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          gap: 22px;
          width: 100%;
        }

        .heritage-kicker {
          font-size: 11.5px;
          font-weight: 700;
          letter-spacing: 2px;
          text-transform: uppercase;
          color: #a1321d;
        }

        .heritage-medallion {
          width: 320px;
          height: 320px;
          border-radius: 50%;
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          background: #faf8f5;
          box-shadow: 0 10px 30px rgba(15, 32, 66, 0.05);
        }

        .heritage-map-art {
          width: 100%;
          height: 100%;
          object-fit: cover;
          border-radius: 50%;
          display: block;
          transform: scale(1.23);
        }

        /* Minimalist Civic Pulse Animation Nodes */
        .civic-pulse-node {
          position: absolute;
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #d4a359;
          box-shadow: 0 0 6px rgba(212, 163, 89, 0.9);
          pointer-events: none;
          z-index: 3;
        }

        .civic-pulse-node::after {
          content: '';
          position: absolute;
          top: -5px;
          left: -5px;
          right: -5px;
          bottom: -5px;
          border-radius: 50%;
          border: 1.5px solid rgba(212, 163, 89, 0.75);
          animation: beaconPing 3s cubic-bezier(0, 0, 0.2, 1) infinite;
        }

        .node-delhi { top: 27%; left: 41%; animation-delay: 0s; }
        .node-mumbai { top: 59%; left: 32%; animation-delay: 0.8s; }
        .node-bengaluru { top: 77%; left: 42%; animation-delay: 1.6s; }
        .node-kolkata { top: 45%; left: 63%; animation-delay: 2.4s; }

        @keyframes beaconPing {
          0% { transform: scale(0.6); opacity: 0.9; }
          75%, 100% { transform: scale(2.2); opacity: 0; }
        }

        .heritage-divider {
          width: 260px;
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .divider-line {
          height: 1px;
          flex: 1;
          background: #d4a359;
          opacity: 0.6;
        }

        .divider-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #d4a359;
        }

        .heritage-branding {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
        }

        .heritage-title {
          font-family: 'Marcellus', Georgia, serif;
          font-size: 26px;
          font-weight: 800;
          color: #0f2042;
          letter-spacing: 3px;
          margin: 0;
        }

        .heritage-subtitle {
          font-size: 13px;
          color: #64748b;
          margin: 0;
          font-weight: 500;
        }

        /* RIGHT CARD COLUMN */
        .login-card-container {
          background: #fffefb;
          border: 1px solid rgba(212, 163, 89, 0.32);
          border-radius: 12px;
          padding: 38px 32px;
          box-shadow: 0 16px 44px rgba(15, 32, 66, 0.06);
          position: relative;
          width: 100%;
          max-width: 440px;
          margin: 0 auto;
        }

        /* CORNER BRACKETS */
        .corner-bracket {
          position: absolute;
          width: 12px;
          height: 12px;
          border: 2px solid #c5a059;
          pointer-events: none;
        }

        .corner-tl { top: 8px; left: 8px; border-right: none; border-bottom: none; }
        .corner-tr { top: 8px; right: 8px; border-left: none; border-bottom: none; }
        .corner-bl { bottom: 8px; left: 8px; border-right: none; border-top: none; }
        .corner-br { bottom: 8px; right: 8px; border-left: none; border-top: none; }

        /* CARD HEADER */
        .card-top-header {
          text-align: center;
          margin-bottom: 24px;
        }

        .brand-logo-row {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          margin-bottom: 6px;
        }

        .brand-pillar-icon {
          display: flex;
          align-items: center;
          gap: 2px;
          height: 24px;
        }

        .pillar-gold-left, .pillar-gold-right {
          width: 2.5px;
          height: 18px;
          background: #d4a359;
          border-radius: 1px;
        }

        .pillar-terracotta-center {
          width: 4px;
          height: 24px;
          background: #942b19;
          border-radius: 1px;
        }

        .brand-heading {
          font-family: 'Marcellus', Georgia, serif;
          font-size: 24px;
          font-weight: 800;
          color: #0f2042;
          letter-spacing: 2px;
          margin: 0;
          display: flex;
          align-items: baseline;
          gap: 8px;
        }

        .brand-sanskrit-tag {
          font-size: 16px;
          font-family: system-ui, sans-serif;
          color: #c84b31;
          font-weight: 600;
          letter-spacing: 0;
        }

        .card-subheading {
          font-size: 11px;
          font-weight: 700;
          color: #64748b;
          letter-spacing: 1.4px;
          text-transform: uppercase;
        }

        .login-error-alert {
          background: #fef2f2;
          border: 1px solid #fecaca;
          color: #dc2626;
          border-radius: 6px;
          padding: 8px 12px;
          font-size: 13px;
          margin-bottom: 16px;
          text-align: center;
        }

        /* FORM CONTROLS */
        .field-group {
          margin-bottom: 16px;
        }

        .field-label {
          display: block;
          font-size: 12.5px;
          font-weight: 600;
          color: #334155;
          margin-bottom: 6px;
        }

        .input-with-icon {
          position: relative;
          display: flex;
          align-items: center;
        }

        .text-input-field {
          width: 100%;
          height: 44px;
          padding: 10px 40px 10px 14px;
          background: #ffffff;
          border: 1px solid #cbd5e1;
          border-radius: 6px;
          font-size: 13.5px;
          color: #0f172a;
          outline: none;
          transition: border-color 0.2s ease, box-shadow 0.2s ease;
        }

        .text-input-field:focus {
          border-color: #2563eb;
          box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
        }

        .trailing-icon {
          position: absolute;
          right: 12px;
          display: flex;
          align-items: center;
          pointer-events: none;
        }

        .btn-access-control {
          width: 100%;
          height: 46px;
          background: #942b19;
          color: #ffffff;
          border: none;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
          transition: background 0.2s ease, transform 0.1s ease;
          margin-top: 6px;
          margin-bottom: 20px;
        }

        .btn-access-control:hover:not(:disabled) {
          background: #7e2314;
        }

        .btn-access-control:active:not(:disabled) {
          transform: translateY(1px);
        }

        /* TEST CREDENTIALS */
        .test-credentials-box {
          border-top: 1px dashed rgba(212, 163, 89, 0.4);
          padding-top: 16px;
        }

        .test-creds-title {
          font-size: 11px;
          font-weight: 700;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 12px;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .test-creds-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
        }

        .cred-btn {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          padding: 9px 12px;
          font-size: 12.5px;
          font-weight: 600;
          color: #1e293b;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          cursor: pointer;
          transition: all 0.2s ease;
          white-space: nowrap;
        }

        .cred-btn:hover {
          border-color: #d4a359;
          background: #fffcf7;
          box-shadow: 0 2px 6px rgba(15, 32, 66, 0.04);
        }

        .cred-btn-full {
          grid-column: span 2;
        }

        /* RESPONSIVE */
        @media (max-width: 840px) {
          .login-dual-layout {
            grid-template-columns: 1fr;
            gap: 36px;
          }
          .heritage-medallion {
            width: 270px;
            height: 270px;
          }
        }
      `}</style>
    </div>
  );
}
