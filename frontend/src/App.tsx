import { useState } from "react";
import IssueForm from "./components/IssueForm";
import StatusCheck from "./components/StatusCheck";
import { AudioWaveIcon, PinIcon } from "./components/Icons";

export default function App() {
  const [activeTab, setActiveTab] = useState<"report" | "track">("report");

  // Detailed SVG representation of a traditional Indian Mandala decoration
  const MandalaSVG = () => (
    <svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="100" cy="100" r="95" stroke="var(--heritage-gold)" strokeWidth="0.5" strokeDasharray="3 3" />
      <circle cx="100" cy="100" r="85" stroke="var(--heritage-gold)" strokeWidth="0.75" />
      <circle cx="100" cy="100" r="70" stroke="var(--heritage-gold)" strokeWidth="0.5" strokeDasharray="1 4" />
      <circle cx="100" cy="100" r="55" stroke="var(--heritage-gold)" strokeWidth="1" />
      <circle cx="100" cy="100" r="30" stroke="var(--heritage-gold)" strokeWidth="0.75" />
      <circle cx="100" cy="100" r="10" stroke="var(--heritage-gold)" strokeWidth="1.5" />

      {/* Concentric Petals */}
      {Array.from({ length: 24 }).map((_, i) => {
        const angle = (i * 360) / 24;
        return (
          <path
            key={`outer-${i}`}
            d={`M 100 100 L 100 15 A 8 8 0 0 1 105 30 L 100 100`}
            transform={`rotate(${angle} 100 100)`}
            stroke="var(--heritage-gold)"
            strokeWidth="0.5"
            opacity="0.75"
          />
        );
      })}

      {/* Inner Petals */}
      {Array.from({ length: 12 }).map((_, i) => {
        const angle = (i * 360) / 12 + 15;
        return (
          <path
            key={`inner-${i}`}
            d={`M 100 100 L 100 45 A 5 5 0 0 1 103 55 L 100 100`}
            transform={`rotate(${angle} 100 100)`}
            stroke="var(--heritage-gold)"
            strokeWidth="0.75"
            opacity="0.85"
          />
        );
      })}

      {/* Decorative Star points */}
      {Array.from({ length: 8 }).map((_, i) => {
        const angle = (i * 360) / 8;
        return (
          <line
            key={`line-${i}`}
            x1="100"
            y1="100"
            x2="100"
            y2="7"
            transform={`rotate(${angle} 100 100)`}
            stroke="var(--terracotta-red)"
            strokeWidth="0.75"
            opacity="0.4"
          />
        );
      })}
    </svg>
  );

  return (
    <div className="app-container">
      {/* Slow rotating Mandalas in the background for visual depth */}
      <div className="mandala-bg">
        <MandalaSVG />
      </div>
      <div className="mandala-bg-left">
        <MandalaSVG />
      </div>

      <header className="portal-header">
        <div className="header-content">
          <div className="brand-wrapper">
            <div className="brand-pillar"></div>
            <h1 className="brand-title">
              NIVARAN <span className="brand-subtitle-sanskrit">निवारण</span>
            </h1>
          </div>
          <div className="nav-badges">
            <span className="badge-heritage">
              <AudioWaveIcon size={14} color="var(--terracotta-red)" />
              Multilingual Voice AI
            </span>
          </div>
        </div>
      </header>

      <section className="hero-sec">
        <span className="hero-slogan">AI-Powered Citizen Remediation Portal</span>
        <h2 className="hero-main-title">Digital Governance Redefined</h2>
        <p className="hero-desc">
          Describe public grievances in your local dialect. Our multilingual system auto-transcribes your voice, calculates department routing, maps geolocation coordinates, and prioritizes civic remediation for official resolution.
        </p>
      </section>

      <nav className="mode-navigator">
        <button
          className={`tab-btn ${activeTab === "report" ? "active" : ""}`}
          onClick={() => setActiveTab("report")}
        >
          <AudioWaveIcon size={16} /> File Report
        </button>
        <nav style={{ width: "16px" }}></nav>
        <button
          className={`tab-btn ${activeTab === "track" ? "active" : ""}`}
          onClick={() => setActiveTab("track")}
        >
          <PinIcon size={16} /> Track Status
        </button>
      </nav>

      <main className="tab-contents">
        {activeTab === "report" ? (
          <div className="animate-fade-in-up">
            <IssueForm />
          </div>
        ) : (
          <div className="animate-fade-in-up">
            <StatusCheck />
          </div>
        )}
      </main>

      <footer className="portal-footer">
        <div className="footer-decorator"></div>
        <p>&copy; {new Date().getFullYear()} Nivaran AI. All rights reserved.</p>
        <p style={{ fontSize: "11px", marginTop: "4px" }}>
          Incorporating Traditional Indian Art, Heritage Architecture Accents, and Advanced Artificial Intelligence Systems.
        </p>
      </footer>
    </div>
  );
}
