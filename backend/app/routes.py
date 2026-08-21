import os
import sys
import json
import logging
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any

from fastapi import (
    APIRouter,
    UploadFile,
    File,
    Form,
    HTTPException,
    Body,
    Depends,
)
from fastapi.responses import StreamingResponse

# Ensure backend directory is in python path
backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

try:
    from app.auth import get_current_user, verify_password, create_token
    from app.database import (
        issues_collection,
        users_collection,
        clusters_collection,
        audit_logs_collection,
    )
    from app.utils import generate_serial
    from app.geo import detect_nearby_places, reverse_geocode
    from app.ai import analyze_issue
    from app.models import UserLogin
    from app.translator import SUPPORTED_LANGUAGES, translate_to_english, translate_from_english
    from app.voice_engine import transcribe_audio_file, synthesize_speech, convert_to_wav
    from app.structuring import extract_structured_entities, compute_completeness_score
    from app.rules_engine import apply_rule_overrides
    from app.similarity import (
        generate_embedding,
        compute_explainable_relationship,
        find_duplicates_and_related,
    )
    from app.clustering import assign_or_create_cluster, run_batch_clustering
    from app.benchmark import generate_synthetic_dataset, run_benchmark_evaluation, get_cached_or_evaluate_benchmark
except ImportError:
    from auth import get_current_user, verify_password, create_token
    from database import (
        issues_collection,
        users_collection,
        clusters_collection,
        audit_logs_collection,
    )
    from utils import generate_serial
    from geo import detect_nearby_places, reverse_geocode
    from ai import analyze_issue
    from models import UserLogin
    from translator import SUPPORTED_LANGUAGES, translate_to_english, translate_from_english
    from voice_engine import transcribe_audio_file, synthesize_speech, convert_to_wav
    from structuring import extract_structured_entities, compute_completeness_score
    from rules_engine import apply_rule_overrides
    from similarity import (
        generate_embedding,
        compute_explainable_relationship,
        find_duplicates_and_related,
    )
    from clustering import assign_or_create_cluster, run_batch_clustering
    from benchmark import generate_synthetic_dataset, run_benchmark_evaluation, get_cached_or_evaluate_benchmark

logger = logging.getLogger("nivaran.routes")

# ======================================================
# ROUTER
# ======================================================
router = APIRouter()

UPLOAD_DIR = "uploads"
VOICE_DIR = os.path.join(UPLOAD_DIR, "voice")
os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(VOICE_DIR, exist_ok=True)


# ======================================================
# GEO & UTILITIES
# ======================================================
@router.get("/geo/reverse")
async def get_reverse_geocode(lat: float, lon: float):
    """Reverse geocodes coordinates to street address and locality."""
    return reverse_geocode(lat, lon)


