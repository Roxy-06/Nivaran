"""
Multilingual translation module for Nivaran.
Translates regional language civic issue descriptions to English for administration,
and translates system notifications/status updates back to the citizen's native language.
"""

from typing import Optional, Tuple
import logging

logger = logging.getLogger("nivaran.translator")

# Supported Indian & International languages with ISO codes and localized labels
SUPPORTED_LANGUAGES = {
    "auto": {"name": "Auto Detect", "native": "स्वचालित / தானியங்கி", "code": "auto", "speech_locale": "hi-IN"},
    "hi": {"name": "Hindi", "native": "हिन्दी", "code": "hi", "speech_locale": "hi-IN"},
    "ta": {"name": "Tamil", "native": "தமிழ்", "code": "ta", "speech_locale": "ta-IN"},
    "te": {"name": "Telugu", "native": "తెలుగు", "code": "te", "speech_locale": "te-IN"},
    "bn": {"name": "Bengali", "native": "বাংলা", "code": "bn", "speech_locale": "bn-IN"},
    "mr": {"name": "Marathi", "native": "मराठी", "code": "mr", "speech_locale": "mr-IN"},
    "kn": {"name": "Kannada", "native": "ಕನ್ನಡ", "code": "kn", "speech_locale": "kn-IN"},
    "ml": {"name": "Malayalam", "native": "മലയാളം", "code": "ml", "speech_locale": "ml-IN"},
    "gu": {"name": "Gujarati", "native": "ગુજરાતી", "code": "gu", "speech_locale": "gu-IN"},
    "pa": {"name": "Punjabi", "native": "ਪੰਜਾਬੀ", "code": "pa", "speech_locale": "pa-IN"},
    "ur": {"name": "Urdu", "native": "اردو", "code": "ur", "speech_locale": "ur-IN"},
    "en": {"name": "English", "native": "English", "code": "en", "speech_locale": "en-IN"},
}

def translate_to_english(text: str, source_lang: Optional[str] = "auto") -> Tuple[str, str]:
    """
    Translates input text to English.
    Returns a tuple of (translated_text, detected_language).
    """
    if not text or not text.strip():
        return "", source_lang or "en"

    cleaned_text = text.strip()

    try:
        from deep_translator import GoogleTranslator
        valid_codes = set(SUPPORTED_LANGUAGES.keys()) - {"auto"}
        src = source_lang if (source_lang and source_lang in valid_codes) else "auto"
        translator = GoogleTranslator(source=src, target="en")
        translated = translator.translate(cleaned_text)
        
        # If successfully translated and different, return
        detected = source_lang if source_lang and source_lang != "auto" else "unknown"
        return translated or cleaned_text, detected
    except Exception as e:
        return cleaned_text, source_lang or "en"


def translate_from_english(text: str, target_lang: str) -> str:
    """
    Translates English text into a target regional language (for TTS audio readout).
    """
    if not text or not text.strip() or not target_lang or target_lang in ("en", "auto"):
        return text

    try:
        from deep_translator import GoogleTranslator
        translator = GoogleTranslator(source="en", target=target_lang)
        translated = translator.translate(text.strip())
        return translated or text
    except Exception as e:
        logger.warning(f"Translation from English to {target_lang} failed: {e}")
        return text
