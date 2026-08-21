"""
Deterministic Rule-based Override Engine for Nivaran (Tier 4).
Applies deterministic safety policies, emergency overrides, and official decision routing.
"""

from typing import Dict, Any, Tuple

EMERGENCY_RULES = [
    {
        "keywords": ["spark", "fire", "electric wire", "current", "बिजली का तार", "करंट", "आग", "शॉर्ट सर्किट"],
        "condition": lambda text, nearby: True,
        "department_override": "Electricity Board",
        "priority_override": "High",
        "escalation_reason": "Live electrical/fire hazard with immediate life-safety risk",
    },
    {
        "keywords": ["open manhole", "manhole खुला", "गटर खुला", "खुला मैनहोल", "manhole cover missing"],
        "condition": lambda text, nearby: True,
        "department_override": "Roads Department",
        "priority_override": "High",
        "escalation_reason": "Open manhole hazard on public pathway",
    },
    {
        "keywords": ["hospital road", "ambulance", "hospital", "अस्पताल का रास्ता", "एम्बुलेंस"],
        "condition": lambda text, nearby: nearby.get("hospitals", 0) > 0 or "hospital" in text.lower() or "अस्पताल" in text,
        "department_override": None,  # retain predicted dept
        "priority_override": "High",
        "escalation_reason": "Civic blockage adjacent to emergency healthcare corridor",
    },
    {
        "keywords": ["school", "children", "स्कूल के पास", "बच्चे"],
        "condition": lambda text, nearby: nearby.get("schools", 0) > 0 or "school" in text.lower() or "स्कूल" in text,
        "department_override": None,
        "priority_override": "High",
        "escalation_reason": "Vulnerable school zone safety hazard",
    },
]


def apply_rule_overrides(
    text: str,
    ai_department: str,
    ai_priority: str,
    ai_confidence: float,
    nearby: Dict[str, Any]
) -> Tuple[str, str, bool, str]:
    """
    Applies deterministic overrides on top of AI predictions.
    Returns: (final_department, final_priority, is_overridden, override_reason)
    """
    lower = (text or "").lower()

    for rule in EMERGENCY_RULES:
        if any(kw in lower for kw in rule["keywords"]):
            if rule["condition"](text, nearby):
                dept = rule["department_override"] or ai_department
                prio = rule["priority_override"]
                reason = rule["escalation_reason"]
                return dept, prio, True, reason

    return ai_department, ai_priority, False, ""
