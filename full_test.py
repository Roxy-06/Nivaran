#!/usr/bin/env python
"""Complete test - MongoDB connection and API"""
import asyncio
import subprocess
import time
import os
import sys
import requests
import json

async def test_mongodb_sync():
    """Test MongoDB connection synchronously"""
    from motor.motor_asyncio import AsyncIOMotorClient
    
    mongo_url = os.getenv("MONGO_URL", "mongodb://localhost:27017")
    print(f"\n[1/3] Testing MongoDB connection...")
    print(f"  URL: {mongo_url}")
    
    try:
        client = AsyncIOMotorClient(mongo_url, serverSelectionTimeoutMS=5000)
        db = client["civicpulse"]
        
        await client.admin.command('ping')
        print("  ✓ MongoDB connection successful!")
        return True
    except Exception as e:
        print(f"  ✗ Connection failed: {e}")
        print("\n  Make sure MongoDB is running:")
        print('  C:\\Program Files\\MongoDB\\Server\\7.0\\bin\\mongod.exe')
        return False

def test_api():
    """Test the follow-up API endpoint"""
    print(f"\n[2/3] Testing API endpoint...")
    
    data = {
        'message': 'Water logged in my area',
        'latitude': 12.9716,
        'longitude': 77.5946
    }
    
    url = 'http://127.0.0.1:8000/issues/follow-up'
    print(f"  POST {url}")
    
    # Give backend 2 seconds to be ready
    for i in range(3):
        try:
            response = requests.post(url, data=data, timeout=2)
            print(f"  ✓ Status: {response.status_code}")
            
            result = response.json()
            print(f"  ✓ Response:")
            print(f"    - needs_follow_up: {result.get('needs_follow_up')}")
            print(f"    - submission_id: {result.get('submission_id')}")
            print(f"    - questions: {len(result.get('questions', []))} items")
            
            if result.get('questions'):
                print(f"    - First question: {result['questions'][0]['question']}")
            
            return True
        except requests.exceptions.ConnectionError:
            if i < 2:
                print(f"  ⏳ Backend not ready yet... retrying ({i+1}/3)")
                time.sleep(1)
            else:
                print(f"  ✗ Could not connect to backend")
                print(f"\n  Make sure backend is running:")
                print(f"  .venv\\Scripts\\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --app-dir backend")
                return False
        except Exception as e:
            print(f"  ✗ API test failed: {e}")
            return False
    
    return False

async def main():
    print("=" * 60)
    print("MongoDB + API Testing Suite")
    print("=" * 60)
    
    # Test 1: MongoDB
    mongo_ok = await test_mongodb_sync()
    
    if not mongo_ok:
        return
    
    # Test 2: API
    api_ok = test_api()
    
    print(f"\n[3/3] Summary:")
    print(f"  MongoDB: {'✓ OK' if mongo_ok else '✗ FAILED'}")
    print(f"  API:     {'✓ OK' if api_ok else '✗ FAILED'}")
    
    if mongo_ok and api_ok:
        print("\n✓ All tests passed!")
    else:
        print("\n✗ Some tests failed. Check messages above.")

if __name__ == "__main__":
    asyncio.run(main())
