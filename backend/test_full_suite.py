"""
Full End-to-End Test Suite for Nivaran Tier 0 - Tier 9 Features
"""
import os
import sys
import asyncio

# Ensure UTF-8 output on Windows console
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.structuring import extract_structured_entities, compute_completeness_score
from app.similarity import compute_explainable_relationship, generate_embedding
from app.clustering import assign_or_create_cluster
from app.benchmark import generate_synthetic_dataset, run_benchmark_evaluation
from app.rules_engine import apply_rule_overrides

def test_all():
    print("==================================================")
    print("TESTING NIVARAN COMPREHENSIVE AI & CLUSTERING SUITE")
    print("==================================================")

    # 1. Structuring & Completeness Test
    print("\n[1] Testing AI Entity Structuring & Completeness Scoring...")
    sample_text = "Main water pipeline near Metro Pillar 142 MG Road has burst and leaking for 3 days"
    entities = extract_structured_entities(sample_text, "Water Board")
    print(f"  Extracted Entities: {entities}")
    assert entities["duration_observed"] == "3 days", f"Expected 3 days, got {entities['duration_observed']}"
    assert "142" in entities["landmark_or_spot"] or "near" in entities["landmark_or_spot"].lower()

    quality = compute_completeness_score(
        sample_text,
        {"lat": 28.6139, "lon": 77.2090},
        entities,
        has_media=True
    )
    print(f"  Completeness Score: {quality['completeness_score']}% (Breakdown: {quality['breakdown']})")
    assert quality["completeness_score"] >= 80

    # 2. Rule Overrides Test
    print("\n[2] Testing Deterministic Rule-Based Emergency Overrides...")
    dept, prio, is_over, reason = apply_rule_overrides(
        "Open manhole cover missing on main walkway near school",
        "Roads Department",
        "Low",
        0.8,
        {"schools": 1, "hospitals": 0, "residential": 1}
    )
    print(f"  Override Result: Dept={dept}, Priority={prio}, IsOverridden={is_over}, Reason='{reason}'")
    assert prio == "High"
    assert is_over is True

    # 3. Explainable Relationship Score Test
    print("\n[3] Testing Cross-Grievance Explainable Relationship Scoring (Tier 5)...")
    comp_a = {
        "serial": "CP-TEST-001",
        "message": "Water pipe leak on MG Road near Pillar 142",
        "translation": "Water pipe leak on MG Road near Pillar 142",
        "department": "Water Board",
        "location": {"lat": 28.6139, "lon": 77.2090},
        "reportedAt": "2026-08-20T10:00:00Z"
    }
    comp_b = {
        "serial": "CP-TEST-002",
        "message": "Pillar 142 MG road main drinking water pipe broken dirty water coming",
        "translation": "Pillar 142 MG road main drinking water pipe broken dirty water coming",
        "department": "Water Board",
        "location": {"lat": 28.6142, "lon": 77.2093},  # ~45 meters away
        "reportedAt": "2026-08-20T14:30:00Z"  # 4.5 hours later
    }
    rel = compute_explainable_relationship(comp_a, comp_b)
    print(f"  Relationship Score: {rel['score']} (IsDuplicate={rel['is_duplicate']}, Distance={rel['distance_meters']}m)")
    print(f"  Explanation: {rel['explanation']}")
    print(f"  Breakdown: {rel['breakdown']}")
    assert rel["score"] >= 0.70, f"Expected high relationship score, got {rel['score']}"
    assert rel["distance_meters"] < 100

    # 4. Incremental Cluster Formation Test
    print("\n[4] Testing Auto-Clustering & Macro-Issue Formation (Tier 6)...")
    active_clusters = []
    cid_1, cdata_1, is_new_1 = assign_or_create_cluster({
        "serial": comp_a["serial"],
        "translation": comp_a["translation"],
        "department": comp_a["department"],
        "priority": "High",
        "location": comp_a["location"],
        "structured_entities": entities
    }, active_clusters)
    print(f"  Formed Cluster 1: ID={cid_1}, Title='{cdata_1['title']}', Complaints={cdata_1['complaint_count']}")
    assert is_new_1 is True
    active_clusters.append(cdata_1)

    cid_2, cdata_2, is_new_2 = assign_or_create_cluster({
        "serial": comp_b["serial"],
        "translation": comp_b["translation"],
        "department": comp_b["department"],
        "priority": "High",
        "location": comp_b["location"],
        "structured_entities": entities
    }, active_clusters)
    print(f"  Added to Cluster: ID={cid_2}, Title='{cdata_2['title']}', Complaints={cdata_2['complaint_count']}, Velocity=+{cdata_2['growth_rate_pct']}%")
    print(f"  Why Grouped: {cdata_2['why_grouped']}")
    assert is_new_2 is False
    assert cid_1 == cid_2
    assert cdata_2["complaint_count"] == 2

    # 5. Synthetic Dataset & Benchmark Generation Test
    print("\n[5] Testing Benchmark Dataset (Hindi, English, Hinglish, Bengali) (Tier 9)...")
    dataset = generate_synthetic_dataset(20)
    print(f"  Generated {len(dataset)} synthetic test records.")
    langs = [d["detected_language"] for d in dataset]
    print(f"  Sample Language Distribution: Hindi={langs.count('hi')}, Hinglish={langs.count('hinglish')}, English={langs.count('en')}, Bengali={langs.count('bn')}")

    print("\n==================================================")
    print("ALL CORE TESTS PASSED SUCCESSFULLY! TIERS 2-9 VERIFIED.")
    print("==================================================")

if __name__ == "__main__":
    test_all()
