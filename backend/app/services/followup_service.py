from app.followup_models import IncompleteSubmission
from app.database import incomplete_submissions_collection, issues_collection
from app.utils import generate_serial
from datetime import datetime
from typing import Dict, Any


async def create_incomplete_submission(
    original_message: str,
    location: Dict[str, float],
    areaImpact: Dict[str, Any],
    missing_fields: list,
    questions: list,
):
    submission_id = f"INCOMP-{generate_serial()}"

    doc = {
        "submission_id": submission_id,
        "original_message": original_message,
        "location": location,
        "areaImpact": areaImpact,
        "missing_fields": missing_fields,
        "questions": questions,
        "completed_fields": {},
        "status": "incomplete",
        "created_at": datetime.utcnow(),
        "final_issue_serial": None,
    }

    await incomplete_submissions_collection.insert_one(doc)
    return submission_id


async def add_followup_response(submission_id: str, field: str, answer: str):
    doc = await incomplete_submissions_collection.find_one({"submission_id": submission_id})
    if not doc:
        return {"error": "submission_not_found"}

    # update completed fields
    completed = doc.get("completed_fields", {})
    completed[field] = answer

    missing = [f for f in doc.get("missing_fields", []) if f != field]

    update = {
        "$set": {"completed_fields": completed, "missing_fields": missing}
    }

    # if no missing fields remain, finalize into an issue
    finalized = False
    final_serial = None

    if len(missing) == 0:
        # construct final message by appending completed fields
        parts = [doc.get("original_message", "")]
        for k, v in completed.items():
            parts.append(f"{k}: {v}")

        final_message = "\n".join(parts)

        serial = generate_serial()
        issue = {
            "serial": serial,
            "message": final_message,
            "location": doc.get("location"),
            "areaImpact": doc.get("areaImpact"),
            "media": None,
            "status": "Reported",
            "department": "General Administration",
            "priority": "Low",
            "confidence": 0.0,
            "reportedAt": datetime.utcnow(),
        }

        await issues_collection.insert_one(issue)
        update["$set"]["status"] = "completed"
        update["$set"]["final_issue_serial"] = serial
        finalized = True
        final_serial = serial

    await incomplete_submissions_collection.update_one({"submission_id": submission_id}, update)

    return {"finalized": finalized, "serial": final_serial}


async def get_submission(submission_id: str):
    return await incomplete_submissions_collection.find_one({"submission_id": submission_id})
