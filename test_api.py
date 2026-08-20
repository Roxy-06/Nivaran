#!/usr/bin/env python
"""Test the follow-up API endpoint"""
import requests
import json

# Test data
data = {
    'message': 'Water logged in my area',
    'latitude': 12.9716,
    'longitude': 77.5946
}

# Test the endpoint
url = 'http://127.0.0.1:8002/issues/follow-up'
print(f"Testing {url}")
print(f"Sending: {json.dumps(data, indent=2)}")
print("-" * 50)

try:
    response = requests.post(url, data=data)
    print(f"Status Code: {response.status_code}")
    print(f"Response:")
    print(json.dumps(response.json(), indent=2))
except Exception as e:
    print(f"Error: {e}")
    import traceback
    traceback.print_exc()
