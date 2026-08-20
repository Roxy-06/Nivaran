import { useState } from "react";
import { API } from "../services/api";

export default function IssueForm() {
  const [message, setMessage] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [serial, setSerial] = useState<string | null>(null);
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

  const submitIssue = async () => {
    if (!message || lat === null || lng === null) {
      alert("Please describe the issue and allow location access");
      return;
    }

    try {
      setLoading(true);
      setSerial(null);

      const formData = new FormData();
      formData.append("message", message);
      formData.append("latitude", lat.toString());
      formData.append("longitude", lng.toString());
      if (file) formData.append("file", file);

      const res = await API.post("/issues", formData);
      setSerial(res.data.serial);

      setMessage("");
      setFile(null);
      setLocationReady(false);
      setLat(null);
      setLng(null);
    } catch {
      alert("Submission failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`app ${theme}`}>
      {/* NAVBAR */}
      <header className="navbar">
        <div className="nav-content">
          <h1>Nivaran</h1>
        </div>
      </header>

      {/* MAIN */}
      <main className="main">
        <div className="layout">
          {/* LEFT */}
          <aside className="info">
            <h2>How to report effectively</h2>
            <ul>
              <li>Clearly describe the public problem</li>
              <li>Mention risks to people or infrastructure</li>
              <li>Add photo or video if possible</li>
              <li>Your identity remains anonymous</li>
            </ul>

            <div className="note">
              Your report is securely stored and tracked using a serial number.
            </div>
          </aside>

          {/* RIGHT */}
          <section className="form">
            <h2>Report a Public Issue</h2>

            <textarea
              placeholder="Describe the public issue in detail..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />

            <button
              className={`secondary ${locationReady ? "disabled" : ""}`}
              onClick={useMyLocation}
              disabled={locationReady}
            >
              {locationReady ? " Location Found" : " Use My Location"}
            </button>

            <input
              type="file"
              accept="image/*,video/*"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />

            <button className="primary" onClick={submitIssue} disabled={loading}>
              {loading ? "Submitting..." : "Submit Issue"}
            </button>

            {serial && (
              <div className="success">
                <h3>Issue Submitted Successfully</h3>
                <p className="serial">{serial}</p>
                <p className="hint">
                  Save this serial number to track the issue status.
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
          font-family: system-ui, sans-serif;
        }

        .app.light {
          background: #f8fafc;
          color: #0f172a;
        }

        /* NAVBAR */
        .navbar {
          width: 100%;
          border-bottom: 1px solid #334155;
        }

        .nav-content {
          max-width: 1400px;
          margin: 0 auto;
          padding: 18px 32px;
          display: flex;
          justify-content: space-between;
        }

        .layout {
          max-width: 1400px;
          margin: 40px auto;
          padding: 0 32px;
          display: grid;
          grid-template-columns: 1fr 1.2fr;
          gap: 40px;
        }

        .info, .form {
          background: rgba(255,255,255,0.04);
          padding: 28px;
          border-radius: 12px;
        }

        textarea {
          width: 100%;
          min-height: 150px;
          padding: 14px;
          border-radius: 8px;
          border: 1px solid #64748b;
          background: transparent;
          margin-bottom: 16px;
          color: #000000;    
        }

        button {
          width: 100%;
          padding: 12px;
          border-radius: 8px;
          border: none;
          font-size: 15px;
          cursor: pointer;
        }

        .primary {
          background: #2563eb;
          color: white;
          margin-top: 10px;
        }

        .secondary {
          background: #334155;
          color: white;
          margin-bottom: 10px;
        }

        .secondary.disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .success {
          margin-top: 20px;
          padding: 16px;
          border: 1px solid #22c55e;
          border-radius: 8px;
          text-align: center;
        }

        .serial {
          font-size: 22px;
          font-weight: bold;
        }

        @media (max-width: 900px) {
          .layout {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
