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


def test_complete_component_isolation():
    """
    Verifies 100% strict isolation between brake rotor and car bonnet:
    - Data ingestion for one component NEVER appears in the other's analytics.
    - Resetting one component leaves the other component completely intact.
    """
    # 1. Clean both components
    client.post("/api/analytics/reset?component_type=brake_rotor")
    client.post("/api/analytics/reset?component_type=car_bonnet")

    # 2. Add 3 parts to brake_rotor (PU01) and 4 parts to car_bonnet (DC02)
    sim_rotor = client.post("/api/analytics/simulate?component_type=brake_rotor&machine_code=PU01&count=3")
    assert sim_rotor.status_code == 200
    sim_bonnet = client.post("/api/analytics/simulate?component_type=car_bonnet&machine_code=DC02&count=4")
    assert sim_bonnet.status_code == 200

    # 3. Verify brake rotor analytics: MUST show exactly 3 parts and ONLY rotor stations
    r_resp = client.get("/api/analytics?component_type=brake_rotor")
    assert r_resp.status_code == 200
    r_data = r_resp.json()
    assert r_data["component_type"] == "brake_rotor"
    assert r_data["total_inspections"] == 3
    assert "PU01" in r_data["machine_heatmaps"]
    assert "DC02" not in r_data["machine_heatmaps"]  # No bonnet station!

    # 4. Verify car bonnet analytics: MUST show exactly 4 parts and ONLY bonnet stations
    b_resp = client.get("/api/analytics?component_type=car_bonnet")
    assert b_resp.status_code == 200
    b_data = b_resp.json()
    assert b_data["component_type"] == "car_bonnet"
    assert b_data["total_inspections"] == 4
    assert "DC02" in b_data["machine_heatmaps"]
    assert "PU01" not in b_data["machine_heatmaps"]  # No rotor station!

    # 5. Reset ONLY car_bonnet
    reset_b = client.post("/api/analytics/reset?component_type=car_bonnet")
    assert reset_b.status_code == 200
    assert reset_b.json()["total_inspections"] == 0

    # 6. Verify brake_rotor is STILL completely intact (3 parts)
    r_check = client.get("/api/analytics?component_type=brake_rotor")
    assert r_check.status_code == 200
    assert r_check.json()["total_inspections"] == 3
    assert r_check.json()["machine_heatmaps"]["PU01"]["total_defects"] == 3

    # Clean up
    client.post("/api/analytics/reset?component_type=brake_rotor")
    client.post("/api/analytics/reset?component_type=car_bonnet")


def test_machine_critical_thresholds():
    """
    Verifies exact conditions when machines escalate to CRITICAL:
    - CR01: >= 2 cracks triggers CRITICAL.
    - PU01: >= 5 gripper defects escalates from warning to CRITICAL.
    - PR01: >= 2 draw splits triggers CRITICAL.
    - DC02: >= 4 punch pimples/dents escalates from warning to CRITICAL.
    """
    # 1. Reset
    client.post("/api/analytics/reset?component_type=brake_rotor")
    client.post("/api/analytics/reset?component_type=car_bonnet")

    # --- Rotor: CR01 Quench Cracks (Critical at >= 2) ---
    cr01_res = client.post("/api/analytics/simulate?component_type=brake_rotor&machine_code=CR01&count=2")
    assert cr01_res.status_code == 200
    cr01_data = cr01_res.json()
    cr01_warns = [w for w in cr01_data["active_early_warnings"] if w["machine_code"] == "CR01"]
    assert len(cr01_warns) == 1
    assert cr01_warns[0]["severity_level"] == "critical"

    # --- Rotor: PU01 Gripper Dents (Warning at 3, Critical at >= 5) ---
    client.post("/api/analytics/reset?component_type=brake_rotor")
    # 3 parts -> warning
    pu_res_3 = client.post("/api/analytics/simulate?component_type=brake_rotor&machine_code=PU01&count=3")
    pu_warns_3 = [w for w in pu_res_3.json()["active_early_warnings"] if w["machine_code"] == "PU01"]
    assert pu_warns_3[0]["severity_level"] == "warning"
    # +2 more parts (total 5) -> critical
    pu_res_5 = client.post("/api/analytics/simulate?component_type=brake_rotor&machine_code=PU01&count=2")
    pu_warns_5 = [w for w in pu_res_5.json()["active_early_warnings"] if w["machine_code"] == "PU01"]
    assert pu_warns_5[0]["severity_level"] == "critical"

    # --- Bonnet: PR01 Draw Splits (Critical at >= 2) ---
    pr_res = client.post("/api/analytics/simulate?component_type=car_bonnet&machine_code=PR01&count=2")
    pr_warns = [w for w in pr_res.json()["active_early_warnings"] if w["machine_code"] == "PR01"]
    assert len(pr_warns) == 1
    assert pr_warns[0]["severity_level"] == "critical"

    # --- Bonnet: DC02 Punch Contamination (Warning at 2-3, Critical at >= 4) ---
    client.post("/api/analytics/reset?component_type=car_bonnet")
    # 2 parts -> warning
    dc_res_2 = client.post("/api/analytics/simulate?component_type=car_bonnet&machine_code=DC02&count=2")
    dc_warns_2 = [w for w in dc_res_2.json()["active_early_warnings"] if w["machine_code"] == "DC02"]
    assert dc_warns_2[0]["severity_level"] == "warning"
    # +2 more parts (total 4) -> critical
    dc_res_4 = client.post("/api/analytics/simulate?component_type=car_bonnet&machine_code=DC02&count=2")
    dc_warns_4 = [w for w in dc_res_4.json()["active_early_warnings"] if w["machine_code"] == "DC02"]
    assert dc_warns_4[0]["severity_level"] == "critical"

    # Clean up
    client.post("/api/analytics/reset?component_type=brake_rotor")
    client.post("/api/analytics/reset?component_type=car_bonnet")

