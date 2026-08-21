import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface GrievanceMapProps {
  issues: any[];
  clusters: any[];
  onSelectIssue?: (issue: any) => void;
  onSelectCluster?: (cluster: any) => void;
}

export default function GrievanceMap({
  issues,
  clusters,
  onSelectIssue,
  onSelectCluster,
}: GrievanceMapProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const layerGroupRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      // Default to Salt Lake (Bidhannagar), Kolkata coordinates
      const map = L.map(mapContainerRef.current).setView([22.5800, 88.4200], 13);

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(map);

      layerGroupRef.current = L.layerGroup().addTo(map);
      mapInstanceRef.current = map;
    }

    const map = mapInstanceRef.current;
    const layerGroup = layerGroupRef.current;
    if (!map || !layerGroup) return;

    layerGroup.clearLayers();

    const bounds = L.latLngBounds([]);

    // 1. Draw Macro Issue Clusters
    clusters.forEach((cluster) => {
      if (!cluster.centroid_lat || !cluster.centroid_lon) return;

      const lat = cluster.centroid_lat;
      const lon = cluster.centroid_lon;
      bounds.extend([lat, lon]);

      const isHigh = cluster.priority === "High";
      const isResolved = cluster.status === "Resolved";
      const color = isResolved ? "#1a4d2e" : isHigh ? "#a83f2c" : "#c5a059";

      // Draw cluster circle area
      const circle = L.circle([lat, lon], {
        radius: Math.max(150, cluster.radius_meters || 150),
        color: color,
        fillColor: color,
        fillOpacity: 0.18,
        weight: 2,
      }).addTo(layerGroup);

      // Custom marker icon
      const count = cluster.complaint_count || 1;
      const customIcon = L.divIcon({
        className: "custom-cluster-icon",
        html: `<div style="
          background: ${color};
          color: white;
          width: 34px;
          height: 34px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 13px;
          border: 2px solid white;
          box-shadow: 0 4px 10px rgba(0,0,0,0.3);
          font-family: Marcellus, serif;
        ">${count}</div>`,
        iconSize: [34, 34],
        iconAnchor: [17, 17],
      });

      const marker = L.marker([lat, lon], { icon: customIcon }).addTo(layerGroup);

      const popupContent = `
        <div style="font-family: Outfit, sans-serif; padding: 6px; max-width: 240px;">
          <b style="color: #0f2042; font-family: Marcellus, serif; font-size: 14px;">${cluster.title}</b>
          <div style="margin: 6px 0; font-size: 12px; color: #475569;">
            <span><b>Dept:</b> ${cluster.department}</span><br/>
            <span><b>Priority:</b> <span style="color: ${isHigh ? '#a83f2c' : '#c5a059'}; font-weight: 700;">${cluster.priority}</span></span><br/>
            <span><b>Status:</b> ${cluster.status}</span><br/>
            <span><b>Reports:</b> ${count} citizen tickets</span>
          </div>
          <p style="margin: 4px 0 0 0; font-size: 11px; color: #64748b; font-style: italic;">
            ${cluster.why_grouped || ""}
          </p>
        </div>
      `;

      marker.bindPopup(popupContent);
      circle.bindPopup(popupContent);

      if (onSelectCluster) {
        marker.on("click", () => onSelectCluster(cluster));
      }
    });

    // 2. Draw Individual Complaints pins
    issues.forEach((issue) => {
      const loc = issue.location;
      if (!loc || !loc.lat || !loc.lon) return;

      bounds.extend([loc.lat, loc.lon]);

      const isHigh = issue.priority === "High";
      const isResolved = issue.status === "Resolved";
      const pinColor = isResolved ? "#1a4d2e" : isHigh ? "#a83f2c" : "#1b365d";

      const pinIcon = L.divIcon({
        className: "custom-pin-icon",
        html: `<div style="
          background: ${pinColor};
          width: 10px;
          height: 10px;
          border-radius: 50%;
          border: 1.5px solid white;
          box-shadow: 0 1px 4px rgba(0,0,0,0.4);
        "></div>`,
        iconSize: [10, 10],
        iconAnchor: [5, 5],
      });

      const pinMarker = L.marker([loc.lat, loc.lon], { icon: pinIcon }).addTo(layerGroup);
      pinMarker.bindPopup(`
        <div style="font-family: Outfit, sans-serif; font-size: 12px;">
          <b>${issue.serial}</b> (${issue.department})<br/>
          <span style="color: #64748b;">${loc.address || ""}</span><br/>
          <p style="margin: 4px 0 0 0; font-style: italic;">"${(issue.translation || issue.message || "").slice(0, 80)}..."</p>
        </div>
      `);

      if (onSelectIssue) {
        pinMarker.on("click", () => onSelectIssue(issue));
      }
    });

    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
    }

    setTimeout(() => {
      try {
        map.invalidateSize();
      } catch {
        // ignore
      }
    }, 150);
  }, [issues, clusters, onSelectIssue, onSelectCluster]);

  return (
    <div style={{ position: "relative", width: "100%", height: "520px", borderRadius: "10px", overflow: "hidden", border: "1.5px solid var(--border-gold)" }}>
      <div ref={mapContainerRef} style={{ width: "100%", height: "100%" }} />
      <div style={{
        position: "absolute",
        bottom: 12,
        right: 12,
        background: "rgba(255,255,255,0.92)",
        backdropFilter: "blur(6px)",
        padding: "8px 12px",
        borderRadius: "8px",
        border: "1px solid var(--border-gold)",
        fontSize: "11px",
        fontWeight: 600,
        zIndex: 1000,
        display: "flex",
        flexDirection: "column",
        gap: "4px"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#a83f2c", display: "inline-block" }}></span>
          <span>High Urgency Issue / Hotspot</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#c5a059", display: "inline-block" }}></span>
          <span>Medium Priority Cluster</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#1a4d2e", display: "inline-block" }}></span>
          <span>Resolved Zone</span>
        </div>
      </div>
    </div>
  );
}
