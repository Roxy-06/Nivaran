# Nivaran (निवारण)

**AI-Powered Civic Issue Reporting & Management Platform with Multilingual Voice AI**

Nivaran empowers citizens to report public civic issues (potholes, water leaks, broken street lights, garbage, safety hazards) speaking in their native Indian and international languages or through text/image proof. Our AI pipeline automatically transcribes speech, translates it, semantically classifies the responsible municipal department, computes priority based on surrounding sensitive area impact (schools, hospitals, residential zones), and provides government officers with actionable role-based dashboards.

---

## 🏛️ System Architecture

```
                                  NIVARAN CITIZEN APP
                    [ Speak in Hindi, Tamil, Telugu, Bengali, English... ]
                                         │
                                         ▼ (16kHz PCM WAV Audio)
+─────────────────────────────────────────────────────────────────────────────────────────────+
│                                  FASTAPI AI BACKEND                                          │
│                                                                                             │
│  [ Multilingual STT & LID Engine ] ──► Transcribes speech into original native script       │
│  [ Deep Translation Engine ]       ──► Generates standardized English for administration    │
│  [ Reverse Geocoding & OSM Geo ]   ──► Detects nearby schools, hospitals & residential zones │
│  [ Multilingual Semantic AI ]      ──► Classifies Department & calculates Priority Score     │
│  [ Neural Text-to-Speech (TTS) ]   ──► Synthesizes spoken audio for status tracking         │
│  [ SQLite Database ]               ──► Stores audio archives, bilingual text & coordinates   │
+─────────────────────────────────────────────────────────────────────────────────────────────+
                                         │
                    ┌────────────────────┴────────────────────┐
                    ▼                                         ▼
         ADMIN CONTROL CENTER                        DEPARTMENT PORTALS
   (Global overview, voice player,            (Electricity, Water, Roads,
    bilingual transcripts, triage)             Municipality, Safety Queues)
```

---

## 🚀 Quick Start

### 1. Clone the Repository

```bash
git clone <repo-url>
cd Nivaran
```

### 2. Backend (FastAPI + AI Engine)

```bash
cd backend
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # Mac/Linux
pip install -r requirements.txt
```

**Pre-download the multilingual AI model** (one-time, ~470MB, makes startup instant):

```bash
python -c "from sentence_transformers import SentenceTransformer; SentenceTransformer('sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2')"
```

**Run automated test suite:**

```bash
python test_voice_pipeline.py
```

**Start the backend server:**

```bash
python -m uvicorn app.main:app --reload --port 8000
```
Backend runs at **http://localhost:8000** (Swagger API docs at **http://localhost:8000/docs**).

---

### 3. Frontend (Citizen App)

```bash
cd frontend
npm install
npm run dev
```
Frontend runs at **http://localhost:5173**.

---

### 4. Dashboard (Admin & Department Portal)

```bash
cd dashboard
npm install
npm run dev
```
Dashboard runs at **http://localhost:5174**.

---

## 🌐 Ports & Services

| Service | URL | Description |
|---------|-----|-------------|
| **Backend API** | `http://localhost:8000` | REST API, Voice Engine, Semantic Classifier |
| **API Documentation** | `http://localhost:8000/docs` | Interactive OpenAPI / Swagger UI |
| **Citizen App** | `http://localhost:5173` | Multilingual voice reporting & status tracking |
| **Admin & Dept Dashboard** | `http://localhost:5174` | Role-based civic management & voice inspection |

---

## 🔑 Test Credentials

| Role | Email | Password | Assigned Scope |
|------|-------|----------|----------------|
| **Global Admin** | `admin@nivaran.in` | `admin123` | All departments & full triage |
| **Electricity Board** | `electricity@nivaran.in` | `department123` | Streetlights, transformers, power cuts |
| **Municipality** | `municipality@nivaran.in` | `department123` | Waste, sewage, drainage, sanitation |
| **Roads Department** | `roads@nivaran.in` | `department123` | Potholes, road damage, traffic signals |
| **Water Board** | `water@nivaran.in` | `department123` | Water supply, pipeline leaks, clean water |
| **Public Safety** | `safety@nivaran.in` | `department123` | Accidents, open hazards, zone danger |

