import pytest
import os
from fastapi.testclient import TestClient
from app.main import app
from app.services.severity_engine import SeverityEngine
from app.models.schemas import SeverityLevel

client = TestClient(app)


def test_health_endpoint():
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert "inference_mode" in data
    assert "model_loaded" in data


def test_severity_engine_calculations():
    # Crack with high confidence -> CRITICAL
    assert SeverityEngine.calculate_severity("crack", 0.96, 2.5) == SeverityLevel.CRITICAL

    # Small scratch -> LOW
    assert SeverityEngine.calculate_severity("scratch", 0.75, 0.4) == SeverityLevel.LOW

    # Large dent -> HIGH
    assert SeverityEngine.calculate_severity("dent", 0.85, 6.2) == SeverityLevel.HIGH

    # Unknown anomaly with medium area -> MEDIUM
    assert SeverityEngine.calculate_severity("unknown anomaly", 0.45, 1.8) == SeverityLevel.MEDIUM


def test_inspect_endpoint_with_crack_image():
    sample_path = "backend/samples/sample_rotor_crack.jpg"
    assert os.path.exists(sample_path)

    with open(sample_path, "rb") as f:
        response = client.post(
            "/api/inspect",
            files={"image": ("sample_rotor_crack.jpg", f, "image/jpeg")},
        )

    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "completed"
    assert data["overall_status"] == "REJECT"
    assert len(data["detections"]) > 0
    assert "crack" in data["detections"][0]["defect_type"].lower()
    assert data["detections"][0]["severity"] == "critical"
    assert data["annotated_image_base64"] is not None


def test_inspect_endpoint_clean_image():
    sample_path = "backend/samples/sample_rotor_clean.jpg"
    with open(sample_path, "rb") as f:
        response = client.post(
            "/api/inspect",
            files={"image": ("sample_rotor_clean.jpg", f, "image/jpeg")},
        )

    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "no_defect"
    assert data["overall_status"] == "PASS"
    assert len(data["detections"]) == 0
    assert "No visible defect" in data["summary_message"]


def test_inspect_unknown_anomaly_image():
    sample_path = "backend/samples/sample_rotor_unknown_anomaly.jpg"
    with open(sample_path, "rb") as f:
        response = client.post(
            "/api/inspect",
            files={"image": ("sample_rotor_unknown_anomaly.jpg", f, "image/jpeg")},
        )

    assert response.status_code == 200
    data = response.json()
    assert len(data["detections"]) > 0
    assert data["overall_status"] in ["REVIEW", "REJECT"]


def test_invalid_file_extension():
    fake_txt = b"not an image file"
    response = client.post(
        "/api/inspect",
        files={"image": ("component.txt", fake_txt, "text/plain")},
    )
    assert response.status_code == 400
    assert "Unsupported file format" in response.json()["detail"]
