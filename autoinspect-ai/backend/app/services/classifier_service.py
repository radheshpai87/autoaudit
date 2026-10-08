import os
import joblib
import numpy as np
import logging
from typing import Dict, Any, Tuple
from app.models.schemas import ConditionClassification, RotorConditionClass
from app.utils.feature_extractor import extract_brake_rotor_features

logger = logging.getLogger(__name__)


class BrakeConditionClassifierService:
    """
    Inference service for the trained Brake Rotor Condition Classifier:
    Classifies disc brake into 3 operational states:
    - GOOD (serviceable, clean friction band)
    - ALMOST_WORN (concentric grooving, glazing, near discard spec)
    - FAULTY (cracked, heat damaged, structurally condemned)
    """

    _model = None
    _weights_path = "backend/weights/brake_condition_classifier.joblib"

    @classmethod
    def get_model(cls):
        if cls._model is None:
            # Check relative paths
            paths = [
                cls._weights_path,
                "weights/brake_condition_classifier.joblib",
                os.path.join(os.path.dirname(__file__), "../../../weights/brake_condition_classifier.joblib"),
            ]
            for p in paths:
                if os.path.exists(p):
                    try:
                        cls._model = joblib.load(p)
                        logger.info("Loaded trained brake condition classifier from %s", p)
                        break
                    except Exception as e:
                        logger.warning("Could not load weights from %s: %s", p, e)

        return cls._model

    @classmethod
    def classify_rotor_condition(
        cls,
        image_bgr: np.ndarray,
        has_critical_defects: bool = False,
        defect_count: int = 0,
    ) -> ConditionClassification:
        model = cls.get_model()

        if model is None:
            # Fallback heuristic
            if has_critical_defects:
                cond = RotorConditionClass.FAULTY
                conf = 0.95
                probs = {"FAULTY": 0.95, "ALMOST_WORN": 0.04, "GOOD": 0.01}
                wear_score = 92.0
            else:
                cond = RotorConditionClass.GOOD
                conf = 0.90
                probs = {"GOOD": 0.90, "ALMOST_WORN": 0.08, "FAULTY": 0.02}
                wear_score = 15.0

        else:
            feat = extract_brake_rotor_features(image_bgr).reshape(1, -1)
            pred_class = model.predict(feat)[0]
            probs_arr = model.predict_proba(feat)[0]
            classes = model.classes_
            probs = {cls_name: round(float(prob), 3) for cls_name, prob in zip(classes, probs_arr)}
            conf = float(probs.get(pred_class, 0.9))

            # If critical structural defect (crack) is present, rotor is FAULTY
            if has_critical_defects:
                pred_class = "FAULTY"
                conf = 0.96
                probs["FAULTY"] = 0.96
                probs["GOOD"] = min(probs.get("GOOD", 0.05), 0.02)
                probs["ALMOST_WORN"] = round(1.0 - probs["FAULTY"] - probs["GOOD"], 3)
            elif defect_count == 0 and pred_class == "ALMOST_WORN" and probs.get("GOOD", 0) > 0.30:
                # Borderline surface texture on a defect-free rotor is calibrated as GOOD
                pred_class = "GOOD"
                conf = max(probs.get("GOOD", 0.85), 0.86)
                probs["GOOD"] = conf

            cond = RotorConditionClass(pred_class)

            # Wear score computation
            if cond == RotorConditionClass.GOOD:
                wear_score = round(10.0 + (1.0 - probs.get("GOOD", 0.9)) * 25.0, 1)
            elif cond == RotorConditionClass.ALMOST_WORN:
                wear_score = round(52.0 + probs.get("ALMOST_WORN", 0.7) * 20.0, 1)
            else:  # FAULTY
                wear_score = round(85.0 + probs.get("FAULTY", 0.8) * 14.0, 1)

        # Verdict text
        if cond == RotorConditionClass.GOOD:
            verdict = "Disc brake friction ring in GOOD serviceable condition. Uniform pad contact, no fissures."
        elif cond == RotorConditionClass.ALMOST_WORN:
            verdict = "Disc brake ALMOST WORN. Swept band shows scoring grooves & glazing. Nearing minimum discard thickness."
        else:
            verdict = "Disc brake FAULTY. Dangerous structural fissures or heat checking detected. Condemn rotor immediately."

        return ConditionClassification(
            condition=cond,
            confidence=round(conf, 3),
            probabilities=probs,
            wear_index_score=wear_score,
            triage_verdict=verdict,
        )
