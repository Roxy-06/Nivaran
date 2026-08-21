"""
Auto-Clustering & Macro-Issue Formation Engine for Nivaran (Tier 6).
Transforms dozens of scattered citizen complaints into unified, actionable municipal Issue Cards.
"""

import uuid
import logging
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, List, Optional, Tuple
import numpy as np

try:
    from app.similarity import haversine_distance, compute_cosine_similarity, generate_embedding
except ImportError:
    from similarity import haversine_distance, compute_cosine_similarity, generate_embedding

logger = logging.getLogger("nivaran.clustering")


def generate_issue_title(department: str, sub_category: str, landmark: str, count: int) -> str:
    """
    Generates a concise, executive headline for the aggregated municipal Issue Card.
    """
    import re
    spot = landmark.strip() if landmark and landmark != "Not specified" else "Local Vicinity"
    spot_clean = re.sub(r"^(?:near|opposite to|opposite|behind|at|in front of|close to|next to|beside)\s+", "", spot, flags=re.IGNORECASE).strip()
    if len(spot_clean) > 35:
        spot_clean = spot_clean[:35] + "..."

    reports_str = f"({count} citizen reports)" if count > 1 else "(1 citizen report)"
    return f"{sub_category} near {spot_clean} {reports_str}"


def form_plain_language_explanation(
    department: str,
    complaint_count: int,
    radius_meters: float,
    hours_span: float,
    common_phrases: List[str]
) -> str:
    """
    Creates an explainable narrative detailing why complaints were grouped together.
    """
    radius_str = f"{int(radius_meters)}m" if radius_meters > 0 else "50m"
    time_str = f"the past {int(hours_span)} hours" if hours_span >= 2 else "recent hours"

    phrases_sample = f" (mentioning '{common_phrases[0]}')" if common_phrases else ""
    return (
        f"Grouped {complaint_count} corroborating reports within a {radius_str} geographic radius "
        f"submitted over {time_str} under {department}{phrases_sample}."
    )


def assign_or_create_cluster(
    new_complaint: Dict[str, Any],
    active_clusters: List[Dict[str, Any]]
) -> Tuple[str, Dict[str, Any], bool]:
    """
    Incrementally matches an incoming complaint to an active cluster or creates a new one.
    Returns: (cluster_id, cluster_dict, is_new_cluster)
    """
    loc = new_complaint.get("location") or {}
    lat = loc.get("lat", 0.0)
    lon = loc.get("lon", 0.0)
    dept = new_complaint.get("department", "General Administration")
    text = new_complaint.get("translation") or new_complaint.get("message") or ""
    serial = new_complaint.get("serial")
    entities = new_complaint.get("structured_entities") or {}
    sub_cat = entities.get("sub_category", "Civic Grievance")
    landmark = entities.get("landmark_or_spot", "")

    new_emb = new_complaint.get("embedding")
    if not new_emb:
        new_emb = generate_embedding(text)

    best_cluster = None
    min_dist = 99999.0
    best_sem = 0.0

    # Look for existing active cluster with matching department and proximity
    for cluster in active_clusters:
        if cluster.get("status") == "Resolved":
            continue
        if cluster.get("department") != dept:
            continue

        c_lat = cluster.get("centroid_lat", 0.0)
        c_lon = cluster.get("centroid_lon", 0.0)
        if c_lat and c_lon and lat and lon:
            dist = haversine_distance(lat, lon, c_lat, c_lon)
            if dist <= 500.0:  # within 500m radius
                best_cluster = cluster
                min_dist = dist
                break

    now_iso = datetime.now(timezone.utc).isoformat()

    if best_cluster:
        # Update existing cluster
        c_id = best_cluster["cluster_id"]
        old_count = best_cluster.get("complaint_count", 1)
        new_count = old_count + 1

        serials = best_cluster.get("complaint_serials", [])
        if isinstance(serials, str):
            import json
            try:
                serials = json.loads(serials)
            except Exception:
                serials = [s.strip() for s in serials.split(",") if s.strip()]
        if serial not in serials:
            serials.append(serial)

        # Update centroid incrementally
        old_lat = best_cluster.get("centroid_lat", lat)
        old_lon = best_cluster.get("centroid_lon", lon)
        new_lat = (old_lat * old_count + lat) / new_count if lat else old_lat
        new_lon = (old_lon * old_count + lon) / new_count if lon else old_lon

        # Recalculate max radius
        radius = max(best_cluster.get("radius_meters", 50.0), min_dist)

        # Priority escalation: if new complaint is High, cluster becomes High
        priority = best_cluster.get("priority", "Medium")
        if new_complaint.get("priority") == "High":
            priority = "High"

        # Growth velocity calculation (+% increase)
        growth_rate = round(min(300.0, (new_count / max(1, old_count) - 1.0) * 100.0 + 25.0), 1)

        updated_cluster = {
            "cluster_id": c_id,
            "title": generate_issue_title(dept, sub_cat, landmark or best_cluster.get("title", ""), new_count),
            "department": dept,
            "priority": priority,
            "status": best_cluster.get("status", "Reported"),
            "centroid_lat": new_lat,
            "centroid_lon": new_lon,
            "radius_meters": radius,
            "complaint_count": new_count,
            "first_reported_at": best_cluster.get("first_reported_at", now_iso),
            "last_reported_at": now_iso,
            "growth_rate_pct": growth_rate,
            "why_grouped": form_plain_language_explanation(dept, new_count, radius, 24.0, [sub_cat]),
            "complaint_serials": serials,
            "updated_at": now_iso
        }
        return c_id, updated_cluster, False

    else:
        # Form new Issue Cluster
        short_id = uuid.uuid4().hex[:5].upper()
        c_id = f"ISSUE-2026-{dept[:3].upper()}-{short_id}"
        new_cluster = {
            "cluster_id": c_id,
            "title": generate_issue_title(dept, sub_cat, landmark, 1),
            "department": dept,
            "priority": new_complaint.get("priority", "Medium"),
            "status": "Reported",
            "centroid_lat": lat or 28.6139,
            "centroid_lon": lon or 77.2090,
            "radius_meters": 50.0,
            "complaint_count": 1,
            "first_reported_at": now_iso,
            "last_reported_at": now_iso,
            "growth_rate_pct": 0.0,
            "why_grouped": form_plain_language_explanation(dept, 1, 50.0, 1.0, [sub_cat]),
            "complaint_serials": [serial],
            "updated_at": now_iso
        }
        return c_id, new_cluster, True


def run_batch_clustering(complaints: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Performs full spatial-semantic clustering across a batch of complaints.
    Used for initial seeding and periodic database optimization.
    """
    if not complaints:
        return []

    clusters_dict = {}
    active_list = []

    for c in complaints:
        cid, cl_data, is_new = assign_or_create_cluster(c, active_list)
        c["cluster_id"] = cid
        clusters_dict[cid] = cl_data

        # Update active_list reference
        if is_new:
            active_list.append(cl_data)
        else:
            for idx, item in enumerate(active_list):
                if item["cluster_id"] == cid:
                    active_list[idx] = cl_data
                    break

    return list(clusters_dict.values())
