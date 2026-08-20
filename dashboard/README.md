# Nivaran Admin & Department Dashboard

Role-based management portal for government administrators and municipal department officers.

---

## Features

- **Admin Control Center**:
  - Global overview of civic issues across all departments.
  - Filter by department and sort by priority (High, Medium, Low).
  - Modify department assignment, priority, and resolution status.
  - Listen to citizen's original voice recording and inspect bilingual transcripts in the detail modal.
- **Department View**:
  - Department-specific queue (Electricity Board, Municipality, Roads Department, Water Board, Public Safety).
  - Update issue progress (`Reported` -> `In Progress` -> `Resolved`).
  - View proof media, GPS location coordinates, and surrounding sensitive area impact (schools, hospitals, residential).
- **Audio & Multilingual Inspection**:
  - Direct in-browser voice playback of citizen reports.
  - Native script transcript and standardized English translation side-by-side.

---

## Tech Stack

- **React 19** + **TypeScript**
- **Vite** (Dev server on port 5174)
- **Axios** (JWT authenticated requests)

---

## Getting Started

```bash
# Install dependencies
npm install

# Start dashboard server (http://localhost:5174)
npm run dev

# Build for production
npm run build
```
