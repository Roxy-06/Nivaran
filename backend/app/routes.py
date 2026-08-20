import os
import sys
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
from datetime import datetime, timezone

# Ensure backend directory is in python path
backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

try:
    from app.auth import get_current_user, verify_password, create_token
    from app.database import issues_collection, users_collection
    from app.utils import generate_serial
    from app.geo import detect_nearby_places
    from app.ai import analyze_issue
    from app.models import UserLogin
    from app.translator import SUPPORTED_LANGUAGES, translate_to_english, translate_from_english
    from app.voice_engine import transcribe_audio_file, synthesize_speech, convert_to_wav
except ImportError:
    from auth import get_current_user, verify_password, create_token
    from database import issues_collection, users_collection
    from utils import generate_serial
    from geo import detect_nearby_places
    from ai import analyze_issue
    from models import UserLogin
    from translator import SUPPORTED_LANGUAGES, translate_to_english, translate_from_english
    from voice_engine import transcribe_audio_file, synthesize_speech, convert_to_wav


# ======================================================
# ROUTER
# ======================================================
router = APIRouter()

UPLOAD_DIR = "uploads"
VOICE_DIR = os.path.join(UPLOAD_DIR, "voice")
os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(VOICE_DIR, exist_ok=True)

# ======================================================
# AUTH: LOGIN
# ======================================================
@router.post("/auth/login")
async def login(data: UserLogin = Body(...)):
    user = await users_collection.find_one({"email": data.email})

    if not user or not verify_password(data.password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = create_token(
        {
            "user_id": str(user["_id"]),
            "role": user["role"],
            "department": user.get("department"),
        }
    )

    return {
        "token": token,
        "role": user["role"],
        "department": user.get("department"),
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


@router.post("/voice/report-issue")
async def create_voice_issue(
    audio: UploadFile = File(...),
    latitude: float = Form(...),
    longitude: float = Form(...),
    language: str = Form("auto"),
    file: UploadFile = File(None),
):
    """
    End-to-end voice reporting endpoint:
    1. Ingests and archives citizen voice recording.
    2. Transcribes voice in original Indic/global language.
    3. Translates to English for administrative review.
    4. Runs multilingual semantic AI classification & priority scoring.
    5. Saves issue with voice audio and bilingual text.
    """
    audio_bytes = await audio.read()
    serial = generate_serial()

    # Save permanent voice recording
    audio_filename = f"{serial}_voice_{audio.filename or 'recording.webm'}"
    voice_path = f"{VOICE_DIR}/{audio_filename}"
    with open(voice_path, "wb") as f:
        f.write(audio_bytes)

    # Convert and transcribe
    wav_path = convert_to_wav(audio_bytes, audio.filename or "recording.webm")
    try:
        transcription_result = transcribe_audio_file(wav_path, language_code=language)
    finally:
        if os.path.exists(wav_path):
            try:
                os.remove(wav_path)
            except OSError:
                pass

    transcript = transcription_result.get("transcript", "").strip()
    translation = transcription_result.get("translation", "").strip()
    detected_lang = transcription_result.get("detected_language", language or "en")

    if not transcript:
        raise HTTPException(
            status_code=400,
            detail="Speech could not be recognized. Please try recording again in a quieter environment."
        )

    # Semantic issue analysis uses translation or original multilingual transcript
    area_impact = detect_nearby_places(latitude, longitude)
    analysis_text = translation if translation else transcript
    analysis = analyze_issue(analysis_text, area_impact)

    if analysis.get("notPublicIssue"):
        return {
            "notPublicIssue": True,
            "confidence": analysis["confidence"],
            "transcript": transcript,
            "translation": translation,
            "detected_language": detected_lang
        }

    # Save optional media attachment (photo/video)
    media_path = None
    if file:
        filename = f"{serial}_{file.filename}"
        media_path = f"{UPLOAD_DIR}/{filename}"
        with open(media_path, "wb") as f:
            f.write(await file.read())

    issue_doc = {
        "serial": serial,
        "message": translation or transcript,
        "location": {"lat": latitude, "lon": longitude},
        "areaImpact": area_impact,
        "media": media_path,
        "voice_audio": voice_path,
        "detected_language": detected_lang,
        "transcript": transcript,
        "translation": translation,
        "status": "Reported",
        "department": analysis["department"],
        "priority": analysis["priority"],
        "confidence": analysis["confidence"],
        "reportedAt": datetime.now(timezone.utc),
    }

    await issues_collection.insert_one(issue_doc)

    return {
        "serial": serial,
        "department": analysis["department"],
        "priority": analysis["priority"],
        "confidence": analysis["confidence"],
        "transcript": transcript,
        "translation": translation,
        "detected_language": detected_lang,
        "voice_audio": voice_path
    }


# ======================================================
# CREATE ISSUE (PUBLIC - TEXT/VOICE HYBRID)
# ======================================================
@router.post("/issues")
async def create_issue(
    message: str = Form(...),
    latitude: float = Form(...),
    longitude: float = Form(...),
    file: UploadFile = File(None),
    voice_audio_file: UploadFile = File(None),
    transcript: str = Form(None),
    translation: str = Form(None),
    detected_language: str = Form(None),
):
    area_impact = detect_nearby_places(latitude, longitude)
    analysis = analyze_issue(message, area_impact)

    if analysis.get("notPublicIssue"):
        return {
            "notPublicIssue": True,
            "confidence": analysis["confidence"],
        }

    serial = generate_serial()

    media_path = None
    if file:
        filename = f"{serial}_{file.filename}"
        media_path = f"{UPLOAD_DIR}/{filename}"
        with open(media_path, "wb") as f:
            f.write(await file.read())

    voice_path = None
    if voice_audio_file:
        voice_filename = f"{serial}_voice_{voice_audio_file.filename}"
        voice_path = f"{VOICE_DIR}/{voice_filename}"
        with open(voice_path, "wb") as f:
            f.write(await voice_audio_file.read())

    issue_doc = {
        "serial": serial,
        "message": message,
        "location": {"lat": latitude, "lon": longitude},
        "areaImpact": area_impact,
        "media": media_path,
        "voice_audio": voice_path,
        "detected_language": detected_language or "en",
        "transcript": transcript or message,
        "translation": translation or message,
        "status": "Reported",
        "department": analysis["department"],
        "priority": analysis["priority"],
        "confidence": analysis["confidence"],
        "reportedAt": datetime.now(timezone.utc),
    }

    await issues_collection.insert_one(issue_doc)

    return {
        "serial": serial,
        "department": analysis["department"],
        "priority": analysis["priority"],
        "confidence": analysis["confidence"],
        "transcript": issue_doc["transcript"],
        "translation": issue_doc["translation"],
    }


# ======================================================
# GET ISSUE BY SERIAL
# ======================================================
@router.get("/issues/{serial}")
async def get_issue(serial: str):
    issue = await issues_collection.find_one({"serial": serial})

    if not issue:
        raise HTTPException(status_code=404, detail="Issue not found")

    issue["_id"] = str(issue["_id"])
    return issue


# ======================================================
# ADMIN: GET ALL ISSUES
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


# ======================================================
# ADMIN: UPDATE ISSUE (STATUS + PRIORITY ONLY)
# ======================================================
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

    if not allowed:
        raise HTTPException(
            status_code=400, detail="No valid fields to update"
        )

    result = await issues_collection.update_one(
        {"serial": serial}, {"$set": allowed}
    )

    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Issue not found")

    return {"success": True}


# ======================================================
# DEPARTMENT: GET OWN ISSUES
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


# ======================================================
# DEPARTMENT: UPDATE STATUS ONLY
# ======================================================
@router.patch("/department/issues/{serial}")
async def update_issue_department(
    serial: str,
    updates: dict,
    user=Depends(get_current_user),
):
    if user["role"] != "department_user":
        raise HTTPException(status_code=403, detail="Forbidden")

    if "status" not in updates:
        raise HTTPException(
            status_code=400, detail="Only status update allowed"
        )

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
