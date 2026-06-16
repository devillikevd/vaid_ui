import asyncio
import os
import base64
import jwt
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

# Generate a valid token
JWT_SECRET = "swastik-healthcare-jwt-secret-key-2024"
token = jwt.encode({"id": "test_patient_123", "role": "patient"}, JWT_SECRET, algorithm="HS256")

# Create a dummy image for testing (a tiny 1x1 black pixel image in base64)
dummy_image_b64 = "UGxlYXNlIHNldCBhIHVzZXItYWdlbnQgYW5kIHJlc3BlY3Qgb3VyIHJvYm90IHBvbGljeSBodHRwczovL3cud2lraS80d0pTLiBTZWUgYWxzbyBodHRwczovL3BoYWJyaWNhdG9yLndpa2ltZWRpYS5vcmcvVDQwMDExOS4K"

def test_calculate():
    print("\n--- Testing /api/diet/calculate ---")
    response = client.post(
        "/api/diet/calculate",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "items": [
                {
                    "name": "Roti",
                    "quantity": 2,
                    "unit": "pieces"
                },
                {
                    "name": "Dal Tadka",
                    "quantity": 1,
                    "unit": "katori"
                }
            ],
            "additional_notes": "Added 1 spoon ghee",
            "medical_conditions": ["Type 2 Diabetes"],
            "language": "en"
        }
    )
    print(f"Status Code: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        print("Success! Data:")
        import json
        print(json.dumps(data, indent=2))
    else:
        print(f"Failed: {response.text}")

def test_vision():
    print("\n--- Testing /api/diet/vision ---")
    response = client.post(
        "/api/diet/vision",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "image": f"data:image/jpeg;base64,{dummy_image_b64}"
        }
    )
    print(f"Status Code: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        print("Success! Data:")
        import json
        print(json.dumps(data, indent=2))
    else:
        print(f"Failed: {response.text}")

if __name__ == "__main__":
    test_calculate()
    test_vision()
