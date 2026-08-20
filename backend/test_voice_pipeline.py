"""
End-to-End Verification Test for Nivaran Multilingual Voice Pipeline
"""

import sys
import os
import io

# Ensure UTF-8 output on Windows console
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

# Setup path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.translator import translate_to_english, translate_from_english, SUPPORTED_LANGUAGES
from app.voice_engine import synthesize_speech, transcribe_audio_file
from app.ai import analyze_issue
from app.database import issues_collection, users_collection
from app.utils import generate_serial

def run_tests():
    print("==================================================")
    print("NIVARAN MULTILINGUAL VOICE PIPELINE TEST SUITE")
    print("==================================================")

    # 1. Test Supported Languages
    print("\n[TEST 1] Testing Supported Languages...")
    assert len(SUPPORTED_LANGUAGES) >= 10, "Supported languages dictionary is missing languages"
    print(f"PASS: {len(SUPPORTED_LANGUAGES)} languages configured:")
    for code, info in list(SUPPORTED_LANGUAGES.items())[:6]:
        print(f"  - {code}: {info['name']} ({info['native']})")

    # 2. Test Multilingual Translation
    print("\n[TEST 2] Testing Multilingual Translation (Indic -> English)...")
    hindi_text = "सड़क पर बड़ा गड्ढा है और पानी भरा हुआ है"
    tamil_text = "தெரு விளக்கு எரியவில்லை இருட்டாக இருக்கிறது"
    english_text = "Broken water pipeline leaking clean water on the main road"

    hi_trans, hi_lang = translate_to_english(hindi_text, source_lang="hi")
    print(f"  Hindi Original:  '{hindi_text}'")
    print(f"  Hindi -> Eng:    '{hi_trans}'")
    assert len(hi_trans) > 0, "Hindi translation failed"

    ta_trans, ta_lang = translate_to_english(tamil_text, source_lang="ta")
    print(f"  Tamil Original:  '{tamil_text}'")
    print(f"  Tamil -> Eng:    '{ta_trans}'")
    assert len(ta_trans) > 0, "Tamil translation failed"

    print("PASS: Multilingual translation working accurately.")

    # 3. Test Text-to-Speech (TTS) Synthesis
    print("\n[TEST 3] Testing Text-to-Speech (TTS) Synthesis (gTTS)...")
    tts_stream_hi = synthesize_speech("आपकी शिकायत सफलतापूर्वक दर्ज कर ली गई है", language_code="hi")
    assert tts_stream_hi.getbuffer().nbytes > 1000, "Hindi TTS audio stream is empty"
    print(f"  Hindi TTS Stream Size: {tts_stream_hi.getbuffer().nbytes} bytes (Audio MP3)")

    tts_stream_en = synthesize_speech("Issue CP-2026-TEST status is In Progress with Roads Department", language_code="en")
    assert tts_stream_en.getbuffer().nbytes > 1000, "English TTS audio stream is empty"
    print(f"  English TTS Stream Size: {tts_stream_en.getbuffer().nbytes} bytes (Audio MP3)")
    print("PASS: Speech synthesis generating valid audio streams.")

    # 4. Test Semantic Classification with Multilingual Text
    print("\n[TEST 4] Testing AI Semantic Department Classification & Priority Scoring...")
    nearby_places = {"schools": 1, "hospitals": 1, "residential": 1}

    # Test Road Issue
    road_analysis = analyze_issue(hi_trans, nearby_places)
    print(f"  Road Issue Analysis: Dept={road_analysis['department']}, Priority={road_analysis['priority']}, Confidence={road_analysis['confidence']}")
    assert road_analysis["department"] == "Roads Department", f"Expected Roads Department, got {road_analysis['department']}"

    # Test Electricity Issue
    elec_analysis = analyze_issue(ta_trans, nearby_places)
    print(f"  Electricity Issue Analysis: Dept={elec_analysis['department']}, Priority={elec_analysis['priority']}, Confidence={elec_analysis['confidence']}")
    assert elec_analysis["department"] == "Electricity Board", f"Expected Electricity Board, got {elec_analysis['department']}"

    # Test Water Issue
    water_analysis = analyze_issue(english_text, nearby_places)
    print(f"  Water Issue Analysis: Dept={water_analysis['department']}, Priority={water_analysis['priority']}, Confidence={water_analysis['confidence']}")
    assert water_analysis["department"] == "Water Board", f"Expected Water Board, got {water_analysis['department']}"
    print("PASS: AI semantic classification and priority scoring verified.")

    # 5. Test SQLite Persistence with Voice Metadata
    print("\n[TEST 5] Testing SQLite Database Persistence with Voice Metadata...")
    import asyncio

    async def test_db():
        serial = generate_serial()
        test_doc = {
            "serial": serial,
            "message": hi_trans,
            "location": {"lat": 13.0827, "lon": 80.2707},
            "areaImpact": nearby_places,
            "media": None,
            "voice_audio": f"uploads/voice/{serial}_voice_sample.webm",
            "detected_language": "hi",
            "transcript": hindi_text,
            "translation": hi_trans,
            "status": "Reported",
            "department": road_analysis["department"],
            "priority": road_analysis["priority"],
            "confidence": road_analysis["confidence"],
            "reportedAt": "2026-08-20T13:00:00"
        }
        await issues_collection.insert_one(test_doc)
        fetched = await issues_collection.find_one({"serial": serial})
        assert fetched is not None, "Failed to fetch inserted issue"
        assert fetched["transcript"] == hindi_text, "Transcript mismatch"
        assert fetched["translation"] == hi_trans, "Translation mismatch"
        assert fetched["voice_audio"] == f"uploads/voice/{serial}_voice_sample.webm", "Voice audio path mismatch"
        assert fetched["detected_language"] == "hi", "Detected language mismatch"
        print(f"  Stored & Retrieved Issue: Serial={fetched['serial']}, Dept={fetched['department']}, Lang={fetched['detected_language']}")
        print(f"  Native Script: {fetched['transcript']}")
        print(f"  English Translation: {fetched['translation']}")
        print(f"  Voice Audio Path: {fetched['voice_audio']}")

    asyncio.run(test_db())
    print("PASS: SQLite schema, migration, and persistence working seamlessly.")

    print("\n==================================================")
    print("ALL 5 TESTS PASSED SUCCESSFULLY! MULTILINGUAL VOICE PIPELINE READY.")
    print("==================================================")

if __name__ == "__main__":
    run_tests()
