from typing import Dict, Tuple, Optional
from app.models.schemas import FMEAEvaluation, ProductionLineFMEASummary, SeverityLevel


BONNET_DEFECT_EXPLANATIONS: Dict[str, Dict[str, str]] = {
    "surface impact dent": {
        "title": "Sheet Metal Surface Impact Dent / Die Pox",
        "explanation": "Localized plastic deformation on the sheet metal panel Class-A surface. Caused by handling contact, robot transfer finger shock, or foreign particles between die steels. Degrades Class-A optical highlight reflections.",
        "recommendation": "REWORK FEASIBLE: Apply Paintless Dent Repair (PDR) or light hammer & dolly surface metal finishing if paint film is uncreased. If sharp crease depth > 1.2mm, condemn to scrap.",
        "station": "Forming & Restrike Press",
        "process_code": "DC02",
        "failure_mode": "Localized punch dent / die pox indentation",
        "causes": "De-stacker robotic arm acceleration jolt or sheet blank misalignment",
        "severity_s": 5,
        "occurrence_o": 6,
        "detection_d": 3,
        "action": "Calibrate blank de-stacker transfer velocity and verify robotic suction cup cushion dampers.",
    },
    "dent": {
        "title": "Sheet Metal Surface Dent / Mechanical Pox",
        "explanation": "Localized plastic deformation on the Class-A sheet metal panel. Degrades aerodynamic contour curvature and Class-A optical reflection continuity.",
        "recommendation": "REWORK FEASIBLE: Apply Paintless Dent Repair (PDR) or light hammer & dolly metal finishing if crease depth < 1.2mm.",
        "station": "Forming & Restrike Press",
        "process_code": "DC02",
        "failure_mode": "Localized punch dent / die pox indentation",
        "causes": "De-stacker robotic arm acceleration jolt or handling shock",
        "severity_s": 5,
        "occurrence_o": 6,
        "detection_d": 3,
        "action": "Calibrate blank transfer velocity and check suction cup polyurethane pads.",
    },
    "stamping draw split": {
        "title": "Stamping Draw Split / Tensile Necking Tear",
        "explanation": "Catastrophic localized sheet thinning exceeding the Forming Limit Diagram (FLD) envelope in high-strain deep draw areas (headlamp pockets or fender character transitions). Severe structural breach.",
        "recommendation": "CONDEMN TO SCRAP IMMEDIATELY. Cannot be salvaged. Verify blankholder hydraulic cushion tonnage, draw bead clearance, and coil lubrication.",
        "station": "Tandem Draw Press #1",
        "process_code": "PR01",
        "failure_mode": "Tensile draw split tear / Necking fracture",
        "causes": "Excessive blankholder binder tonnage, insufficient die clearance, or lubricant starvation",
        "severity_s": 9,
        "occurrence_o": 5,
        "detection_d": 2,
        "action": "Reduce blankholder hydraulic cushion pressure by 8% and inspect draw bead radius lubrication.",
    },
    "split crack": {
        "title": "Stamping Draw Split / Tensile Necking Tear",
        "explanation": "Localized sheet metal tearing caused by excessive tensile strain exceeding the material Forming Limit Curve during deep draw stamping.",
        "recommendation": "CONDEMN TO SCRAP IMMEDIATELY. Panel structurally compromised. Adjust blankholder binder pressure.",
        "station": "Tandem Draw Press #1",
        "process_code": "PR01",
        "failure_mode": "Tensile draw split tear / Necking fracture",
        "causes": "Excessive blankholder binder tonnage or insufficient draw radius clearance",
        "severity_s": 9,
        "occurrence_o": 5,
        "detection_d": 2,
        "action": "Reduce blankholder hydraulic cushion pressure and inspect draw bead lubrication.",
    },
    "crack": {
        "title": "Stamping Draw Split / Tensile Fracture",
        "explanation": "Material fracture along high-stress draw pocket radius or character transition. Exceeds sheet elongation limits.",
        "recommendation": "CONDEMN TO SCRAP. Verify press draw cushion pressure and sheet metal incoming coil tensile specs.",
        "station": "Tandem Draw Press #1",
        "process_code": "PR01",
        "failure_mode": "Tensile draw split tear / Necking fracture",
        "causes": "Excessive blankholder binder pressure or draw bead starvation",
        "severity_s": 9,
        "occurrence_o": 5,
        "detection_d": 2,
        "action": "Reduce blankholder pressure by 8% and check draw bead clearance.",
    },
    "die contamination pimple": {
        "title": "Die Contamination Pimple / Upper Punch Chip",
        "explanation": "Outward raised protrusion on Class-A panel caused by swarf or metal sliver chip trapped between upper die punch and sheet blank. Will recur at identical stamping coordinate on consecutive panels.",
        "recommendation": "HALT LINE FOR 5-MIN DIE CLEANING. Clean upper punch face with solvent blow-off. Surface stone panel to remove pimple prior to E-Coat.",
        "station": "Secondary Form & Restrike Press",
        "process_code": "DC02",
        "failure_mode": "Repetitive localized punch pimple / metal chip entrapment",
        "causes": "Metal swarf slivers generated by trim scrap chute back-up or lack of punch die blow-off",
        "severity_s": 6,
        "occurrence_o": 7,
        "detection_d": 3,
        "action": "Halt line for die face blow-off cleaning; inspect trim chute scrap clearance.",
    },
    "pimple": {
        "title": "Die Contamination Pimple",
        "explanation": "Raised protrusion on panel caused by foreign particle trapped on the upper stamping punch.",
        "recommendation": "Halt line for die face blow-off cleaning. Stone panel surface before e-coat.",
        "station": "Secondary Form & Restrike Press",
        "process_code": "DC02",
        "failure_mode": "Repetitive localized punch pimple",
        "causes": "Metal sliver chip stuck to punch die steel",
        "severity_s": 6,
        "occurrence_o": 7,
        "detection_d": 3,
        "action": "Perform die blow-off cycle and inspect upper punch face.",
    },
    "hemming edge burr": {
        "title": "Perimeter Hemming Burr / Flange Shear Tear",
        "explanation": "Excessive burr or micro-tear along the outer panel hemming perimeter flange. Caused by dull trim steels or excessive clearance, risking outer skin piercing during roller hemming.",
        "recommendation": "Deburr perimeter flange prior to marriage with inner hood reinforcement. Re-sharpen trimming die punch steels.",
        "station": "Trimming & Piercing Station",
        "process_code": "TR03",
        "failure_mode": "Trim edge burr / micro-shearing tear",
        "causes": "Trim die cutting blade clearance excessive (> 12% sheet thickness) or dull shear edge",
        "severity_s": 6,
        "occurrence_o": 5,
        "detection_d": 3,
        "action": "Re-shim trim die blade clearance to 8-10% of sheet thickness and re-sharpen cutting steels.",
    },
    "burr": {
        "title": "Perimeter Hemming Burr / Flange Shear Tear",
        "explanation": "Excessive burr along outer panel hemming perimeter. Dull trim steels or improper clearance.",
        "recommendation": "Deburr perimeter flange before hemming assembly. Re-shim trimming die clearance.",
        "station": "Trimming & Piercing Station",
        "process_code": "TR03",
        "failure_mode": "Trim edge burr / micro-shearing tear",
        "causes": "Trim blade clearance excessive or cutting edge dullness",
        "severity_s": 6,
        "occurrence_o": 5,
        "detection_d": 3,
        "action": "Re-shim trim die blade clearance and sharpen cutting steels.",
    },
    "scratch": {
        "title": "Sheet Metal Coil Scratch / Handling Gouge",
        "explanation": "Linear surface abrasion on galvanized / aluminum skin caused by feed roller friction, coil transport slippage, or conveyor guide rails.",
        "recommendation": "SURFACE FINISHING FEASIBLE: Feather out scratch with 1500-grit wet sanding and surface primer before E-Coat line if metal substrate is not deeply gouged.",
        "station": "Paint Prep / E-Coat Station",
        "process_code": "PT05",
        "failure_mode": "Surface scratch / coating abrasion",
        "causes": "De-stacker suction cup slippage or blank feed conveyor roller friction",
        "severity_s": 4,
        "occurrence_o": 5,
        "detection_d": 4,
        "action": "Clean blank feeder conveyor rollers and verify blank oiling washer pressure.",
    },
    "unknown anomaly": {
        "title": "Unclassified BIW Panel Anomaly",
        "explanation": "Surface topological or photometric irregularity detected outside standard Class-A reflectance baseline. Possible oil-canning oil well distortion, loose draw wrinkle, or metallurgical inclusion.",
        "recommendation": "Inspect with tactile stone rubbing block and laser profilometer. Verify panel stiffness and curvature.",
        "station": "Inspection & Optical Vision Station",
        "process_code": "IN01",
        "failure_mode": "Unclassified surface irregularity / oil-canning wave",
        "causes": "Localized sheet thickness variation or uneven binder draw friction",
        "severity_s": 5,
        "occurrence_o": 4,
        "detection_d": 4,
        "action": "Conduct tactile stone block sweep and measure curvature profile with CMM scanner.",
    },
}


