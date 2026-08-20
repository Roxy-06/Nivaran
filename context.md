# Project Contributions & Engineering Context

**Author / Contributor:** Saayon  
**Features Implemented:** Multilingual Voice Pipeline & Multi-Layer Geolocation System  
**Project:** Nivaran (AI-Powered Civic Issue Platform)

---

## 1. Multilingual Voice Pipeline (End-to-End)

### Problem Addressed
Citizens across India speak diverse regional languages (Hindi, Tamil, Telugu, Bengali, Marathi, etc.) and often face barriers when describing civic issues in written English.

### Implementation Details

#### A. In-Browser 16-bit PCM WAV Audio Recorder (`frontend/src/components/VoiceRecorder.tsx`)
- **Browser Audio Capture:** Uses the Web Audio API (`AudioContext`, `ScriptProcessorNode`) to capture raw 16kHz mono audio streams directly from the microphone.
- **In-Memory PCM WAV Encoding:** Custom `encodeWAV()` utility generates standard 44-byte RIFF/WAVE headers with 16-bit PCM audio in memory. This eliminates browser WebM/Opus codec dependencies and ensures seamless cross-browser compatibility.
- **Waveform Visualizer:** Real-time HTML5 Canvas visualizer rendering dynamic frequency bar animations.
- **Live Interim Captions:** Real-time speech caption preview while speaking using browser `webkitSpeechRecognition`.
- **Language Selector:** Supports 12 languages (Auto-detect, Hindi, Tamil, Telugu, Bengali, Marathi, Kannada, Malayalam, Gujarati, Punjabi, Urdu, English).

#### B. Speech-to-Text & Audio Normalization (`backend/app/voice_engine.py`)
- **STT Engine:** Uses Python's `SpeechRecognition` connected to Google Speech Recognition with multi-locale candidate probing (`hi-IN`, `ta-IN`, `te-IN`, `bn-IN`, `mr-IN`, `kn-IN`, `ml-IN`, `gu-IN`, `pa-IN`, `ur-IN`, `en-IN`, `en-US`).
- **Windows Codec Compatibility:** Integrated `imageio-ffmpeg` directly into `pydub.AudioSegment` to normalize legacy WebM, MP4, and OGG formats without requiring manual system ffmpeg installations.
- **Audio Archival:** Automatically saves citizen voice recordings to `uploads/voice/` linked to unique issue serials.

#### C. Multilingual Translation & Standardization (`backend/app/translator.py`)
- **Bilingual Processing:** Translates native scripts into standardized English using `deep-translator` for administrative action and AI classification, while preserving the original native transcript for citizen auditability.

#### D. Neural Text-to-Speech (TTS) & Status Readouts (`backend/app/voice_engine.py`, `frontend/src/components/StatusCheck.tsx`)
- **Voice Synthesis:** Added `POST /voice/synthesize` endpoint using `gTTS` generating neural MP3 audio streams.
- **Citizen Audio Status:** Added a **"🔊 Read Status Aloud"** button on the Status Check page allowing citizens to hear real-time issue updates spoken in their chosen language.

#### E. Dashboard Voice Players & Bilingual Inspection (`dashboard/src/admin/AdminDashboard.tsx`, `dashboard/src/department/DepartmentDashboard.tsx`)
- Integrated audio players in the Issue Details modal for Admin and Department officers to listen to original citizen voice recordings.
- Displayed native script transcripts alongside standardized English translations.

---

## 2. Multi-Layer Geolocation & Reverse Geocoding Fix

### Problem Addressed
Previously, location capture frequently failed or timed out on desktop browsers without GPS hardware, provided no visual feedback of what was captured, and lacked human-readable address resolution.

### Implementation Details

#### A. Multi-Layer Location Detection (`frontend/src/components/IssueForm.tsx`)
- **Primary Detection:** High-accuracy browser GPS (`navigator.geolocation.getCurrentPosition` with `enableHighAccuracy: true`, `timeout: 8000`).
- **Network/IP Fallback:** If GPS is denied or times out, seamlessly falls back to network/IP geolocation (`freeipapi.com` / `ipapi.co`) so location capture **never fails**.

#### B. Backend Reverse Geocoding (`backend/app/geo.py`, `backend/app/routes.py`)
- **Endpoint:** `GET /geo/reverse?lat=...&lon=...`
- **Address Resolution:** Connects to OpenStreetMap Nominatim API to resolve raw coordinates into human-readable street names, neighbourhoods, cities, states, and postal codes.

#### C. On-Screen Location Confirmation Card (`frontend/src/components/IssueForm.tsx`)
- **Visual Feedback:** Tapping **"📍 Capture My Location"** displays a dedicated Location Card containing:
  - ✅ **Confirmation Status & Accuracy:** e.g., `GPS Location Confirmed (±15m accuracy)`
  - 📍 **Human-Readable Address:** e.g., *Raja Muthiah Road, Chennai Corporation, Tamil Nadu, 600001, India*
  - 🌐 **Exact Coordinates:** Formatted latitude & longitude (`13.08270° N, 80.27070° E`)
  - 🗺️ **Interactive Map Link:** Direct `View on Google Maps ↗` link
  - 🔄 **Refresh Button:** Allows citizens to update or recapture location anytime.

#### D. Admin & Department Map Links (`dashboard/src/admin/AdminDashboard.tsx`, `dashboard/src/department/DepartmentDashboard.tsx`)
- Rendered formatted street addresses and clickable Google Maps pin links inside the issue detail modals for quick officer navigation.

---

## 3. Database Schema & Infrastructure Updates (`backend/app/database.py`)

- **Schema Auto-Migration:** Extended the SQLite `issues` table to automatically migrate existing databases and add:
  - `voice_audio` (Path to stored citizen voice clip)
  - `detected_language` (e.g. `hi`, `ta`, `bn`, `en`)
  - `transcript` (Raw speech transcript in native script)
  - `translation` (Standardized English translation)
  - `location` enriched with `{"lat": float, "lon": float, "address": string}`
- **Automated Test Suite (`backend/test_voice_pipeline.py`):** Built a 5-step test suite covering language cataloging, translation, speech synthesis, AI department classification, and SQLite persistence.

---

## 4. API Endpoints Added

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/voice/languages` | Returns supported Indian and global language metadata |
| `POST` | `/voice/transcribe` | Ingests audio, identifies spoken language, and returns translation |
| `POST` | `/voice/synthesize` | Generates streaming neural MP3 audio for status readouts |
| `POST` | `/voice/report-issue` | All-in-one voice reporting endpoint |
| `GET` | `/geo/reverse` | Resolves latitude/longitude coordinates into a formatted street address |
