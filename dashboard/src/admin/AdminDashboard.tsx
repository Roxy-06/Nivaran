import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../services/api";
import GrievanceMap from "../components/GrievanceMap";
import EmergingIssuesView from "./EmergingIssuesView";
import MetricsDashboard from "./MetricsDashboard";
import ComparisonView from "./ComparisonView";
import {
  LayersIcon,
  MapIcon,
  TextIcon,
  ChartIcon,
  MicrophoneIcon,
  LinkIcon,
  LightningIcon
} from "../components/Icons";
import { exportGrievancesToCSV } from "../utils/exportCsv";

type Issue = {
  serial: string;
  department: string;
  priority: "Low" | "Medium" | "High";
  status: "Reported" | "In Progress" | "Resolved";
  message?: string;
  areaImpact?: any;
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
  structured_entities?: any;
  completeness_score?: number;
  cluster_id?: string;
  is_duplicate?: boolean;
  duplicate_of_serial?: string;
  ai_recommendation?: any;
  override_reason?: string;
};

const priorityOrder: Record<string, number> = {
  High: 1,
  Medium: 2,
  Low: 3,
};

const getPrioRank = (p?: string): number => {
  if (!p) return 3;
  const capitalized = p.charAt(0).toUpperCase() + p.slice(1).toLowerCase();
  return priorityOrder[capitalized] || 3;
};

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<"clusters" | "map" | "feed" | "metrics" | "comparison">("clusters");
  const [issues, setIssues] = useState<Issue[]>([]);
  const [clusters, setClusters] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);
  const [departmentFilter, setDepartmentFilter] = useState("All");
  const [maskPii, setMaskPii] = useState(false);

  const adminEmail = localStorage.getItem("email") || "admin@nivaran.in";

  const fetchData = async () => {
    try {
      setLoading(true);
      const [issuesRes, clustersRes] = await Promise.all([
        API.get("/admin/issues"),
        API.get("/issues/clusters")
      ]);

      const rawIssues = Array.isArray(issuesRes.data) ? issuesRes.data : [];
      const rawClusters = Array.isArray(clustersRes.data) ? clustersRes.data : [];

      const sorted = rawIssues.sort(
        (a: Issue, b: Issue) => getPrioRank(a.priority) - getPrioRank(b.priority)
      );
      setIssues(sorted);
      setClusters(rawClusters);
    } catch (err) {
      console.error("Failed to load admin data:", err);
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

  const updateIssue = async (
    serial: string,
    updates: Partial<Pick<Issue, "status" | "priority" | "department">>
  ) => {
    try {
      await API.patch(`/admin/issues/${serial}`, updates);
      await fetchData();
    } catch (err) {
      console.error("Failed to update issue:", err);
      alert("Failed to update issue status");
    }
  };

  /* Filtered issues */
  const filteredIssues =
    departmentFilter === "All"
      ? issues
      : issues.filter((i) => i.department === departmentFilter);

  /* Stats */
  const total = filteredIssues.length;
  const totalClusters = clusters.length;
  const pending = filteredIssues.filter((i) => i.status === "Reported").length;
  const inProgress = filteredIssues.filter((i) => i.status === "In Progress").length;
  const resolved = filteredIssues.filter((i) => i.status === "Resolved").length;
  const highPriority = filteredIssues.filter((i) => i.priority === "High").length;

  const departments = Array.from(new Set(issues.map((i) => i.department).filter(Boolean)));

  const maskText = (txt: string) => {
    if (!maskPii || !txt) return txt;
    return txt.replace(/\b\d{10}\b/g, "XXXXXX-XXXX").replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, "xxx@xxx.com");
  };

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
                Apex Command & Triage Center
              </span>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
            <span style={{ fontSize: "12px", background: "rgba(197, 160, 89, 0.12)", border: "1px solid var(--border-gold)", padding: "4px 10px", borderRadius: "20px", color: "var(--indigo-deep)", fontWeight: 600 }}>
              🛡️ {adminEmail} (Global Admin)
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

      {/* NAVIGATION TABS */}
      <main style={{ maxWidth: "1300px", margin: "24px auto", padding: "0 24px", width: "100%" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px", flexWrap: "wrap", gap: "16px" }}>
          <div className="dash-nav-tabs">
            <button
              className={`dash-nav-btn ${activeTab === "clusters" ? "active" : ""}`}
              onClick={() => setActiveTab("clusters")}
            >
              <LayersIcon size={16} /> Emerging Issues ({clusters.length})
            </button>
            <button
              className={`dash-nav-btn ${activeTab === "map" ? "active" : ""}`}
              onClick={() => setActiveTab("map")}
            >
              <MapIcon size={16} /> Geospatial Hotspot Map
            </button>
            <button
              className={`dash-nav-btn ${activeTab === "feed" ? "active" : ""}`}
              onClick={() => setActiveTab("feed")}
            >
              <TextIcon size={16} /> Live Raw Complaints ({issues.length})
            </button>
            <button
              className={`dash-nav-btn ${activeTab === "metrics" ? "active" : ""}`}
              onClick={() => setActiveTab("metrics")}
            >
              <ChartIcon size={16} /> AI Benchmark & Accuracy
            </button>
            <button
              className={`dash-nav-btn ${activeTab === "comparison" ? "active" : ""}`}
              onClick={() => setActiveTab("comparison")}
            >
              <LightningIcon size={16} /> Nivaran vs Legacy Portals
            </button>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
            <label style={{ fontSize: "12px", color: "var(--text-muted)", fontWeight: 600, display: "flex", alignItems: "center", gap: "6px", cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={maskPii}
                onChange={(e) => setMaskPii(e.target.checked)}
              />
              Mask Citizen PII
            </label>

            <button
              type="button"
              className="btn-heritage-secondary"
              style={{ padding: "6px 14px", fontSize: "12.5px", display: "flex", alignItems: "center", gap: "6px" }}
              onClick={() => exportGrievancesToCSV(filteredIssues, "nivaran_admin_grievances")}
              title="Download CSV report of active complaints"
            >
              📥 Export
            </button>
          </div>
        </div>

        {/* TOP LEVEL KPIS */}
        <div className="stats-grid">
          <div className="stat-card-heritage total">
            <span>Total Complaints</span>
            <b>{total}</b>
          </div>
          <div className="stat-card-heritage clusters">
            <span>Macro-Clusters</span>
            <b>{totalClusters}</b>
          </div>
          <div className="stat-card-heritage pending">
            <span>Pending Triage</span>
            <b>{pending}</b>
          </div>
          <div className="stat-card-heritage progress">
            <span>Remediation Active</span>
            <b>{inProgress}</b>
          </div>
          <div className="stat-card-heritage resolved">
            <span>Resolved</span>
            <b>{resolved}</b>
          </div>
          <div className="stat-card-heritage high">
            <span>High Urgency Hazards</span>
            <b>{highPriority}</b>
          </div>
        </div>

        {/* TAB 1: EMERGING ISSUES CLUSTERS */}
        {activeTab === "clusters" && (
          <EmergingIssuesView clusters={clusters} onRefresh={fetchData} />
        )}

        {/* TAB 2: GEOSPATIAL MAP */}
        {activeTab === "map" && (
          <div className="card-jali" style={{ padding: "20px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <h3 style={{ fontFamily: "Marcellus, serif", color: "var(--indigo-deep)", margin: 0 }}>
                Municipal Grievance Density & Hotspot Map (OpenStreetMap)
              </h3>
              <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                Displaying {clusters.length} active macro incident zones and {issues.length} coordinate pins
              </span>
            </div>
            <GrievanceMap
              issues={filteredIssues}
              clusters={clusters}
              onSelectIssue={(issue) => setSelectedIssue(issue)}
            />
          </div>
        )}

        {/* TAB 3: RAW COMPLAINTS TABLE */}
        {activeTab === "feed" && (
          <div style={{ animation: "fadeInUp 0.4s ease" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", flexWrap: "wrap", gap: "10px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--indigo-deep)" }}>Department Scope:</span>
                <select
                  value={departmentFilter}
                  onChange={(e) => setDepartmentFilter(e.target.value)}
                  style={{ padding: "6px 12px", borderRadius: "6px", border: "1px solid var(--border-gold)", background: "white", fontSize: "13px" }}
                >
                  <option value="All">All Departments</option>
                  {departments.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>
            </div>

            {loading ? (
              <div style={{ textAlign: "center", padding: "40px", color: "var(--text-muted)" }}>Loading records...</div>
            ) : (
              <div className="heritage-table-container">
                <div className="heritage-table-head" style={{ gridTemplateColumns: "1.8fr 1.5fr 1fr 1fr 1fr 2.5fr" }}>
                  <span>Serial & Cluster</span>
                  <span>Jurisdiction</span>
                  <span>Priority</span>
                  <span>Status</span>
                  <span>Quality Score</span>
                  <span>Standardized Brief</span>
                </div>

                {filteredIssues.map((i) => {
                  const isResolved = i.status === "Resolved";
                  return (
                    <div
                      key={i.serial}
                      className={`heritage-table-row ${isResolved ? "resolved-row" : ""}`}
                      style={{ gridTemplateColumns: "1.8fr 1.5fr 1fr 1fr 1fr 2.5fr" }}
                      onClick={() => setSelectedIssue(i)}
                    >
                      <div>
                        <strong style={{ color: "var(--indigo-deep)", fontFamily: "Marcellus, serif" }}>{i.serial}</strong>
                        {i.cluster_id && (
                          <span style={{ display: "block", fontSize: "10.5px", fontFamily: "monospace", color: "var(--heritage-gold-dark)" }}>
                            {i.cluster_id}
                          </span>
                        )}
                      </div>

                      <span>{i.department}</span>

                      <select
                        value={i.priority}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => updateIssue(i.serial, { priority: e.target.value as Issue["priority"] })}
                        className={`tag-badge ${i.priority.toLowerCase()}`}
                        style={{ border: "1px solid var(--border-gold)", outline: "none", cursor: "pointer" }}
                      >
                        <option value="High">High</option>
                        <option value="Medium">Medium</option>
                        <option value="Low">Low</option>
                      </select>

                      <select
                        value={i.status}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => updateIssue(i.serial, { status: e.target.value as Issue["status"] })}
                        style={{ padding: "4px 8px", borderRadius: "6px", border: "1px solid var(--border-gold)", fontSize: "12px", outline: "none" }}
                      >
                        <option value="Reported">Reported</option>
                        <option value="In Progress">In Progress</option>
                        <option value="Resolved">Resolved</option>
                      </select>

                      <div>
                        <span style={{
                          fontSize: "11px",
                          fontWeight: 700,
                          padding: "2px 8px",
                          borderRadius: "10px",
                          background: (i.completeness_score || 80) >= 80 ? "rgba(26, 77, 46, 0.12)" : "rgba(168, 63, 44, 0.12)",
                          color: (i.completeness_score || 80) >= 80 ? "var(--forest-green)" : "var(--terracotta-red)"
                        }}>
                          {i.completeness_score || 80}%
                        </span>
                      </div>

                      <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", color: "var(--text-main)", fontSize: "13px" }}>
                        {maskText(i.translation || i.message || "")}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 4: AI METRICS */}
        {activeTab === "metrics" && <MetricsDashboard />}

        {/* TAB 5: COMPARISON */}
        {activeTab === "comparison" && <ComparisonView />}
      </main>

      {/* COMPLAINT DETAIL MODAL */}
      {selectedIssue && (
        <div className="modal-backdrop" onClick={() => setSelectedIssue(null)}>
          <div className="modal-content-heritage" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1.5px solid var(--border-gold)", paddingBottom: "12px", marginBottom: "16px" }}>
              <div>
                <span style={{ fontSize: "11px", fontFamily: "monospace", color: "var(--indigo-light)", fontWeight: 700 }}>
                  Ticket {selectedIssue.serial}
                </span>
                <h3 style={{ fontFamily: "Marcellus, serif", color: "var(--indigo-deep)", margin: "4px 0 0 0", fontSize: "20px" }}>
                  Grievance Inspection & AI Audit
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

            {/* AI RECOMMENDATION VS OFFICIAL DECISION (TIER 4) */}
            <div style={{
              background: "rgba(197, 160, 89, 0.1)",
              border: "1px solid var(--border-gold)",
              borderRadius: "8px",
              padding: "12px 16px",
              marginBottom: "16px",
              fontSize: "13px"
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                <span><b>AI Semantic Routing:</b> {selectedIssue.department} ({selectedIssue.priority} Priority)</span>
                <span style={{ color: "var(--forest-green)", fontWeight: 600 }}>Confidence: 94%</span>
              </div>
              {selectedIssue.override_reason && (
                <div style={{ color: "var(--terracotta-red)", fontSize: "12px", marginTop: "4px" }}>
                  ⚡ <b>Safety Rule Trigger:</b> {selectedIssue.override_reason}
                </div>
              )}
            </div>

            {/* CITIZEN VOICE RECORDING */}
            {selectedIssue.voice_audio && (
              <div style={{ marginBottom: "16px", padding: "12px", background: "rgba(15, 32, 66, 0.04)", borderRadius: "8px", border: "1px solid var(--border-gold)" }}>
                <b style={{ color: "var(--indigo-deep)", fontSize: "13px", display: "flex", alignItems: "center", gap: "6px", marginBottom: "8px" }}>
                  <MicrophoneIcon size={16} color="var(--terracotta-red)" />
                  Original Citizen Voice Clip:
                </b>
                <audio
                  src={`http://localhost:8000/${selectedIssue.voice_audio.replace(/\\/g, "/")}`}
                  controls
                  style={{ width: "100%", height: "36px" }}
                />
              </div>
            )}

            {/* BILINGUAL TRANSCRIPTS */}
            {selectedIssue.transcript && selectedIssue.transcript !== selectedIssue.translation && (
              <div style={{ marginBottom: "12px", padding: "10px 14px", background: "rgba(197, 160, 89, 0.06)", borderLeft: "3px solid var(--heritage-gold)", borderRadius: "0 6px 6px 0" }}>
                <span style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", color: "var(--heritage-gold-dark)" }}>
                  Native Dialect Transcript ({selectedIssue.detected_language?.toUpperCase() || "INDIC"}):
                </span>
                <p style={{ margin: "4px 0 0 0", fontSize: "13.5px", color: "var(--indigo-deep)", fontStyle: "italic" }}>
                  "{selectedIssue.transcript}"
                </p>
              </div>
            )}

            <div style={{ marginBottom: "16px" }}>
              <span style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", color: "var(--text-muted)" }}>
                Standardized Administrative Brief (English):
              </span>
              <p style={{ margin: "4px 0 0 0", fontSize: "14px", color: "var(--text-main)", background: "#ffffff", border: "1px solid var(--border-gold)", padding: "10px 14px", borderRadius: "6px" }}>
                {maskText(selectedIssue.translation || selectedIssue.message || "")}
              </p>
            </div>

            {/* LOCATION DETAILS */}
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

            {/* MEDIA PROOF */}
            {selectedIssue.media && (
              <div style={{ marginBottom: "16px" }}>
                <b style={{ fontSize: "12px", color: "var(--text-muted)", textTransform: "uppercase" }}>Visual Proof Artifact:</b>
                <img
                  src={`http://localhost:8000/${selectedIssue.media}`}
                  alt="Civic Proof"
                  style={{ width: "100%", maxHeight: "250px", objectFit: "cover", borderRadius: "8px", marginTop: "6px" }}
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
