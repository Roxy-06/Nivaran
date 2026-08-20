import { useEffect, useState } from "react";
import API from "../services/api";

type Issue = {
  serial: string;
  priority: "Low" | "Medium" | "High";
  status: "Reported" | "In Progress" | "Resolved";
  message?: string;
  areaImpact?: string[] | { schools?: number; hospitals?: number; residential?: number };
  location?: { lat: number; lon: number };
  media?: string | null;
  voice_audio?: string | null;
  detected_language?: string | null;
  transcript?: string | null;
  translation?: string | null;
  reportedAt?: string;
};

export default function DepartmentDashboard() {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);

  useEffect(() => {
    API.get("/department/issues")
      .then((res) => setIssues(res.data))
      .finally(() => setLoading(false));
  }, []);

  const updateStatus = async (serial: string, status: Issue["status"]) => {
    await API.patch(`/department/issues/${serial}`, { status });

    setIssues((prev) =>
      prev.map((i) =>
        i.serial === serial ? { ...i, status } : i
      )
    );
  };

  /* 📊 STATS */
  const total = issues.length;
  const pending = issues.filter(i => i.status === "Reported").length;
  const inProgress = issues.filter(i => i.status === "In Progress").length;
  const resolved = issues.filter(i => i.status === "Resolved").length;
  const highPriority = issues.filter(i => i.priority === "High").length;

  return (
    <div className="page">
      <h1>Department Dashboard</h1>
      <p className="subtitle">Issues assigned to your department</p>

      {/* STATS */}
      <div className="stats">
        <div className="stat"><span>Total</span><b>{total}</b></div>
        <div className="stat pending"><span>Pending</span><b>{pending}</b></div>
        <div className="stat progress"><span>In Progress</span><b>{inProgress}</b></div>
        <div className="stat resolved"><span>Resolved</span><b>{resolved}</b></div>
        <div className="stat high"><span>High Priority</span><b>{highPriority}</b></div>
      </div>

      {/* TABLE */}
      {loading ? (
        <p>Loading issues…</p>
      ) : (
        <div className="card">
          <div className="head">
            <span>Serial</span>
            <span>Priority</span>
            <span>Status</span>
          </div>

          {issues.map((i) => (
            <div
              key={i.serial}
              className={`row ${i.status === "Resolved" ? "resolved-row" : ""}`}
              onClick={() => setSelectedIssue(i)}
            >
              <b>{i.serial}</b>

              {/* READ-ONLY PRIORITY */}
              <span className={`badge ${i.priority.toLowerCase()}`}>
                {i.priority}
              </span>

              {/* STATUS EDITABLE */}
              <select
                value={i.status}
                onClick={(e) => e.stopPropagation()}
                onChange={(e) =>
                  updateStatus(i.serial, e.target.value as Issue["status"])
                }
              >
                <option>Reported</option>
                <option>In Progress</option>
                <option>Resolved</option>
              </select>
            </div>
          ))}
        </div>
      )}

      {/* DETAILS MODAL */}
      {selectedIssue && (
        <div className="backdrop" onClick={() => setSelectedIssue(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Issue Details</h2>

            <p><b>Serial:</b> {selectedIssue.serial}</p>
            <p><b>Status:</b> {selectedIssue.status}</p>
            <p><b>Priority:</b> {selectedIssue.priority}</p>

            {selectedIssue.voice_audio && (
              <div style={{ marginTop: 12, marginBottom: 12, padding: 12, background: "#eff6ff", borderRadius: 8 }}>
                <b style={{ color: "#1e40af", display: "block", marginBottom: 6 }}>🎙️ Citizen Voice Recording:</b>
                <audio
                  src={`http://localhost:8000/${selectedIssue.voice_audio}`}
                  controls
                  style={{ width: "100%", height: 36 }}
                />
              </div>
            )}

            {selectedIssue.transcript && selectedIssue.transcript !== selectedIssue.message && (
              <div style={{ marginTop: 10, padding: 10, background: "#fdf4ff", borderRadius: 8 }}>
                <b style={{ color: "#86198f" }}>
                  Original Transcript ({selectedIssue.detected_language ? selectedIssue.detected_language.toUpperCase() : "REGIONAL"}):
                </b>
                <p style={{ margin: "4px 0 0 0", color: "#4c0519" }}>{selectedIssue.transcript}</p>
              </div>
            )}

            {selectedIssue.message && (
              <p><b>Description (Standardized):</b> {selectedIssue.translation || selectedIssue.message}</p>
            )}

            {Array.isArray(selectedIssue.areaImpact) ? (
              <p><b>Nearby:</b> {selectedIssue.areaImpact.join(", ")}</p>
            ) : selectedIssue.areaImpact && typeof selectedIssue.areaImpact === "object" ? (
              <p>
                <b>Nearby:</b>{" "}
                {Object.entries(selectedIssue.areaImpact)
                  .filter(([_, count]) => (count as number) > 0)
                  .map(([type, count]) => `${count} ${type}`)
                  .join(", ") || "None"}
              </p>
            ) : null}

            {selectedIssue.location && (
              <p>
                <b>Location:</b>{" "}
                {selectedIssue.location.lat}, {selectedIssue.location.lon}
              </p>
            )}

            {selectedIssue.media && (
              <img
                src={`http://localhost:8000/${selectedIssue.media}`}
                style={{ width: "100%", borderRadius: 8, marginTop: 10 }}
              />
            )}

            {selectedIssue.reportedAt && (
              <p>
                <b>Reported:</b>{" "}
                {new Date(selectedIssue.reportedAt).toLocaleString()}
              </p>
            )}

            <button onClick={() => setSelectedIssue(null)}>Close</button>
          </div>
        </div>
      )}

      {/* STYLES */}
      <style>{`
        .page {
          padding: 40px;
          max-width: 1100px;
          margin: auto;
          font-family: system-ui;
        }

        .subtitle { color: #64748b; }

        .stats {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
          gap: 16px;
          margin: 24px 0;
        }

        .stat {
          background: white;
          padding: 14px;
          border-radius: 10px;
          box-shadow: 0 6px 20px rgba(0,0,0,0.05);
        }

        .stat b { font-size: 24px; }
        .pending { border-left: 4px solid #2563eb; }
        .progress { border-left: 4px solid #d97706; }
        .resolved { border-left: 4px solid #16a34a; }
        .high { border-left: 4px solid #dc2626; }

        .card {
          background: white;
          border-radius: 12px;
          box-shadow: 0 10px 30px rgba(0,0,0,0.05);
        }

        .head, .row {
          display: grid;
          grid-template-columns: 2fr 1fr 1fr;
          padding: 14px 20px;
          align-items: center;
        }

        .head {
          background: #f1f5f9;
          font-weight: 600;
        }

        .row {
          border-top: 1px solid #e5e7eb;
          cursor: pointer;
        }

        /* ✅ GREYISH RESOLVED ROW */
        .resolved-row {
          background: #f3f4f6;
          opacity: 0.75;
        }

        .resolved-row b {
          color: #6b7280;
        }

        .resolved-row select {
          background: #e5e7eb;
          color: #374151;
        }

        .badge {
          padding: 4px 10px;
          border-radius: 999px;
          font-size: 12px;
          font-weight: 600;
          width: fit-content;
        }

        .badge.high { background: #fee2e2; color: #991b1b; }
        .badge.medium { background: #fef3c7; color: #92400e; }
        .badge.low { background: #e0f2fe; color: #0369a1; }

        select {
          padding: 6px 10px;
          border-radius: 6px;
        }

        .backdrop {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.45);
          display: flex;
          justify-content: center;
          align-items: center;
        }

        .modal {
          background: white;
          padding: 24px;
          border-radius: 12px;
          max-width: 520px;
          width: 90%;
          max-height: 80vh;
          overflow-y: auto;
        }

        .modal button {
          margin-top: 16px;
          padding: 8px 14px;
          background: #2563eb;
          color: white;
          border: none;
          border-radius: 6px;
          cursor: pointer;
        }
      `}</style>
    </div>
  );
}