def get_bonnet_panel_explanation(defect_name: str) -> Tuple[str, str]:
    """Returns (explanation, recommendation) for bonnet defects."""
    key = defect_name.lower().replace("_", " ").strip()
    entry = BONNET_DEFECT_EXPLANATIONS.get(key)
    if not entry:
        for k, v in BONNET_DEFECT_EXPLANATIONS.items():
            if k in key or key in k:
                entry = v
                break
    if not entry:
        entry = BONNET_DEFECT_EXPLANATIONS["unknown anomaly"]
    return entry["explanation"], entry["recommendation"]


def evaluate_bonnet_fmea(defect_name: str, confidence: float, area_pct: float, die_zone: str) -> FMEAEvaluation:
    """Evaluates FMEA risk priority number and recommended action for bonnet press shop."""
    key = defect_name.lower().replace("_", " ").strip()
    entry = BONNET_DEFECT_EXPLANATIONS.get(key)
    if not entry:
        for k, v in BONNET_DEFECT_EXPLANATIONS.items():
            if k in key or key in k:
                entry = v
                break
    if not entry:
        entry = BONNET_DEFECT_EXPLANATIONS["unknown anomaly"]

    s = entry["severity_s"]
    o = entry["occurrence_o"]
    d = entry["detection_d"]

    # Adjust occurrence or detection dynamically based on observed area / confidence
    if area_pct > 3.0:
        s = min(10, s + 1)
    if confidence > 0.90:
        d = max(1, d - 1)

    rpn = s * o * d
    if rpn >= 150:
        tier = "Top 1-5 (Critical)"
    elif rpn >= 100:
        tier = "Top 6-10 (High)"
    elif rpn >= 50:
        tier = "Top 11-15 (Medium)"
    else:
        tier = "Top 16+ (Low)"

    return FMEAEvaluation(
        station=entry["station"],
        process_code=entry["process_code"],
        potential_failure_mode=entry["failure_mode"],
        potential_failure_effects=f"Class-A surface flaw / structural breach in {die_zone}",
        potential_causes=entry["causes"],
        severity_s=s,
        occurrence_o=o,
        detection_d=d,
        rpn=rpn,
        rpn_rank_tier=tier,
        recommended_action=entry["action"],
        current_control_detection="Automated Top-Down Optical Vision & Stamping Die Profilometer",
        associated_quality_defect="Class-A Surface & Stamping Geometry"
    )


