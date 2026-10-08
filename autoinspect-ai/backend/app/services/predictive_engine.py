import math
import numpy as np
from datetime import datetime, timezone, timedelta
from typing import List, Dict, Any, Tuple, Optional
from collections import defaultdict
from app.models.historical_schemas import (
    HistoricalInspectionRecord,
    HistoricalDefectPoint,
    MachineSignatureWarning,
    HeatmapBin,
    MachineHeatmapData,
    HistoricalAnalyticsResponse,
)
from app.services.historical_db import HistoricalDatabaseManager


KNOWN_SIGNATURE_PATTERNS = {
    # --- Brake Rotor Stations ---
    "CR01": {
        "station": "Grinding & Induction Treatment",
        "component_type": "brake_rotor",
        "failure_mode": "Transverse radial thermal crack / fissure",
        "potential_causes": "Cyclic thermal shock, residual tensile stress, or coolant pressure drop",
        "signature_type": "Swept friction ring localized radial fracture (0.30 <= r <= 0.42)",
        "recommended_action": "Condemn rotor immediately. Verify coolant nozzle pressure and induction quench timing.",
    },
    "PU01": {
        "station": "Picking-up Station",
        "component_type": "brake_rotor",
        "failure_mode": "Robot unloader gripper mechanical indentation",
        "potential_causes": "Gripper finger misalignment or degraded polyurethane buffer pads",
        "signature_type": "Bipolar outer edge clustering (θ near 90° & 270°, r >= 0.37)",
        "recommended_action": "Realign unloader robot gripper fingers and replace polyurethane protective pads immediately.",
    },
    "DT16": {
        "station": "Grinding Station",
        "component_type": "brake_rotor",
        "failure_mode": "Uneven wear / loading of CBN grinding wheel",
        "potential_causes": "CBN tool dull or loaded with swarf; excessive feed rate in finishing pass",
        "signature_type": "Concentric annular track scoring (0.31 <= r <= 0.37 across multiple angles)",
        "recommended_action": "Execute CBN grinding wheel dressing cycle and check tool replacement counter.",
    },
    "DT17": {
        "station": "Grinding Station",
        "component_type": "brake_rotor",
        "failure_mode": "Thickness variation / Spindle bearing chatter",
        "potential_causes": "Spindle anti-backlash bearing clearance loosening",
        "signature_type": "Wavy thickness flutter and cavitation pits",
        "recommended_action": "Check cutting speed variation and adjust spindle anti-backlash bearing clearance.",
    },
    "BA02": {
        "station": "Balancing Station",
        "component_type": "brake_rotor",
        "failure_mode": "Dynamic unbalance / Runout tilt",
        "potential_causes": "Balancing jig wear and locating clamp pin eccentricity",
        "signature_type": "Outer rim dynamic runout wobble (> 20 µm)",
        "recommended_action": "Recalibrate balancing machine jig and replace worn locating clamp pins.",
    },
    "IN01": {
        "station": "Inspection Station",
        "component_type": "brake_rotor",
        "failure_mode": "Residual wash water oxidation & rust",
        "potential_causes": "Air knife blower nozzle clogging or insufficient drying heat cycle",
        "signature_type": "Discoloration patches across friction face & hub hat",
        "recommended_action": "Clean air knife drying nozzles and verify wash drying temperature.",
    },

    # --- Car Bonnet / Sheet Metal Stamping Press Stations ---
    "PR01": {
        "station": "Tandem Draw Press #1 (Cushion & Punch)",
        "component_type": "car_bonnet",
        "failure_mode": "Tensile draw split tear / Necking fracture",
        "potential_causes": "Excessive blankholder binder tonnage, insufficient die clearance, or lubricant starvation",
        "signature_type": "Deep draw pocket concentration (Zone D/E headlamp blend radius)",
        "recommended_action": "Reduce blankholder hydraulic cushion tonnage by 8% and recheck draw bead radius lubrication.",
    },
    "DC02": {
        "station": "Forming & Restrike Press",
        "component_type": "car_bonnet",
        "failure_mode": "Repetitive punch pimple / metal chip entrapment",
        "potential_causes": "Metal swarf slivers trapped between upper die punch and sheet blank",
        "signature_type": "Clustered spatial pimple hotspot at identical die coordinate",
        "recommended_action": "Halt line for 5-minute die face solvent blow-off cleaning; check scrap chute vacuum.",
    },
    "TR03": {
        "station": "Trimming & Piercing Station",
        "component_type": "car_bonnet",
        "failure_mode": "Perimeter hemming edge burr / micro-shearing tear",
        "potential_causes": "Trim steel cutting blade clearance excessive (> 12% sheet gauge) or dull shear edge",
        "signature_type": "Perimeter edge burr lining (Zone F front or outer hemming flange)",
        "recommended_action": "Re-shim trim die steel clearance (maintain 8-10% sheet thickness) and re-sharpen cutting steels.",
    },
    "HM04": {
        "station": "Roller Hemming Robot Cell",
        "component_type": "car_bonnet",
        "failure_mode": "Hem flange wrinkling & puckering / uneven bead",
        "potential_causes": "Roller hemming guide pressure uneven or pre-hem angle deviation",
        "signature_type": "Longitudinal flange edge waviness along front cowl perimeter",
        "recommended_action": "Recalibrate hemming robot TCP force transducer and check roller guide alignment.",
    },
    "PT05": {
        "station": "Paint Prep & E-Coat Station",
        "component_type": "car_bonnet",
        "failure_mode": "Surface scratch / coating abrasion / pinholes",
        "potential_causes": "De-stacker suction cup slippage or blank feed conveyor roller friction",
        "signature_type": "Distributed planar micro-blemishes across upper bonnet spine",
        "recommended_action": "Clean blank feeder conveyor rollers and verify blank oiling washer pressure.",
    },
}


