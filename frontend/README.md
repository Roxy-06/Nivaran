# Nivaran Citizen App (Frontend)

Citizen-facing web application for reporting civic issues with text, media, geolocation, and **Multilingual Voice AI**.

---

## Features

- **Multilingual Voice Reporting**: Speak in Hindi, Tamil, Telugu, Bengali, Marathi, Kannada, Malayalam, Gujarati, Punjabi, Urdu, or English.
- **Audio Waveform Visualizer**: Live HTML5 Canvas visualizer providing dynamic visual feedback while speaking.
- **Real-Time Bilingual Transcription**: Transcribes speech into native Indic script and standardizes English translation for administrative routing.
- **Issue Tracking & Status Check**: Query status using serial numbers (`CP-2026-XXXX`).
- **Text-to-Speech (TTS) Readouts**: Listen to spoken resolution status updates in your preferred language.
- **GPS Location Detection**: Captures location to identify nearby impact on schools, hospitals, and residential zones.

---

## Tech Stack

- **React 19** + **TypeScript**
- **Vite** (Build tool & Dev server on port 5173)
- **Web Audio API** (PCM WAV in-browser encoding)
- **Axios**

---

## Getting Started

```bash
# Install dependencies
npm install

# Start local dev server (http://localhost:5173)
npm run dev

# Build for production
npm run build
```
