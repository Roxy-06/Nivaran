"""
Cross-Grievance Vector Intelligence & Relationship Engine (Tier 5).
Computes dense multilingual embeddings, evaluates Explainable Relationship Scores,
and identifies duplicates and related civic patterns.
"""

import math
import logging
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional, Tuple
import numpy as np

logger = logging.getLogger("nivaran.similarity")

_model = None

def get_embedding_model():
    global _model
    if _model is None:
        try:
            from sentence_transformers import SentenceTransformer
            _model = SentenceTransformer("sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2")
        except Exception as e:
            logger.warning(f"Failed to initialize SentenceTransformer: {e}")
            _model = False
    return _model


def generate_embedding(text: str) -> List[float]:
    """
    Generates a 384-dimensional dense semantic embedding vector for multilingual text.
    """
    if not text or not text.strip():
        return [0.0] * 384

    model = get_embedding_model()
    if model and model is not False:
        try:
            emb = model.encode(text.strip(), convert_to_numpy=True)
            norm = np.linalg.norm(emb)
            if norm > 0:
                emb = emb / norm
            return emb.tolist()
        except Exception as e:
            logger.warning(f"Embedding error: {e}")

    # Deterministic fallback pseudo-embedding
    vec = [0.0] * 384
    words = text.lower().split()
    for i, w in enumerate(words[:384]):
        vec[i % 384] += (hash(w) % 1000) / 1000.0
    return vec


