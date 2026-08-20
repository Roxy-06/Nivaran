"""
Multilingual AI classification and priority scoring engine for Nivaran.
Uses sentence-transformers multilingual model with robust semantic classification.
"""

import logging

logger = logging.getLogger("nivaran.ai")

# Civic department reference phrases
CATEGORIES = {
    "Electricity Board": [
        "street light not working",
        "power cut",
        "electricity problem",
        "electric wire broken",
        "transformer spark",
        "बिजली गुल",
        "மின்சாரம் இல்லை",
        "विद्युत समस्या"
    ],
    "Municipality": [
        "garbage not collected",
        "drainage problem",
        "sewage overflow",
        "waste issue",
        "dirty water stagnant",
        "कचरा नहीं उठाया",
        "குப்பை எடுக்கவில்லை",
        "गंदगी और बदबू"
    ],
    "Roads Department": [
        "pothole",
        "road damage",
        "traffic signal not working",
        "broken road",
        "manhole open",
        "सड़क में गड्ढा",
        "சாலை சேதம்",
        "रास्ता खराब"
    ],
    "Water Board": [
        "water leakage",
        "no water supply",
        "pipeline broken",
        "drinking water issue",
        "पानी की लीकेज",
        "குடிநீர் பற்றாக்குறை",
        "नल में पानी नहीं आ रहा"
    ],
    "Public Safety": [
        "danger",
        "accident risk",
        "unsafe area",
        "school zone danger",
        "open electric wire",
        "खतरा",
        "அபாயம்",
        "सुरक्षा समस्या"
    ]
}

NON_PUBLIC_TOPICS = [
    "movie",
    "relationship",
    "exam",
    "salary",
    "personal issue",
    "company problem",
    "film",
    "love"
]

_model = None
_category_emb = None
_non_public_emb = None
_danger_emb = None

def get_model():
    global _model, _category_emb, _non_public_emb, _danger_emb
    if _model is None:
        try:
            from sentence_transformers import SentenceTransformer
            _model = SentenceTransformer("sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2")
            _category_emb = {
                dept: _model.encode(texts, convert_to_tensor=True)
                for dept, texts in CATEGORIES.items()
            }
            _non_public_emb = _model.encode(NON_PUBLIC_TOPICS, convert_to_tensor=True)
            _danger_emb = _model.encode(
                ["danger", "emergency", "risk", "accident", "unsafe", "hazard", "threat"],
                convert_to_tensor=True
            )
        except Exception as e:
            logger.warning(f"Could not load SentenceTransformer: {e}. Using keyword semantic matching.")
            _model = False
    return _model

def analyze_issue(text: str, nearby: dict):
    """
    Analyzes civic report text (original or translated) and calculates
    department routing, priority level, and public vs personal filtering.
    """
    model = get_model()
    lower_text = text.lower() if text else ""

    # If neural transformer is available
    if model and model is not False:
        try:
            from sentence_transformers import util
            emb = model.encode(text, convert_to_tensor=True)

            # 1. Check Public vs Non-Public
            non_public_score = util.cos_sim(emb, _non_public_emb).max().item()
            if non_public_score > 0.55:
                return {
                    "notPublicIssue": True,
                    "confidence": round(non_public_score, 2)
                }

            # 2. Department Detection
            best_dept = "General Administration"
            best_score = 0.0

            for dept, refs in _category_emb.items():
                score = util.cos_sim(emb, refs).max().item()
                if score > best_score:
                    best_score = score
                    best_dept = dept

            # 3. Danger / Priority
            danger_score = util.cos_sim(emb, _danger_emb).max().item()
            nearby_score = (
                nearby.get("schools", 0)
                + nearby.get("hospitals", 0) * 2
                + nearby.get("residential", 0)
            )

            final_score = danger_score + nearby_score * 0.3

            if final_score > 1.2 or danger_score > 0.6:
                priority = "High"
            elif final_score > 0.7 or danger_score > 0.4:
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
        except Exception as e:
            logger.warning(f"Error during transformer inference: {e}. Falling back to rule-based classification.")

    # Rule-based fallback
    for non_pub in NON_PUBLIC_TOPICS:
        if non_pub in lower_text:
            return {"notPublicIssue": True, "confidence": 0.85}

    matched_dept = "General Administration"
    max_matches = 0
    for dept, phrases in CATEGORIES.items():
        matches = sum(1 for phrase in phrases if any(word in lower_text for word in phrase.lower().split()))
        if matches > max_matches:
            max_matches = matches
            matched_dept = dept

    # Priority
    danger_words = ["danger", "emergency", "risk", "accident", "unsafe", "fire", "spark", "die", "death", "hazard", "خतरा", "காயம்", "विस्फोट"]
    is_danger = any(w in lower_text for w in danger_words)
    nearby_score = nearby.get("schools", 0) + nearby.get("hospitals", 0) * 2 + nearby.get("residential", 0)

    if is_danger or nearby_score >= 3:
        priority = "High"
    elif nearby_score >= 1 or max_matches >= 2:
        priority = "Medium"
    else:
        priority = "Low"

    return {
        "notPublicIssue": False,
        "department": matched_dept,
        "priority": priority,
        "confidence": 0.88 if max_matches > 0 else 0.70
    }
