import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../services/api";
import GrievanceMap from "../components/GrievanceMap";
import EmergingIssuesView from "../admin/EmergingIssuesView";
import {
  LayersIcon,
  MapIcon,
  TextIcon,
  MicrophoneIcon,
  LinkIcon
} from "../components/Icons";
import { exportGrievancesToCSV } from "../utils/exportCsv";

type Issue = {
  serial: string;
  priority: "Low" | "Medium" | "High";
  status: "Reported" | "In Progress" | "Resolved";
  message?: string;
  areaImpact?: any;
  location?: { lat: number; lon: number; address?: string };
  media?: string | null;
  voice_audio?: string | null;
  detected_language?: string | null;
  transcript?: string | null;
  translation?: string | null;
  reportedAt?: string;
  cluster_id?: string;
};

export default function DepartmentDashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<"clusters" | "map" | "feed">("clusters");
  const [issues, setIssues] = useState<Issue[]>([]);
  const [clusters, setClusters] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);

  const deptName = localStorage.getItem("department") || "Municipal Officer";
  const userEmail = localStorage.getItem("email") || "officer@nivaran.in";

  const fetchData = async () => {
    try {
      setLoading(true);
      const [issuesRes, clustersRes] = await Promise.all([
        API.get("/department/issues"),
        API.get("/issues/clusters")
      ]);
      setIssues(Array.isArray(issuesRes.data) ? issuesRes.data : []);
      setClusters(Array.isArray(clustersRes.data) ? clustersRes.data : []);
    } catch (err) {
      console.error("Failed to load department data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const handleLogout = () => {
    localStorage.clear();
    navigate("/", { replace: true });
  };

  const updateStatus = async (serial: string, status: Issue["status"]) => {
    await API.patch(`/department/issues/${serial}`, { status });
    setIssues((prev) =>
      prev.map((i) => (i.serial === serial ? { ...i, status } : i))
    );
  };

  /* Stats */
  const total = issues.length;
  const totalClusters = clusters.length;
  const pending = issues.filter((i) => i.status === "Reported").length;
  const inProgress = issues.filter((i) => i.status === "In Progress").length;
  const resolved = issues.filter((i) => i.status === "Resolved").length;
  const highPriority = issues.filter((i) => i.priority === "High").length;

  return (
    <div className="dashboard-container">
      {/* HEADER */}
      <header className="portal-header">
        <div className="header-content">
          <div className="brand-wrapper">
            <div className="brand-pillar"></div>
            <div>
              <h1 className="brand-title">
                NIVARAN <span className="brand-subtitle-sanskrit">निवारण</span>
              </h1>
              <span style={{ fontSize: "11px", color: "var(--text-muted)", letterSpacing: "1px", textTransform: "uppercase", fontWeight: 600 }}>
                {deptName} Remediation Portal
              </span>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
            <span style={{ fontSize: "12px", background: "rgba(197, 160, 89, 0.12)", border: "1px solid var(--border-gold)", padding: "4px 10px", borderRadius: "20px", color: "var(--indigo-deep)", fontWeight: 600 }}>
              🏛️ {deptName} ({userEmail})
            </span>
            <button
              onClick={handleLogout}
              className="btn-heritage-secondary"
              style={{ padding: "4px 12px", fontSize: "12px" }}
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      {/* CONTENT */}
      <main style={{ maxWidth: "1300px", margin: "24px auto", padding: "0 24px", width: "100%" }}>
        {/* TABS */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px", flexWrap: "wrap", gap: "16px" }}>
          <div className="dash-nav-tabs">
            <button
              className={`dash-nav-btn ${activeTab === "clusters" ? "active" : ""}`}
              onClick={() => setActiveTab("clusters")}
            >
              <LayersIcon size={16} /> Emerging Department Clusters ({clusters.length})
            </button>
            <button
              className={`dash-nav-btn ${activeTab === "map" ? "active" : ""}`}
              onClick={() => setActiveTab("map")}
            >
              <MapIcon size={16} /> Jurisdiction Map
            </button>
            <button
              className={`dash-nav-btn ${activeTab === "feed" ? "active" : ""}`}
              onClick={() => setActiveTab("feed")}
            >
              <TextIcon size={16} /> Department Queue ({issues.length})
            </button>
          </div>

          <div>
            <button
              type="button"
              className="btn-heritage-secondary"
              style={{ padding: "6px 14px", fontSize: "12.5px", display: "flex", alignItems: "center", gap: "6px" }}
              onClick={() => exportGrievancesToCSV(issues, `nivaran_${deptName.toLowerCase().replace(/\s+/g, "_")}_grievances`)}
              title="Download CSV report of department complaints"
            >
              📥 Export
            </button>
          </div>
        </div>

        {/* STATS */}
        <div className="stats-grid">
          <div className="stat-card-heritage total">
            <span>Department Reports</span>
            <b>{total}</b>
          </div>
          <div className="stat-card-heritage clusters">
            <span>Macro Clusters</span>
            <b>{totalClusters}</b>
          </div>
          <div className="stat-card-heritage pending">
            <span>Pending Action</span>
            <b>{pending}</b>
          </div>
          <div className="stat-card-heritage progress">
            <span>Work In Progress</span>
            <b>{inProgress}</b>
          </div>
          <div className="stat-card-heritage resolved">
            <span>Resolved</span>
            <b>{resolved}</b>
          </div>
          <div className="stat-card-heritage high">
            <span>High Priority Emergencies</span>
            <b>{highPriority}</b>
          </div>
        </div>

        {/* TAB 1: CLUSTERS */}
        {activeTab === "clusters" && (
          <EmergingIssuesView clusters={clusters} onRefresh={fetchData} />
        )}

        {/* TAB 2: MAP */}
        {activeTab === "map" && (
          <div className="card-jali" style={{ padding: "20px" }}>
            <h3 style={{ fontFamily: "Marcellus, serif", color: "var(--indigo-deep)", margin: "0 0 16px 0" }}>
              {deptName} Incident Density & Hotspots
            </h3>
            <GrievanceMap
              issues={issues}
              clusters={clusters}
              onSelectIssue={(issue) => setSelectedIssue(issue)}
            />
          </div>
        )}

        {/* TAB 3: QUEUE */}
        {activeTab === "feed" && (
          <div style={{ animation: "fadeInUp 0.4s ease" }}>
            {loading ? (
              <div style={{ textAlign: "center", padding: "40px", color: "var(--text-muted)" }}>Loading records...</div>
            ) : (
              <div className="heritage-table-container">
                <div className="heritage-table-head" style={{ gridTemplateColumns: "1.8fr 1fr 1fr 2.5fr" }}>
                  <span>Serial & Cluster</span>
                  <span>Priority</span>
                  <span>Resolution Status</span>
                  <span>Brief / Location</span>
                </div>

                {issues.map((i) => {
                  const isResolved = i.status === "Resolved";
                  return (
                    <div
                      key={i.serial}
                      className={`heritage-table-row ${isResolved ? "resolved-row" : ""}`}
                      style={{ gridTemplateColumns: "1.8fr 1fr 1fr 2.5fr" }}
                      onClick={() => setSelectedIssue(i)}
                    >
                      <div>
                        <strong style={{ color: "var(--indigo-deep)", fontFamily: "Marcellus, serif" }}>{i.serial}</strong>
                        {i.cluster_id && (
                          <span style={{ display: "block", fontSize: "11px", fontFamily: "monospace", color: "var(--heritage-gold-dark)" }}>
                            {i.cluster_id}
                          </span>
                        )}
                      </div>

                      <span className={`tag-badge ${(i.priority || "low").toLowerCase()}`}>
                        {i.priority || "Low"}
                      </span>

                      <select
                        value={i.status}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => updateStatus(i.serial, e.target.value as Issue["status"])}
                        style={{ padding: "4px 8px", borderRadius: "6px", border: "1px solid var(--border-gold)", fontSize: "12px", outline: "none" }}
                      >
                        <option value="Reported">Reported</option>
                        <option value="In Progress">In Progress</option>
                        <option value="Resolved">Resolved</option>
                      </select>

                      <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", color: "var(--text-main)", fontSize: "13px" }}>
                        {i.translation || i.message}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </main>

      {/* DETAIL MODAL */}
      {selectedIssue && (
        <div className="modal-backdrop" onClick={() => setSelectedIssue(null)}>
          <div className="modal-content-heritage" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1.5px solid var(--border-gold)", paddingBottom: "12px", marginBottom: "16px" }}>
              <div>
                <span style={{ fontSize: "11px", fontFamily: "monospace", color: "var(--indigo-light)", fontWeight: 700 }}>
                  Ticket {selectedIssue.serial}
                </span>
                <h3 style={{ fontFamily: "Marcellus, serif", color: "var(--indigo-deep)", margin: "4px 0 0 0", fontSize: "20px" }}>
                  Department Action & Voice Log
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedIssue(null)}
                style={{ background: "none", border: "none", fontSize: "22px", cursor: "pointer", color: "var(--text-muted)" }}
              >
                &times;
              </button>
            </div>

            {selectedIssue.voice_audio && (
              <div style={{ marginBottom: "16px", padding: "12px", background: "rgba(15, 32, 66, 0.04)", borderRadius: "8px", border: "1px solid var(--border-gold)" }}>
                <b style={{ color: "var(--indigo-deep)", fontSize: "13px", display: "flex", alignItems: "center", gap: "6px", marginBottom: "8px" }}>
                  <MicrophoneIcon size={16} color="var(--terracotta-red)" />
                  Citizen Voice Clip:
                </b>
                <audio
                  src={`http://localhost:8000/${selectedIssue.voice_audio.replace(/\\/g, "/")}`}
                  controls
                  style={{ width: "100%", height: "36px" }}
                />
              </div>
            )}

            {selectedIssue.transcript && selectedIssue.transcript !== selectedIssue.translation && (
              <div style={{ marginBottom: "12px", padding: "10px 14px", background: "rgba(197, 160, 89, 0.06)", borderLeft: "3px solid var(--heritage-gold)", borderRadius: "0 6px 6px 0" }}>
                <span style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", color: "var(--heritage-gold-dark)" }}>
                  Native Dialect Transcript:
                </span>
                <p style={{ margin: "4px 0 0 0", fontSize: "13.5px", color: "var(--indigo-deep)", fontStyle: "italic" }}>
                  "{selectedIssue.transcript}"
                </p>
              </div>
            )}

            <div style={{ marginBottom: "16px" }}>
              <span style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", color: "var(--text-muted)" }}>
                English Description:
              </span>
              <p style={{ margin: "4px 0 0 0", fontSize: "14px", color: "var(--text-main)", background: "#ffffff", border: "1px solid var(--border-gold)", padding: "10px 14px", borderRadius: "6px" }}>
                {selectedIssue.translation || selectedIssue.message}
              </p>
            </div>

            {selectedIssue.location && (
              <div style={{ marginBottom: "16px", padding: "12px", background: "var(--sandstone-bg)", borderRadius: "8px", border: "1px solid var(--border-gold)" }}>
                <b style={{ color: "var(--indigo-deep)", fontSize: "13px" }}>📍 Geolocation & Landmark:</b>
                <p style={{ margin: "4px 0", fontSize: "13px", color: "var(--text-main)" }}>
                  {selectedIssue.location.address || `${selectedIssue.location.lat}, ${selectedIssue.location.lon}`}
                </p>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "12px", color: "var(--text-muted)" }}>
                  <span>Coordinates: {selectedIssue.location.lat?.toFixed(5)}° N, {selectedIssue.location.lon?.toFixed(5)}° E</span>
                  <a
                    href={`https://www.google.com/maps?q=${selectedIssue.location.lat},${selectedIssue.location.lon}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: "var(--indigo-light)", fontWeight: 600, textDecoration: "none", display: "flex", alignItems: "center", gap: "4px" }}
                  >
                    <LinkIcon size={12} /> View Map ↗
                  </a>
                </div>
              </div>
            )}

            {selectedIssue.media && (
              <div style={{ marginBottom: "16px" }}>
                <b style={{ fontSize: "12px", color: "var(--text-muted)", textTransform: "uppercase" }}>Photo Proof:</b>
                <img
                  src={`http://localhost:8000/${selectedIssue.media}`}
                  alt="Proof"
                  style={{ width: "100%", maxHeight: "220px", objectFit: "cover", borderRadius: "8px", marginTop: "6px" }}
                />
              </div>
            )}

            <button
              className="btn-heritage-primary"
              style={{ width: "100%", marginTop: "10px" }}
              onClick={() => setSelectedIssue(null)}
            >
              Close Inspection
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