def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Computes great-circle distance between two coordinates in meters.
    """
    R = 6371000  # Earth radius in meters
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)

    a = (math.sin(dphi / 2.0) ** 2 +
         math.cos(phi1) * math.cos(phi2) * (math.sin(dlambda / 2.0) ** 2))
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c


def compute_spatial_similarity(distance_meters: float, half_life_meters: float = 350.0) -> float:
    """
    Decays spatial similarity with distance: 1.0 at 0m, 0.5 at 350m, ~0.1 at 1km.
    """
    if distance_meters <= 30.0:
        return 1.0
    return float(math.exp(-distance_meters / half_life_meters))


def compute_temporal_similarity(dt_hours: float, half_life_hours: float = 48.0) -> float:
    """
    Decays temporal similarity over time: 1.0 at 0h, 0.5 at 48h, ~0.15 at 120h.
    """
    if dt_hours <= 1.0:
        return 1.0
    return float(math.exp(-dt_hours / half_life_hours))


def compute_cosine_similarity(vec1: List[float], vec2: List[float]) -> float:
    """
    Cosine similarity between two normalized vectors.
    """
    if not vec1 or not vec2:
        return 0.0
    v1 = np.array(vec1, dtype=np.float32)
    v2 = np.array(vec2, dtype=np.float32)
    norm1 = np.linalg.norm(v1)
    norm2 = np.linalg.norm(v2)
    if norm1 == 0 or norm2 == 0:
        return 0.0
    return float(np.dot(v1, v2) / (norm1 * norm2))


def compute_explainable_relationship(
    complaint_a: Dict[str, Any],
    complaint_b: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Calculates the 4-Factor Explainable Relationship Score:
    Score = w_sem * S_sem + w_geo * S_geo + w_dept * S_dept + w_temp * S_temp
    """
    # 1. Semantic Similarity (Weight: 0.40)
    emb_a = complaint_a.get("embedding")
    emb_b = complaint_b.get("embedding")
    if not emb_a:
        emb_a = generate_embedding(complaint_a.get("translation") or complaint_a.get("message") or "")
    if not emb_b:
        emb_b = generate_embedding(complaint_b.get("translation") or complaint_b.get("message") or "")

    s_sem = max(0.0, min(1.0, compute_cosine_similarity(emb_a, emb_b)))

    # 2. Geospatial Proximity (Weight: 0.35)
    loc_a = complaint_a.get("location") or {}
    loc_b = complaint_b.get("location") or {}
    lat_a, lon_a = loc_a.get("lat", 0.0), loc_a.get("lon", 0.0)
    lat_b, lon_b = loc_b.get("lat", 0.0), loc_b.get("lon", 0.0)

    if lat_a and lon_a and lat_b and lon_b:
        dist_meters = haversine_distance(lat_a, lon_a, lat_b, lon_b)
        s_geo = compute_spatial_similarity(dist_meters)
    else:
        dist_meters = 99999.0
        s_geo = 0.0

    # 3. Department & Category Match (Weight: 0.15)
    dept_a = complaint_a.get("department")
    dept_b = complaint_b.get("department")
    if dept_a == dept_b:
        s_dept = 1.0
    elif {dept_a, dept_b}.issubset({"Roads Department", "Public Safety"}) or {dept_a, dept_b}.issubset({"Municipality", "Water Board"}):
        s_dept = 0.5
    else:
        s_dept = 0.0

    # 4. Temporal Overlap (Weight: 0.10)
    def parse_time(dt_val):
        if isinstance(dt_val, datetime):
            if dt_val.tzinfo is not None:
                return dt_val.astimezone(timezone.utc).replace(tzinfo=None)
            return dt_val
        if isinstance(dt_val, str):
            try:
                parsed = datetime.fromisoformat(dt_val.replace("Z", "+00:00"))
                if parsed.tzinfo is not None:
                    return parsed.astimezone(timezone.utc).replace(tzinfo=None)
                return parsed
            except Exception:
                pass
        return datetime.now(timezone.utc).replace(tzinfo=None)

    time_a = parse_time(complaint_a.get("reportedAt"))
    time_b = parse_time(complaint_b.get("reportedAt"))
    dt_hours = abs((time_a - time_b).total_seconds()) / 3600.0
    s_temp = compute_temporal_similarity(dt_hours)

    # Weighted Composite Score
    total_score = (0.40 * s_sem) + (0.35 * s_geo) + (0.15 * s_dept) + (0.10 * s_temp)
    total_score = round(min(1.0, max(0.0, total_score)), 3)

    is_duplicate = bool(total_score >= 0.78 and dist_meters <= 250.0 and s_sem >= 0.65)
    is_related = bool(total_score >= 0.55 and dist_meters <= 800.0)

    # Explainable plain-language summary
    explanation_parts = []
    if s_sem >= 0.70:
        explanation_parts.append(f"High semantic overlap ({int(s_sem*100)}%) in grievance description")
    if dist_meters <= 300.0:
        explanation_parts.append(f"Co-located within {int(dist_meters)}m proximity")
    if s_dept == 1.0:
        explanation_parts.append(f"Same jurisdiction ({dept_a})")
    if dt_hours <= 48.0:
        explanation_parts.append(f"Reported within {int(dt_hours)}h timeframe")

    explanation = "; ".join(explanation_parts) if explanation_parts else "Low correlation across parameters"

    return {
        "score": total_score,
        "is_duplicate": is_duplicate,
        "is_related": is_related,
        "distance_meters": round(dist_meters, 1),
        "time_diff_hours": round(dt_hours, 1),
        "breakdown": {
            "semantic_similarity": round(s_sem, 3),
            "spatial_proximity": round(s_geo, 3),
            "department_match": round(s_dept, 3),
            "temporal_overlap": round(s_temp, 3)
        },
        "explanation": explanation
    }


def find_duplicates_and_related(
    new_complaint: Dict[str, Any],
    existing_complaints: List[Dict[str, Any]]
) -> Tuple[Optional[str], float, List[Dict[str, Any]]]:
    """
    Checks an incoming complaint against recent active complaints.
    Returns: (duplicate_of_serial, highest_relationship_score, list_of_related_complaints)
    """
    duplicate_serial = None
    max_score = 0.0
    related_list = []

    for item in existing_complaints:
        if item.get("serial") == new_complaint.get("serial"):
            continue
        rel = compute_explainable_relationship(new_complaint, item)
        score = rel["score"]
        if score > max_score:
            max_score = score

        if rel["is_duplicate"] and not duplicate_serial:
            duplicate_serial = item.get("serial")

        if rel["is_related"] or rel["is_duplicate"]:
            related_list.append({
                "serial": item.get("serial"),
                "score": score,
                "distance_meters": rel["distance_meters"],
                "explanation": rel["explanation"],
                "message": item.get("translation") or item.get("message")
            })

    # Sort related list by relationship score descending
    related_list.sort(key=lambda x: x["score"], reverse=True)

    return duplicate_serial, max_score, related_list[:10]
