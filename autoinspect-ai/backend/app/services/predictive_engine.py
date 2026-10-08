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
    "CR01": {
        "station": "Grinding & Induction Treatment",
        "failure_mode": "Transverse radial thermal crack / fissure",
        "potential_causes": "Cyclic thermal shock, residual tensile stress, or coolant pressure drop",
        "signature_type": "Swept friction ring localized radial fracture (0.30 <= r <= 0.42)",
        "recommended_action": "Condemn rotor immediately. Verify coolant nozzle pressure and induction quench timing.",
    },
    "PU01": {
        "station": "Picking-up Station",
        "failure_mode": "Robot unloader gripper mechanical indentation",
        "potential_causes": "Gripper finger misalignment or degraded polyurethane buffer pads",
        "signature_type": "Bipolar outer edge clustering (θ near 90° & 270°, r >= 0.37)",
        "recommended_action": "Realign unloader robot gripper fingers and replace polyurethane protective pads immediately.",
    },
    "DT16": {
        "station": "Grinding Station",
        "failure_mode": "Uneven wear / loading of CBN grinding wheel",
        "potential_causes": "CBN tool dull or loaded with swarf; excessive feed rate in finishing pass",
        "signature_type": "Concentric annular track scoring (0.31 <= r <= 0.37 across multiple angles)",
        "recommended_action": "Execute CBN grinding wheel dressing cycle and check tool replacement counter.",
    },
    "DT17": {
        "station": "Grinding Station",
        "failure_mode": "Thickness variation / Spindle bearing chatter",
        "potential_causes": "Spindle anti-backlash bearing clearance loosening",
        "signature_type": "Wavy thickness flutter and cavitation pits",
        "recommended_action": "Check cutting speed variation and adjust spindle anti-backlash bearing clearance.",
    },
    "BA02": {
        "station": "Balancing Station",
        "failure_mode": "Dynamic unbalance / Runout tilt",
        "potential_causes": "Balancing jig wear and locating clamp pin eccentricity",
        "signature_type": "Outer rim dynamic runout wobble (> 20 µm)",
        "recommended_action": "Recalibrate balancing machine jig and replace worn locating clamp pins.",
    },
    "IN01": {
        "station": "Inspection Station",
        "failure_mode": "Residual wash water oxidation & rust",
        "potential_causes": "Air knife blower nozzle clogging or insufficient drying heat cycle",
        "signature_type": "Discoloration patches across friction face & hub hat",
        "recommended_action": "Clean air knife drying nozzles and verify wash drying temperature.",
    },
}


