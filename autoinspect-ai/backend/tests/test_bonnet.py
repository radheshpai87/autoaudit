import os
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.services.historical_db import HistoricalDatabaseManager
from app.services.predictive_engine import PredictiveHeatmapEngine

client = TestClient(app)


@pytest.fixture(autouse=True)
def clean_db():
    HistoricalDatabaseManager.clear_all_records()
    yield
    HistoricalDatabaseManager.clear_all_records()


def test_inspect_bonnet_good():
    sample_path = "backend/samples/sample_bonnet_good.jpg"
    assert os.path.exists(sample_path)
    with open(sample_path, "rb") as f:
        response = client.post(
            "/api/inspect",
            files={"image": ("sample_bonnet_good.jpg", f, "image/jpeg")},
            data={"component_type": "car_bonnet"}
        )
    assert response.status_code == 200
    data = response.json()
    assert data["component_type"] == "car_bonnet"
    assert data["defect_count"] == 0
    assert data["overall_status"] == "PASS"
    assert data["condition_classification"]["condition"] == "GOOD"
    assert "Car Bonnet" in data["brake_component_type"] or "BIW" in data["brake_component_type"]


def test_inspect_bonnet_split():
    sample_path = "backend/samples/sample_bonnet_split.jpg"
    assert os.path.exists(sample_path)
    with open(sample_path, "rb") as f:
        response = client.post(
            "/api/inspect",
            files={"image": ("sample_bonnet_split.jpg", f, "image/jpeg")},
            data={"component_type": "car_bonnet"}
        )
    assert response.status_code == 200
    data = response.json()
    assert data["component_type"] == "car_bonnet"
    assert data["defect_count"] >= 1
    assert data["overall_status"] == "REJECT"
    assert data["condition_classification"]["condition"] == "FAULTY"
    assert data["detections"][0]["severity"] == "critical"
    assert "PR01" in data["top_fmea_risk"]["process_code"]
    assert "Tandem Draw Press" in data["top_fmea_risk"]["station"]


def test_inspect_bonnet_dent():
    sample_path = "backend/samples/sample_bonnet_dent.jpg"
    assert os.path.exists(sample_path)
    with open(sample_path, "rb") as f:
        response = client.post(
            "/api/inspect",
            files={"image": ("sample_bonnet_dent.jpg", f, "image/jpeg")},
            data={"component_type": "car_bonnet"}
        )
    assert response.status_code == 200
    data = response.json()
    assert data["component_type"] == "car_bonnet"
    assert data["defect_count"] >= 1
    assert data["overall_status"] == "REVIEW"
    assert "DC02" in data["top_fmea_risk"]["process_code"]


def test_bonnet_analytics_and_simulation():
    # 1. Fetch initial empty analytics for bonnet
    res = client.get("/api/analytics?component_type=car_bonnet")
    assert res.status_code == 200
    data = res.json()
    assert data["component_type"] == "car_bonnet"
    assert "PR01" in data["machine_heatmaps"]
    assert "DC02" in data["machine_heatmaps"]
    assert "TR03" in data["machine_heatmaps"]

    # 2. Simulate 3 consecutive bonnets on DC02 (die contamination pimples)
    sim_res = client.post("/api/analytics/simulate?component_type=car_bonnet&machine_code=DC02&count=3")
    assert sim_res.status_code == 200
    sim_data = sim_res.json()
    assert sim_data["total_inspections"] == 3
    assert sim_data["machine_heatmaps"]["DC02"]["total_defects"] == 3
    assert len(sim_data["active_early_warnings"]) >= 1
    warn = sim_data["active_early_warnings"][0]
    assert warn["machine_code"] == "DC02"
    assert "DC02" in warn["alert_message"]
