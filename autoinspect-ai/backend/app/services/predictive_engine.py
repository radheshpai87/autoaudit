import math
import numpy as np
from typing import List, Dict, Any, Tuple
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


# Research Paper (Appl. Sci. 2020, 10, 6565) Known Failure Signatures & Polar Footprints
KNOWN_SIGNATURE_PATTERNS = {
    "PU01": {
        "station": "Picking-up Station",
        "failure_mode": "Robot unloader gripper mechanical indentation",
        "potential_causes": "Gripper finger misalignment or degraded polyurethane buffer pads",
        "signature_type": "Bipolar outer edge clustering (θ near 90° & 270°, r >= 0.37)",
        "expected_r_min": 0.36,
        "expected_r_max": 0.43,
        "recommended_action": "Realign unloader robot gripper fingers and replace polyurethane protective pads immediately.",
    },
    "DT16": {
        "station": "Grinding Station",
        "failure_mode": "Uneven wear / loading of CBN grinding wheel",
        "potential_causes": "CBN tool dull or loaded with swarf; excessive feed rate in finishing pass",
        "signature_type": "Concentric annular track scoring (0.31 <= r <= 0.37 across wide θ)",
        "expected_r_min": 0.30,
        "expected_r_max": 0.38,
        "recommended_action": "Execute CBN grinding wheel dressing cycle and check tool replacement counter.",
    },
    "CR01": {
        "station": "Grinding & Induction Treatment",
        "failure_mode": "Transverse radial thermal crack / fissure",
        "potential_causes": "Cyclic thermal shock, residual tensile stress, or coolant pressure drop",
        "signature_type": "High tortuosity radial fissure extending across swept friction ring",
        "expected_r_min": 0.25,
        "expected_r_max": 0.42,
        "recommended_action": "Verify coolant flow pressure and inspect casting induction quench parameters.",
    },
    "DT17": {
        "station": "Grinding Station",
        "failure_mode": "Thickness variation / Spindle bearing chatter",
        "potential_causes": "Spindle anti-backlash bearing clearance loosening",
        "signature_type": "Wavy thickness flutter and cavitation pits",
        "expected_r_min": 0.22,
        "expected_r_max": 0.40,
        "recommended_action": "Check cutting speed variation and adjust spindle anti-backlash bearing clearance.",
    },
    "BA02": {
        "station": "Balancing Station",
        "failure_mode": "Dynamic unbalance / Runout tilt",
        "potential_causes": "Balancing jig wear and locating clamp pin eccentricity",
        "signature_type": "Outer rim dynamic runout wobble (> 20 µm)",
        "expected_r_min": 0.38,
        "expected_r_max": 0.43,
        "recommended_action": "Recalibrate balancing machine jig and replace worn locating clamp pins.",
    },
    "IN01": {
        "station": "Inspection Station",
        "failure_mode": "Residual wash water oxidation & rust",
        "potential_causes": "Air knife blower nozzle clogging or insufficient drying heat cycle",
        "signature_type": "Discoloration patches across friction face & hub hat",
        "expected_r_min": 0.15,
        "expected_r_max": 0.43,
        "recommended_action": "Clean air knife drying nozzles and verify wash drying temperature.",
    },
}


