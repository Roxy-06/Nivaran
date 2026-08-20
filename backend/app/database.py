# app/database.py
from motor.motor_asyncio import AsyncIOMotorClient
import os

MONGO_URL = os.getenv("MONGO_URL", "mongodb://localhost:27017")
client = AsyncIOMotorClient(MONGO_URL)

db = client["civicpulse"]

issues_collection = db["issues"]
users_collection = db["users"]  # ✅ ADD THIS
incomplete_submissions_collection = db["incomplete_submissions"]
