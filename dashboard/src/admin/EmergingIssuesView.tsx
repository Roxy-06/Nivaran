import { useState } from "react";
import API from "../services/api";
import { CheckIcon } from "../components/Icons";

interface EmergingIssuesViewProps {
  clusters: any[];
  onRefresh: () => void;
}

export default function EmergingIssuesView({ clusters, onRefresh }: EmergingIssuesViewProps) {
  const [selectedCluster, setSelectedCluster] = useState<any>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [searchFilter, setSearchFilter] = useState("");

  const handleOpenCluster = async (cluster: any) => {
    try {
      setLoadingDetails(true);
      setSelectedCluster(cluster);
      const res = await API.get(`/issues/clusters/${cluster.cluster_id}`);
      setSelectedCluster(res.data);
    } catch (err) {
      console.error("Error loading cluster details:", err);
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleBatchStatusUpdate = async (newStatus: string) => {
    if (!selectedCluster) return;
    try {
      setUpdating(true);
      await API.patch(`/issues/clusters/${selectedCluster.cluster_id}`, {
        status: newStatus,
        rationale: "Officer batch status update from Emerging Issues Feed"
      });
      setSelectedCluster({
        ...selectedCluster,
        status: newStatus,
        supporting_complaints: (selectedCluster.supporting_complaints || []).map((c: any) => ({
          ...c,
          status: newStatus
        }))
      });
      await onRefresh();
    } catch (err) {
      console.error("Batch update error:", err);
      alert("Failed to update cluster status");
    } finally {
      setUpdating(false);
    }
  };

  const filtered = (clusters || []).filter(
    (c) =>
      (c.title || "").toLowerCase().includes(searchFilter.toLowerCase()) ||
      (c.department || "").toLowerCase().includes(searchFilter.toLowerCase()) ||
      (c.cluster_id || "").toLowerCase().includes(searchFilter.toLowerCase())
  );

  return (
    <div style={{ animation: "fadeInUp 0.4s ease" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <h2 style={{ fontFamily: "Marcellus, serif", color: "var(--indigo-deep)", margin: "0 0 4px 0" }}>
            Emerging Civic Issues & Macro-Clusters
          </h2>
          <p style={{ margin: 0, fontSize: "14px", color: "var(--text-muted)" }}>
            Aggregated municipal incidents ranked by urgency velocity & volume growth
          </p>
        </div>

        <input
          type="text"
          placeholder="Filter by title, department, or ID..."
          value={searchFilter}
          onChange={(e) => setSearchFilter(e.target.value)}
          style={{
            padding: "8px 14px",
            borderRadius: "6px",
            border: "1px solid var(--border-gold)",
            background: "#ffffff",
            fontSize: "13px",
            minWidth: "260px"
          }}
        />
      </div>

      {filtered.length === 0 ? (
        <div className="card-jali" style={{ textAlign: "center", padding: "40px" }}>
          <p style={{ color: "var(--text-muted)", margin: 0 }}>No active macro-issue clusters found.</p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: "20px" }}>
          {filtered.map((cluster) => {
            const isHigh = cluster.priority === "High";
            const isResolved = cluster.status === "Resolved";

            return (
              <div
                key={cluster.cluster_id}
                className="card-jali"
                style={{
                  cursor: "pointer",
                  borderLeft: `4px solid ${isResolved ? "var(--forest-green)" : isHigh ? "var(--terracotta-red)" : "var(--heritage-gold)"}`,
                  transition: "transform 0.2s, box-shadow 0.2s"
                }}
                onClick={() => handleOpenCluster(cluster)}
              >
                <div className="corner-accent corner-top-left"></div>
                <div className="corner-accent corner-top-right"></div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px", gap: "8px" }}>
                  <span style={{ fontSize: "11px", fontFamily: "monospace", color: "var(--indigo-light)", fontWeight: 700 }}>
                    {cluster.cluster_id}
                  </span>
                  <div style={{ display: "flex", gap: "6px" }}>
                    <span className={`tag-badge ${(cluster.priority || "low").toLowerCase()}`}>
                      {cluster.priority || "Low"}
                    </span>
                    <span className="tag-badge" style={{
                      background: isResolved ? "rgba(26, 77, 46, 0.12)" : "rgba(15, 32, 66, 0.08)",
                      color: isResolved ? "var(--forest-green)" : "var(--indigo-deep)"
                    }}>
                      {cluster.status}
                    </span>
                  </div>
                </div>

                <h3 style={{ fontFamily: "Marcellus, serif", fontSize: "17px", color: "var(--indigo-deep)", margin: "0 0 8px 0", lineHeight: "1.3" }}>
                  {cluster.title}
                </h3>

                <div style={{ display: "flex", alignItems: "center", gap: "12px", fontSize: "12px", color: "var(--text-muted)", marginBottom: "12px" }}>
                  <span><b>Dept:</b> {cluster.department}</span>
                  <span>•</span>
                  <span><b>Reports:</b> <b style={{ color: "var(--indigo-deep)" }}>{cluster.complaint_count}</b></span>
                  {cluster.growth_rate_pct > 0 && (
                    <>
                      <span>•</span>
                      <span style={{ color: "var(--terracotta-red)", fontWeight: 700 }}>
                        +{cluster.growth_rate_pct}% velocity
                      </span>
                    </>
                  )}
                </div>

                <p style={{
                  fontSize: "13px",
                  color: "var(--text-main)",
                  background: "var(--sandstone-bg)",
                  border: "1px solid var(--border-gold)",
                  padding: "10px 12px",
                  borderRadius: "6px",
                  margin: "0 0 14px 0",
                  lineHeight: "1.4"
                }}>
                  <b>Why Grouped:</b> {cluster.why_grouped}
                </p>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "12px" }}>
                  <span style={{ color: "var(--text-muted)" }}>
                    First reported: {cluster.first_reported_at ? new Date(cluster.first_reported_at).toLocaleDateString() : "Recent"}
                  </span>
                  <span style={{ color: "var(--terracotta-red)", fontWeight: 600, display: "flex", alignItems: "center", gap: "4px" }}>
                    Inspect & Batch Triage &rarr;
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* CLUSTER DETAIL & BATCH ACTION MODAL */}
      {selectedCluster && (
        <div className="modal-backdrop" onClick={() => setSelectedCluster(null)}>
          <div className="modal-content-heritage" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1.5px solid var(--border-gold)", paddingBottom: "14px", marginBottom: "16px" }}>
              <div>
                <span style={{ fontSize: "11px", fontFamily: "monospace", color: "var(--indigo-light)", fontWeight: 700 }}>
                  {selectedCluster.cluster_id}
                </span>
                <h3 style={{ fontFamily: "Marcellus, serif", color: "var(--indigo-deep)", margin: "4px 0 0 0", fontSize: "20px" }}>
                  {selectedCluster.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedCluster(null)}
                style={{ background: "none", border: "none", fontSize: "20px", cursor: "pointer", color: "var(--text-muted)" }}
              >
                &times;
              </button>
            </div>

            {/* BATCH RESOLUTION CONTROLS */}
            <div style={{
              background: "rgba(197, 160, 89, 0.1)",
              border: "1px solid var(--border-gold)",
              borderRadius: "8px",
              padding: "14px 18px",
              marginBottom: "20px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "12px"
            }}>
              <div>
                <span style={{ fontSize: "12px", fontWeight: 700, color: "var(--indigo-deep)", display: "block" }}>
                  ⚡ Batch Incident Action (Updates all {selectedCluster.complaint_count} supporting citizen tickets):
                </span>
                <span style={{ fontSize: "11.5px", color: "var(--text-muted)" }}>
                  Current Status: <b>{selectedCluster.status}</b>
                </span>
              </div>

              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  type="button"
                  className="btn-heritage-secondary"
                  style={{ padding: "6px 12px", fontSize: "12px" }}
                  onClick={() => handleBatchStatusUpdate("In Progress")}
                  disabled={updating || selectedCluster.status === "In Progress"}
                >
                  Mark In Progress
                </button>
                <button
                  type="button"
                  className="btn-heritage-primary"
                  style={{ padding: "6px 12px", fontSize: "12px", background: "var(--forest-green)" }}
                  onClick={() => handleBatchStatusUpdate("Resolved")}
                  disabled={updating || selectedCluster.status === "Resolved"}
                >
                  <CheckIcon size={14} />
                  Mark All Resolved
                </button>
              </div>
            </div>

            {/* WHY GROUPED PANEL */}
            <div style={{ marginBottom: "20px" }}>
              <b style={{ fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.5px", color: "var(--text-muted)", display: "block", marginBottom: "6px" }}>
                Explainable Cross-Grievance Synthesis:
              </b>
              <p style={{ margin: 0, fontSize: "14px", color: "var(--indigo-deep)", background: "var(--sandstone-bg)", padding: "12px 16px", borderRadius: "8px", border: "1px solid var(--border-gold)", lineHeight: "1.5" }}>
                {selectedCluster.why_grouped}
              </p>
            </div>

            {/* SUPPORTING COMPLAINTS DRILLDOWN */}
            <div>
              <b style={{ fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.5px", color: "var(--text-muted)", display: "block", marginBottom: "10px" }}>
                Corroborating Citizen Reports ({selectedCluster.supporting_complaints?.length || selectedCluster.complaint_count || 0}):
              </b>

              {loadingDetails ? (
                <p style={{ fontSize: "13px", color: "var(--text-muted)" }}>Loading supporting complaint details...</p>
              ) : selectedCluster.supporting_complaints?.length > 0 ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "10px", maxHeight: "300px", overflowY: "auto" }}>
                  {selectedCluster.supporting_complaints.map((c: any) => (
                    <div
                      key={c.serial}
                      style={{
                        background: "#ffffff",
                        border: "1px solid var(--border-gold)",
                        borderRadius: "8px",
                        padding: "12px 14px",
                        fontSize: "13px"
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                        <span style={{ fontWeight: 700, color: "var(--indigo-deep)" }}>{c.serial}</span>
                        <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                          {c.reportedAt ? new Date(c.reportedAt).toLocaleDateString() : ""}
                        </span>
                      </div>

                      {c.transcript && c.transcript !== c.translation && (
                        <p style={{ margin: "2px 0 4px 0", color: "#86198f", fontStyle: "italic", fontSize: "12px" }}>
                          "{c.transcript}"
                        </p>
                      )}

                      <p style={{ margin: "2px 0", color: "var(--text-main)" }}>
                        {c.translation || c.message}
                      </p>

                      {c.voice_audio && (
                        <div style={{ marginTop: "6px" }}>
                          <audio
                            src={`http://localhost:8000/${c.voice_audio.replace(/\\/g, "/")}`}
                            controls
                            style={{ width: "100%", height: "30px" }}
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ fontSize: "13px", color: "var(--text-muted)" }}>
                  Serials: {(selectedCluster.complaint_serials || []).join(", ")}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