# ======================================================
# AUTH: LOGIN
# ======================================================
@router.post("/auth/login")
async def login(data: UserLogin = Body(...)):
    user = await users_collection.find_one({"email": data.email})

    if not user or not verify_password(data.password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    user_id_val = str(user.get("_id") or user.get("id") or "1")
    token = create_token(
        {
            "user_id": user_id_val,
            "role": user["role"],
            "department": user.get("department"),
            "email": user["email"],
        }
    )

    return {
        "token": token,
        "role": user["role"],
        "department": user.get("department"),
        "email": user["email"],
    }


# ======================================================
# MULTILINGUAL VOICE PIPELINE ROUTES
# ======================================================
@router.get("/voice/languages")
async def get_supported_languages():
    """Returns the list of supported Indic and global languages."""
    return {"languages": SUPPORTED_LANGUAGES}


@router.post("/voice/transcribe")
async def transcribe_audio(
    audio: UploadFile = File(...),
    language: str = Form("auto")
):
    """
    Transcribes audio into text, identifies the spoken language,
    and returns both the native transcript and English translation.
    """
    audio_bytes = await audio.read()
    wav_path = convert_to_wav(audio_bytes, audio.filename or "audio.wav")

    try:
        result = transcribe_audio_file(wav_path, language_code=language)
    finally:
        if os.path.exists(wav_path):
            try:
                os.remove(wav_path)
            except OSError:
                pass

    if not result.get("transcript"):
        raise HTTPException(status_code=400, detail="Could not recognize speech from audio. Please speak clearly.")

    return result


@router.post("/voice/synthesize")
async def synthesize_voice(
    text: str = Body(..., embed=True),
    language: str = Body("en", embed=True),
):
    """
    Synthesizes speech from text in the requested language (Text-to-Speech)
    and streams back an MP3 audio file.
    """
    audio_stream = synthesize_speech(text, language_code=language)
    return StreamingResponse(audio_stream, media_type="audio/mpeg")


# ======================================================
# AI STRUCTURING & PREVIEW (TIER 2 & 3)
# ======================================================
@router.post("/issues/preview")
async def preview_issue(
    message: str = Body(..., embed=True),
    latitude: Optional[float] = Body(None, embed=True),
    longitude: Optional[float] = Body(None, embed=True),
    source_language: str = Body("auto", embed=True),
    has_media: bool = Body(False, embed=True)
):
    """
    Real-time grievance analysis & quality preview:
    1. Translates Indic dialects / code-mixed text to standardized English.
    2. Runs AI semantic classification and sensitive area impact.
    3. Extracts structured entities (category, subcategory, duration, landmark, urgency).
    4. Computes 0-100% Completeness Score.
    5. Returns single targeted clarification question if context is missing.
    """
    # 1. Standardize translation
    translation, detected_lang = translate_to_english(message, source_lang=source_language)
    analysis_text = translation if translation else message

    # 2. Geo impact
    nearby = {"schools": 0, "hospitals": 0, "residential": 1}
    if latitude and longitude:
        nearby = detect_nearby_places(latitude, longitude)

    # 3. AI Analysis
    ai_res = analyze_issue(analysis_text, nearby)
    if ai_res.get("notPublicIssue"):
        return {
            "notPublicIssue": True,
            "confidence": ai_res.get("confidence", 0.9),
            "translation": translation,
            "detected_language": detected_lang
        }

    ai_dept = ai_res.get("department", "General Administration")
    ai_prio = ai_res.get("priority", "Low")
    ai_conf = ai_res.get("confidence", 0.8)

    # 4. Deterministic Override Check
    final_dept, final_prio, is_override, override_reason = apply_rule_overrides(
        analysis_text, ai_dept, ai_prio, ai_conf, nearby
    )

    # 5. Extract Structured Entities
    entities = extract_structured_entities(analysis_text, final_dept)

    # 6. Completeness Score
    loc_dict = {"lat": latitude, "lon": longitude} if latitude and longitude else None
    quality = compute_completeness_score(analysis_text, loc_dict, entities, has_media=has_media)

    return {
        "notPublicIssue": False,
        "transcript": message,
        "translation": translation,
        "detected_language": detected_lang,
        "department": final_dept,
        "priority": final_prio,
        "confidence": ai_conf,
        "is_overridden": is_override,
        "override_reason": override_reason,
        "structured_entities": entities,
        "completeness_score": quality["completeness_score"],
        "breakdown": quality["breakdown"],
        "missing_fields": quality["missing_fields"],
        "clarification_question": quality["clarification_question"]
    }


# ======================================================
# CREATE ISSUE (PUBLIC - TEXT/VOICE HYBRID WITH CLUSTERING)
# ======================================================
@router.post("/issues")
async def create_issue(
    message: str = Form(...),
    latitude: float = Form(...),
    longitude: float = Form(...),
    address: str = Form(None),
    file: UploadFile = File(None),
    voice_audio_file: UploadFile = File(None),
    transcript: str = Form(None),
    translation: str = Form(None),
    detected_language: str = Form(None),
    structured_entities: str = Form(None),
    completeness_score: int = Form(80),
    clarification_response: str = Form(None),
):
    area_impact = detect_nearby_places(latitude, longitude)
    analysis_text = translation or message

    analysis = analyze_issue(analysis_text, area_impact)
    if analysis.get("notPublicIssue"):
        return {
            "notPublicIssue": True,
            "confidence": analysis["confidence"],
        }

    # Deterministic rule override
    final_dept, final_prio, is_override, override_reason = apply_rule_overrides(
        analysis_text, analysis["department"], analysis["priority"], analysis["confidence"], area_impact
    )

    serial = generate_serial()

    # Save optional media
    media_path = None
    if file:
        filename = f"{serial}_{file.filename}"
        media_path = f"{UPLOAD_DIR}/{filename}"
        with open(media_path, "wb") as f:
            f.write(await file.read())

    # Save optional voice recording
    voice_path = None
    if voice_audio_file:
        voice_filename = f"{serial}_voice_{voice_audio_file.filename}"
        voice_path = f"{VOICE_DIR}/{voice_filename}"
        with open(voice_path, "wb") as f:
            f.write(await voice_audio_file.read())

    address_val = address or reverse_geocode(latitude, longitude).get("formatted_address")

    # Structured entities parse or extract
    parsed_entities = None
    if structured_entities:
        try:
            parsed_entities = json.loads(structured_entities)
        except Exception:
            pass
    if not parsed_entities:
        parsed_entities = extract_structured_entities(analysis_text, final_dept)

    if clarification_response:
        analysis_text = f"{analysis_text} [Clarification: {clarification_response}]"

    # Generate dense semantic embedding
    emb = generate_embedding(analysis_text)

    # Step 1: Duplicate & Relationship check against existing complaints
    existing_recent = await issues_collection.find().to_list(100)
    dup_serial, max_rel_score, related_list = find_duplicates_and_related(
        {
            "serial": serial,
            "message": analysis_text,
            "translation": analysis_text,
            "department": final_dept,
            "location": {"lat": latitude, "lon": longitude},
            "reportedAt": datetime.now(timezone.utc).isoformat(),
            "embedding": emb
        },
        existing_recent
    )

    # Step 2: Incremental Cluster Formation (Tier 6)
    active_clusters = await clusters_collection.find().to_list(100)
    cluster_id, cluster_data, is_new_cluster = assign_or_create_cluster(
        {
            "serial": serial,
            "message": analysis_text,
            "translation": analysis_text,
            "department": final_dept,
            "priority": final_prio,
            "location": {"lat": latitude, "lon": longitude},
            "structured_entities": parsed_entities,
            "embedding": emb
        },
        active_clusters
    )
    await clusters_collection.insert_or_update(cluster_data)

    issue_doc = {
        "serial": serial,
        "message": message,
        "location": {"lat": latitude, "lon": longitude, "address": address_val},
        "areaImpact": area_impact,
        "media": media_path,
        "voice_audio": voice_path,
        "detected_language": detected_language or "en",
        "transcript": transcript or message,
        "translation": translation or message,
        "status": "Reported",
        "department": final_dept,
        "priority": final_prio,
        "confidence": analysis["confidence"],
        "reportedAt": datetime.now(timezone.utc),
        "structured_entities": parsed_entities,
        "completeness_score": completeness_score,
        "clarification_history": {"response": clarification_response} if clarification_response else None,
        "is_duplicate": bool(dup_serial is not None),
        "duplicate_of_serial": dup_serial,
        "cluster_id": cluster_id,
        "relationship_score": max_rel_score,
        "ai_recommendation": {
            "predicted_department": analysis["department"],
            "predicted_priority": analysis["priority"],
            "confidence": analysis["confidence"],
            "is_overridden": is_override
        },
        "override_reason": override_reason if is_override else None,
        "embedding": emb
    }

    await issues_collection.insert_one(issue_doc)

    return {
        "serial": serial,
        "department": final_dept,
        "priority": final_prio,
        "confidence": analysis["confidence"],
        "transcript": issue_doc["transcript"],
        "translation": issue_doc["translation"],
        "location": issue_doc["location"],
        "completeness_score": completeness_score,
        "is_duplicate": bool(dup_serial is not None),
        "duplicate_of_serial": dup_serial,
        "cluster_id": cluster_id,
        "cluster_title": cluster_data.get("title"),
        "relationship_score": max_rel_score,
        "related_complaints_count": len(related_list)
    }


# ======================================================
# MACRO ISSUE CLUSTERS
# ======================================================
@router.get("/issues/clusters")
async def get_all_clusters(user=Depends(get_current_user)):
    """
    Returns all active macro-issue clusters for the Admin or Department feed.
    """
    query = {}
    if user.get("role") == "department_user" and user.get("department"):
        query["department"] = user["department"]

    clusters = await clusters_collection.find(query).to_list(200)

    # Sort by priority High -> Medium -> Low and growth rate
    priority_map = {"High": 1, "Medium": 2, "Low": 3}
    clusters.sort(key=lambda c: (priority_map.get(c.get("priority", "Low"), 3), -float(c.get("growth_rate_pct", 0))))
    return clusters


@router.get("/issues/clusters/{cluster_id}")
async def get_cluster_details(cluster_id: str, user=Depends(get_current_user)):
    """
    Retrieves full details of a cluster including member complaints.
    """
    cluster = await clusters_collection.find_one({"cluster_id": cluster_id})
    if not cluster:
        raise HTTPException(status_code=404, detail="Cluster not found")

    # Fetch supporting member complaints
    serials = cluster.get("complaint_serials", [])
    supporting_complaints = []
    for s in serials:
        c_doc = await issues_collection.find_one({"serial": s})
        if c_doc:
            c_doc["_id"] = str(c_doc["_id"])
            supporting_complaints.append(c_doc)

    cluster["supporting_complaints"] = supporting_complaints
    return cluster


@router.patch("/issues/clusters/{cluster_id}")
async def update_cluster_status(
    cluster_id: str,
    updates: dict = Body(...),
    user=Depends(get_current_user)
):
    """
    Batch Resolution Action: Updating a Macro Issue Cluster's status
    automatically cascades to all linked citizen complaints.
    """
    cluster = await clusters_collection.find_one({"cluster_id": cluster_id})
    if not cluster:
        raise HTTPException(status_code=404, detail="Cluster not found")

    new_status = updates.get("status")
    new_priority = updates.get("priority")
    rationale = updates.get("rationale", "Officer cluster batch update")

    cluster_updates = {"updated_at": datetime.now(timezone.utc).isoformat()}
    if new_status:
        cluster_updates["status"] = new_status
    if new_priority:
        cluster_updates["priority"] = new_priority

    await clusters_collection.update_one({"cluster_id": cluster_id}, {"$set": cluster_updates})

    # Cascade to all member complaints
    serials = cluster.get("complaint_serials", [])
    if isinstance(serials, str):
        try:
            serials = json.loads(serials)
        except Exception:
            serials = [s.strip() for s in serials.split(",") if s.strip()]

    complaint_update = {}
    if new_status:
        complaint_update["status"] = new_status
    if new_priority:
        complaint_update["priority"] = new_priority

    if complaint_update:
        # Update by cluster_id foreign key
        await issues_collection.update_one({"cluster_id": cluster_id}, {"$set": complaint_update})
        # Also update by each serial directly
        for s in serials:
            await issues_collection.update_one({"serial": s}, {"$set": complaint_update})

    # Log audit trail
    await audit_logs_collection.insert_one({
        "user_email": user.get("email", "officer@nivaran.in"),
        "action": "BATCH_CLUSTER_STATUS_UPDATE",
        "target_serial": cluster_id,
        "previous_val": cluster.get("status"),
        "new_val": new_status,
        "rationale": f"{rationale} (Updated {len(serials)} linked citizen complaints)"
    })

    return {"success": True, "updated_count": len(serials)}


# ======================================================
# GET ISSUE BY SERIAL (WITH MACRO CLUSTER DATA)
# ======================================================
@router.get("/issues/{serial}")
async def get_issue(serial: str):
    issue = await issues_collection.find_one({"serial": serial})
    if not issue:
        raise HTTPException(status_code=404, detail="Issue not found")

    issue["_id"] = str(issue["_id"])

    # Attach cluster details if part of a cluster
    if issue.get("cluster_id"):
        cluster = await clusters_collection.find_one({"cluster_id": issue["cluster_id"]})
        if cluster:
            issue["cluster_details"] = {
                "title": cluster.get("title"),
                "total_complaints": cluster.get("complaint_count", 1),
                "why_grouped": cluster.get("why_grouped"),
                "status": cluster.get("status"),
                "growth_rate_pct": cluster.get("growth_rate_pct", 0.0)
            }

    return issue


@router.post("/issues/{serial}/feedback")
async def submit_issue_feedback(serial: str, payload: dict = Body(...)):
    """
    Citizen satisfaction rating & feedback submission for resolved issues.
    """
    rating = int(payload.get("rating", 5))
    feedback = str(payload.get("feedback", "")).strip()

    issue = await issues_collection.find_one({"serial": serial})
    if not issue:
        raise HTTPException(status_code=404, detail="Issue not found")

    await issues_collection.update_one(
        {"serial": serial},
        {"$set": {"rating": rating, "citizen_feedback": feedback}}
    )

    await audit_logs_collection.insert_one({
        "user_email": "citizen@nivaran.in",
        "action": "CITIZEN_RESOLUTION_FEEDBACK",
        "target_serial": serial,
        "previous_val": str(issue.get("rating")),
        "new_val": f"{rating} Stars: {feedback}",
        "rationale": f"Citizen submitted {rating}-star feedback on resolved issue {serial}"
    })

    return {"success": True, "serial": serial, "rating": rating, "feedback": feedback}


# ======================================================
# ADMIN: GET ALL ISSUES & UPDATE
# ======================================================
@router.get("/admin/issues")
async def admin_issues(user=Depends(get_current_user)):
    if user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Forbidden")

    issues = (
        await issues_collection.find()
        .sort("reportedAt", -1)
        .to_list(1000)
    )

    for issue in issues:
        issue["_id"] = str(issue["_id"])

    return issues


@router.patch("/admin/issues/{serial}")
async def update_issue_admin(
    serial: str,
    updates: dict,
    user=Depends(get_current_user),
):
    if user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Forbidden")

    allowed = {}
    if "status" in updates:
        allowed["status"] = updates["status"]
    if "priority" in updates:
        allowed["priority"] = updates["priority"]
    if "department" in updates:
        allowed["department"] = updates["department"]

    if not allowed:
        raise HTTPException(status_code=400, detail="No valid fields to update")

    prev = await issues_collection.find_one({"serial": serial})
    result = await issues_collection.update_one(
        {"serial": serial}, {"$set": allowed}
    )

    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Issue not found")

    # Record audit log
    await audit_logs_collection.insert_one({
        "user_email": user.get("email", "admin@nivaran.in"),
        "action": "ADMIN_OVERRIDE",
        "target_serial": serial,
        "previous_val": json.dumps({k: prev.get(k) for k in allowed.keys()}) if prev else "",
        "new_val": json.dumps(allowed),
        "rationale": updates.get("rationale", "Admin manual triage override")
    })

    return {"success": True}


# ======================================================
# DEPARTMENT: GET OWN ISSUES & UPDATE
# ======================================================
@router.get("/department/issues")
async def department_issues(user=Depends(get_current_user)):
    if user["role"] != "department_user":
        raise HTTPException(status_code=403, detail="Access denied")

    issues = await issues_collection.find(
        {"department": user["department"]}
    ).to_list(500)

    for issue in issues:
        issue["_id"] = str(issue["_id"])

    return issues


@router.patch("/department/issues/{serial}")
async def update_issue_department(
    serial: str,
    updates: dict,
    user=Depends(get_current_user),
):
    if user["role"] != "department_user":
        raise HTTPException(status_code=403, detail="Forbidden")

    if "status" not in updates:
        raise HTTPException(status_code=400, detail="Only status update allowed")

    result = await issues_collection.update_one(
        {
            "serial": serial,
            "department": user["department"],
        },
        {"$set": {"status": updates["status"]}},
    )

    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Issue not found")

    return {"success": True}


# ======================================================
# AI METRICS, BENCHMARK & SEEDING (TIER 9)
# ======================================================
@router.get("/admin/metrics")
async def get_ai_metrics(recompute: bool = False, user=Depends(get_current_user)):
    """
    Returns live performance metrics for the Admin Dashboard.
    """
    return get_cached_or_evaluate_benchmark(force_recompute=recompute)


@router.post("/admin/seed-benchmark")
async def seed_benchmark_data(user=Depends(get_current_user)):
    """
    Seeds 300+ synthetic multilingual complaints (heavily weighted in Hindi,
    English, Hinglish, Bengali) and auto-clusters them into macro Issue Cards.
    """
    if user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Only admin can seed benchmark data")

    # Clear existing synthetic data if needed or append
    dataset = generate_synthetic_dataset(300)

    inserted_count = 0
    active_clusters = []

    for item in dataset:
        text = item["message"]
        lang = item["detected_language"]
        trans = item.get("translation") or text

        analysis = analyze_issue(trans, item["areaImpact"])
        dept = analysis.get("department", item["ground_truth"]["department"])
        prio = analysis.get("priority", item["ground_truth"]["priority"])

        emb = generate_embedding(trans)
        struct = extract_structured_entities(trans, dept)

        cid, c_data, is_new = assign_or_create_cluster({
            "serial": item["serial"],
            "message": text,
            "translation": trans,
            "department": dept,
            "priority": prio,
            "location": item["location"],
            "structured_entities": struct,
            "embedding": emb
        }, active_clusters)

        if is_new:
            active_clusters.append(c_data)
        else:
            for idx, c in enumerate(active_clusters):
                if c["cluster_id"] == cid:
                    active_clusters[idx] = c_data
                    break

        await clusters_collection.insert_or_update(c_data)

        doc = {
            "serial": item["serial"],
            "message": text,
            "location": item["location"],
            "areaImpact": item["areaImpact"],
            "media": None,
            "voice_audio": None,
            "detected_language": lang,
            "transcript": text,
            "translation": trans,
            "status": "Reported",
            "department": dept,
            "priority": prio,
            "confidence": analysis.get("confidence", 0.92),
            "reportedAt": item["reportedAt"],
            "structured_entities": struct,
            "completeness_score": 85,
            "is_duplicate": item["ground_truth"]["is_duplicate"],
            "cluster_id": cid,
            "relationship_score": 0.85 if item["ground_truth"]["is_duplicate"] else 0.0,
            "embedding": emb
        }
        await issues_collection.insert_one(doc)
        inserted_count += 1

    return {
        "success": True,
        "inserted_complaints": inserted_count,
        "formed_clusters": len(active_clusters),
        "message": f"Successfully seeded {inserted_count} multilingual complaints into {len(active_clusters)} macro-issue clusters."
    }
