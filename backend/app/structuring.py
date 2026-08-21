"""
AI Structuring & Quality Layer for Nivaran (Tier 2 & Tier 3).
Extracts structured grievance entities, computes completeness score,
and detects missing context for targeted clarification.
"""

import re
import logging
from typing import Dict, Any, List, Optional

logger = logging.getLogger("nivaran.structuring")

# Subcategories mapped to parent departments
SUBCATEGORIES = {
    "Water Board": [
        "Pipeline Leakage",
        "Contaminated / Muddy Water",
        "Low Water Pressure",
        "No Water Supply",
        "Broken Water Meter",
        "Drainage Infiltration in Supply",
    ],
    "Electricity Board": [
        "Power Cut / Outage",
        "Streetlight Malfunction",
        "Transformer Spark / Hazard",
        "Dangling / Broken Electric Wire",
        "Fluctuating Voltage",
        "Meter Sparking",
    ],
    "Roads Department": [
        "Pothole / Road Damage",
        "Broken Footpath / Divider",
        "Traffic Signal Failure",
        "Missing Manhole Cover",
        "Waterlogging on Road",
        "Road Cave-in",
    ],
    "Municipality": [
        "Uncollected Garbage / Dump",
        "Sewage / Drain Overflow",
        "Stagnant Dirty Water",
        "Public Toilet Sanitation",
        "Dead Animal Removal",
        "Mosquito Breeding Hazard",
    ],
    "Public Safety": [
        "Road Accident / Crash Hazard",
        "Open Hazard / Trench",
        "Falling Tree / Tree Branch",
        "Fire / Short Circuit Hazard",
        "Stray Animal Aggression",
    ],
}

SUBCATEGORY_KEYWORDS = {
    "Road Accident / Crash Hazard": ["accident", "crash", "collision", "hit", "injured", "chot", "takkar", "takkaron", "एक्सीडेंट", "दुर्घटना", "हादसा", "দূর্ঘটনা"],
    "Fire / Short Circuit Hazard": ["fire", "blaze", "smoke", "cylinder", "short circuit", "aag", "dhuan", "आग", "धुआं", "শর্ট সার্কিট", "আগুন"],
    "Open Hazard / Trench": ["trench", "khula", "open pit", "manhole", "hole", "खुला", "गड्ढा"],
    "Falling Tree / Tree Branch": ["tree", "branch", "ped gir", "per", "গাছ", "पेड़"],
    "Stray Animal Aggression": ["dog", "bite", "kutta", "stray", "monkey", "कুকুর", "कुत्ता"],
    "Pipeline Leakage": ["leak", "burst", "pipe", "pipeline", "leakage", "nal", "paani beh", "पानी बह रहा", "লিক"],
    "No Water Supply": ["no water", "paani nahi", "water cut", "water supply", "bandh", "pani nahi", "पानी नहीं", "জল নেই"],
    "Contaminated / Muddy Water": ["dirty water", "muddy", "bad smell", "ganda pani", "polluted", "गंदा पानी"],
    "Low Water Pressure": ["low pressure", "pressure", "kam paani", "धीमा पानी"],
    "Transformer Spark / Hazard": ["transformer", "spark", "current", "wire", "dangling", "तार टूट", "करंट"],
    "Streetlight Malfunction": ["streetlight", "dark", "street light", "andhera", "light kharab", "अंधेरा", "स्ट्रीट लाइट"],
    "Power Cut / Outage": ["power cut", "outage", "blackout", "load shedding", "bijli", "बिजली गुल", "कारेंट"],
    "Pothole / Road Damage": ["pothole", "gaddha", "broken road", "sinkhole", "pit", "गड्ढा", "टूटी सड़क"],
    "Waterlogging on Road": ["waterlogging", "water logged", "jal jamao", "paani bhara", "जलभराव"],
    "Uncollected Garbage / Dump": ["garbage", "kachra", "waste", "dump", "trash", "dustbin", "gandagi", "कचरा", "कूड़ा", "ময়লা"],
    "Sewage / Drain Overflow": ["drain", "sewage", "overflow", "gutter", "nala", "naali", "नाली", "सीवर", "ড্রেন"],
}

