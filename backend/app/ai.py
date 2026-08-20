from sentence_transformers import SentenceTransformer, util
import re

# ======================================================
# Multilingual semantic model (EN + TA + HI)
# ======================================================

model = SentenceTransformer(
    "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2"
)

FORM_FIELDS = {
    "issue_type": {
        "question": "What kind of civic issue are you reporting?",
        "keywords": [
            "pothole",
            "road",
            "garbage",
            "drainage",
            "sewage",
            "water",
            "leak",
            "power",
            "electricity",
            "street light",
            "lamp",
            "safety",
            "unsafe",
            "traffic signal",
            "wall collapse",
            "flood",
            "overflow",
            "broken",
        ],
    },
    "location": {
        "question": "Can you share the exact nearby landmark, street, or locality where this issue is happening?",
        "keywords": [
            "near",
            "opposite",
            "beside",
            "in front of",
            "street",
            "road",
            "lane",
            "junction",
            "market",
            "school",
            "hospital",
            "temple",
            "park",
            "bus stand",
            "area",
            "locality",
        ],
    },
    "urgency": {
        "question": "Is this an urgent hazard or emergency that could affect people immediately?",
        "keywords": [
            "danger",
            "urgent",
            "emergency",
            "risk",
            "unsafe",
            "accident",
            "hazard",
            "life threatening",
            "falling",
            "collapse",
            "fire",
            "flood",
            "blocked",
        ],
    },
    "impact": {
        "question": "How is this affecting residents, traffic, or public services?",
        "keywords": [
            "affecting",
            "impact",
            "traffic",
            "public",
            "people",
            "school",
            "hospital",
            "resident",
            "blocked",
            "stagnant",
            "overflow",
            "no water",
            "power cut",
            "dark",
            "danger",
        ],
    },
}

# ======================================================
# Civic department reference phrases
# ======================================================

CATEGORIES = {
    "Electricity Board": [
        "street light not working",
        "power cut",
        "electricity problem"
    ],
    "Municipality": [
        "garbage not collected",
        "drainage problem",
        "sewage overflow",
        "waste issue"
    ],
    "Roads Department": [
        "pothole",
        "road damage",
        "traffic signal not working"
    ],
    "Water Board": [
        "water leakage",
        "no water supply",
        "pipeline broken"
    ],
    "Public Safety": [
        "danger",
        "accident risk",
        "unsafe area",
        "school zone danger"
    ]
}

NON_PUBLIC_TOPICS = [
    "movie",
    "relationship",
    "exam",
    "salary",
    "personal issue",
    "company problem"
]

# Precompute embeddings
CATEGORY_EMB = {
    dept: model.encode(texts, convert_to_tensor=True)
    for dept, texts in CATEGORIES.items()
}
NON_PUBLIC_EMB = model.encode(NON_PUBLIC_TOPICS, convert_to_tensor=True)


def _normalize_text(text: str) -> str:
    return re.sub(r"\s+", " ", (text or "").lower()).strip()


def _has_any_keyword(text: str, keywords: list[str]) -> bool:
    norm_text = _normalize_text(text)
    return any(keyword.lower() in norm_text for keyword in keywords)


def get_missing_info_questions(message: str, nearby: dict | None = None) -> dict:
    """Check whether a complaint description is missing critical form information."""
    norm_text = _normalize_text(message)
    nearby = nearby or {}

    if not norm_text:
        return {
            "needs_follow_up": True,
            "missing_fields": ["issue_type", "location", "urgency", "impact"],
            "questions": [
                {"field": field_name, "question": config["question"]}
                for field_name, config in FORM_FIELDS.items()
            ],
        }

    detected = {
        "issue_type": _has_any_keyword(norm_text, FORM_FIELDS["issue_type"]["keywords"]),
        "location": _has_any_keyword(norm_text, FORM_FIELDS["location"]["keywords"]) or bool(nearby and any(nearby.values())),
        "urgency": _has_any_keyword(norm_text, FORM_FIELDS["urgency"]["keywords"]),
        "impact": _has_any_keyword(norm_text, FORM_FIELDS["impact"]["keywords"]) or len(norm_text.split()) >= 12,
    }

    missing_fields = []
    questions = []

    for field_name, config in FORM_FIELDS.items():
        if not detected.get(field_name, False):
            missing_fields.append(field_name)
            questions.append({
                "field": field_name,
                "question": config["question"],
            })

    return {
        "needs_follow_up": bool(missing_fields),
        "missing_fields": missing_fields,
        "questions": questions,
    }


# ======================================================
# AI Analysis
# ======================================================

def analyze_issue(text: str, nearby: dict):
    """
    nearby example:
    {
        "schools": 1,
        "hospitals": 0,
        "residential": 1
    }
    """

    emb = model.encode(text, convert_to_tensor=True)

    # ---------- Public vs Non-public ----------
    non_public_score = util.cos_sim(emb, NON_PUBLIC_EMB).max().item()
    if non_public_score > 0.55:
        return {
            "notPublicIssue": True,
            "confidence": round(non_public_score, 2)
        }

    # ---------- Department Detection ----------
    best_dept = "General Administration"
    best_score = 0.0

    for dept, refs in CATEGORY_EMB.items():
        score = util.cos_sim(emb, refs).max().item()
        if score > best_score:
            best_score = score
            best_dept = dept

    # ---------- Danger / Priority ----------
    danger_refs = model.encode(
        ["danger", "emergency", "risk", "accident", "unsafe"],
        convert_to_tensor=True
    )
    danger_score = util.cos_sim(emb, danger_refs).max().item()

    nearby_score = (
        nearby.get("schools", 0)
        + nearby.get("hospitals", 0) * 2
        + nearby.get("residential", 0)
    )

    final_score = danger_score + nearby_score * 0.3

    if final_score > 1.2:
        priority = "High"
    elif final_score > 0.7:
        priority = "Medium"
    else:
        priority = "Low"

    confidence = round(min(1.0, (best_score + danger_score) / 2), 2)

    return {
        "notPublicIssue": False,
        "department": best_dept,
        "priority": priority,
        "confidence": confidence
    }
