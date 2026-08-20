try:
    from sentence_transformers import SentenceTransformer, util
    HAS_ST = True
except Exception:
    HAS_ST = False

import re

model = None
if HAS_ST:
    try:
        model = SentenceTransformer(
            "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2"
        )
    except Exception:
        model = None

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

# Precompute embeddings only if model is available
if model is not None:
    CATEGORY_EMB = {
        dept: model.encode(texts, convert_to_tensor=True)
        for dept, texts in CATEGORIES.items()
    }
    NON_PUBLIC_EMB = model.encode(NON_PUBLIC_TOPICS, convert_to_tensor=True)
else:
    CATEGORY_EMB = {}
    NON_PUBLIC_EMB = None


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

    # If sentence-transformers is available, use embedding based analysis
    if model is not None and NON_PUBLIC_EMB is not None and CATEGORY_EMB:
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

    # Fallback lightweight heuristic when sentence-transformers is unavailable
    norm = _normalize_text(text)
    
    # Non-public quick check
    if _has_any_keyword(norm, NON_PUBLIC_TOPICS):
        return {"notPublicIssue": True, "confidence": 0.6}

    # Department by keyword frequency
    best_dept = "General Administration"
    for dept, kws in CATEGORIES.items():
        if _has_any_keyword(norm, kws):
            best_dept = dept
            break

    # Priority heuristics
    danger = _has_any_keyword(norm, ["danger", "emergency", "risk", "accident", "unsafe"])
    nearby_score = (
        nearby.get("schools", 0)
        + nearby.get("hospitals", 0) * 2
        + nearby.get("residential", 0)
    )

    final_score = (1.0 if danger else 0.0) + nearby_score * 0.3

    if final_score > 1.2:
        priority = "High"
    elif final_score > 0.7:
        priority = "Medium"
    else:
        priority = "Low"

    confidence = 0.5 if best_dept != "General Administration" else 0.3

    return {
        "notPublicIssue": False,
        "department": best_dept,
        "priority": priority,
        "confidence": confidence,
    }
