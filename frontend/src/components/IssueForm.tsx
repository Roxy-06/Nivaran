import { useState } from "react";
import { API } from "../services/api";

type FollowUpQuestion = {
  field: string;
  question: string;
};

export default function IssueForm() {
  const [message, setMessage] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [serial, setSerial] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [theme] = useState<"light" | "dark">("light");
  const [locationReady, setLocationReady] = useState(false);
  const [followUpQuestions, setFollowUpQuestions] = useState<FollowUpQuestion[]>([]);
  const [followUpSubmissionId, setFollowUpSubmissionId] = useState<string | null>(null);
  const [followUpAnswers, setFollowUpAnswers] = useState<Record<string, string>>({});

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

  const runFollowUpCheck = async () => {
    if (!message.trim()) {
      setFollowUpQuestions([
        {
          field: "issue_type",
          question: "What kind of civic issue are you reporting?",
        },
      ]);
      return true;
    }

    try {
      const formData = new FormData();
      formData.append("message", message);
      if (lat !== null) formData.append("latitude", lat.toString());
      if (lng !== null) formData.append("longitude", lng.toString());

      const res = await API.post("/issues/follow-up", formData);
      const questions = res.data.questions || [];
      setFollowUpQuestions(questions);
      if (res.data.submission_id) setFollowUpSubmissionId(res.data.submission_id);
      return Boolean(res.data.needs_follow_up);
    } catch {
      setFollowUpQuestions([]);
      return false;
    }
  };

  const sendFollowUpResponses = async () => {
    if (!followUpSubmissionId) return;

    try {
      setLoading(true);

      for (const q of followUpQuestions) {
        const answer = followUpAnswers[q.field] || "";
        await API.post(`/followup/${followUpSubmissionId}/response`, {
          field: q.field,
          answer,
        });
      }

      // fetch status
      const status = await API.get(`/followup/${followUpSubmissionId}`);
      if (status.data && status.data.final_issue_serial) {
        setSerial(status.data.final_issue_serial);

        // reset form
        setMessage("");
        setFile(null);
        setLocationReady(false);
        setLat(null);
        setLng(null);
        setFollowUpQuestions([]);
        setFollowUpSubmissionId(null);
        setFollowUpAnswers({});
      }
    } catch (e) {
      alert("Failed to submit follow-up answers");
    } finally {
      setLoading(false);
    }
  };

  const submitIssue = async () => {
    if (!message || lat === null || lng === null) {
      alert("Please describe the issue and allow location access");
      return;
    }

    try {
      const followUpNeeded = await runFollowUpCheck();
      if (followUpNeeded) {
        return;
      }

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
      setFollowUpQuestions([]);
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
          <h1>CivicPulse</h1>
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
              onChange={(e: any) => setMessage(e.target.value)}
            />

            {followUpQuestions.length > 0 && (
              <div className="followup">
                <h3>Need a little more info</h3>
                {followUpQuestions.map((item: FollowUpQuestion, index: number) => (
                  <div key={`${item.field}-${index}`} style={{ marginBottom: 8 }}>
                    <p>{item.question}</p>
                    <input
                      type="text"
                      value={followUpAnswers[item.field] || ""}
                      onChange={(e) =>
                        setFollowUpAnswers((s) => ({ ...s, [item.field]: e.target.value }))
                      }
                      placeholder="Your answer"
                    />
                  </div>
                ))}

                <button className="primary" onClick={sendFollowUpResponses} disabled={loading}>
                  {loading ? "Sending..." : "Send Answers"}
                </button>
              </div>
            )}

            <button
              className={`secondary ${locationReady ? "disabled" : ""}`}
              onClick={useMyLocation}
              disabled={locationReady}
            >
              {locationReady ? " Location Located" : " Use My Location"}
            </button>

            <input
              type="file"
              accept="image/*,video/*"
              onChange={(e: any) => setFile(e.target.files?.[0] || null)}
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

        .followup {
          margin: 0 0 16px;
          padding: 14px 16px;
          border: 1px solid #f59e0b;
          border-radius: 8px;
          background: rgba(245, 158, 11, 0.08);
        }

        .followup h3 {
          margin: 0 0 10px;
        }

        .followup p {
          margin: 6px 0;
          line-height: 1.5;
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
