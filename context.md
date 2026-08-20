Context summary for Nivaran repository

- Feature: AI follow-up question pipeline for incomplete complaint forms
- Branch: update/context-md-for-pr
- What changed:
  - Backend: new follow-up models, services, routes, DB integration
  - Frontend: follow-up UI in `frontend/src/components/IssueForm.tsx`
  - DB config: environment-variable `MONGO_URL` in `backend/app/database.py`
  - Tests: `test_mongodb.py`, `full_test.py` added
  - Fix: corrected syntax error in `backend/app/ai.py`

How to test locally:
1. Install MongoDB (or use Atlas) and ensure `MONGO_URL` is set or default local MongoDB is running.
2. Start backend (example):
   .\.venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 9000 --app-dir backend
3. Submit follow-up check:
   POST http://127.0.0.1:9000/issues/follow-up (form-data: `message`, `latitude`, `longitude`)

Notes:
- The incomplete submissions are stored in `incomplete_submissions` collection.
- Follow-up answers are accepted at `POST /followup/{submission_id}/response`.
- This branch is ready for PR into https://github.com/Roxy-06/Nivaran
