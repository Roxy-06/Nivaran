#!/usr/bin/env python
"""Test MongoDB connection"""
import asyncio
import os
from motor.motor_asyncio import AsyncIOMotorClient

async def test_mongodb():
    mongo_url = os.getenv("MONGO_URL", "mongodb://localhost:27017")
    print(f"Connecting to: {mongo_url}")
    
    try:
        client = AsyncIOMotorClient(mongo_url, serverSelectionTimeoutMS=5000)
        db = client["civicpulse"]
        
        # Test connection
        await client.admin.command('ping')
        print("✓ MongoDB connection successful!")
        
        # List collections
        collections = await db.list_collection_names()
        print(f"✓ Database 'civicpulse' collections: {collections if collections else 'empty (will create on first insert)'}")
        
        # Test insert/read
        test_doc = {"test": "hello", "status": "connected"}
        result = await db["test_collection"].insert_one(test_doc)
        print(f"✓ Test insert successful (ID: {result.inserted_id})")
        
        retrieved = await db["test_collection"].find_one({"_id": result.inserted_id})
        print(f"✓ Test read successful: {retrieved}")
        
        # Cleanup
        await db["test_collection"].delete_one({"_id": result.inserted_id})
        print("✓ Cleanup successful")
        
    except Exception as e:
        print(f"✗ Connection failed: {e}")
        return False
    
    return True

if __name__ == "__main__":
    success = asyncio.run(test_mongodb())
    exit(0 if success else 1)
