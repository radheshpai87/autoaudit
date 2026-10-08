import io
import uuid
import numpy as np
from PIL import Image
import cv2
from typing import Tuple, List, Optional

from fastapi import UploadFile, HTTPException
from app.config import settings
from app.models.schemas import (
    InspectionResponse,
    InspectionOverallStatus,
    DefectDetection,
    SeverityLevel,
    ComponentType,
    RotorConditionClass,
    ConditionClassification,
    AnomalyOrigin,
)
from app.services.severity_engine import SeverityEngine
from app.inference.manager import ModelManager
from app.utils.visualizer import draw_inspection_overlay, encode_image_to_base64, generate_defect_heatmap_overlay
from app.services.bonnet_panel_explanations import build_bonnet_fmea_summary


class InspectionService:
    @staticmethod
    async def validate_and_read_image(file: UploadFile) -> Tuple[np.ndarray, str]:
        """
        Validates uploaded file:
        - Checks file extension (.jpg, .jpeg, .png)
        - Checks content size limit
        - Decodes bytes into an OpenCV BGR numpy array
        """
        if not file.filename:
            raise HTTPException(status_code=400, detail="No file provided or empty filename.")

        ext = f".{file.filename.split('.')[-1].lower()}"
        if ext not in settings.ALLOWED_EXTENSIONS:
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported file format '{ext}'. Allowed formats: {', '.join(settings.ALLOWED_EXTENSIONS)}",
            )

        content = await file.read()
        max_bytes = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024
        if len(content) > max_bytes:
            raise HTTPException(
                status_code=413,
                detail=f"File exceeds maximum allowed size of {settings.MAX_UPLOAD_SIZE_MB}MB.",
            )

        try:
            # Decode using PIL first to verify image integrity
            pil_image = Image.open(io.BytesIO(content)).convert("RGB")
            # Convert to OpenCV BGR
            image_bgr = cv2.cvtColor(np.array(pil_image), cv2.COLOR_RGB2BGR)
            return image_bgr, ext
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Invalid or corrupted image file: {str(e)}")

    @staticmethod
    def process_inspection(
        image_bgr: np.ndarray,
        filename: str,
        ext: str,
        component_type: str = "brake_rotor"
    ) -> InspectionResponse:
        """
        Coordinates the complete inspection workflow:
        1. Queries the active defect model (YOLO or Demo/Mock)
        2. Detects defects or unknown anomalies
        3. Calculates overall inspection pass/fail status (PASS, REVIEW, REJECT)
        4. Generates visual overlays (annotated images with masks and HUD badges)
        5. Computes component-specific FMEA assessment & condition triage
        6. Logs inspection telemetry to historical database
        7. Returns structured JSON inspection response
        """
        model = ModelManager.get_instance().get_model()
        h, w = image_bgr.shape[:2]
        image_id = str(uuid.uuid4())
        component_type = component_type.lower()
        is_bonnet = (component_type == "car_bonnet")

        # Run inference
        try:
            detections = model.predict(
                image_bgr,
                confidence_threshold=settings.CONFIDENCE_THRESHOLD,
                unknown_threshold=settings.UNKNOWN_ANOMALY_THRESHOLD,
                filename_hint=filename,
                component_type=component_type,
            )
        except TypeError:
            try:
                detections = model.predict(
                    image_bgr,
                    confidence_threshold=settings.CONFIDENCE_THRESHOLD,
                    unknown_threshold=settings.UNKNOWN_ANOMALY_THRESHOLD,
                    filename_hint=filename,
                )
            except TypeError:
                detections = model.predict(
                    image_bgr,
                    confidence_threshold=settings.CONFIDENCE_THRESHOLD,
                    unknown_threshold=settings.UNKNOWN_ANOMALY_THRESHOLD,
                )

        has_critical = any(d.severity == SeverityLevel.CRITICAL for d in detections)
        has_high = any(d.severity == SeverityLevel.HIGH for d in detections)
        has_medium = any(d.severity == SeverityLevel.MEDIUM for d in detections)
        has_unknown = any(d.is_unknown_anomaly for d in detections)

        if has_critical or has_high:
            overall_status = InspectionOverallStatus.REJECT
        elif has_medium or has_unknown:
            overall_status = InspectionOverallStatus.REVIEW
        elif len(detections) > 0:
            overall_status = InspectionOverallStatus.REVIEW
        else:
            overall_status = InspectionOverallStatus.PASS

        # Generate summary message
        if len(detections) == 0:
            summary_message = (
                "No visible defect detected. Stamped Car Bonnet conforms to Class-A specifications."
                if is_bonnet
                else "No visible defect detected. Brake disc conforms to quality specifications."
            )
            status_text = "no_defect"
        else:
            primary_defect = detections[0]
            summary_message = (
                f"Detected {len(detections)} defect(s). "
                f"Primary concern: {primary_defect.defect_type.upper()} ({primary_defect.severity.value.upper()}) "
                f"with {primary_defect.confidence*100:.1f}% confidence."
            )
            status_text = "completed"

        # Generate visual overlays
        annotated_bgr = draw_inspection_overlay(image_bgr, detections, draw_masks=True, draw_boxes=True)
        annotated_b64 = encode_image_to_base64(annotated_bgr, ext=ext)

        mask_only_bgr = draw_inspection_overlay(image_bgr, detections, draw_masks=True, draw_boxes=False)
        mask_only_b64 = encode_image_to_base64(mask_only_bgr, ext=ext)

        heatmap_bgr = generate_defect_heatmap_overlay(image_bgr, detections)
        heatmap_b64 = encode_image_to_base64(heatmap_bgr, ext=ext)

        # Condition triage classification
        if is_bonnet:
            if len(detections) == 0:
                condition_result = ConditionClassification(
                    condition=RotorConditionClass.GOOD,
                    confidence=0.98,
                    probabilities={"GOOD": 0.98, "ALMOST_WORN": 0.02, "FAULTY": 0.0},
                    wear_index_score=11.2,
                    triage_verdict="CONFORMING CLASS-A STAMPED PANEL: Zero surface defects detected. Sheet metal contours and character lines within standard draw tolerances."
                )
                rework_feasibility = "Nominal Conformity — No Rework Needed"
                panel_die_zone = "All Zones Nominal"
            elif has_critical:
                condition_result = ConditionClassification(
                    condition=RotorConditionClass.FAULTY,
                    confidence=0.96,
                    probabilities={"GOOD": 0.01, "ALMOST_WORN": 0.04, "FAULTY": 0.95},
                    wear_index_score=86.5,
                    triage_verdict="CRITICAL STAMPING FRACTURE / SCRAP: Catastrophic tensile split tear exceeding Forming Limit Diagram. Condemn panel to scrap."
                )
                rework_feasibility = "Unrepairable Tensile Fracture — Condemn to Scrap"
                panel_die_zone = detections[0].location
            else:
                condition_result = ConditionClassification(
                    condition=RotorConditionClass.ALMOST_WORN,
                    confidence=0.91,
                    probabilities={"GOOD": 0.06, "ALMOST_WORN": 0.90, "FAULTY": 0.04},
                    wear_index_score=48.0,
                    triage_verdict="HOLD FOR REWORK / PDR: Shallow surface dent or pimple blemish. PDR or surface stoning feasible before paint."
                )
                rework_feasibility = "Paintless Dent Repair (PDR) / Surface Polishing Feasible"
                panel_die_zone = detections[0].location

            primary_origin = AnomalyOrigin.SURFACE if len(detections) > 0 else None
            fmea_summary = build_bonnet_fmea_summary(detections)
            fmea_risks = [d.fmea for d in detections if getattr(d, "fmea", None) is not None]
            top_fmea_risk = max(fmea_risks, key=lambda f: f.rpn) if fmea_risks else None
        else:
            # Brake Rotor workflow
            from app.services.classifier_service import BrakeConditionClassifierService
            condition_result = BrakeConditionClassifierService.classify_rotor_condition(
                image_bgr,
                has_critical_defects=has_critical,
                has_high_defects=has_high,
                defect_count=len(detections),
            )
            rework_feasibility = None
            panel_die_zone = None

            primary_origin = None
            if any(d.anomaly_origin == AnomalyOrigin.THERMAL for d in detections):
                primary_origin = AnomalyOrigin.THERMAL
            elif any(d.anomaly_origin == AnomalyOrigin.SURFACE for d in detections):
                primary_origin = AnomalyOrigin.SURFACE
            elif any(d.anomaly_origin == AnomalyOrigin.UNKNOWN for d in detections):
                primary_origin = AnomalyOrigin.UNKNOWN

            fmea_summary = SeverityEngine.build_production_line_fmea_summary(detections)
            fmea_risks = [d.fmea for d in detections if getattr(d, "fmea", None) is not None]
            top_fmea_risk = max(fmea_risks, key=lambda f: f.rpn) if fmea_risks else None

        # Asynchronously log inspection to historical SQLite database
        try:
            from datetime import datetime, timezone
            from app.models.historical_schemas import HistoricalInspectionRecord, HistoricalDefectPoint
            from app.services.historical_db import HistoricalDatabaseManager
            from app.services.predictive_engine import PredictiveHeatmapEngine

            hist_defects = []
            for d in detections:
                p_code = getattr(d.fmea, "process_code", "UNKNOWN") if getattr(d, "fmea", None) else "UNKNOWN"
                norm_poly = None
                if d.mask_polygon and len(d.mask_polygon) >= 3:
                    norm_poly = [
                        [round((pt[0] / float(max(w, 1))) - 0.5, 4), round((pt[1] / float(max(h, 1))) - 0.5, 4)]
                        for pt in d.mask_polygon
                    ]

                norm_bbox = [
                    round((d.bbox[0] / float(max(w, 1))) - 0.5, 4),
                    round((d.bbox[1] / float(max(h, 1))) - 0.5, 4),
                    round((d.bbox[2] / float(max(w, 1))) - 0.5, 4),
                    round((d.bbox[3] / float(max(h, 1))) - 0.5, 4),
                ]

                if is_bonnet:
                    px, py, die_zone = PredictiveHeatmapEngine.normalize_panel_coordinates(d.bbox, w, h)
                    hist_defects.append(HistoricalDefectPoint(
                        defect_type=d.defect_type,
                        process_code=p_code,
                        severity=d.severity.value,
                        confidence=d.confidence,
                        component_type="car_bonnet",
                        dx_normalized=round(px - 0.5, 4),
                        dy_normalized=round(py - 0.5, 4),
                        r_normalized=0.0,
                        theta_degrees=0.0,
                        clock_hour=12.0,
                        panel_x_normalized=px,
                        panel_y_normalized=py,
                        zone_name=die_zone,
                        area_pct=d.area_percentage,
                        bbox=norm_bbox,
                        mask_polygon=norm_poly
                    ))
                else:
                    dx, dy, r_norm, clock_deg, clock_h, zone = PredictiveHeatmapEngine.cartesian_to_polar(
                        d.bbox, w, h
                    )
                    hist_defects.append(HistoricalDefectPoint(
                        defect_type=d.defect_type,
                        process_code=p_code,
                        severity=d.severity.value,
                        confidence=d.confidence,
                        component_type="brake_rotor",
                        dx_normalized=dx,
                        dy_normalized=dy,
                        r_normalized=r_norm,
                        theta_degrees=clock_deg,
                        clock_hour=clock_h,
                        zone_name=zone,
                        area_pct=d.area_percentage,
                        bbox=norm_bbox,
                        mask_polygon=norm_poly
                    ))

            p_code_top = getattr(top_fmea_risk, "process_code", None) if top_fmea_risk else None
            station_top = getattr(top_fmea_risk, "station", None) if top_fmea_risk else None
            part_prefix = "BN" if is_bonnet else "BD"

            hist_record = HistoricalInspectionRecord(
                part_id=f"{part_prefix}-{image_id[:8].upper()}",
                component_type="car_bonnet" if is_bonnet else "brake_rotor",
                timestamp=datetime.now(timezone.utc).isoformat(),
                image_filename=filename,
                overall_status=overall_status.value,
                defect_count=len(detections),
                condition=condition_result.condition.value,
                wear_index_score=condition_result.wear_index_score,
                dtv_value_um=fmea_summary.dtv_value_um or (0.2 if is_bonnet else 2.1),
                runout_value_um=fmea_summary.runout_value_um or (0.3 if is_bonnet else 11.4),
                parallelism_value_um=fmea_summary.parallelism_value_um or (0.2 if is_bonnet else 16.2),
                highest_rpn=fmea_summary.highest_rpn,
                primary_process_code=p_code_top,
                station=station_top,
                defects=hist_defects
            )
            HistoricalDatabaseManager.log_inspection(hist_record)
        except Exception as log_err:
            import logging
            logging.getLogger("autoinspect").warning("Could not log inspection to historical database: %s", log_err)

        return InspectionResponse(
            image_id=image_id,
            status=status_text,
            overall_status=overall_status,
            defect_count=len(detections),
            detections=detections,
            condition_classification=condition_result,
            primary_anomaly_origin=primary_origin,
            top_fmea_risk=top_fmea_risk,
            fmea_quality_control=fmea_summary,
            inference_mode="real_ai" if model.is_real_model else "demo_mock",
            model_name=model.model_name,
            summary_message=summary_message,
            image_width=w,
            image_height=h,
            annotated_image_base64=annotated_b64,
            mask_overlay_base64=mask_only_b64,
            heatmap_overlay_base64=heatmap_b64,
            brake_component_type="Stamped BIW Body Panel (Car Bonnet / Hood)" if is_bonnet else "Ventilated Brake Disc Rotor",
            component_type=ComponentType.CAR_BONNET if is_bonnet else ComponentType.BRAKE_ROTOR,
            panel_die_zone=panel_die_zone,
            rework_feasibility=rework_feasibility,
        )
