import { CheckIcon } from "../components/Icons";

export default function ComparisonView() {
  const comparisonRows = [
    {
      capability: "Input Modality",
      cpgrams: "English / Hindi text forms only",
      samadhan: "Basic WhatsApp bot / form",
      nivaran: "10+ Indic Languages Speech-to-Text with live audio waveform & automatic code-mixed translation"
    },
    {
      capability: "Grievance Quality Gate",
      cpgrams: "No quality check (garbage-in, garbage-out)",
      samadhan: "Fixed multi-step forms (high drop-off)",
      nivaran: "0-100% Completeness Meter with targeted 1-click single-question clarification dialogue"
    },
    {
      capability: "Duplicate Detection",
      cpgrams: "Manual officer deduplication (weeks delayed)",
      samadhan: "Exact keyword match only",
      nivaran: "Dense Vector Semantic Cosine Search + Geospatial Proximity + Temporal Overlap"
    },
    {
      capability: "Macro Issue Clustering",
      cpgrams: "None (individual isolated tickets)",
      samadhan: "None",
      nivaran: "Explainable Auto-Clustering forming unified Issue Cards with growth velocity & 'Why Grouped' narrative"
    },
    {
      capability: "Authority Triage Action",
      cpgrams: "1-by-1 manual ticket disposal",
      samadhan: "Manual forward to ward officer",
      nivaran: "1-Click Batch Resolution updating dozens of corroborating citizen complaints simultaneously"
    },
    {
      capability: "Citizen Tracking Feedback",
      cpgrams: "Cryptic status codes ('Under Process')",
      samadhan: "Text notifications",
      nivaran: "Audible Multilingual TTS readout + macro-incident correlation feedback ('Your report joined 14 neighbors')"
    },
    {
      capability: "Safety & Emergency Routing",
      cpgrams: "FIFO Queue (emergencies wait in line)",
      samadhan: "Static department routing",
      nivaran: "AI Semantic Danger Detection + OSM Sensitive Zone Multiplier (Schools, Hospitals) + Deterministic Override"
    }
  ];

  return (
    <div style={{ animation: "fadeInUp 0.4s ease" }}>
      <div style={{ marginBottom: "24px" }}>
        <h2 style={{ fontFamily: "Marcellus, serif", color: "var(--indigo-deep)", margin: "0 0 4px 0" }}>
          Competitive Matrix: Nivaran vs Legacy Governance Portals
        </h2>
        <p style={{ margin: 0, fontSize: "14px", color: "var(--text-muted)" }}>
          Demonstrating architectural superiority and proactive civic intelligence over existing grievance systems
        </p>
      </div>

      <div className="card-jali" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "13.5px" }}>
            <thead>
              <tr style={{ background: "var(--sandstone-bg)", borderBottom: "2px solid var(--border-gold)" }}>
                <th style={{ padding: "16px 20px", color: "var(--indigo-deep)", fontFamily: "Marcellus, serif", fontSize: "15px", width: "22%" }}>
                  Civic Intelligence Layer
                </th>
                <th style={{ padding: "16px 20px", color: "var(--text-muted)", width: "24%" }}>
                  Legacy CPGRAMS / IGMS
                </th>
                <th style={{ padding: "16px 20px", color: "var(--text-muted)", width: "24%" }}>
                  State Chatbots (Samadhan Didi)
                </th>
                <th style={{ padding: "16px 20px", color: "var(--terracotta-red)", background: "rgba(197, 160, 89, 0.12)", width: "30%", fontWeight: 700 }}>
                  Nivaran (निवारण) AI Platform
                </th>
              </tr>
            </thead>
            <tbody>
              {comparisonRows.map((row, idx) => (
                <tr
                  key={row.capability}
                  style={{
                    borderBottom: "1px solid rgba(197, 160, 89, 0.2)",
                    background: idx % 2 === 0 ? "#ffffff" : "rgba(251, 249, 244, 0.5)"
                  }}
                >
                  <td style={{ padding: "16px 20px", fontWeight: 700, color: "var(--indigo-deep)" }}>
                    {row.capability}
                  </td>
                  <td style={{ padding: "16px 20px", color: "var(--text-muted)" }}>
                    {row.cpgrams}
                  </td>
                  <td style={{ padding: "16px 20px", color: "var(--text-muted)" }}>
                    {row.samadhan}
                  </td>
                  <td style={{ padding: "16px 20px", color: "var(--indigo-deep)", background: "rgba(197, 160, 89, 0.08)", fontWeight: 500 }}>
                    <div style={{ display: "flex", alignItems: "flex-start", gap: "8px" }}>
                      <span style={{ color: "var(--forest-green)", marginTop: "2px" }}>
                        <CheckIcon size={16} />
                      </span>
                      <span>{row.nivaran}</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