DURATION_PATTERNS = [
    (r"(\d+)\s*(?:दिन|days?|din)", "{0} days"),
    (r"(\d+)\s*(?:हफ्ते|हफ़्ते|weeks?|hafte|hafta)", "{0} weeks"),
    (r"(\d+)\s*(?:महीने|months?|mahine|mahina)", "{0} months"),
    (r"(\d+)\s*(?:घंटे|hours?|ghante|ghanta)", "{0} hours"),
    (r"(?:कल से|since yesterday|kal se)", "Since yesterday"),
    (r"(?:आज सुबह से|since morning|aaj subah se)", "Since this morning"),
    (r"(?:काफी दिनों से|for a long time|bohot dino se)", "Several days (unspecified)"),
]

LANDMARK_KEYWORDS = [
    "near", "opposite", "behind", "in front of", "next to", "beside",
    "पास", "सामने", "पीछे", "बगल में", "चौराहा", "chowk", "market",
    "school", "hospital", "station", "temple", "mandir", "masjid", "park", "atm", "bank",
    "काचे", "सामने", "রাস্তা", "সামने", "निकट"
]

URGENCY_KEYWORDS = [
    "danger", "emergency", "spark", "accident", "hospital", "school", "child", "fire",
    "खतरा", "आग", "चोट", "बच्चे", "अस्पताल", "বিপদ", "জরুরি", "risk", "hazard", "shock", "overflow"
]

STOP_WORDS = {"near", "and", "or", "in", "to", "at", "for", "the", "a", "an", "on", "of", "with", "from", "by", "is", "it"}


def extract_structured_entities(text: str, department: str = "General Administration") -> Dict[str, Any]:
    """
    Extracts structured fields from free text in Hindi, English, Hinglish, Bengali etc.
    """
    cleaned = (text or "").strip()
    lower = cleaned.lower()

    # 1. Subcategory detection
    dept_subs = SUBCATEGORIES.get(department, SUBCATEGORIES["Municipality"])
    detected_sub = dept_subs[0]
    best_sub_score = 0

    for sub in dept_subs:
        score = 0
        # Check explicit keywords first
        kws = SUBCATEGORY_KEYWORDS.get(sub, [])
        for kw in kws:
            if kw in lower:
                score += 5

        # Check subcategory title words (excluding stop words)
        sub_words = [w for w in re.findall(r'\b[a-z]{3,}\b', sub.lower()) if w not in STOP_WORDS]
        for w in sub_words:
            if w in lower:
                score += 2

        if score > best_sub_score:
            best_sub_score = score
            detected_sub = sub

    # 2. Duration extraction
    duration_val = "Not specified"
    for pattern, template in DURATION_PATTERNS:
        match = re.search(pattern, lower, re.IGNORECASE)
        if match:
            if match.groups():
                duration_val = template.format(match.group(1))
            else:
                duration_val = template
            break

    # 3. Landmark / Spot extraction
    landmark_val = "Not specified"
    landmark_pattern = r"(?:\b(?:near|opposite to|opposite|in front of|behind|next to|beside|close to|around|at|पास|सामने|पीछे|बगल में|चौराहा|কাছে|নিকট)\b\s+)?([A-Za-z0-9\s\-]+?\b(?:market|chowk|station|metro|crossing|hospital|school|temple|mandir|masjid|park|circle|gate|block|road|sector|flyover|bridge|building|tower|avenue|street)\b(?:\s+[A-Za-z0-9\-]+){0,3})"
    m = re.search(landmark_pattern, cleaned, re.IGNORECASE)
    if m and len(m.group(0).strip()) >= 4:
        landmark_val = m.group(0).strip()
    else:
        for kw in LANDMARK_KEYWORDS:
            kw_match = re.search(r"\b" + re.escape(kw) + r"\b", cleaned, re.IGNORECASE)
            if kw_match:
                pos = kw_match.start()
                snippet = cleaned[pos : min(len(cleaned), pos + 40)]
                for punct in [".", ",", "\n", ";", "!", "?"]:
                    if punct in snippet:
                        snippet = snippet.split(punct)[0]
                if len(snippet.strip()) >= 3:
                    landmark_val = snippet.strip()
                    break

    # 4. Urgency markers & Recurring flag
    urgency_detected = any(u in lower for u in URGENCY_KEYWORDS)
    is_recurring = any(r in lower for r in ["बार-बार", "again", "repeat", "bar bar", "pehle bhi", "dobara", "recurring", "पहले भी", "আবার"])

    # 5. Affected radius
    if any(k in lower for k in ["entire colony", "pure ilake", "पूरे इलाके", "poora mohalla", "whole area", "পুরো এলাকা"]):
        affected_area = "Broad (Colony / Ward level)"
    elif any(k in lower for k in ["main road", "highway", "चौराहा", "chowk", "crossing"]):
        affected_area = "Significant (Main arterial road/intersection)"
    else:
        affected_area = "Local (Street / Building vicinity)"

    return {
        "category": department,
        "sub_category": detected_sub,
        "duration_observed": duration_val,
        "landmark_or_spot": landmark_val,
        "is_recurring": is_recurring,
        "urgency_markers": urgency_detected,
        "affected_area": affected_area,
    }