---

## 🛠️ Technology Stack

### Frontend & Dashboard
- **React 19** + **TypeScript**
- **Vite** (Next-gen build tool)
- **Web Audio API** (Browser-side 16-bit PCM WAV encoding)
- **Axios** (API & JWT authentication)

### Backend & AI
- **FastAPI** + **Uvicorn**
- **SQLite** (Async storage with voice metadata schema & auto-migration)
- **Sentence Transformers** (`paraphrase-multilingual-MiniLM-L12-v2` for cross-lingual semantic matching)
- **SpeechRecognition & imageio-ffmpeg** (16kHz PCM audio processing & speech recognition)
- **Deep Translator** (Indic script to English standardization)
- **gTTS** (Neural Text-to-Speech audio streaming)
- **OpenStreetMap Overpass & Nominatim APIs** (Reverse geocoding & nearby sensitive area detection)

---

## ✨ Features

### Citizen Application
- **Multilingual Voice Reporting**: Report issues speaking in Hindi (हिन्दी), Tamil (தமிழ்), Telugu (తెలుగు), Bengali (বাংলা), Marathi (मराठी), Kannada (ಕನ್ನಡ), Malayalam (മലയാളം), Gujarati (ગુજરાતી), Punjabi (ਪੰਜਾਬੀ), Urdu (اردو), or English.
- **Real-Time Waveform Visualizer**: Interactive canvas showing dynamic sound wave amplitudes while recording.
- **Instant Bilingual Transcription**: Automatically creates native script transcripts and standardized English translations.
- **Multi-Layer Geolocation**: High-accuracy GPS with network fallback and reverse-geocoded street addresses.
- **Spoken Audio Status Readouts (TTS)**: Listen to issue resolution updates read aloud in your preferred language.
- **Serial-Number-Based Tracking**: Anonymous tracking via unique serial codes (e.g. `CP-2026-XXXX`).

### Admin Dashboard
- **Global Overview**: View, filter, and sort civic issues across all departments.
- **Citizen Voice Player**: Listen to the citizen's original recorded voice audio.
- **Bilingual Inspection**: View native language transcript and English translation side-by-side.
- **Geospatial Intelligence**: View reverse-geocoded address, GPS coordinates, and direct Google Maps links.
- **Triage Controls**: Modify assigned department, priority, and resolution status.

### Department Dashboard
- **Department Queue**: Specialized queues for Electricity, Water, Roads, Municipality, and Safety officers.
- **Citizen Voice Playback**: Listen to citizen voice clips directly in the issue detail modal.
- **Status Workflow**: Update progress through `Reported` ➔ `In Progress` ➔ `Resolved`.
- **Proof Media & Area Impact**: Inspect attached photos/videos and nearby sensitive infrastructure.

---

## 📡 API Endpoints

### Voice & Geocoding Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/voice/languages` | List supported Indian & international languages |
| `POST` | `/voice/transcribe` | Transcribe audio, detect language & translate to English |
| `POST` | `/voice/synthesize` | Text-to-Speech MP3 audio streaming |
| `POST` | `/voice/report-issue` | All-in-one voice issue submission with AI categorization |
| `GET` | `/geo/reverse` | Reverse geocode latitude/longitude to street address |

### Core Civic Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/auth/login` | Public | Authenticate Admin or Department user |
| `POST` | `/issues` | Public | Submit civic issue (Voice or Text + Location + Media) |
| `GET` | `/issues/{serial}` | Public | Retrieve issue details by serial number |
| `GET` | `/admin/issues` | Admin | Get all issues across departments |
| `PATCH` | `/admin/issues/{serial}` | Admin | Update issue status and priority |
| `GET` | `/department/issues` | Dept User | Get issues assigned to own department |
| `PATCH` | `/department/issues/{serial}` | Dept User | Update issue resolution status |

---

## 🧪 Testing & Verification

Run the end-to-end test suite to verify all voice pipeline, translation, TTS, semantic AI, and database persistence components:

```bash
cd backend
python test_voice_pipeline.py
```
