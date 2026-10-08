import numpy as np
from typing import List, Tuple, Optional
import os
import hashlib
from app.inference.base_model import BaseDefectModel
from app.models.schemas import DefectDetection, SeverityLevel, AnomalyOrigin
from app.services.severity_engine import SeverityEngine
from app.services.brake_disc_explanations import get_brake_disc_explanation, classify_anomaly_origin


class MockDefectModel(BaseDefectModel):
    """
    Production-quality Demo/Mock Defect Model.
    Clearly designated as 'demo_mock' mode.
    
    Why this exists:
    When the system is deployed without custom-trained YOLO automotive weights,
    this mock engine enables full end-to-end testing of:
    - Frontend-backend image transmission and response schemas
    - Defect segmentation masks and bounding box overlays
    - Severity calculation
    - Unknown anomaly classification logic
    - Edge cases (clean parts vs defective parts)
    
    It deterministically analyzes the uploaded image (checking filename hints or image hashes)
    to provide realistic inspection responses with bounding boxes, segmentation masks,
    confidence levels, and defect types.
    """

    def __init__(self):
        self._loaded = True

    def load_model(self, weights_path: str = None) -> bool:
        self._loaded = True
        return True

    @property
    def model_name(self) -> str:
        return "AutoInspect-MockEngine-v1 (Demo Mode)"

    @property
    def is_real_model(self) -> bool:
        return False

    def predict(
        self,
        image_np: np.ndarray,
        confidence_threshold: float = 0.35,
        unknown_threshold: float = 0.55,
        filename_hint: str = "",
    ) -> List[DefectDetection]:
        """
        Generates realistic defect detections with bounding boxes, polygons,
        confidence scores, and severity ratings.
        """
        h, w = image_np.shape[:2]
        lower_name = (filename_hint or "").lower()

        # Check if the user uploaded an image intended to be "clean" / "pass"
        if "clean" in lower_name or "good" in lower_name or "pass" in lower_name or "flawless" in lower_name:
            return []

        # Check if user specifically requested an unknown anomaly test
        if "unknown" in lower_name or "anomaly" in lower_name:
            # Generate an unknown anomaly
            cx, cy = int(w * 0.45), int(h * 0.52)
            bw, bh = int(w * 0.16), int(h * 0.14)
            x1, y1 = max(0, cx - bw // 2), max(0, cy - bh // 2)
            x2, y2 = min(w, cx + bw // 2), min(h, cy + bh // 2)
            area_pct = round(((x2 - x1) * (y2 - y1) / (w * h)) * 100, 2)
            
            # Anomaly confidence high, but classification confidence low (< unknown_threshold)
            conf = 0.48
            poly = [
                [float(x1 + bw * 0.2), float(y1)],
                [float(x2), float(y1 + bh * 0.3)],
                [float(x2 - bw * 0.1), float(y2)],
                [float(x1), float(y2 - bh * 0.2)],
            ]
            sev = SeverityEngine.calculate_severity("unknown anomaly", conf, area_pct)
            exp, rec = get_brake_disc_explanation("unknown anomaly")

            return [
                DefectDetection(
                    defect_type="Unknown Anomaly",
                    confidence=conf,
                    severity=sev,
                    bbox=[float(x1), float(y1), float(x2), float(y2)],
                    area_percentage=area_pct,
                    location="Bore / Inner rim",
                    mask_polygon=poly,
                    is_unknown_anomaly=True,
                    anomaly_origin=AnomalyOrigin.UNKNOWN,
                    explanation=exp,
                    recommendation=rec,
                )
            ]

        # Check for specific defect keyword in file
        has_scratch = "scratch" in lower_name
        has_dent = "dent" in lower_name
        has_corrosion = "corrosion" in lower_name or "rust" in lower_name
        has_pitting = "pitting" in lower_name
        has_deformation = "deform" in lower_name

        detections: List[DefectDetection] = []

        # Default standard scenario: Primary defect + optional secondary defect
        # Consistent with automotive brake rotor, piston, casting, or machined surface
        
        # 1. Primary Defect
        if has_scratch:
            p_type = "scratch"
            p_conf = 0.912
            p_loc = "Outer surface"
            bx1, by1 = int(w * 0.22), int(h * 0.38)
            bx2, by2 = int(w * 0.58), int(h * 0.44)
            poly = [
                [float(bx1), float(by1 + 5)],
                [float(bx1 + (bx2-bx1)*0.3), float(by1)],
                [float(bx2), float(by2)],
                [float(bx1 + (bx2-bx1)*0.7), float(by2 + 8)],
            ]
        elif has_dent:
            p_type = "dent"
            p_conf = 0.884
            p_loc = "Outer surface flange"
            bx1, by1 = int(w * 0.40), int(h * 0.30)
            bx2, by2 = int(w * 0.62), int(h * 0.52)
            poly = [
                [float(bx1 + (bx2-bx1)*0.2), float(by1)],
                [float(bx2), float(by1 + (by2-by1)*0.4)],
                [float(bx2 - (bx2-bx1)*0.1), float(by2)],
                [float(bx1), float(by2 - (by2-by1)*0.3)],
            ]
        elif has_corrosion:
            p_type = "corrosion"
            p_conf = 0.941
            p_loc = "Machined face"
            bx1, by1 = int(w * 0.25), int(h * 0.45)
            bx2, by2 = int(w * 0.55), int(h * 0.75)
            poly = [
                [float(bx1 + (bx2-bx1)*0.1), float(by1)],
                [float(bx2), float(by1 + (by2-by1)*0.2)],
                [float(bx2 - (bx2-bx1)*0.2), float(by2)],
                [float(bx1 + (bx2-bx1)*0.1), float(by2 - (by2-by1)*0.1)],
                [float(bx1), float(by1 + (by2-by1)*0.5)],
            ]
        elif has_pitting:
            p_type = "pitting"
            p_conf = 0.895
            p_loc = "Bearing journal"
            bx1, by1 = int(w * 0.35), int(h * 0.35)
            bx2, by2 = int(w * 0.50), int(h * 0.50)
            poly = [
                [float(bx1), float(by1)],
                [float(bx2), float(by1)],
                [float(bx2), float(by2)],
                [float(bx1), float(by2)],
            ]
        elif has_deformation:
            p_type = "deformation"
            p_conf = 0.953
            p_loc = "Outer rim edge"
            bx1, by1 = int(w * 0.70), int(h * 0.20)
            bx2, by2 = int(w * 0.92), int(h * 0.48)
            poly = [
                [float(bx1 + (bx2-bx1)*0.3), float(by1)],
                [float(bx2), float(by1 + (by2-by1)*0.2)],
                [float(bx2), float(by2)],
                [float(bx1), float(by2 - (by2-by1)*0.2)],
            ]
        else:
            # Default: Realistic Crack defect as specified in requirements
            p_type = "crack"
            p_conf = 0.964
            p_loc = "Outer surface"
            bx1, by1 = int(w * 0.32), int(h * 0.28)
            bx2, by2 = int(w * 0.54), int(h * 0.58)
            # Irregular fracture mask outline
            poly = [
                [float(bx1 + (bx2 - bx1) * 0.35), float(by1)],
                [float(bx1 + (bx2 - bx1) * 0.65), float(by1 + (by2 - by1) * 0.20)],
                [float(bx2), float(by1 + (by2 - by1) * 0.45)],
                [float(bx1 + (bx2 - bx1) * 0.80), float(by2)],
                [float(bx1 + (bx2 - bx1) * 0.40), float(by2 - (by2 - by1) * 0.25)],
                [float(bx1), float(by1 + (by2 - by1) * 0.35)],
            ]

        area_pct_1 = round(((bx2 - bx1) * (by2 - bx1) / (w * h)) * 100, 2)
        sev_1 = SeverityEngine.calculate_severity(p_type, p_conf, area_pct_1)
        exp_1, rec_1 = get_brake_disc_explanation(p_type)
        orig_1 = AnomalyOrigin(classify_anomaly_origin(p_type))

        detections.append(
            DefectDetection(
                defect_type=p_type.replace('_', ' ').title(),
                confidence=p_conf,
                severity=sev_1,
                bbox=[float(bx1), float(by1), float(bx2), float(by2)],
                area_percentage=area_pct_1,
                location=p_loc,
                mask_polygon=poly,
                is_unknown_anomaly=False,
                anomaly_origin=orig_1,
                explanation=exp_1,
                recommendation=rec_1,
            )
        )

        # 2. Secondary defect: Add a scratch unless primary was already scratch
        if p_type != "scratch" and not has_pitting and not has_deformation:
            s_type = "scratch"
            s_conf = 0.812
            s_loc = "Flange bevel"
            sx1, sy1 = int(w * 0.60), int(h * 0.62)
            sx2, sy2 = int(w * 0.78), int(h * 0.72)
            s_area_pct = round(((sx2 - sx1) * (sy2 - sy1) / (w * h)) * 100, 2)
            s_sev = SeverityEngine.calculate_severity(s_type, s_conf, s_area_pct)
            s_exp, s_rec = get_brake_disc_explanation(s_type)
            s_orig = AnomalyOrigin(classify_anomaly_origin(s_type))
            s_poly = [
                [float(sx1), float(sy1 + 4)],
                [float(sx1 + (sx2 - sx1) * 0.4), float(sy1)],
                [float(sx2), float(sy2)],
                [float(sx1 + (sx2 - sx1) * 0.6), float(sy2 + 4)],
            ]
            detections.append(
                DefectDetection(
                    defect_type=s_type.replace('_', ' ').title(),
                    confidence=s_conf,
                    severity=s_sev,
                    bbox=[float(sx1), float(sy1), float(sx2), float(sy2)],
                    area_percentage=s_area_pct,
                    location=s_loc,
                    mask_polygon=s_poly,
                    is_unknown_anomaly=False,
                    anomaly_origin=s_orig,
                    explanation=s_exp,
                    recommendation=s_rec,
                )
            )

        return detections
