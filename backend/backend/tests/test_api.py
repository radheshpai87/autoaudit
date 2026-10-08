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


def test_research_paper_fmea_methodology():
    # Research paper Applied Sciences 2020, 10, 6565:
    # 1. Radial Crack -> Critical (S=10, O=2, D=6, RPN=120)
    crack_fmea = SeverityEngine.evaluate_fmea("crack", 0.95, 1.2, "Friction Ring")
    assert crack_fmea.process_code == "CR01"
    assert crack_fmea.severity_s == 10
    assert crack_fmea.occurrence_o == 2
    assert crack_fmea.detection_d == 6
    assert crack_fmea.rpn == 120
    assert "Critical" in crack_fmea.rpn_rank_tier
    assert "DTV" in crack_fmea.associated_quality_defect

    # 2. Balancing / Runout -> S=8, O=2, D=7, RPN=112
    bal_fmea = SeverityEngine.evaluate_fmea("runout deformation", 0.90, 2.0, "Outer Rim")
    assert bal_fmea.process_code == "BA02"
    assert bal_fmea.rpn == 112
    assert bal_fmea.station == "Balancing Station"

    # 3. Grinding oil / Inclusions (DT15) -> S=6, O=2, D=8, RPN=96
    oil_fmea = SeverityEngine.evaluate_fmea("inclusion", 0.85, 0.5, "Friction Ring")
    assert oil_fmea.process_code == "DT15"
    assert oil_fmea.rpn == 96
    assert "4 ± 2%" in oil_fmea.recommended_action

    # 4. Clamping distortion / Unknown anomaly (DT18) -> S=6, O=2, D=6, RPN=72
    dt18_fmea = SeverityEngine.evaluate_fmea("Unknown Anomaly", 0.5, 0.8, "Friction Ring")
    assert dt18_fmea.process_code == "DT18"
    assert dt18_fmea.rpn == 72


def test_inspect_endpoint_fmea_payload():
    sample_path = "backend/samples/sample_rotor_crack.jpg"
    with open(sample_path, "rb") as f:
        response = client.post(
            "/api/inspect",
            files={"image": ("sample_rotor_crack.jpg", f, "image/jpeg")},
        )
    assert response.status_code == 200
    data = response.json()
    assert "top_fmea_risk" in data
    assert data["top_fmea_risk"] is not None
    assert data["top_fmea_risk"]["rpn"] >= 100
    assert "fmea_quality_control" in data
    qc = data["fmea_quality_control"]
    assert qc is not None
    assert "Applied Sciences 2020" in qc["paper_reference"]
    assert "REJECT & STOP LINE" in qc["line_decision"]
    assert len(qc["recommended_process_adjustments"]) > 0

