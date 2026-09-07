import os
import pytest
from fastapi.testclient import TestClient
from backend.main import app

client = TestClient(app)


def test_root_endpoint():
    response = client.get("/")
    assert response.status_code == 200
    # Returns HTML frontend when mounted, or JSON fallback
    assert ("text/html" in response.headers.get("content-type", "")) or ("application/json" in response.headers.get("content-type", ""))


def test_api_info_endpoint():
    response = client.get("/api/info")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "online"
    assert "supported_languages" in data
    assert "endpoints" in data


def test_health_endpoint():
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "whisper_config" in data


def test_languages_endpoint():
    response = client.get("/api/catalog/languages")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 3
    codes = [item["code"] for item in data]
    assert "gu" in codes
    assert "mr" in codes
    assert "hi" in codes


def test_generate_text_hindi():
    payload = {
        "text": "यह एक शुद्ध बनारसी कतान सिल्क साड़ी है, जिसमें सोने की जरी का काम है।",
        "language": "hi"
    }
    response = client.post("/api/catalog/generate-text", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["input_language"] == "hi"
    assert data["input_method"] == "text"
    assert data["transcript"] == payload["text"]
    assert "translations" in data
    assert data["translations"]["hindi"] == payload["text"]
    assert data["translations"]["english"]
    assert data["catalog"]["english"]["title"]
    assert data["catalog"]["hindi"]["title"]


def test_generate_text_gujarati():
    payload = {
        "text": "આ એક સુંદર હાથથી બનાવેલી બાંધણી સાડી છે.",
        "language": "gu"
    }
    response = client.post("/api/catalog/generate-text", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["input_language"] == "gu"
    assert data["input_method"] == "text"
    assert data["transcript"] == payload["text"]
    assert "translations" in data
    assert "hindi" in data["translations"]
    assert "english" in data["translations"]
    assert "catalog" in data
    assert "english" in data["catalog"]
    assert "hindi" in data["catalog"]
    assert data["catalog"]["english"]["title"]
    assert data["catalog"]["hindi"]["title"]


def test_generate_text_invalid_language():
    payload = {
        "text": "Some text",
        "language": "fr"
    }
    response = client.post("/api/catalog/generate-text", json=payload)
    assert response.status_code == 400
    assert "Invalid language" in response.json()["detail"]


def test_generate_audio_endpoint():
    sample_path = os.path.join("backend", "sample_audio", "gujarati_bandhani_sample.mp3")
    if not os.path.exists(sample_path):
        pytest.skip("Sample audio file not found, skipping audio upload test")

    with open(sample_path, "rb") as audio_file:
        files = {"audio": ("gujarati_bandhani_sample.mp3", audio_file, "audio/mpeg")}
        data = {"language": "gu"}
        response = client.post("/api/catalog/generate", files=files, data=data)

    assert response.status_code == 200
    result = response.json()
    assert result["success"] is True
    assert result["input_language"] == "gu"
    assert result["input_method"] == "audio"
    assert result["transcript"]
    assert result["translations"]["hindi"]
    assert result["translations"]["english"]
    assert result["catalog"]["english"]["title"]
    assert result["catalog"]["hindi"]["title"]
