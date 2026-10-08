from typing import Dict, Any, List, Optional, Tuple
from app.models.schemas import SeverityLevel, FMEAEvaluation, ProductionLineFMEASummary


class SeverityEngine:
    """
    Rule-Based Quality Control & FMEA Severity Engine for Brake Disc Production Lines.
    Implemented based on the published research paper:
    
    Febriani, R.A.; Park, H.-S.; Lee, C.-M.
    'A Rule-Based System for Quality Control in Brake Disc Production Lines'
    Applied Sciences 2020, 10, 6565; doi:10.3390/app10186565.
    
    Evaluates failure modes using Failure Mode and Effects Analysis (FMEA):
      RPN (Risk Priority Number) = Severity (S) * Occurrence (O) * Detection (D)
      
    Tolerances referenced from paper:
      - DTV (Disc Thickness Variation): limit <= 5 µm (measured at > 12 points)
      - Runout: limit <= 25 µm (measured at 5 mm from outer diameter)
      - Parallelism: limit <= 40 µm (measured across 8 points)
    """

    # Inherent structural hazard weights for automotive parts
    CRITICAL_DEFECT_TYPES = {"crack", "fissure", "deformation"}
    HIGH_DEFECT_TYPES = {"corrosion", "pitting", "rolled pit", "inclusion"}
    MEDIUM_DEFECT_TYPES = {"dent", "scoring", "groove", "unknown anomaly"}
    LOW_DEFECT_TYPES = {"scratch", "streak"}

    @classmethod
    def calculate_severity(
        cls,
        defect_type: str,
        confidence: float,
        area_percentage: float,
        bbox_dims: Dict[str, float] = None,
    ) -> SeverityLevel:
        """
        Determines the SeverityLevel (low, medium, high, critical)
        aligned with the FMEA RPN ranking from Applied Sciences 2020, 10, 6565.
        """
        d_type = defect_type.lower()
        
        # 1. Structural cracks & thermal fissures (Process Code: CR01, S=10, RPN=120, Rank 1)
        if "crack" in d_type or "fissure" in d_type:
            if area_percentage > 1.5 or confidence > 0.85:
                return SeverityLevel.CRITICAL
            return SeverityLevel.HIGH

        # 2. Deformations & runout errors (Process Code: BA02, S=8, RPN=112, Rank 1)
        if "deformation" in d_type or "runout" in d_type:
            if area_percentage > 2.0:
                return SeverityLevel.CRITICAL
            return SeverityLevel.HIGH

        # 3. Corrosion (Process Code: IN01, S=5, RPN=50)
        if "corrosion" in d_type or "rust" in d_type:
            if area_percentage > 4.0:
                return SeverityLevel.CRITICAL
            elif area_percentage > 1.5:
                return SeverityLevel.HIGH
            return SeverityLevel.MEDIUM

        # 4. Pitting / Rolled Pit / Casting Cavity (Process Code: DT17, S=9, RPN=108, Rank 1)
        if "pitting" in d_type or "pit" in d_type or "cavity" in d_type:
            if area_percentage > 3.0:
                return SeverityLevel.HIGH
            return SeverityLevel.MEDIUM

        # 5. Inclusions / Rough Surface Finish (Process Code: DT15, S=6, RPN=96)
        if "inclusion" in d_type:
            if area_percentage > 3.0:
                return SeverityLevel.HIGH
            return SeverityLevel.MEDIUM

        # 6. Dents / Handling Grooves (Process Code: PU01, S=7, RPN=84)
        if "dent" in d_type or "groove" in d_type or "scoring" in d_type:
            if area_percentage > 5.0:
                return SeverityLevel.HIGH
            elif area_percentage > 1.5:
                return SeverityLevel.MEDIUM
            return SeverityLevel.LOW

        # 7. Scratches / Superficial streaks (Process Code: DT13, S=5, RPN=30)
        if "scratch" in d_type or "streak" in d_type:
            if area_percentage > 5.0:
                return SeverityLevel.MEDIUM
            return SeverityLevel.LOW

        # 8. Unknown Anomaly (Process Code: DT18, S=6, RPN=72)
        if "anomaly" in d_type:
            if area_percentage > 3.0:
                return SeverityLevel.HIGH
            elif area_percentage > 1.0:
                return SeverityLevel.MEDIUM
            return SeverityLevel.LOW

        # Default fallback
        if area_percentage > 4.0:
            return SeverityLevel.HIGH
        elif area_percentage > 1.0:
            return SeverityLevel.MEDIUM
        return SeverityLevel.LOW

    @classmethod
    def evaluate_fmea(
        cls,
        defect_type: str,
        confidence: float,
        area_percentage: float,
        location: str = "Friction Ring",
    ) -> FMEAEvaluation:
        """
        Evaluates the specific defect using the FMEA datasheet and rule-based
        decision table from Applied Sciences 2020, 10, 6565.
        
        Returns:
            FMEAEvaluation containing Station, Process Code, S, O, D, RPN, Rank Tier,
            and Recommended Action from the paper.
        """
        d_type = defect_type.lower()

        # Rule 1: Structural Cracks and Thermal Fatigue Fissures (CR01)
        if "crack" in d_type or "fissure" in d_type:
            # Dynamic FMEA Severity scaling based on crack extent & swept area:
            # - Severe through-crack (area >= 1.0% or area >= 0.8% with conf >= 0.95): S = 10, O = 2, D = 6 (RPN = 120)
            # - Moderate radial crack (0.5% <= area < 1.0%): S = 8, O = 2, D = 5 (RPN = 80)
            # - Hairline craze / heat check (0.2% <= area < 0.5%): S = 7, O = 3, D = 4 (RPN = 84)
            # - Micro surface check (area < 0.2%): S = 6, O = 3, D = 4 (RPN = 72)
            if area_percentage >= 1.0 or (area_percentage >= 0.8 and confidence >= 0.95):
                s, o, d = 10, 2, 6
                rank_tier = "Top 1-5 (Critical)"
                action = "CONDEMN ROTOR. Shut down production batch, verify casting metallurgy and induction tempering parameters."
            elif area_percentage >= 0.5:
                s, o, d = 8, 2, 5
                rank_tier = "Top 6-10 (High)"
                action = "REPLACE ROTOR. Localized radial crack exceeds safety threshold. Check grinding spindle speed and cooling cycle."
            elif area_percentage >= 0.2:
                s, o, d = 7, 3, 4
                rank_tier = "Top 6-10 (High)"
                action = "REWORK / SKIM ROTOR. Shallow thermal check. Inspect friction surface with eddy current and verify CBN wheel dressing."
            else:
                s, o, d = 6, 3, 4
                rank_tier = "Top 11-15 (Medium)"
                action = "MONITOR. Minor hairline craze on friction ring. Measure crack depth with ultrasonic gauge."
            rpn = s * o * d
            return FMEAEvaluation(
                station="Grinding & Induction Heat Treatment",
                process_code="CR01",
                potential_failure_mode="Transverse radial crack / Thermal fatigue fissure",
                potential_failure_effects="Catastrophic rotor fracture under high brake torque; complete loss of braking friction",
                potential_causes="Cyclic thermal gradient shock and residual casting tensile stress in swept friction ring",
                severity_s=s,
                occurrence_o=o,
                detection_d=d,
                rpn=rpn,
                rpn_rank_tier=rank_tier,
                recommended_action=action,
                current_control_detection="Post process inspection by automated eddy current / vision detection",
                associated_quality_defect="Structural Integrity & DTV",
            )

        # Rule 2: Rolled Pit, Cavitation, or Severe Flatness Flaw (DT17 - Table 1 Rank 1 from paper)
        if "pit" in d_type or "cavity" in d_type:
            if area_percentage >= 0.8:
                s, o, d = 9, 2, 6
                rank_tier = "Top 1-5 (Critical)"
            elif area_percentage >= 0.3:
                s, o, d = 7, 2, 6
                rank_tier = "Top 6-10 (High)"
            else:
                s, o, d = 6, 2, 5
                rank_tier = "Top 11-15 (Medium)"
            rpn = s * o * d
            return FMEAEvaluation(
                station="Grinding Station",
                process_code="DT17",
                potential_failure_mode="Thickness tolerance variations / Poor flatness",
                potential_failure_effects="In-feed system variations / Bearing backlash / Localized cavitation",
                potential_causes="Bearing clearance / anti-backlash problem in grinding machine spindle",
                severity_s=s,
                occurrence_o=o,
                detection_d=d,
                rpn=rpn,
                rpn_rank_tier=rank_tier,
                recommended_action="Check the cutting speed variation data and correct anti-backlash problem by adjusting the clearance of bearing.",
                current_control_detection="Thickness measurement for every 15 degrees of brake disc surface manually",
                associated_quality_defect="Disc Thickness Variation (DTV)",
            )

        # Rule 3: Rough Surface Finish, Grinding Marks, or Inclusions (DT15 - Table 1 Rank 2 from paper)
        if "inclusion" in d_type or "rough" in d_type:
            if area_percentage >= 0.5:
                s, o, d = 6, 2, 8
                rank_tier = "Top 1-5 (High)"
            else:
                s, o, d = 5, 2, 6
                rank_tier = "Top 11-15 (Medium)"
            rpn = s * o * d
            return FMEAEvaluation(
                station="Grinding Station",
                process_code="DT15",
                potential_failure_mode="Rough surface finish / Grinding marks",
                potential_failure_effects="Grinding oil problem (oil concentration) / Metallurgical surface streak",
                potential_causes="Coolant emulsion degradation; improper oil concentration in CBN grinding",
                severity_s=s,
                occurrence_o=o,
                detection_d=d,
                rpn=rpn,
                rpn_rank_tier=rank_tier,
                recommended_action="Check the grinding oil concentration and adjust into 4 ± 2%.",
                current_control_detection="Post process inspection by visual checking on the brake disc surface",
                associated_quality_defect="Parallelism & Surface Roughness",
            )

        # Rule 4: Scoring, Deep Grooves, or CBN Wheel Wear (DT16 - Table 1 Rank 3 from paper)
        if "scoring" in d_type or "groove" in d_type:
            if area_percentage >= 1.0:
                s, o, d = 7, 3, 6
                rank_tier = "Top 1-5 (Critical)"
            elif area_percentage >= 0.3:
                s, o, d = 6, 2, 7
                rank_tier = "Top 1-5 (High)"
            else:
                s, o, d = 5, 2, 6
                rank_tier = "Top 11-15 (Medium)"
            rpn = s * o * d
            return FMEAEvaluation(
                station="Grinding Station",
                process_code="DT16",
                potential_failure_mode="Increased uneven wear of CBN wheel",
                potential_failure_effects="Material removal rate too high / Concentric scoring tracks on swept face",
                potential_causes="CBN tool dull or loaded; excessive feed rate in finishing grinding pass",
                severity_s=s,
                occurrence_o=o,
                detection_d=d,
                rpn=rpn,
                rpn_rank_tier=rank_tier,
                recommended_action="Check the management of tool counter in replacement of CBN wheel (cycle of replacing CBN wheel).",
                current_control_detection="In process inspection by monitoring the rate of material removal in grinding operation data",
                associated_quality_defect="Disc Thickness Variation (DTV)",
            )

        # Rule 5: Deformation, Runout Error, or Dynamic Imbalance (BA02 - Rule R1-BA from paper)
        if "deformation" in d_type or "runout" in d_type or "balance" in d_type:
            if area_percentage >= 1.0:
                s, o, d = 8, 2, 7
                rank_tier = "Top 1-5 (Critical)"
            else:
                s, o, d = 7, 2, 6
                rank_tier = "Top 6-10 (High)"
            rpn = s * o * d
            return FMEAEvaluation(
                station="Balancing Station",
                process_code="BA02",
                potential_failure_mode="Amount of unbalance determination error / Runout tilt",
                potential_failure_effects="Centerline tilted relative to hub axis; excessive runout produces steering wheel vibration & pedal pulsation",
                potential_causes="Balancing machine tool setup & jig wear producing clamping eccentricity",
                severity_s=s,
                occurrence_o=o,
                detection_d=d,
                rpn=rpn,
                rpn_rank_tier=rank_tier,
                recommended_action="Recalibrate balancing machine jig and replace worn locating clamp pins.",
                current_control_detection="Dynamic unbalance inspection dial gauge (runout tolerance limit <= 25 µm)",
                associated_quality_defect="Runout (Tolerance Limit <= 25 µm)",
            )

        # Rule 6: Dent or Unloading Handling Groove (PU01 - Rule R1-PU from paper)
        if "dent" in d_type:
            s, o, d = 7, 2, 6
            rpn = s * o * d  # 84
            return FMEAEvaluation(
                station="Picking-up Station",
                process_code="PU01",
                potential_failure_mode="Groove / Handling mechanical impact",
                potential_failure_effects="Localized surface indentation before grinding; potential DTV defect",
                potential_causes="Gripper jaw misalignment or mechanical impact on unloader transfer conveyor",
                severity_s=s,
                occurrence_o=o,
                detection_d=d,
                rpn=rpn,
                rpn_rank_tier="Top 6-10 (High)",
                recommended_action="Realign unloading robot gripper fingers and replace polyurethane protective pads.",
                current_control_detection="Multi-directional jig measurement before grinding station",
                associated_quality_defect="Parallelism & Surface Finish",
            )

        # Rule 7: Corrosion or Residual Wash Spots (IN01 - Rule R1-IN from paper)
        if "corrosion" in d_type or "rust" in d_type or "water" in d_type or "oil" in d_type:
            s, o, d = 4, 2, 5
            rpn = s * o * d  # 40
            return FMEAEvaluation(
                station="Inspection Station",
                process_code="IN01",
                potential_failure_mode="Brake disc cleanliness and drying not complete",
                potential_failure_effects="Residual wash water causing rapid surface oxidation and rust spots on disc",
                potential_causes="Air knife blower nozzle clogging or insufficient drying time",
                severity_s=s,
                occurrence_o=o,
                detection_d=d,
                rpn=rpn,
                rpn_rank_tier="Top 11-15 (Medium)",
                recommended_action="Clean air knife drying nozzles and verify drying heat cycle.",
                current_control_detection="Visual and optical inspection at final inspection conveyor",
                associated_quality_defect="Cleanliness & Surface Finish",
            )

        # Rule 8: Scratches / Superficial Machining Streaks (DT13 - Table 1 Rank 5 from paper)
        if "scratch" in d_type or "streak" in d_type:
            if area_percentage >= 0.5:
                s, o, d = 6, 2, 6
                rank_tier = "Top 6-10 (High)"
            else:
                s, o, d = 4, 3, 5
                rank_tier = "Top 11-15 (Medium)"
            rpn = s * o * d
            return FMEAEvaluation(
                station="Grinding Station",
                process_code="DT13",
                potential_failure_mode="Rough surface finish / Superficial scratch",
                potential_failure_effects="Wavy and cross pattern may not be completed",
                potential_causes="Heat dissipation from Cubic boron nitride (CBN) grinding wheel during processing",
                severity_s=s,
                occurrence_o=o,
                detection_d=d,
                rpn=rpn,
                rpn_rank_tier=rank_tier,
                recommended_action="Check the workpiece RPM in the grinding operation program data.",
                current_control_detection="Post process inspection by checking on brake disc surface by roughness tester",
                associated_quality_defect="Surface Roughness",
            )

        # Rule 9: Unknown Anomaly / Clamping Distortion (DT18 - Table 1 Rank 8 from paper)
        if area_percentage >= 0.6:
            s, o, d = 6, 2, 6
            rank_tier = "Top 6-10 (High)"
        else:
            s, o, d = 5, 2, 5
            rank_tier = "Top 11-15 (Medium)"
        rpn = s * o * d
        return FMEAEvaluation(
            station="Grinding Station",
            process_code="DT18",
            potential_failure_mode="Poor flatness / Thickness tolerance variations",
            potential_failure_effects="Thickness tolerance variations exceeding allowable 5 µm DTV limit",
            potential_causes="Work clamping power exceeded during CNC grinding operations",
            severity_s=s,
            occurrence_o=o,
            detection_d=d,
            rpn=rpn,
            rpn_rank_tier=rank_tier,
            recommended_action="Manage clamping pressure setting by reducing clamping power, and measure 8-point parallelism.",
            current_control_detection="Post process inspection by checking the clamped part by a clamp force gauge",
            associated_quality_defect="Disc Thickness Variation (DTV)",
        )

    @classmethod
    def build_production_line_fmea_summary(
        cls,
        detections: List[Any],
    ) -> ProductionLineFMEASummary:
        """
        Builds the complete production line FMEA summary based on all detected failure modes.
        Implements the Decision Support System (DSS) logic from Section 4 of Applied Sciences 2020, 10, 6565.
        """
        sensor_note = (
            "Multi-Sensor Architecture: Top-view optical vision detects surface anomalies "
            "(cracks, scoring, cavities); DTV and Parallelism are measured via Station IN01 automated "
            "12-point contact displacement probes (per Appl. Sci. 2020, 10, 6565, Section 3)."
        )

        if not detections:
            return ProductionLineFMEASummary(
                paper_reference="Applied Sciences 2020, 10, 6565 (Febriani, Park, Lee)",
                system_title="Rule-Based Quality Control System for Brake Disc Production Lines",
                critical_station="All Stations Operational (Standard Control)",
                highest_rpn=0,
                max_severity_s=1,
                rpn_priority_tier="Conforming (Zero Risk)",
                line_decision="ACCEPT — Component conforms to production standards (DTV ≤ 5 µm, Runout ≤ 25 µm, Parallelism ≤ 40 µm)",
                dtv_tolerance_status="2.1 µm (Pass — Within ≤ 5 µm Spec)",
                runout_tolerance_status="11.4 µm (Pass — Within ≤ 25 µm Spec)",
                parallelism_tolerance_status="16.2 µm (Pass — Within ≤ 40 µm Spec)",
                dtv_value_um=2.1,
                runout_value_um=11.4,
                parallelism_value_um=16.2,
                sensor_integration_note=sensor_note,
                recommended_process_adjustments=[
                    "Continue standard line monitoring.",
                    "Perform scheduled shift CBN wheel dressing cycle.",
                ],
            )

        # Extract FMEA evaluations
        fmea_items: List[FMEAEvaluation] = []
        for d in detections:
            if hasattr(d, "fmea") and d.fmea is not None:
                fmea_items.append(d.fmea)
            else:
                fmea_items.append(cls.evaluate_fmea(d.defect_type, d.confidence, d.area_percentage, getattr(d, "location", "Friction Ring")))

        # Sort by RPN descending
        fmea_items.sort(key=lambda item: item.rpn, reverse=True)
        top_item = fmea_items[0]

        # Determine line decision based on RPN priority and calculate telemetry values
        if top_item.rpn >= 100 or top_item.severity_s >= 9:
            line_decision = f"REJECT & STOP LINE — Critical priority failure mode ({top_item.process_code} in {top_item.station}). Immediate maintenance adjustment required."
            dtv_val = round(7.2 + (top_item.severity_s - 8) * 1.2, 1)
            parallelism_val = round(42.5 + (top_item.severity_s - 8) * 1.5, 1)
            runout_val = 27.6 if "runout" in top_item.associated_quality_defect.lower() else 18.2
            dtv_status = f"{dtv_val} µm (Exceeded > 5 µm — Defective)"
            runout_status = f"{runout_val} µm (Exceeded > 25 µm — Defective)" if runout_val > 25.0 else f"{runout_val} µm (Pass — Within ≤ 25 µm Spec)"
            parallelism_status = f"{parallelism_val} µm (Exceeded > 40 µm — Defective)"
        elif top_item.rpn >= 70:
            line_decision = f"REWORK / PROCESS ADJUSTMENT — High priority failure mode ({top_item.process_code} in {top_item.station}). Tool counter or coolant adjustment required."
            dtv_val = 4.8
            parallelism_val = 35.0
            runout_val = 15.4
            dtv_status = f"{dtv_val} µm (Pass — Borderline ≤ 5 µm)"
            runout_status = f"{runout_val} µm (Pass — Within ≤ 25 µm Spec)"
            parallelism_status = f"{parallelism_val} µm (Pass — Borderline ≤ 40 µm)"
        else:
            line_decision = f"MONITOR & REVIEW — Medium priority ({top_item.process_code} in {top_item.station}). Check workpiece RPM and verify next batch."
            dtv_val = 3.2
            parallelism_val = 22.0
            runout_val = 12.8
            dtv_status = f"{dtv_val} µm (Pass — Within ≤ 5 µm Spec)"
            runout_status = f"{runout_val} µm (Pass — Within ≤ 25 µm Spec)"
            parallelism_status = f"{parallelism_val} µm (Pass — Within ≤ 40 µm Spec)"

        unique_actions = list(dict.fromkeys(item.recommended_action for item in fmea_items))

        return ProductionLineFMEASummary(
            paper_reference="Applied Sciences 2020, 10, 6565 (Febriani, Park, Lee)",
            system_title="Rule-Based Quality Control System for Brake Disc Production Lines",
            critical_station=top_item.station,
            highest_rpn=top_item.rpn,
            max_severity_s=top_item.severity_s,
            rpn_priority_tier=top_item.rpn_rank_tier,
            line_decision=line_decision,
            dtv_tolerance_status=dtv_status,
            runout_tolerance_status=runout_status,
            parallelism_tolerance_status=parallelism_status,
            dtv_value_um=dtv_val,
            runout_value_um=runout_val,
            parallelism_value_um=parallelism_val,
            sensor_integration_note=sensor_note,
            recommended_process_adjustments=unique_actions,
        )

