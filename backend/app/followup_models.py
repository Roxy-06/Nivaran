from pydantic import BaseModel
from typing import Dict, List, Optional
from datetime import datetime


class IncompleteSubmission(BaseModel):
    submission_id: str
    original_message: str
    location: Dict[str, float]
    areaImpact: Dict[str, int]
    missing_fields: List[str]
    questions: List[Dict]
    completed_fields: Dict[str, str] = {}
    status: str = "incomplete"
    created_at: datetime = datetime.utcnow()
    final_issue_serial: Optional[str] = None


class FollowUpResponse(BaseModel):
    field: str
    answer: str
