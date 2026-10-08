import io
import uuid
import numpy as np
from PIL import Image
import cv2
from typing import Tuple, List

from fastapi import UploadFile, HTTPException
from app.config import settings
from app.models.schemas import (
    InspectionResponse,
    InspectionOverallStatus,
    DefectDetection,
    SeverityLevel,
)
from app.services.severity_engine import SeverityEngine
from app.inference.manager import ModelManager
from app.inference.mock_model import MockDefectModel
from app.utils.visualizer import draw_inspection_overlay, encode_image_to_base64


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
    def process_inspection(image_bgr: np.ndarray, filename: str, ext: str) -> InspectionResponse:
        """
        Coordinates the complete inspection workflow:
        1. Queries the active defect model (YOLO or Demo/Mock)
        2. Detects defects or unknown anomalies
        3. Calculates overall inspection pass/fail status (PASS, REVIEW, REJECT)
        4. Generates visual overlays (annotated images with masks and HUD badges)
        5. Returns structured JSON inspection response
        """
        model = ModelManager.get_instance().get_model()
        h, w = image_bgr.shape[:2]
        image_id = str(uuid.uuid4())

        # Run inference
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


        # Determine overall component inspection status:
        # - Any Critical defect -> REJECT
        # - Any High defect -> REJECT
        # - Any Medium defect or Unknown Anomaly -> REVIEW
        # - Only Low defects or 0 defects -> PASS (or REVIEW if minor cosmetic threshold exceeded)
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
            summary_message = "No visible defect detected. Component conforms to quality specifications."
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

        # Mask-only overlay (masks only, no boxes) for view toggling
        mask_only_bgr = draw_inspection_overlay(image_bgr, detections, draw_masks=True, draw_boxes=False)
        mask_only_b64 = encode_image_to_base64(mask_only_bgr, ext=ext)

        # Run trained 3-class classifier: GOOD vs ALMOST_WORN vs FAULTY
        from app.services.classifier_service import BrakeConditionClassifierService
        from app.models.schemas import AnomalyOrigin
        condition_result = BrakeConditionClassifierService.classify_rotor_condition(
            image_bgr,
            has_critical_defects=has_critical,
            has_high_defects=has_high,
            defect_count=len(detections),
        )

        # Determine primary anomaly origin:
        # 1. If any thermal defect -> THERMAL (highest automotive risk)
        # 2. Else if any surface defect -> SURFACE
        # 3. Else if any unknown defect -> UNKNOWN
        # 4. None if defect_count == 0
        primary_origin = None
        if any(d.anomaly_origin == AnomalyOrigin.THERMAL for d in detections):
            primary_origin = AnomalyOrigin.THERMAL
        elif any(d.anomaly_origin == AnomalyOrigin.SURFACE for d in detections):
            primary_origin = AnomalyOrigin.SURFACE
        elif any(d.anomaly_origin == AnomalyOrigin.UNKNOWN for d in detections):
            primary_origin = AnomalyOrigin.UNKNOWN

        # Calculate Applied Sciences 2020 FMEA production line quality control assessment
        fmea_summary = SeverityEngine.build_production_line_fmea_summary(detections)
        fmea_risks = [d.fmea for d in detections if getattr(d, "fmea", None) is not None]
        top_fmea_risk = max(fmea_risks, key=lambda f: f.rpn) if fmea_risks else None

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
            brake_component_type="Ventilated Brake Disc Rotor",
        )
