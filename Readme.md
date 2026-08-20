# Nivaran

AI-powered civic issue reporting and management platform. Citizens report issues via text/image, AI classifies them to departments and sets priority, and government admins/departments manage resolution through role-based dashboards.

---

## Prerequisites

- **Python 3.10+**
- **Node.js 18+**
- **Git**

---

## Quick Start

### 1. Clone the repo

```bash
git clone <repo-url>
cd Nivaran
```

### 2. Backend (FastAPI)

```bash
cd backend
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # Mac/Linux
pip install -r requirements.txt
```

**Pre-download the AI model** (one-time, ~470MB, makes startup instant):

```bash
python -c "from sentence_transformers import SentenceTransformer; SentenceTransformer('sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2')"
```

**Run the backend:**

```bash
python -m uvicorn app.main:app --reload
```

Backend runs at **http://localhost:8000**

### 3. Frontend (Citizen App)

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at **http://localhost:5173**

### 4. Dashboard (Admin & Department)

```bash
cd dashboard
npm install
npm run dev
```

Dashboard runs at **http://localhost:5174**

---

## Ports

| Service | URL |
|---------|-----|
| Backend API | http://localhost:8000 |
| Frontend (Citizen) | http://localhost:5173 |
| Dashboard (Admin/Dept) | http://localhost:5174 |

---

## Test Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@nivaran.in | admin123 |
| Electricity Board | electricity@nivaran.in | department123 |
| Municipality | municipality@nivaran.in | department123 |
| Roads Department | roads@nivaran.in | department123 |
| Water Board | water@nivaran.in | department123 |
| Public Safety | safety@nivaran.in | department123 |

---

## Tech Stack

### Frontend & Dashboard
- React 19 / 18 (Vite + TypeScript)
- React Router
- Axios

### Backend
- FastAPI + Uvicorn
- SQLite (async wrapper with voice schema)
- JWT Authentication (python-jose + bcrypt)
- Sentence Transformers (multilingual semantic embeddings: English, Hindi, Tamil, Telugu, etc.)
- SpeechRecognition & gTTS (Speech-to-Text & Text-to-Speech)
- Deep Translator (Indic to English translation & normalization)
- OpenStreetMap Overpass API (nearby place detection)

---

## Features

### Citizen Side
- **Multilingual Voice Reporting**: Report issues by speaking in Hindi, Tamil, Telugu, Bengali, Marathi, Kannada, Malayalam, Gujarati, Punjabi, Urdu, or English.
- **Real-Time Audio Waveform & Visualizer**: Interactive voice recorder with live sound waves and recording playback.
- **Instant Bilingual Transcription**: Automatically generates native script transcripts and standardized English translations.
- **Spoken Audio Status Readouts (TTS)**: Listen to issue resolution updates read aloud in your preferred language.
- **AI Department Classification & Priority Detection**: Automatic semantic routing to Electricity, Water, Roads, Municipality, or Safety.
- **Nearby Sensitive Area Impact Detection**: OpenStreetMap analysis for schools, hospitals, and residential zones.
- **Serial-Number-Based Issue Tracking**: Secure anonymous issue tracking (e.g. `CP-2026-XXXX`).

### Admin Dashboard
- View all issues across departments with original voice playback audio player.
- Inspect original regional transcripts alongside standardized English translations.
- Filter by department, sort by priority.
- Update issue status and priority.

### Department Dashboard
- View department-specific issues only with citizen voice recordings and bilingual transcripts.
- Update issue status (`Reported` -> `In Progress` -> `Resolved`).
- Detail view with media proof, geolocation, and area impact.

---

## Voice API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/voice/languages` | List supported Indian & international languages |
| `POST` | `/voice/transcribe` | Transcribe audio, identify language & translate to English |
| `POST` | `/voice/synthesize` | Text-to-Speech audio streaming in requested language |
| `POST` | `/voice/report-issue` | All-in-one voice issue submission with AI categorization |