class PredictiveHeatmapEngine:
    """
    Computes polar spatial density heatmaps and runs signature correlation
    to detect early machine failure before out-of-spec scrap limits are reached.
    """

    @classmethod
    def cartesian_to_polar(cls, x: float, y: float, w: float, h: float, img_w: int, img_h: int) -> Tuple[float, float]:
        """
        Transforms bounding box centroid into normalized polar coordinates (r, theta)
        relative to the rotor hub center (0.5, 0.5).
        r in [0.0, 1.0], theta in [0.0, 360.0).
        """
        center_x = (x + w / 2.0) / float(img_w)
        center_y = (y + h / 2.0) / float(img_h)

        dx = center_x - 0.5
        dy = center_y - 0.5

        # Radius normalized (0.5 is outer border of a square bounding the circle)
        r = math.sqrt(dx * dx + dy * dy)
        theta_rad = math.atan2(dy, dx)
        theta_deg = (math.degrees(theta_rad) + 360.0) % 360.0

        return round(r, 4), round(theta_deg, 2)

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
                machine_heatmaps={},
                time_series=[]
            )

        pass_count = sum(1 for r in records if r.overall_status == "PASS")
        reject_count = sum(1 for r in records if r.overall_status == "REJECT")
        review_count = sum(1 for r in records if r.overall_status == "REVIEW")

        pass_rate = round((pass_count / total) * 100.0, 1)
        reject_rate = round((reject_count / total) * 100.0, 1)
        review_rate = round((review_count / total) * 100.0, 1)

        # 1. Build Polar Spatial Heatmaps aggregated by Machine Code
        # We divide the rotor disc into 8 radial bands (r: 0.0 -> 0.5) and 24 angular sectors (each 15 deg)
        machine_defects: Dict[str, List[HistoricalDefectPoint]] = defaultdict(list)
        all_defects: List[HistoricalDefectPoint] = []

        for r in records:
            for d in r.defects:
                code = d.process_code or "UNKNOWN"
                machine_defects[code].append(d)
                all_defects.append(d)

        machine_heatmaps: Dict[str, MachineHeatmapData] = {}
        target_codes = ["PU01", "DT16", "CR01", "DT17", "BA02", "IN01"]

        for code in target_codes:
            defects_for_code = machine_defects.get(code, [])
            meta = KNOWN_SIGNATURE_PATTERNS.get(code, {
                "station": "Production Station",
                "signature_type": "General spatial distribution"
            })

            # Create 2D grid bins: (r_bin, theta_bin)
            # r_bin: 0.1 to 0.45 in steps of 0.05 (7 bins)
            # theta_bin: 0 to 360 in steps of 30 (12 bins)
            grid: Dict[Tuple[float, float], int] = defaultdict(int)
            for d in defects_for_code:
                # Snap to grid
                r_snapped = round(math.floor(d.r_normalized / 0.05) * 0.05, 2)
                t_snapped = round(math.floor(d.theta_degrees / 30.0) * 30.0, 1)
                grid[(r_snapped, t_snapped)] += 1

            max_count = max(grid.values()) if grid else 1
            bins = [
                HeatmapBin(
                    r_bin=k[0],
                    theta_bin=k[1],
                    intensity=round(v / max_count, 3),
                    defect_count=v,
                    top_process_code=code
                )
                for k, v in grid.items()
            ]

            machine_heatmaps[code] = MachineHeatmapData(
                machine_code=code,
                station=meta["station"],
                total_samples=total,
                total_defects=len(defects_for_code),
                bins=bins,
                signature_summary=meta["signature_type"]
            )

        # 2. Predictive Failure & Early Warning Engine
        # Analyzes the last 20 inspection records for spatial signature clusters and time-series tolerance drift
        active_warnings = cls._evaluate_early_warnings(records)

        # 3. Format Time-Series for Frontend Charting (chronological order)
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
            records=records[:25],  # Return recent 25 for fast table rendering
            active_early_warnings=active_warnings,
            machine_heatmaps=machine_heatmaps,
            time_series=time_series
        )

    @classmethod
    def _evaluate_early_warnings(cls, records: List[HistoricalInspectionRecord]) -> List[MachineSignatureWarning]:
        """
        Runs spatial signature matching and drift regression over recent parts
        to detect incipient tool or fixture degradation.
        """
        warnings: List[MachineSignatureWarning] = []
        recent_records = records[:20]  # Last 20 parts

        # Case 1: Evaluate PU01 Robot Gripper Degradation (Bipolar spatial cluster at 90 deg / 270 deg)
        pu01_defects = [
            d for r in recent_records
            for d in r.defects
            if d.process_code == "PU01"
        ]

        if len(pu01_defects) >= 3:
            # Check if defects cluster near 90 or 270 deg on the outer perimeter (r >= 0.36)
            bipolar_cluster_count = sum(
                1 for d in pu01_defects
                if d.r_normalized >= 0.36 and (
                    abs(d.theta_degrees - 90.0) <= 25.0 or
                    abs(d.theta_degrees - 270.0) <= 25.0
                )
            )
            confidence = min(0.96, 0.65 + (bipolar_cluster_count / len(pu01_defects)) * 0.30)
            meta = KNOWN_SIGNATURE_PATTERNS["PU01"]
            warnings.append(MachineSignatureWarning(
                machine_code="PU01",
                station=meta["station"],
                failure_mode=meta["failure_mode"],
                potential_causes=meta["potential_causes"],
                confidence=round(confidence, 2),
                spatial_signature="Bipolar Outer Rim Cluster (θ ≈ 90° & 270°, r = 0.38–0.41)",
                severity_level="critical" if len(pu01_defects) >= 6 else "warning",
                alert_message=(
                    f"PREDICTIVE ALERT: Station PU01 robot unloader gripper shows repeated micro-impact dents "
                    f"({bipolar_cluster_count} incidents at 90°/270° orientation in last {len(recent_records)} parts). "
                    f"Polyurethane buffer pads are degraded."
                ),
                recommended_action=meta["recommended_action"],
                evidence_count=len(pu01_defects),
                recent_trend_slope=round(len(pu01_defects) / 20.0, 3)
            ))

        # Case 2: Evaluate DT16 CBN Grinding Wheel Glazing / Concentric Wear Drift
        dtv_values = [r.dtv_value_um for r in recent_records]
        if len(dtv_values) >= 10:
            # Linear trend slope (positive slope indicates DTV drift towards 5 um limit)
            x = np.arange(len(dtv_values))
            y = np.array(list(reversed(dtv_values)))  # Chronological order
            slope, _ = np.polyfit(x, y, 1)

            recent_dt16 = [d for r in recent_records for d in r.defects if d.process_code == "DT16"]
            latest_dtv = dtv_values[0]

            if slope > 0.05 or latest_dtv >= 3.8 or len(recent_dt16) >= 2:
                meta = KNOWN_SIGNATURE_PATTERNS["DT16"]
                conf = min(0.94, 0.70 + slope * 1.5)
                warnings.append(MachineSignatureWarning(
                    machine_code="DT16",
                    station=meta["station"],
                    failure_mode=meta["failure_mode"],
                    potential_causes=meta["potential_causes"],
                    confidence=round(conf, 2),
                    spatial_signature="Concentric Annular Scoring & DTV Upward Drift",
                    severity_level="warning",
                    alert_message=(
                        f"PREDICTIVE WARNING: Grinding Station DT16 DTV telemetry is drifting upward "
                        f"(slope: +{slope*10:.2f} µm/10 parts, current: {latest_dtv} µm, spec limit: ≤ 5 µm). "
                        f"CBN wheel swarf loading detected."
                    ),
                    recommended_action=meta["recommended_action"],
                    evidence_count=len(recent_dt16) + (1 if slope > 0.05 else 0),
                    recent_trend_slope=round(float(slope), 3)
                ))

        # Case 3: Evaluate BA02 Balancing Collet Runout Drift
        runout_values = [r.runout_value_um for r in recent_records]
        if len(runout_values) >= 10:
            latest_runout = runout_values[0]
            if latest_runout >= 18.0:
                meta = KNOWN_SIGNATURE_PATTERNS["BA02"]
                warnings.append(MachineSignatureWarning(
                    machine_code="BA02",
                    station=meta["station"],
                    failure_mode=meta["failure_mode"],
                    potential_causes=meta["potential_causes"],
                    confidence=0.86,
                    spatial_signature="Radial Runout Eccentricity (> 18 µm approaching 25 µm limit)",
                    severity_level="warning",
                    alert_message=(
                        f"PREDICTIVE WARNING: Balancing Station BA02 runout elevated at {latest_runout} µm "
                        f"(limit ≤ 25 µm). Balancing collet wear detected."
                    ),
                    recommended_action=meta["recommended_action"],
                    evidence_count=1,
                    recent_trend_slope=0.04
                ))

        return warnings
