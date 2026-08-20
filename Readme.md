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
| Admin | admin@civicpulse.com | admin123 |
| Electricity Board | electricity@civicpulse.com | department123 |
| Municipality | municipality@civicpulse.com | department123 |
| Roads Department | roads@civicpulse.com | department123 |
| Water Board | water@civicpulse.com | department123 |
| Public Safety | safety@civicpulse.com | department123 |

---

## Tech Stack

### Frontend & Dashboard
- React 19 / 18 (Vite + TypeScript)
- React Router
- Axios

### Backend
- FastAPI + Uvicorn
- SQLite (async wrapper)
- JWT Authentication (python-jose + bcrypt)
- Sentence Transformers (multilingual: English, Tamil, Hindi)
- OpenStreetMap Overpass API (nearby place detection)

---

## Features

### Citizen Side
- Report civic issues with text, image, and geolocation
- AI-based department classification and priority detection
- Nearby area impact detection (schools, hospitals, residential)
- Serial-number-based issue tracking

### Admin Dashboard
- View all issues across departments
- Filter by department, sort by priority
- Update issue status and priority

### Department Dashboard
- View department-specific issues only
- Update issue status (Reported -> In Progress -> Resolved)
- Detail view with media and location