class PredictiveHeatmapEngine:
    """
    Transforms detected bounding boxes into exact rotor Cartesian & clock coordinates,
    or planar automotive sheet-metal Stamping Die coordinates (for Car Bonnets).
    Generates cumulative spatial heatmaps and triggers early warnings only when
    statistically significant spatial clusters or tolerance drift are observed.
    """

    @classmethod
    def cartesian_to_polar(cls, bbox: List[float], img_w: int, img_h: int) -> Tuple[float, float, float, float, float, str]:
        """
        Calculates exact centroid from bbox [x1, y1, x2, y2] for circular brake discs.
        Returns:
            (dx_norm, dy_norm, r_norm, clock_deg, clock_hour, zone_name)
        """
        x1, y1, x2, y2 = bbox[0], bbox[1], bbox[2], bbox[3]
        cx = (x1 + x2) / 2.0
        cy = (y1 + y2) / 2.0

        u = cx / float(max(img_w, 1))
        v = cy / float(max(img_h, 1))

        dx = round(u - 0.5, 4)
        dy = round(v - 0.5, 4)
        r = round(math.sqrt(dx * dx + dy * dy), 4)

        clock_deg = (math.degrees(math.atan2(dx, -dy)) + 360.0) % 360.0
        clock_hour = round(clock_deg / 30.0, 1)
        if clock_hour == 0.0:
            clock_hour = 12.0

        if r < 0.22:
            zone = "Hub Hat / Bolt Mounting Flange"
        elif r < 0.32:
            zone = "Inner Swept Friction Track"
        elif r <= 0.43:
            zone = "Mid-Swept Braking Face"
        else:
            zone = "Outer Chamfer & Perimeter Edge"

        return dx, dy, r, round(clock_deg, 1), clock_hour, zone

    @classmethod
    def normalize_panel_coordinates(cls, bbox: List[float], img_w: int, img_h: int) -> Tuple[float, float, str]:
        """
        Calculates normalized panel coordinates (X, Y) in [0.0, 1.0] across the car bonnet surface
        and determines the specific Stamping Press Die Zone.
        Returns:
            (panel_x, panel_y, die_zone_name)
        """
        x1, y1, x2, y2 = bbox[0], bbox[1], bbox[2], bbox[3]
        cx = (x1 + x2) / 2.0
        cy = (y1 + y2) / 2.0

        px = round(min(1.0, max(0.0, cx / float(max(img_w, 1)))), 4)
        py = round(min(1.0, max(0.0, cy / float(max(img_h, 1)))), 4)

        # Die Zone Mapping based on planar hood geometry:
        # Top (y < 0.25): Front nose & radiator latch edge
        # Bottom (y > 0.70): Rear cowl & windshield hinge mountings
        # Middle (0.25 <= y <= 0.70): Center spine and side draw shoulders
        if py > 0.70:
            if px < 0.50:
                zone = "Zone A: Left Cowl / Rear Hinge Flange"
            else:
                zone = "Zone B: Right Cowl / Rear Hinge Flange"
        elif py < 0.25:
            if px < 0.35:
                zone = "Zone D: Left Deep Draw Headlamp Pocket"
            elif px > 0.65:
                zone = "Zone E: Right Deep Draw Headlamp Pocket"
            else:
                zone = "Zone F: Front Hemming & Radiator Latch Edge"
        else:
            if 0.35 <= px <= 0.65:
                zone = "Zone C: Center Character Line & Spine"
            elif px < 0.35:
                zone = "Zone D: Left Hood Shoulder Flange"
            else:
                zone = "Zone E: Right Hood Shoulder Flange"

        return px, py, zone

    @classmethod
    def generate_analytics_and_heatmaps(
        cls,
        component_type: str = "brake_rotor",
        limit: int = 100
    ) -> HistoricalAnalyticsResponse:
        component_type = component_type.lower()
        records = HistoricalDatabaseManager.get_recent_inspections(limit=limit, component_type=component_type)
        total = len(records)

        target_codes = (
            ["PR01", "DC02", "TR03", "HM04", "PT05"]
            if component_type == "car_bonnet"
            else ["CR01", "PU01", "DT16", "DT17", "BA02", "IN01"]
        )

        if total == 0:
            comp_display = "Car Bonnet / BIW Panel" if component_type == "car_bonnet" else "Brake Disc Rotor"
            return HistoricalAnalyticsResponse(
                component_type=component_type,
                supported_components=["brake_rotor", "car_bonnet"],
                total_inspections=0,
                pass_rate=100.0,
                reject_rate=0.0,
                review_rate=0.0,
                records=[],
                active_early_warnings=[],
                machine_heatmaps=cls._empty_heatmaps(target_codes, component_type),
                time_series=[],
                latest_inspection_record=None,
                latest_inspected_defect=None,
                latest_machine_code=None,
                latest_conveyor_status=f"No {comp_display} parts inspected yet. Start scanning on conveyor line.",
                collection_status_message=f"No inspection records logged yet for {comp_display}. Upload or test a part in HUD Inspection mode to begin logging real-time telemetry."
            )

        pass_count = sum(1 for r in records if r.overall_status == "PASS")
        reject_count = sum(1 for r in records if r.overall_status == "REJECT")
        review_count = sum(1 for r in records if r.overall_status == "REVIEW")

        pass_rate = round((pass_count / total) * 100.0, 1)
        reject_rate = round((reject_count / total) * 100.0, 1)
        review_rate = round((review_count / total) * 100.0, 1)

        machine_defects: Dict[str, List[HistoricalDefectPoint]] = defaultdict(list)
        all_defects: List[HistoricalDefectPoint] = []

        latest_record = records[0] if records else None
        latest_defect: Optional[HistoricalDefectPoint] = None
        latest_machine: Optional[str] = None
        latest_conveyor_status = ""

        if latest_record:
            prefix = "Car Bonnet" if component_type == "car_bonnet" else "Rotor"
            if latest_record.defect_count == 0:
                latest_conveyor_status = (
                    f"Conveyor Line Active: {prefix} {latest_record.part_id} PASSED "
                    f"(0 Defects, Wear Index {latest_record.wear_index_score:.1f}/100). "
                    "Component is clean and conforming — zero heat signature added."
                )
                latest_defect = None
                latest_machine = None
            else:
                if latest_record.defects:
                    latest_defect = latest_record.defects[0]
                    latest_machine = latest_defect.process_code
                    loc_desc = (
                        f"Die Zone '{latest_defect.zone_name}' (X={latest_defect.panel_x_normalized:.2f}, Y={latest_defect.panel_y_normalized:.2f})"
                        if (component_type == "car_bonnet" and latest_defect.panel_x_normalized is not None)
                        else f"{latest_defect.clock_hour}h on Station {latest_defect.process_code}"
                    )
                    latest_conveyor_status = (
                        f"Conveyor Line Alert: {prefix} {latest_record.part_id} REJECTED ({latest_record.defect_count} Defect(s)). "
                        f"Plotted '{latest_defect.defect_type}' at {loc_desc} on Station {latest_defect.process_code}."
                    )

        for r in records:
            for d in r.defects:
                code = d.process_code or "UNKNOWN"
                machine_defects[code].append(d)
                all_defects.append(d)

        machine_heatmaps: Dict[str, MachineHeatmapData] = {}
        for code in target_codes:
            defects_for_code = machine_defects.get(code, [])
            meta = KNOWN_SIGNATURE_PATTERNS.get(code, {
                "station": "Production Station",
                "signature_type": "General spatial distribution",
                "component_type": component_type
            })

            bins = []
            for d in defects_for_code:
                bins.append(HeatmapBin(
                    dx=d.dx_normalized,
                    dy=d.dy_normalized,
                    r_bin=d.r_normalized,
                    theta_bin=d.theta_degrees,
                    clock_hour=d.clock_hour,
                    panel_x=d.panel_x_normalized,
                    panel_y=d.panel_y_normalized,
                    die_zone=d.zone_name,
                    component_type=component_type,
                    intensity=round(d.confidence, 2),
                    defect_count=1,
                    top_process_code=code,
                    defect_type=d.defect_type,
                    bbox=d.bbox,
                    mask_polygon=d.mask_polygon,
                    area_pct=d.area_pct,
                ))

            machine_heatmaps[code] = MachineHeatmapData(
                machine_code=code,
                station=meta["station"],
                component_type=component_type,
                total_samples=total,
                total_defects=len(defects_for_code),
                bins=bins,
                raw_points=defects_for_code,
                signature_summary=meta["signature_type"]
            )

        active_warnings = (
            cls._evaluate_bonnet_warnings(records, machine_defects)
            if component_type == "car_bonnet"
            else cls._evaluate_rotor_warnings(records, machine_defects)
        )

        if len(all_defects) == 0:
            status_msg = f"Logged {total} conforming part(s) with zero surface defects. Production within Table 1 tolerances."
        elif len(active_warnings) == 0:
            status_msg = (
                f"Live Ingestion Mode: {len(all_defects)} defect(s) logged across {total} part(s). "
                f"Defect hotspots plotted at exact coordinates. "
                f"Predictive warning triggers when recurrent defects cluster on a single station."
            )
        else:
            status_msg = (
                f"Recurrent failure pattern detected! {len(active_warnings)} station(s) show spatial defect clustering."
            )

        time_series = [
            {
                "timestamp": r.timestamp,
                "part_id": r.part_id,
                "dtv_um": r.dtv_value_um,
                "runout_um": r.runout_value_um,
                "parallelism_um": r.parallelism_value_um,
                "rpn": r.highest_rpn,
                "status": r.overall_status,
                "defect_count": r.defect_count,
                "process_code": r.primary_process_code or "PASS",
                "wear_index": r.wear_index_score
            }
            for r in reversed(records)
        ]

        return HistoricalAnalyticsResponse(
            component_type=component_type,
            supported_components=["brake_rotor", "car_bonnet"],
            total_inspections=total,
            pass_rate=pass_rate,
            reject_rate=reject_rate,
            review_rate=review_rate,
            records=records[:25],
            active_early_warnings=active_warnings,
            machine_heatmaps=machine_heatmaps,
            time_series=time_series,
            latest_inspection_record=latest_record,
            latest_inspected_defect=latest_defect,
            latest_machine_code=latest_machine or (records[0].primary_process_code if records else None),
            latest_conveyor_status=latest_conveyor_status,
            collection_status_message=status_msg
        )

    @classmethod
    def _empty_heatmaps(cls, target_codes: List[str], component_type: str) -> Dict[str, MachineHeatmapData]:
        res = {}
        for code in target_codes:
            meta = KNOWN_SIGNATURE_PATTERNS.get(code, {
                "station": "Production Station",
                "signature_type": "General spatial distribution",
                "component_type": component_type
            })
            res[code] = MachineHeatmapData(
                machine_code=code,
                station=meta["station"],
                component_type=component_type,
                total_samples=0,
                total_defects=0,
                bins=[],
                raw_points=[],
                signature_summary=meta["signature_type"]
            )
        return res

    @classmethod
    def _evaluate_rotor_warnings(
        cls,
        records: List[HistoricalInspectionRecord],
        machine_defects: Dict[str, List[HistoricalDefectPoint]]
    ) -> List[MachineSignatureWarning]:
        warnings: List[MachineSignatureWarning] = []

        # 1. Check PU01 Robot Gripper Impact Clustering (requires >= 3 defects)
        pu01_defects = machine_defects.get("PU01", [])
        if len(pu01_defects) >= 3:
            bipolar_count = sum(
                1 for d in pu01_defects
                if abs(d.theta_degrees - 90.0) <= 30.0 or abs(d.theta_degrees - 270.0) <= 30.0
            )
            conf = min(0.96, 0.60 + (bipolar_count / len(pu01_defects)) * 0.35)
            meta = KNOWN_SIGNATURE_PATTERNS["PU01"]
            warnings.append(MachineSignatureWarning(
                machine_code="PU01",
                station=meta["station"],
                component_type="brake_rotor",
                failure_mode=meta["failure_mode"],
                potential_causes=meta["potential_causes"],
                confidence=round(conf, 2),
                spatial_signature=f"Bipolar Rim Cluster ({bipolar_count} defects at 3 o'clock & 9 o'clock)",
                severity_level="critical" if len(pu01_defects) >= 5 else "warning",
                alert_message=(
                    f"PREDICTIVE WARNING: Station PU01 unloader robot gripper exhibits repetitive impact dents "
                    f"({len(pu01_defects)} defects logged). Polyurethane protective buffer pads degraded."
                ),
                recommended_action=meta["recommended_action"],
                evidence_count=len(pu01_defects),
                recent_trend_slope=round(len(pu01_defects) / max(len(records), 1), 3)
            ))

        # 2. Check DT16 Grinding Wheel Wear (requires >= 3 defects OR DTV drift)
        dt16_defects = machine_defects.get("DT16", [])
        dtv_values = [r.dtv_value_um for r in records[:15]]
        dtv_slope = 0.0
        if len(dtv_values) >= 5:
            x = np.arange(len(dtv_values))
            y = np.array(list(reversed(dtv_values)))
            dtv_slope = float(np.polyfit(x, y, 1)[0])

        if len(dt16_defects) >= 3 or (len(dtv_values) >= 5 and dtv_slope > 0.10):
            meta = KNOWN_SIGNATURE_PATTERNS["DT16"]
            warnings.append(MachineSignatureWarning(
                machine_code="DT16",
                station=meta["station"],
                component_type="brake_rotor",
                failure_mode=meta["failure_mode"],
                potential_causes=meta["potential_causes"],
                confidence=0.89,
                spatial_signature="Concentric Annular Scoring & DTV Telemetry Drift",
                severity_level="warning",
                alert_message=(
                    f"PREDICTIVE WARNING: Grinding Station DT16 CBN wheel wear detected. "
                    f"{len(dt16_defects)} concentric scoring defect(s) logged; DTV drift slope: +{dtv_slope*5:.2f} µm/5 parts."
                ),
                recommended_action=meta["recommended_action"],
                evidence_count=len(dt16_defects),
                recent_trend_slope=round(dtv_slope, 3)
            ))

        # 3. Check CR01 Thermal Quench Cracks (requires >= 2 radial cracks)
        cr01_defects = machine_defects.get("CR01", [])
        if len(cr01_defects) >= 2:
            meta = KNOWN_SIGNATURE_PATTERNS["CR01"]
            warnings.append(MachineSignatureWarning(
                machine_code="CR01",
                station=meta["station"],
                component_type="brake_rotor",
                failure_mode=meta["failure_mode"],
                potential_causes=meta["potential_causes"],
                confidence=0.95,
                spatial_signature="Repeated Radial Structural Cracks across swept friction ring",
                severity_level="critical",
                alert_message=(
                    f"CRITICAL REJECTION: Station CR01 has produced {len(cr01_defects)} structural radial cracks. "
                    f"Immediate batch shutdown required to check casting induction quenching."
                ),
                recommended_action=meta["recommended_action"],
                evidence_count=len(cr01_defects),
                recent_trend_slope=0.1
            ))

        return warnings

    @classmethod
    def _evaluate_bonnet_warnings(
        cls,
        records: List[HistoricalInspectionRecord],
        machine_defects: Dict[str, List[HistoricalDefectPoint]]
    ) -> List[MachineSignatureWarning]:
        """
        Evaluates early warning failure signatures for Sheet Metal Stamping Press lines:
        - DC02 Die Contamination: Identical coordinate repetitive pimples/dents
        - PR01 Tandem Draw Press: Deep draw split cracks in corner scoops
        - TR03 Trimming Station: Perimeter edge burrs
        """
        warnings: List[MachineSignatureWarning] = []

        # 1. DC02 Die Punch Contamination (Foreign metal chip on punch)
        dc02_defects = machine_defects.get("DC02", [])
        if len(dc02_defects) >= 2:
            # Check for localized clustering in Die (X, Y) space (distance <= 0.12)
            pts = [(d.panel_x_normalized or 0.5, d.panel_y_normalized or 0.5) for d in dc02_defects]
            clustered = 0
            for i in range(len(pts)):
                for j in range(i + 1, len(pts)):
                    dist = math.hypot(pts[i][0] - pts[j][0], pts[i][1] - pts[j][1])
                    if dist <= 0.12:
                        clustered += 1

            if clustered >= 1:
                meta = KNOWN_SIGNATURE_PATTERNS["DC02"]
                sample_pt = pts[0]
                warnings.append(MachineSignatureWarning(
                    machine_code="DC02",
                    station=meta["station"],
                    component_type="car_bonnet",
                    failure_mode=meta["failure_mode"],
                    potential_causes=meta["potential_causes"],
                    confidence=0.94,
                    spatial_signature=f"Die Surface Hotspot at X={sample_pt[0]:.2f}, Y={sample_pt[1]:.2f}",
                    severity_level="critical" if len(dc02_defects) >= 4 else "warning",
                    alert_message=(
                        f"PREDICTIVE ALERT: Secondary Form Press DC02 upper punch contamination! "
                        f"{len(dc02_defects)} repetitive punch pimple(s) logged at identical die location. "
                        f"Foreign metal sliver chip trapped on punch face."
                    ),
                    recommended_action=meta["recommended_action"],
                    evidence_count=len(dc02_defects),
                    recent_trend_slope=round(len(dc02_defects) / max(len(records), 1), 3)
                ))

        # 2. PR01 Tandem Draw Press #1 (Excessive binder tonnage / draw split)
        pr01_defects = machine_defects.get("PR01", [])
        if len(pr01_defects) >= 2:
            meta = KNOWN_SIGNATURE_PATTERNS["PR01"]
            warnings.append(MachineSignatureWarning(
                machine_code="PR01",
                station=meta["station"],
                component_type="car_bonnet",
                failure_mode=meta["failure_mode"],
                potential_causes=meta["potential_causes"],
                confidence=0.96,
                spatial_signature="Deep Draw Pocket Tensile Necking Fracture",
                severity_level="critical",
                alert_message=(
                    f"CRITICAL SCRAP ALERT: Tandem Draw Press PR01 produced {len(pr01_defects)} tensile draw split tears. "
                    f"Excessive blankholder binder pressure or draw bead lubrication failure."
                ),
                recommended_action=meta["recommended_action"],
                evidence_count=len(pr01_defects),
                recent_trend_slope=round(len(pr01_defects) / max(len(records), 1), 3)
            ))

        # 3. TR03 Trimming & Piercing Station (Perimeter Burrs)
        tr03_defects = machine_defects.get("TR03", [])
        if len(tr03_defects) >= 2:
            meta = KNOWN_SIGNATURE_PATTERNS["TR03"]
            warnings.append(MachineSignatureWarning(
                machine_code="TR03",
                station=meta["station"],
                component_type="car_bonnet",
                failure_mode=meta["failure_mode"],
                potential_causes=meta["potential_causes"],
                confidence=0.88,
                spatial_signature="Perimeter Hem Flange Burr Concentration",
                severity_level="warning",
                alert_message=(
                    f"PREDICTIVE ALERT: Trimming Station TR03 cutting blade wear detected. "
                    f"{len(tr03_defects)} perimeter edge burr(s) observed. Excessive die clearance."
                ),
                recommended_action=meta["recommended_action"],
                evidence_count=len(tr03_defects),
                recent_trend_slope=round(len(tr03_defects) / max(len(records), 1), 3)
            ))

        return warnings

    @classmethod
    def simulate_shift_batch(
        cls,
        component_type: str = "brake_rotor",
        machine_code: str = "PU01",
        count: int = 3
    ) -> HistoricalAnalyticsResponse:
        import random
        now = datetime.now(timezone.utc)
        machine_code = machine_code.upper()
        component_type = component_type.lower()

        if component_type == "car_bonnet":
            # Simulate Bonnet Parts
            for k in range(count):
                p_time = (now - timedelta(minutes=(count - k) * 5)).isoformat()
                p_id = f"BN-SIM-{random.randint(1000, 9999)}"

                if machine_code == "DC02":
                    # Clustered punch pimple on upper spine / character line (X ~ 0.46, Y ~ 0.35)
                    px = round(0.46 + random.uniform(-0.02, 0.02), 4)
                    py = round(0.35 + random.uniform(-0.02, 0.02), 4)
                    norm_bbox = [
                        round((px - 0.03) - 0.5, 4),
                        round((py - 0.03) - 0.5, 4),
                        round((px + 0.03) - 0.5, 4),
                        round((py + 0.03) - 0.5, 4)
                    ]
                    poly = [
                        [round(norm_bbox[0], 4), round(norm_bbox[1], 4)],
                        [round(norm_bbox[2], 4), round(norm_bbox[1], 4)],
                        [round(norm_bbox[2], 4), round(norm_bbox[3], 4)],
                        [round(norm_bbox[0], 4), round(norm_bbox[3], 4)]
                    ]

                    defect = HistoricalDefectPoint(
                        defect_type="Die Contamination Pimple",
                        process_code="DC02",
                        severity="medium",
                        confidence=round(0.91 + random.uniform(0, 0.05), 2),
                        component_type="car_bonnet",
                        dx_normalized=round(px - 0.5, 4),
                        dy_normalized=round(py - 0.5, 4),
                        panel_x_normalized=px,
                        panel_y_normalized=py,
                        zone_name="Zone C: Center Character Line & Spine",
                        area_pct=round(random.uniform(0.3, 0.6), 2),
                        bbox=norm_bbox,
                        mask_polygon=poly
                    )
                    rec = HistoricalInspectionRecord(
                        part_id=p_id,
                        component_type="car_bonnet",
                        timestamp=p_time,
                        image_filename=f"sim_bonnet_dc02_{k}.jpg",
                        overall_status="REVIEW",
                        defect_count=1,
                        condition="ALMOST_WORN",
                        wear_index_score=48.0,
                        dtv_value_um=0.6,
                        runout_value_um=0.5,
                        parallelism_value_um=0.3,
                        highest_rpn=126,
                        primary_process_code="DC02",
                        station="Forming & Restrike Press",
                        defects=[defect]
                    )
                    HistoricalDatabaseManager.log_inspection(rec)

                elif machine_code == "PR01":
                    # Deep draw split tear in left headlamp pocket (X ~ 0.22, Y ~ 0.18)
                    px = round(0.22 + random.uniform(-0.02, 0.02), 4)
                    py = round(0.18 + random.uniform(-0.02, 0.02), 4)
                    norm_bbox = [
                        round((px - 0.04) - 0.5, 4),
                        round((py - 0.03) - 0.5, 4),
                        round((px + 0.04) - 0.5, 4),
                        round((py + 0.03) - 0.5, 4)
                    ]
                    defect = HistoricalDefectPoint(
                        defect_type="Stamping Draw Split",
                        process_code="PR01",
                        severity="critical",
                        confidence=round(0.95 + random.uniform(0, 0.04), 2),
                        component_type="car_bonnet",
                        dx_normalized=round(px - 0.5, 4),
                        dy_normalized=round(py - 0.5, 4),
                        panel_x_normalized=px,
                        panel_y_normalized=py,
                        zone_name="Zone D: Left Deep Draw Headlamp Pocket",
                        area_pct=round(random.uniform(0.8, 1.4), 2),
                        bbox=norm_bbox,
                        mask_polygon=[
                            [round(norm_bbox[0], 4), round(norm_bbox[1], 4)],
                            [round(norm_bbox[2], 4), round(norm_bbox[1], 4)],
                            [round(norm_bbox[2], 4), round(norm_bbox[3], 4)],
                            [round(norm_bbox[0], 4), round(norm_bbox[3], 4)]
                        ]
                    )
                    rec = HistoricalInspectionRecord(
                        part_id=p_id,
                        component_type="car_bonnet",
                        timestamp=p_time,
                        image_filename=f"sim_bonnet_pr01_{k}.jpg",
                        overall_status="REJECT",
                        defect_count=1,
                        condition="FAULTY",
                        wear_index_score=86.0,
                        dtv_value_um=1.6,
                        runout_value_um=1.1,
                        parallelism_value_um=0.4,
                        highest_rpn=180,
                        primary_process_code="PR01",
                        station="Tandem Draw Press #1 (Cushion & Punch)",
                        defects=[defect]
                    )
                    HistoricalDatabaseManager.log_inspection(rec)

                elif machine_code == "TR03":
                    # Perimeter edge burr along front hemming edge (X ~ 0.18, Y ~ 0.15)
                    px = round(0.18 + random.uniform(-0.02, 0.02), 4)
                    py = round(0.15 + random.uniform(-0.02, 0.02), 4)
                    defect = HistoricalDefectPoint(
                        defect_type="Perimeter Hemming Burr",
                        process_code="TR03",
                        severity="medium",
                        confidence=round(0.88 + random.uniform(0, 0.06), 2),
                        component_type="car_bonnet",
                        dx_normalized=round(px - 0.5, 4),
                        dy_normalized=round(py - 0.5, 4),
                        panel_x_normalized=px,
                        panel_y_normalized=py,
                        zone_name="Zone F: Front Hemming & Radiator Latch Edge",
                        area_pct=round(random.uniform(0.4, 0.7), 2),
                        bbox=[round(px - 0.52, 4), round(py - 0.52, 4), round(px - 0.48, 4), round(py - 0.48, 4)]
                    )
                    rec = HistoricalInspectionRecord(
                        part_id=p_id,
                        component_type="car_bonnet",
                        timestamp=p_time,
                        image_filename=f"sim_bonnet_tr03_{k}.jpg",
                        overall_status="REVIEW",
                        defect_count=1,
                        condition="ALMOST_WORN",
                        wear_index_score=42.0,
                        dtv_value_um=0.4,
                        runout_value_um=0.3,
                        parallelism_value_um=0.8,
                        highest_rpn=90,
                        primary_process_code="TR03",
                        station="Trimming & Piercing Station",
                        defects=[defect]
                    )
                    HistoricalDatabaseManager.log_inspection(rec)

                else:
                    # Conforming Bonnet
                    rec = HistoricalInspectionRecord(
                        part_id=p_id,
                        component_type="car_bonnet",
                        timestamp=p_time,
                        image_filename=f"sim_bonnet_pass_{k}.jpg",
                        overall_status="PASS",
                        defect_count=0,
                        condition="GOOD",
                        wear_index_score=11.0,
                        dtv_value_um=0.2,
                        runout_value_um=0.2,
                        parallelism_value_um=0.2,
                        highest_rpn=0,
                        primary_process_code=None,
                        station=None,
                        defects=[]
                    )
                    HistoricalDatabaseManager.log_inspection(rec)

            return cls.generate_analytics_and_heatmaps(component_type="car_bonnet")

        # Default: Simulate Brake Rotor Parts
        for k in range(count):
            p_time = (now - timedelta(minutes=(count - k) * 5)).isoformat()
            p_id = f"BD-SIM-{random.randint(1000, 9999)}"

            if machine_code == "PU01":
                theta = random.choice([90.0, 270.0]) + random.uniform(-8.0, 8.0)
                r_norm = random.uniform(0.38, 0.41)
                rad = math.radians(theta)
                dx = round(r_norm * math.sin(rad), 4)
                dy = round(-r_norm * math.cos(rad), 4)
                clock_h = round(theta / 30.0, 1) or 12.0

                defect = HistoricalDefectPoint(
                    defect_type="Surface Mechanical Impact Dent",
                    process_code="PU01",
                    severity="medium",
                    confidence=round(0.85 + random.uniform(0, 0.08), 2),
                    component_type="brake_rotor",
                    dx_normalized=dx,
                    dy_normalized=dy,
                    r_normalized=round(r_norm, 3),
                    theta_degrees=round(theta, 1),
                    clock_hour=clock_h,
                    zone_name="Outer Chamfer & Perimeter Edge",
                    area_pct=round(random.uniform(0.2, 0.35), 2),
                    bbox=[round(dx - 0.03, 4), round(dy - 0.03, 4), round(dx + 0.03, 4), round(dy + 0.03, 4)]
                )
                rec = HistoricalInspectionRecord(
                    part_id=p_id,
                    component_type="brake_rotor",
                    timestamp=p_time,
                    image_filename=f"sim_pu01_{k}.jpg",
                    overall_status="REVIEW",
                    defect_count=1,
                    condition="ALMOST_WORN",
                    wear_index_score=52.0,
                    dtv_value_um=3.4,
                    runout_value_um=13.2,
                    parallelism_value_um=22.0,
                    highest_rpn=84,
                    primary_process_code="PU01",
                    station="Picking-up Station",
                    defects=[defect]
                )
                HistoricalDatabaseManager.log_inspection(rec)

            elif machine_code == "CR01":
                theta = random.uniform(40.0, 60.0)
                r_norm = random.uniform(0.34, 0.39)
                rad = math.radians(theta)
                dx = round(r_norm * math.sin(rad), 4)
                dy = round(-r_norm * math.cos(rad), 4)
                clock_h = round(theta / 30.0, 1)

                defect = HistoricalDefectPoint(
                    defect_type="Surface Radial Crack",
                    process_code="CR01",
                    severity="critical",
                    confidence=round(0.93 + random.uniform(0, 0.05), 2),
                    component_type="brake_rotor",
                    dx_normalized=dx,
                    dy_normalized=dy,
                    r_normalized=round(r_norm, 3),
                    theta_degrees=round(theta, 1),
                    clock_hour=clock_h,
                    zone_name="Mid-Swept Braking Face",
                    area_pct=round(random.uniform(0.6, 0.9), 2),
                    bbox=[round(dx - 0.04, 4), round(dy - 0.05, 4), round(dx + 0.04, 4), round(dy + 0.05, 4)]
                )
                rec = HistoricalInspectionRecord(
                    part_id=p_id,
                    component_type="brake_rotor",
                    timestamp=p_time,
                    image_filename=f"sim_cr01_{k}.jpg",
                    overall_status="REJECT",
                    defect_count=1,
                    condition="FAULTY",
                    wear_index_score=88.0,
                    dtv_value_um=7.2,
                    runout_value_um=18.4,
                    parallelism_value_um=42.0,
                    highest_rpn=120,
                    primary_process_code="CR01",
                    station="Grinding & Induction Treatment",
                    defects=[defect]
                )
                HistoricalDatabaseManager.log_inspection(rec)

            else:
                rec = HistoricalInspectionRecord(
                    part_id=p_id,
                    component_type="brake_rotor",
                    timestamp=p_time,
                    image_filename=f"sim_pass_{k}.jpg",
                    overall_status="PASS",
                    defect_count=0,
                    condition="GOOD",
                    wear_index_score=14.0,
                    dtv_value_um=2.1,
                    runout_value_um=11.2,
                    parallelism_value_um=16.0,
                    highest_rpn=0,
                    primary_process_code=None,
                    station=None,
                    defects=[]
                )
                HistoricalDatabaseManager.log_inspection(rec)

        return cls.generate_analytics_and_heatmaps(component_type="brake_rotor")
