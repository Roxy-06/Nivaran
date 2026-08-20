import { useEffect, useState } from "react";
import API from "../services/api";

type Issue = {
  serial: string;
  department: string;
  priority: "Low" | "Medium" | "High";
  status: "Reported" | "In Progress" | "Resolved";
  message?: string;
  areaImpact?: string[] | { schools?: number; hospitals?: number; residential?: number };
  location?: {
    lat: number;
    lon: number;
    address?: string;
  };
  media?: string | null;
  voice_audio?: string | null;
  detected_language?: string | null;
  transcript?: string | null;
  translation?: string | null;
  reportedAt?: string;
};

const priorityOrder = {
  High: 1,
  Medium: 2,
  Low: 3,
};

export default function AdminDashboard() {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);
  const [departmentFilter, setDepartmentFilter] = useState("All");

  useEffect(() => {
    API.get("/admin/issues")
      .then((res) => {
        const sorted = res.data.sort(
          (a: Issue, b: Issue) =>
            priorityOrder[a.priority] - priorityOrder[b.priority]
        );
        setIssues(sorted);
      })
      .finally(() => setLoading(false));
  }, []);

  const updateIssue = async (
    serial: string,
    updates: Partial<Pick<Issue, "status" | "priority">>
  ) => {
    await API.patch(`/admin/issues/${serial}`, updates);

    setIssues((prev) =>
      prev
        .map((i) => (i.serial === serial ? { ...i, ...updates } : i))
        .sort(
          (a, b) =>
            priorityOrder[a.priority] - priorityOrder[b.priority]
        )
    );
  };

  /* 🔍 FILTERED ISSUES */
  const filteredIssues =
    departmentFilter === "All"
      ? issues
      : issues.filter((i) => i.department === departmentFilter);

  /* 📊 STATS (based on filtered list) */
  const total = filteredIssues.length;
  const pending = filteredIssues.filter(i => i.status === "Reported").length;
  const inProgress = filteredIssues.filter(i => i.status === "In Progress").length;
  const resolved = filteredIssues.filter(i => i.status === "Resolved").length;
  const highPriority = filteredIssues.filter(i => i.priority === "High").length;

  /* 🏢 UNIQUE DEPARTMENTS */
  const departments = Array.from(
    new Set(issues.map(i => i.department))
  );

  return (
    <div className="admin-page">
      <h1>Admin Dashboard</h1>
      <p className="subtitle">Manage all civic issues</p>

      {/* 🔍 FILTER */}
      <div className="filter-bar">
        <label>Filter by Department:</label>
        <select
          value={departmentFilter}
          onChange={(e) => setDepartmentFilter(e.target.value)}
        >
          <option value="All">All</option>
          {departments.map((d) => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>
      </div>

      {/* 📊 STATS */}
      <div className="stats">
        <div className="stat-card"><span>Total</span><b>{total}</b></div>
        <div className="stat-card pending"><span>Pending</span><b>{pending}</b></div>
        <div className="stat-card progress"><span>In Progress</span><b>{inProgress}</b></div>
        <div className="stat-card resolved"><span>Resolved</span><b>{resolved}</b></div>
        <div className="stat-card high"><span>High Priority</span><b>{highPriority}</b></div>
      </div>

      {/* 📋 TABLE */}
      {loading ? (
        <p>Loading issues...</p>
      ) : (
        <div className="card">
          <div className="table-head">
            <span>Serial</span>
            <span>Department</span>
            <span>Priority</span>
            <span>Status</span>
          </div>

          {filteredIssues.map((i) => (
           <div
  key={i.serial}
  className={`table-row ${i.status === "Resolved" ? "resolved-row" : ""}`}
  onClick={() => setSelectedIssue(i)}
>

              <span className="serial">{i.serial}</span>
              <span>{i.department}</span>

              <select
                value={i.priority}
                onClick={(e) => e.stopPropagation()}
                onChange={(e) =>
                  updateIssue(i.serial, {
                    priority: e.target.value as Issue["priority"],
                  })
                }
                className={`select ${i.priority.toLowerCase()}`}
              >
                <option>High</option>
                <option>Medium</option>
                <option>Low</option>
              </select>

              <select
                value={i.status}
                onClick={(e) => e.stopPropagation()}
                onChange={(e) =>
                  updateIssue(i.serial, {
                    status: e.target.value as Issue["status"],
                  })
                }
                className="select"
              >
                <option>Reported</option>
                <option>In Progress</option>
                <option>Resolved</option>
              </select>
            </div>
          ))}
        </div>
      )}

      {/* 🪟 MODAL */}
      {selectedIssue && (
        <div className="modal-backdrop" onClick={() => setSelectedIssue(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Issue Details</h2>

            <p><b>Serial:</b> {selectedIssue.serial}</p>
            <p><b>Department:</b> {selectedIssue.department}</p>
            <p><b>Status:</b> {selectedIssue.status}</p>
            <p><b>Priority:</b> {selectedIssue.priority}</p>

            {selectedIssue.voice_audio && (
              <div style={{ marginTop: 12, marginBottom: 12, padding: 12, background: "#eff6ff", borderRadius: 8 }}>
                <b style={{ color: "#1e40af", display: "block", marginBottom: 6 }}>🎙️ Citizen Voice Recording:</b>
                <audio
                  src={`http://localhost:8000/${selectedIssue.voice_audio.replace(/\\/g, "/")}`}
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
              <p>
                <b>Nearby Places:</b>{" "}
                {selectedIssue.areaImpact.join(", ")}
              </p>
            ) : selectedIssue.areaImpact && typeof selectedIssue.areaImpact === "object" ? (
              <p>
                <b>Nearby Places:</b>{" "}
                {Object.entries(selectedIssue.areaImpact)
                  .filter(([_, count]) => (count as number) > 0)
                  .map(([type, count]) => `${count} ${type}`)
                  .join(", ") || "None"}
              </p>
            ) : null}

            {selectedIssue.location && (
              <div style={{ marginTop: 10, marginBottom: 10, padding: 12, background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8 }}>
                <b style={{ color: "#0f172a" }}>📍 Location & Address:</b>
                {selectedIssue.location.address && (
                  <p style={{ margin: "4px 0", color: "#1e293b", fontWeight: 500, fontSize: 13, lineHeight: 1.4 }}>
                    {selectedIssue.location.address}
                  </p>
                )}
                <div style={{ marginTop: 4, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8, fontSize: 12, color: "#64748b" }}>
                  <span>Coordinates: {selectedIssue.location.lat.toFixed(5)}° N, {selectedIssue.location.lon.toFixed(5)}° E</span>
                  <a
                    href={`https://www.google.com/maps?q=${selectedIssue.location.lat},${selectedIssue.location.lon}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: "#2563eb", fontWeight: 600, textDecoration: "none" }}
                  >
                    🗺️ View on Google Maps ↗
                  </a>
                </div>
              </div>
            )}

            {selectedIssue.media && (
              <img
                src={`http://localhost:8000/${selectedIssue.media}`}
                alt="Issue"
                style={{ width: "100%", borderRadius: 8, marginTop: 10 }}
              />
            )}

            <button onClick={() => setSelectedIssue(null)}>Close</button>
          </div>
        </div>
      )}

      {/* 🎨 STYLES */}
      <style>{`
        .admin-page {
          padding: 40px;
          max-width: 1200px;
          margin: auto;
          font-family: system-ui;
        }

        .subtitle {
          color: #64748b;
          margin-bottom: 16px;
        }

        .filter-bar {
          display: flex;
          gap: 12px;
          align-items: center;
          margin-bottom: 20px;
        }

        .filter-bar select {
          padding: 6px 10px;
          border-radius: 6px;
          border: 1px solid #cbd5e1;
        }

        .stats {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
          gap: 16px;
          margin-bottom: 30px;
        }

        .stat-card {
          background: white;
          padding: 16px;
          border-radius: 10px;
          box-shadow: 0 6px 20px rgba(0,0,0,0.06);
        }

        .stat-card b {
          font-size: 26px;
        }

        .stat-card.pending { border-left: 4px solid #2563eb; }
        .stat-card.progress { border-left: 4px solid #d97706; }
        .stat-card.resolved { border-left: 4px solid #16a34a; }
        .stat-card.high { border-left: 4px solid #dc2626; }

        .card {
          background: white;
          border-radius: 12px;
          box-shadow: 0 10px 30px rgba(0,0,0,0.05);
        }

        .resolved-row {
  background: #f3f4f6;
  opacity: 0.7;
}

.resolved-row span,
.resolved-row select {
  color: #6b7280;
}


        .table-head, .table-row {
          display: grid;
          grid-template-columns: 2fr 2fr 1fr 1fr;
          padding: 14px 20px;
          align-items: center;
        }

        .table-head {
          background: #f1f5f9;
          font-weight: 600;
        }

        .table-row {
          border-top: 1px solid #e5e7eb;
          cursor: pointer;
        }

        .select {
          padding: 6px 10px;
          border-radius: 6px;
          border: 1px solid #cbd5f5;
        }

        .select.high { background: #fee2e2; }
        .select.medium { background: #fef3c7; }
        .select.low { background: #e0f2fe; }

        .modal-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.45);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 50;
        }

        .modal {
          background: white;
          border-radius: 12px;
          padding: 24px;
          max-width: 520px;
          width: 90%;
        }

        .modal button {
          margin-top: 16px;
          padding: 8px 14px;
          border-radius: 6px;
          border: none;
          background: #2563eb;
          color: white;
          cursor: pointer;
        }
      `}</style>
    </div>
  );
}
