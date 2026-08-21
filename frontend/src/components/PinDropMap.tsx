import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface PinDropMapProps {
  initialLat?: number;
  initialLng?: number;
  onLocationSelected: (lat: number, lng: number) => void;
  onClose?: () => void;
}

const DEFAULT_SECTOR_V = { lat: 22.5760302, lng: 88.4284409 };

export default function PinDropMap({
  initialLat = DEFAULT_SECTOR_V.lat,
  initialLng = DEFAULT_SECTOR_V.lng,
  onLocationSelected,
  onClose,
}: PinDropMapProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current).setView([initialLat, initialLng], 15);

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(map);

      // Custom pin icon
      const pinIcon = L.divIcon({
        className: "custom-pin-drop",
        html: `
          <div style="
            background: #a83f2c;
            color: #fff;
            width: 32px;
            height: 32px;
            border-radius: 50% 50% 50% 0;
            transform: rotate(-45deg);
            border: 2.5px solid #fff;
            box-shadow: 0 4px 10px rgba(0,0,0,0.3);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 16px;
            cursor: grab;
          ">
            <div style="transform: rotate(45deg); width: 8px; height: 8px; background: #fff; border-radius: 50%;"></div>
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 32],
      });

      const marker = L.marker([initialLat, initialLng], {
        draggable: true,
        icon: pinIcon,
      }).addTo(map);

      marker.bindPopup("<b>Selected Civic Location</b><br/>Drag or click anywhere to adjust pin.").openPopup();

      marker.on("dragend", () => {
        const pos = marker.getLatLng();
        onLocationSelected(pos.lat, pos.lng);
      });

      map.on("click", (e: L.LeafletMouseEvent) => {
        marker.setLatLng(e.latlng);
        onLocationSelected(e.latlng.lat, e.latlng.lng);
      });

      markerRef.current = marker;
      mapInstanceRef.current = map;

      // Invalidate size for proper rendering
      setTimeout(() => {
        map.invalidateSize();
      }, 250);
    } else {
      const map = mapInstanceRef.current;
      const marker = markerRef.current;
      if (map && marker) {
        marker.setLatLng([initialLat, initialLng]);
        map.setView([initialLat, initialLng], map.getZoom());
      }
    }

    return () => {
      // Cleanup
    };
  }, [initialLat, initialLng, onLocationSelected]);

  return (
    <div style={{ animation: "fadeInUp 0.3s ease", marginBottom: "16px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px", flexWrap: "wrap", gap: "8px" }}>
        <div style={{ fontSize: "13px", color: "var(--indigo-deep)", fontWeight: 600 }}>
          📍 Tap map or drag pin to select exact grievance spot
        </div>
        {onClose && (
          <button
            type="button"
            className="lang-chip"
            style={{ cursor: "pointer", background: "var(--sandstone-dark)", color: "#fff" }}
            onClick={onClose}
          >
            ✕ Close Map
          </button>
        )}
      </div>

      <div
        ref={mapContainerRef}
        style={{
          height: "260px",
          width: "100%",
          borderRadius: "8px",
          border: "1.5px solid var(--border-gold)",
          overflow: "hidden",
          boxShadow: "0 4px 12px rgba(15,32,66,0.06)",
        }}
      />
    </div>
  );
}
