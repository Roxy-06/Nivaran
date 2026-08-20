from fastapi import (
    APIRouter,
    UploadFile,
    File,
    Form,
    HTTPException,
    Body,
    Depends,
)
from datetime import datetime
import os

from app.auth import get_current_user, verify_password, create_token
from app.database import issues_collection, users_collection
from app.utils import generate_serial
from app.geo import detect_nearby_places
from app.ai import analyze_issue, get_missing_info_questions
from app.models import UserLogin

# ======================================================
# ROUTER
# ======================================================
router = APIRouter()

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

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
# FOLLOW-UP CHECK: MISSING INFO AGAINST FORM FIELDS
# ======================================================
@router.post("/issues/follow-up")
async def follow_up_questions(
    message: str = Form(...),
    latitude: float | None = Form(None),
    longitude: float | None = Form(None),
):
    nearby = {}
    if latitude is not None and longitude is not None:
        nearby = detect_nearby_places(latitude, longitude)

    return get_missing_info_questions(message, nearby)


# ======================================================
# CREATE ISSUE (PUBLIC)
# ======================================================
@router.post("/issues")
async def create_issue(
    message: str = Form(...),
    latitude: float = Form(...),
    longitude: float = Form(...),
    file: UploadFile = File(None),
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

    issue_doc = {
        "serial": serial,
        "message": message,
        "location": {"lat": latitude, "lon": longitude},
        "areaImpact": area_impact,
        "media": media_path,
        "status": "Reported",
        "department": analysis["department"],
        "priority": analysis["priority"],
        "confidence": analysis["confidence"],
        "reportedAt": datetime.utcnow(),
    }

    await issues_collection.insert_one(issue_doc)

    return {
        "serial": serial,
        "department": analysis["department"],
        "priority": analysis["priority"],
        "confidence": analysis["confidence"],
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
