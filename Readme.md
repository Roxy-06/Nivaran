# 🏙️ Nivaran

**Nivaran** is a AI-powered civic issue reporting and management platform that bridges the gap between citizens and government departments through transparency, prioritization, and accountability.

Built for hackathons, scalability, and real-world civic impact.

---

## 🚀 Features

### 👥 Citizen Side
- Report civic issues with text, image, and geolocation
- Anonymous and secure submissions
- AI-based department classification & priority detection
- Nearby area impact detection

### 🧑‍💼 Admin Dashboard
- View all issues across departments
- Filter by department
- Sort by priority (High → Low)
- Update issue status and priority
- Analytics-ready architecture

### 🏢 Department Dashboard
- View only department-specific issues
- Update issue status (Reported → In Progress → Resolved)
- Read-only priority
- Detailed issue view with media & location

---

## 🧠 AI Capabilities
- Natural language analysis of complaints
- Automatic department mapping
- Priority scoring (High / Medium / Low)
- False or non-public issue detection
- Follow-up question pipeline for incomplete complaint details against predefined form fields

---

## 🛠️ Tech Stack

### Frontend
- React (Vite + TypeScript)
- React Router
- Axios
- Inline CSS (hackathon-friendly)

### Backend
- FastAPI
- MongoDB (Motor async driver)
- JWT Authentication
- Passlib (bcrypt)

### AI / Utilities
- Sentence Transformers
- Custom AI logic for issue analysis
- Geolocation-based nearby place detection

---

### How to run Backend

- cd backend
- pip install -r requirements.txt
- python -m uvicorn app.main:app --reload

### How to run Frontend

- cd frontend
- npm install
- npm run dev

### How to run Dashboard

- cd dashboard
- npm install
- npm run dev

### Test Credentials

- Admin:
- email: admin@civicpulse.com
- password: admin123

- Department:
- email: electricity@civicpulse.com
- password: department123