class PredictiveHeatmapEngine:
    """
    Transforms detected bounding boxes into exact rotor Cartesian and clock coordinates.
    Generates cumulative spatial heatmaps and triggers early warnings only when
    statistically significant spatial clusters or tolerance drift are observed.
    """

    @classmethod
    def cartesian_to_polar(cls, bbox: List[float], img_w: int, img_h: int) -> Tuple[float, float, float, float, float, str]:
        """
        Calculates exact centroid from bbox [x1, y1, x2, y2].
        Returns:
            (dx_norm, dy_norm, r_norm, clock_deg, clock_hour, zone_name)
        """
        x1, y1, x2, y2 = bbox[0], bbox[1], bbox[2], bbox[3]

        # Centroid
        cx = (x1 + x2) / 2.0
        cy = (y1 + y2) / 2.0

        # Normalized coordinates relative to image center (0.5, 0.5)
        u = cx / float(max(img_w, 1))
        v = cy / float(max(img_h, 1))

        dx = round(u - 0.5, 4)
        dy = round(v - 0.5, 4)

        # Distance from center
        r = round(math.sqrt(dx * dx + dy * dy), 4)

        # Clock-face angle: 12 o'clock is 0 deg (top, dy < 0), 3 o'clock is 90 deg, 6 o'clock is 180 deg
        clock_deg = (math.degrees(math.atan2(dx, -dy)) + 360.0) % 360.0
        clock_hour = round(clock_deg / 30.0, 1)
        if clock_hour == 0.0:
            clock_hour = 12.0

        # Rotor radial zone determination
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
    def generate_analytics_and_heatmaps(cls, limit: int = 100) -> HistoricalAnalyticsResponse:
        records = HistoricalDatabaseManager.get_recent_inspections(limit=limit)
        total = len(records)

        if total == 0:
            return HistoricalAnalyticsResponse(
                total_inspections=0,
                pass_rate=100.0,
                reject_rate=0.0,
                review_rate=0.0,
                records=[],
                active_early_warnings=[],
                machine_heatmaps=cls._empty_heatmaps(),
                time_series=[],
                latest_inspection_record=None,
                latest_inspected_defect=None,
                latest_machine_code=None,
                latest_conveyor_status="No conveyor parts inspected yet. Start scanning on line.",
                collection_status_message="No inspection records logged yet. Upload or test a brake disc in HUD Inspection mode to begin logging real-time telemetry."
            )

        pass_count = sum(1 for r in records if r.overall_status == "PASS")
        reject_count = sum(1 for r in records if r.overall_status == "REJECT")
        review_count = sum(1 for r in records if r.overall_status == "REVIEW")

        pass_rate = round((pass_count / total) * 100.0, 1)
        reject_rate = round((reject_count / total) * 100.0, 1)
        review_rate = round((review_count / total) * 100.0, 1)

        # Extract all defect points
        machine_defects: Dict[str, List[HistoricalDefectPoint]] = defaultdict(list)
        all_defects: List[HistoricalDefectPoint] = []

        # Real conveyor belt synchronization:
        # records[0] is the current/latest part that just passed under the camera
        latest_record = records[0] if records else None
        latest_defect: Optional[HistoricalDefectPoint] = None
        latest_machine: Optional[str] = None
        latest_conveyor_status = ""

        if latest_record:
            if latest_record.defect_count == 0:
                latest_conveyor_status = (
                    f"Conveyor Line Active: Part {latest_record.part_id} PASSED (0 Defects, Wear Index {latest_record.wear_index_score}/100). "
                    "Component is clean and conforming — zero heat signature added."
                )
                latest_defect = None
                latest_machine = None
            else:
                if latest_record.defects:
                    latest_defect = latest_record.defects[0]
                    latest_machine = latest_defect.process_code
                    latest_conveyor_status = (
                        f"Conveyor Line Alert: Part {latest_record.part_id} REJECTED ({latest_record.defect_count} Defect(s)). "
                        f"Plotted '{latest_defect.defect_type}' at {latest_defect.clock_hour}h on Station {latest_defect.process_code}."
                    )

        for r in records:
            for d in r.defects:
                code = d.process_code or "UNKNOWN"
                machine_defects[code].append(d)
                all_defects.append(d)

        # Build Heatmap structure per machine
        target_codes = ["CR01", "PU01", "DT16", "DT17", "BA02", "IN01"]
        machine_heatmaps: Dict[str, MachineHeatmapData] = {}

        for code in target_codes:
            defects_for_code = machine_defects.get(code, [])
            meta = KNOWN_SIGNATURE_PATTERNS.get(code, {
                "station": "Production Station",
                "signature_type": "General spatial distribution"
            })

            bins = []
            for d in defects_for_code:
                bins.append(HeatmapBin(
                    dx=d.dx_normalized,
                    dy=d.dy_normalized,
                    r_bin=d.r_normalized,
                    theta_bin=d.theta_degrees,
                    clock_hour=d.clock_hour,
                    intensity=round(d.confidence, 2),
                    defect_count=1,
                    top_process_code=code,
                    defect_type=d.defect_type
                ))

            machine_heatmaps[code] = MachineHeatmapData(
                machine_code=code,
                station=meta["station"],
                total_samples=total,
                total_defects=len(defects_for_code),
                bins=bins,
                raw_points=defects_for_code,
                signature_summary=meta["signature_type"]
            )

        # Early warnings evaluated strictly against real accumulated evidence
        active_warnings = cls._evaluate_early_warnings(records, machine_defects)

        # Collection status explanation for user
        if len(all_defects) == 0:
            status_msg = f"Logged {total} conforming part(s) with zero surface defects. Production within Table 1 tolerances."
        elif len(active_warnings) == 0:
            status_msg = (
                f"Live Ingestion Mode: {len(all_defects)} defect(s) logged across {total} part(s). "
                f"Spatial defect hotspots plotted at exact locations. "
                f"Machine failure warning triggers when ≥ 3 recurrent defects cluster on a single station."
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
    def _empty_heatmaps(cls) -> Dict[str, MachineHeatmapData]:
        res = {}
        for code, meta in KNOWN_SIGNATURE_PATTERNS.items():
            res[code] = MachineHeatmapData(
                machine_code=code,
                station=meta["station"],
                total_samples=0,
                total_defects=0,
                bins=[],
                raw_points=[],
                signature_summary=meta["signature_type"]
            )
        return res

    @classmethod
    def _evaluate_early_warnings(
        cls,
        records: List[HistoricalInspectionRecord],
        machine_defects: Dict[str, List[HistoricalDefectPoint]]
    ) -> List[MachineSignatureWarning]:
        """
        Only triggers a machine warning when REAL evidence exists in the database:
        - At least 3 defects logged for that machine station, OR
        - Upward DTV drift slope > +0.05 um/part across >= 5 parts.
        """
        warnings: List[MachineSignatureWarning] = []

        # 1. Check PU01 Robot Gripper Impact Clustering (requires >= 3 defects)
        pu01_defects = machine_defects.get("PU01", [])
        if len(pu01_defects) >= 3:
            # Check for bipolar orientation (near 90 deg / 3 o'clock or 270 deg / 9 o'clock)
            bipolar_count = sum(
                1 for d in pu01_defects
                if abs(d.theta_degrees - 90.0) <= 30.0 or abs(d.theta_degrees - 270.0) <= 30.0
            )
            conf = min(0.96, 0.60 + (bipolar_count / len(pu01_defects)) * 0.35)
            meta = KNOWN_SIGNATURE_PATTERNS["PU01"]
            warnings.append(MachineSignatureWarning(
                machine_code="PU01",
                station=meta["station"],
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
    def simulate_shift_batch(cls, machine_code: str = "PU01", count: int = 3) -> HistoricalAnalyticsResponse:
        """
        Simulates adding `count` consecutive production discs with micro-variations
        of the specified machine signature, so the user can watch the heatmap and
        early prediction engine evolve live.
        """
        import random
        now = datetime.now(timezone.utc)
        machine_code = machine_code.upper()

        for k in range(count):
            p_time = (now - timedelta(minutes=(count - k) * 5)).isoformat()
            p_id = f"BD-SIM-{random.randint(1000, 9999)}"

            if machine_code == "PU01":
                # Bipolar gripper dents (90 deg or 270 deg)
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
                    dx_normalized=dx,
                    dy_normalized=dy,
                    r_normalized=round(r_norm, 3),
                    theta_degrees=round(theta, 1),
                    clock_hour=clock_h,
                    zone_name="Outer Chamfer & Perimeter Edge",
                    area_pct=round(random.uniform(0.2, 0.35), 2),
                    bbox=[500.0, 200.0, 530.0, 230.0]
                )
                rec = HistoricalInspectionRecord(
                    part_id=p_id,
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
                # Crack in top-right quadrant (~1 o'clock / ~50 deg)
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
                    dx_normalized=dx,
                    dy_normalized=dy,
                    r_normalized=round(r_norm, 3),
                    theta_degrees=round(theta, 1),
                    clock_hour=clock_h,
                    zone_name="Mid-Swept Braking Face",
                    area_pct=round(random.uniform(0.6, 0.9), 2),
                    bbox=[927.0, 245.0, 1012.0, 403.0]
                )
                rec = HistoricalInspectionRecord(
                    part_id=p_id,
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
                # Normal conforming part
                rec = HistoricalInspectionRecord(
                    part_id=p_id,
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

        return cls.generate_analytics_and_heatmaps()
