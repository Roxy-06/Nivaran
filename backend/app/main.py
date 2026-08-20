from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
try:
    from app.routes import router
except ModuleNotFoundError:
    from routes import router


# ======================================================
# FastAPI App
# ======================================================

app = FastAPI(
    title="CivicPulse API",
    description="Multilingual AI-powered civic issue reporting system",
    version="1.0.0"
)

# ======================================================
# CORS CONFIGURATION (CRITICAL)
# ======================================================
# Frontend runs on http://localhost:5173 (Vite)
# Backend runs on http://localhost:8000
# Without this, browser WILL block requests
# ======================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # for development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ======================================================
# Routes
# ======================================================

app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

app.include_router(router)

# ======================================================
# Health Check (optional but useful)
# ======================================================

@app.get("/")
def root():
    return {"status": "CivicPulse backend running"}

