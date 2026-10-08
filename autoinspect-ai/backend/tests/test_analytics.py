from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_analytics_endpoint():
    response = client.get("/api/analytics?limit=50")
    assert response.status_code == 200
    data = response.json()

    assert "total_inspections" in data
    assert data["total_inspections"] >= 30
    assert "pass_rate" in data
    assert "active_early_warnings" in data
    assert "machine_heatmaps" in data
    assert "time_series" in data

    # Check heatmaps exist for core machines
    heatmaps = data["machine_heatmaps"]
    assert "PU01" in heatmaps
    assert "DT16" in heatmaps
    assert "CR01" in heatmaps

    # Check active early warnings
    warnings = data["active_early_warnings"]
    assert len(warnings) > 0
    pu01_warn = next((w for w in warnings if w["machine_code"] == "PU01"), None)
    assert pu01_warn is not None
    assert "PU01" in pu01_warn["machine_code"]
    assert pu01_warn["confidence"] > 0.70


def test_history_endpoint():
    response = client.get("/api/history?limit=10")
    assert response.status_code == 200
    records = response.json()
    assert isinstance(records, list)
    assert len(records) > 0
    first = records[0]
    assert "part_id" in first
    assert "overall_status" in first
    assert "dtv_value_um" in first
