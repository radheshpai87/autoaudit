from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_analytics_and_simulation_flow():
    # 1. Reset database to ensure clean state
    reset_resp = client.post("/api/analytics/reset")
    assert reset_resp.status_code == 200
    clean_data = reset_resp.json()
    assert clean_data["total_inspections"] == 0
    assert len(clean_data["active_early_warnings"]) == 0

    # 2. Get initial analytics
    response = client.get("/api/analytics?limit=50")
    assert response.status_code == 200
    data = response.json()
    assert data["total_inspections"] == 0
    assert "machine_heatmaps" in data
    assert "CR01" in data["machine_heatmaps"]

    # 3. Simulate 3 consecutive parts for PU01
    sim_resp = client.post("/api/analytics/simulate?machine_code=PU01&count=3")
    assert sim_resp.status_code == 200
    sim_data = sim_resp.json()
    assert sim_data["total_inspections"] == 3
    assert sim_data["machine_heatmaps"]["PU01"]["total_defects"] == 3

    # Check that warning triggered once >= 3 defects clustered
    assert len(sim_data["active_early_warnings"]) == 1
    warn = sim_data["active_early_warnings"][0]
    assert warn["machine_code"] == "PU01"
    assert warn["confidence"] >= 0.70

    # 4. Check history endpoint returns the 3 simulated parts
    hist_resp = client.get("/api/history?limit=10")
    assert hist_resp.status_code == 200
    records = hist_resp.json()
    assert len(records) == 3
    first = records[0]
    assert "part_id" in first
    assert len(first["defects"]) > 0
    assert "dx_normalized" in first["defects"][0]
    assert "clock_hour" in first["defects"][0]

    # 5. Clean up by resetting
    client.post("/api/analytics/reset")