def build_bonnet_fmea_summary(detections) -> ProductionLineFMEASummary:
    """Builds overall production line FMEA summary for car bonnet press line."""
    if not detections:
        return ProductionLineFMEASummary(
            paper_reference="Automotive BIW Stamping Quality Control Standard (Febriani, Park, Lee adapted)",
            system_title="Automated Stamping Press Quality Control System for Car Bonnet Panels",
            critical_station="All Stations Conforming",
            highest_rpn=0,
            max_severity_s=1,
            rpn_priority_tier="Nominal Pass",
            line_decision="ACCEPT",
            dtv_tolerance_status="Die Gap ≤ 0.8 mm (Pass)",
            runout_tolerance_status="Surface Flatness ≤ 0.5 mm (Pass)",
            parallelism_tolerance_status="Hemming Flange Gap ≤ 0.3 mm (Pass)",
            dtv_value_um=0.2,
            runout_value_um=0.3,
            parallelism_value_um=0.2,
            sensor_integration_note="Top-down optical vision camera monitors 2D Class-A panel surfaces (draw splits, dents, die pimples); hemming gap and draw strain are correlated with in-die tonnage sensors.",
            recommended_process_adjustments=[]
        )

    fmea_list = [d.fmea for d in detections if getattr(d, "fmea", None) is not None]
    if not fmea_list:
        max_rpn = 40
        max_s = 4
        crit_station = "Tandem Draw Press #1"
        adjustments = []
    else:
        top = max(fmea_list, key=lambda f: f.rpn)
        max_rpn = top.rpn
        max_s = max(f.severity_s for f in fmea_list)
        crit_station = f"{top.station} ({top.process_code})"
        adjustments = list(set(f.recommended_action for f in fmea_list))

    has_critical = any(d.severity == SeverityLevel.CRITICAL for d in detections)
    has_high = any(d.severity == SeverityLevel.HIGH for d in detections)

    if has_critical or max_s >= 8 or max_rpn >= 150:
        line_decision = "REJECT & CONDEMN TO SCRAP"
    elif has_high or max_rpn >= 90:
        line_decision = "HOLD FOR PDR REWORK / DIE CLEANING"
    else:
        line_decision = "MONITOR & REVIEW"

    return ProductionLineFMEASummary(
        paper_reference="Automotive BIW Stamping Quality Control Standard (Febriani, Park, Lee adapted)",
        system_title="Automated Stamping Press Quality Control System for Car Bonnet Panels",
        critical_station=crit_station,
        highest_rpn=max_rpn,
        max_severity_s=max_s,
        rpn_priority_tier="Top 1-5 (Critical)" if max_rpn >= 150 else ("Top 6-10 (High)" if max_rpn >= 90 else "Top 11-15 (Medium)"),
        line_decision=line_decision,
        dtv_tolerance_status="Die Gap Clearance: Out of Spec" if has_critical else "Die Gap ≤ 0.8 mm (Pass)",
        runout_tolerance_status="Surface Flatness: Review Required" if has_high else "Surface Flatness ≤ 0.5 mm (Pass)",
        parallelism_tolerance_status="Hemming Flange Gap ≤ 0.3 mm (Pass)",
        dtv_value_um=1.8 if has_critical else 0.4,
        runout_value_um=1.2 if has_high else 0.4,
        parallelism_value_um=0.3,
        sensor_integration_note="Top-down optical vision camera monitors 2D Class-A panel surfaces (draw splits, dents, die pimples); hemming gap and draw strain are correlated with in-die tonnage sensors.",
        recommended_process_adjustments=adjustments
    )
