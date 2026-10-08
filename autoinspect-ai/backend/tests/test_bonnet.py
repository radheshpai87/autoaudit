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


def get_sample_path(filename: str) -> str:
    candidates = [
        os.path.join("backend/samples", filename),
        os.path.join("samples", filename),
        os.path.join(os.path.dirname(__file__), "../samples", filename),
        os.path.join("/home/radz/Downloads/autoaudit_hood_inspection_images_4", filename),
    ]
    for c in candidates:
        if os.path.exists(c):
            return c
    return os.path.join("backend/samples", filename)


def test_inspect_bonnet_good():
    sample_path = get_sample_path("sample_bonnet_good.jpg")
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
    sample_path = get_sample_path("sample_bonnet_split.jpg")
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
    sample_path = get_sample_path("sample_bonnet_dent.jpg")
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


def test_inspect_real_hood_clean():
    sample_path = get_sample_path("hood_clean_studio.png")
    assert os.path.exists(sample_path)
    with open(sample_path, "rb") as f:
        res = client.post(
            "/api/inspect",
            files={"image": ("02_clean_hood.png", f, "image/png")},
            data={"component_type": "car_bonnet"}
        )
    assert res.status_code == 200
    d = res.json()
    assert d["defect_count"] == 0
    assert d["overall_status"] == "PASS"
    assert d["condition_classification"]["condition"] == "GOOD"
    assert d["panel_die_zone"] == "All Zones Nominal"


def test_inspect_real_hood_dent():
    sample_path = get_sample_path("hood_dent_studio.png")
    assert os.path.exists(sample_path)
    with open(sample_path, "rb") as f:
        res = client.post(
            "/api/inspect",
            files={"image": ("01_hood_with_dent.png", f, "image/png")},
            data={"component_type": "car_bonnet"}
        )
    assert res.status_code == 200
    d = res.json()
    assert d["defect_count"] == 1
    assert d["overall_status"] == "REVIEW"
    assert d["detections"][0]["defect_type"] == "Surface Impact Dent"
    assert "Zone C" in d["panel_die_zone"]
    assert "DC02" in d["top_fmea_risk"]["process_code"]
    # Check bounding box encompasses upper right quadrant
    bx = d["detections"][0]["bbox"]
    assert bx[0] > 700 and bx[2] < 1100
    assert bx[1] > 300 and bx[3] < 600


def test_inspect_real_hood_clean_alternate_lighting():
    sample_path = get_sample_path("hood_clean_alternate.png")
    assert os.path.exists(sample_path)
    with open(sample_path, "rb") as f:
        res = client.post(
            "/api/inspect",
            files={"image": ("03_clean_hood_alternate.png", f, "image/png")},
            data={"component_type": "car_bonnet"}
        )
    assert res.status_code == 200
    d = res.json()
    assert d["defect_count"] == 0
    assert d["overall_status"] == "PASS"
    assert d["condition_classification"]["condition"] == "GOOD"


def test_inspect_real_hood_workshop_dent():
    sample_path = get_sample_path("hood_dent_workshop.png")
    assert os.path.exists(sample_path)
    with open(sample_path, "rb") as f:
        res = client.post(
            "/api/inspect",
            files={"image": ("04_hood_with_dent_workshop.png", f, "image/png")},
            data={"component_type": "car_bonnet"}
        )
    assert res.status_code == 200
    d = res.json()
    assert d["defect_count"] == 1
    assert d["overall_status"] == "REVIEW"
    assert d["detections"][0]["defect_type"] == "Surface Impact Dent"
    assert "Zone C" in d["panel_die_zone"]
    assert "DC02" in d["top_fmea_risk"]["process_code"]
    bx = d["detections"][0]["bbox"]
    assert bx[0] > 600 and bx[2] < 1000
    assert bx[1] > 400 and bx[3] < 650
