"""
Multilingual Voice Engine for Nivaran.
Provides Speech-to-Text (STT) and Text-to-Speech (TTS) capabilities
supporting Indian regional languages and English.
"""

import os
import io
import wave
import logging
import tempfile
from typing import Dict, Any, Optional

try:
    from app.translator import SUPPORTED_LANGUAGES, translate_to_english, translate_from_english
except ModuleNotFoundError:
    from translator import SUPPORTED_LANGUAGES, translate_to_english, translate_from_english

logger = logging.getLogger("nivaran.voice_engine")

AUDIO_UPLOAD_DIR = os.path.join("uploads", "voice")
os.makedirs(AUDIO_UPLOAD_DIR, exist_ok=True)

# Configure ffmpeg for pydub using imageio-ffmpeg
try:
    import imageio_ffmpeg
    from pydub import AudioSegment
    ffmpeg_exe = imageio_ffmpeg.get_ffmpeg_exe()
    AudioSegment.converter = ffmpeg_exe
    ffmpeg_dir = os.path.dirname(ffmpeg_exe)
    if ffmpeg_dir not in os.environ.get("PATH", ""):
        os.environ["PATH"] += os.pathsep + ffmpeg_dir
    logger.info(f"Configured ffmpeg executable: {ffmpeg_exe}")
except Exception as e:
    logger.warning(f"Could not bind imageio-ffmpeg: {e}")


def convert_to_wav(file_bytes: bytes, original_filename: str = "audio.wav") -> str:
    """
    Saves incoming audio bytes to a temporary or normalized WAV file path.
    Uses pydub with bundled ffmpeg or saves direct PCM/WAV.
    """
    suffix = os.path.splitext(original_filename)[1].lower() or ".wav"
    temp_in = tempfile.NamedTemporaryFile(delete=False, suffix=suffix)
    temp_in.write(file_bytes)
    temp_in.flush()
    temp_in.close()

    # If it's already a valid PCM wav file, verify and return
    if suffix == ".wav":
        try:
            with wave.open(temp_in.name, "rb") as w:
                channels = w.getnchannels()
                framerate = w.getframerate()
                if channels in (1, 2) and framerate >= 8000:
                    return temp_in.name
        except Exception:
            pass

    # Use pydub to convert WebM/Opus/MP4/OGG to standard 16kHz mono PCM WAV
    try:
        from pydub import AudioSegment
        sound = AudioSegment.from_file(temp_in.name)
        sound = sound.set_frame_rate(16000).set_channels(1)
        temp_out = tempfile.NamedTemporaryFile(delete=False, suffix=".wav")
        sound.export(temp_out.name, format="wav")
        temp_out.close()
        try:
            os.remove(temp_in.name)
        except OSError:
            pass
        return temp_out.name
    except Exception as e:
        logger.error(f"Audio conversion error: {e}. Returning original temp path.")
        return temp_in.name


def transcribe_audio_file(audio_path: str, language_code: Optional[str] = "auto") -> Dict[str, Any]:
    """
    Transcribes audio into text using SpeechRecognition with locale support.
    Returns:
    {
        "transcript": "...",
        "detected_language": "hi",
        "language_name": "Hindi",
        "translation": "...",
        "confidence": 0.95
    }
    """
    import speech_recognition as sr

    recognizer = sr.Recognizer()
    recognizer.energy_threshold = 200
    recognizer.dynamic_energy_threshold = True

    # Determine speech locale
    lang_info = SUPPORTED_LANGUAGES.get(language_code or "auto", SUPPORTED_LANGUAGES["auto"])
    primary_locale = lang_info.get("speech_locale", "hi-IN")

    locales_to_try = [primary_locale]
    if language_code == "auto" or not language_code:
        # Try candidate Indian locales
        locales_to_try = ["hi-IN", "en-IN", "ta-IN", "te-IN", "bn-IN", "mr-IN", "kn-IN", "ml-IN", "gu-IN"]

    transcript = ""
    detected_locale = primary_locale

    try:
        with sr.AudioFile(audio_path) as source:
            recognizer.adjust_for_ambient_noise(source, duration=0.3)
            audio_data = recognizer.record(source)

        # Attempt recognition with candidate locales
        for loc in locales_to_try:
            try:
                text = recognizer.recognize_google(audio_data, language=loc)
                if text and text.strip():
                    transcript = text.strip()
                    detected_locale = loc
                    break
            except sr.UnknownValueError:
                continue
            except sr.RequestError as e:
                logger.warning(f"Google Speech Recognition API error for locale {loc}: {e}")
                break

    except Exception as e:
        logger.error(f"Error reading audio file for transcription: {e}")
        return {
            "transcript": "",
            "detected_language": language_code or "en",
            "language_name": SUPPORTED_LANGUAGES.get(language_code, {}).get("name", "Unknown"),
            "translation": "",
            "confidence": 0.0,
            "error": str(e)
        }

    # Map detected locale back to language code
    detected_lang_code = language_code if language_code and language_code != "auto" else "en"
    for code, info in SUPPORTED_LANGUAGES.items():
        if info.get("speech_locale") == detected_locale and code != "auto":
            detected_lang_code = code
            break

    # Translate transcript to English for admin and AI semantic processing
    translation, _ = translate_to_english(transcript, source_lang=detected_lang_code)

    lang_name = SUPPORTED_LANGUAGES.get(detected_lang_code, {}).get("name", detected_lang_code.title())

    return {
        "transcript": transcript,
        "detected_language": detected_lang_code,
        "language_name": lang_name,
        "translation": translation,
        "confidence": 0.92 if transcript else 0.0,
    }


def synthesize_speech(text: str, language_code: str = "en") -> io.BytesIO:
    """
    Synthesizes speech from text using gTTS and returns an in-memory MP3 BytesIO stream.
    """
    if not text or not text.strip():
        text = "No content to read."

    # Validate language code for gTTS
    code = language_code if language_code in SUPPORTED_LANGUAGES and language_code != "auto" else "en"
    gtts_lang = code

    try:
        from gtts import gTTS
        tts = gTTS(text=text.strip(), lang=gtts_lang, slow=False)
        audio_fp = io.BytesIO()
        tts.write_to_fp(audio_fp)
        audio_fp.seek(0)
        return audio_fp
    except Exception as e:
        logger.warning(f"gTTS error for language {gtts_lang}: {e}. Falling back to English.")
        from gtts import gTTS
        tts = gTTS(text=text.strip(), lang="en", slow=False)
        audio_fp = io.BytesIO()
        tts.write_to_fp(audio_fp)
        audio_fp.seek(0)
        return audio_fp
