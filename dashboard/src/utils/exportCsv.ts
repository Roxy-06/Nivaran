export function exportGrievancesToCSV(issues: any[], filenamePrefix = "nivaran_grievances") {
  if (!issues || issues.length === 0) {
    alert("No grievance records to export.");
    return;
  }

  const headers = [
    "Serial Key",
    "Department",
    "Priority",
    "Status",
    "Reported Date",
    "Latitude",
    "Longitude",
    "Address / Landmark",
    "Cluster ID",
    "Original Transcript",
    "Remediation Narrative (Translation)",
    "Completeness Score",
    "Citizen Rating",
    "Citizen Feedback"
  ];

  const escapeCSV = (val: any) => {
    if (val === null || val === undefined) return '""';
    const str = String(val).replace(/"/g, '""');
    return `"${str}"`;
  };

  const rows = issues.map((i) => [
    escapeCSV(i.serial),
    escapeCSV(i.department),
    escapeCSV(i.priority),
    escapeCSV(i.status),
    escapeCSV(i.reportedAt ? new Date(i.reportedAt).toLocaleString() : ""),
    escapeCSV(i.location?.lat ?? ""),
    escapeCSV(i.location?.lon ?? ""),
    escapeCSV(i.location?.address ?? ""),
    escapeCSV(i.cluster_id ?? "Unassigned"),
    escapeCSV(i.transcript || i.message || ""),
    escapeCSV(i.translation || i.message || ""),
    escapeCSV(i.completeness_score ? `${i.completeness_score}%` : "80%"),
    escapeCSV(i.rating ? `${i.rating} / 5` : "Unrated"),
    escapeCSV(i.citizen_feedback ?? "")
  ]);

  const csvContent = "\uFEFF" + [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const dateStr = new Date().toISOString().split("T")[0];

  link.setAttribute("href", url);
  link.setAttribute("download", `${filenamePrefix}_${dateStr}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