def compute_completeness_score(
    text: str,
    location: Optional[Dict[str, Any]],
    structured_entities: Dict[str, Any],
    has_media: bool = False
) -> Dict[str, Any]:
    """
    Computes a deterministic Completeness Score (0 - 100%) and identifies missing fields.
    """
    score = 0
    breakdown = {}
    missing_fields = []

    # 1. Description richness (up to 30 points)
    words = len((text or "").split())
    if words >= 12:
        desc_score = 30
    elif words >= 6:
        desc_score = 20
    elif words >= 3:
        desc_score = 10
    else:
        desc_score = 0
        missing_fields.append("Detailed description")
    score += desc_score
    breakdown["description_clarity"] = f"{desc_score}/30"

    # 2. Location & Landmark (up to 25 points)
    loc_score = 0
    if location and location.get("lat") and location.get("lon"):
        loc_score += 15
    else:
        missing_fields.append("GPS Coordinates")

    if structured_entities.get("landmark_or_spot") != "Not specified":
        loc_score += 10
    else:
        missing_fields.append("Nearest landmark / spot name")
    score += loc_score
    breakdown["location_precision"] = f"{loc_score}/25"

    # 3. Duration / Timeline (up to 15 points)
    if structured_entities.get("duration_observed") != "Not specified":
        dur_score = 15
    else:
        dur_score = 0
        missing_fields.append("Duration (how long the issue has persisted)")
    score += dur_score
    breakdown["duration_context"] = f"{dur_score}/15"

    # 4. Media evidence (up to 15 points)
    if has_media:
        media_score = 15
    else:
        media_score = 5  # optional but partial bonus
    score += media_score
    breakdown["evidence_media"] = f"{media_score}/15"

    # 5. Category & Subcategory specificity (up to 15 points)
    cat_score = 15 if structured_entities.get("sub_category") else 10
    score += cat_score
    breakdown["category_specificity"] = f"{cat_score}/15"

    final_score = min(100, score)

    # Generate single highest-leverage clarification question
    clarification_question = None
    if final_score < 80:
        if "Nearest landmark / spot name" in missing_fields:
            clarification_question = {
                "field": "landmark",
                "question_en": "Could you mention a nearby landmark, shop, or building name for faster municipal location?",
                "question_hi": "क्या आप नजदीकी किसी दुकान, स्कूल या लैंडमार्क का नाम बता सकते हैं ताकि टीम आसानी से पहुँच सके?",
                "placeholder": "e.g., Near Sharma Sweets, opposite SBI ATM"
            }
        elif "Duration (how long the issue has persisted)" in missing_fields:
            clarification_question = {
                "field": "duration",
                "question_en": "Approximately how many days or hours has this issue been persisting?",
                "question_hi": "यह समस्या लगभग कितने दिनों या घंटों से बनी हुई है?",
                "placeholder": "e.g., 3 days, since yesterday"
            }
        elif "Detailed description" in missing_fields:
            clarification_question = {
                "field": "description",
                "question_en": "Please provide a few more details about the impact or severity.",
                "question_hi": "कृपया समस्या की गंभीरता के बारे में कुछ और विवरण साझा करें।",
                "placeholder": "e.g., Water is entering homes, sparking wire near pedestrian path"
            }

    return {
        "completeness_score": final_score,
        "breakdown": breakdown,
        "missing_fields": missing_fields,
        "clarification_question": clarification_question,
    }
