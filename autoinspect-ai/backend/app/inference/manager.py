import logging
import os
from typing import Optional
from app.config import settings
from app.inference.base_model import BaseDefectModel
from app.inference.mock_model import MockDefectModel
from app.inference.cv_model import BrakeDiscVisionModel
from app.inference.yolo_model import YOLOSegmentationModel

logger = logging.getLogger(__name__)


class ModelManager:
    """
    Singleton manager for loading, swapping, and serving the vision model.
    Encapsulates switching between:
    1. Real YOLO segmentation weights (when best.pt weights exist)
    2. Computer Vision Adaptive Segment Engine (real pixel analysis without weights)
    3. Demo / Mock inspection engine
    """

    _instance: Optional["ModelManager"] = None
    _model: Optional[BaseDefectModel] = None

    def __init__(self):
        self._initialize_model()

    @classmethod
    def get_instance(cls) -> "ModelManager":
        if cls._instance is None:
            cls._instance = ModelManager()
        return cls._instance

    def _initialize_model(self):
        mode = settings.INFERENCE_MODE.lower()
        weights_path = settings.YOLO_WEIGHTS_PATH

        if mode == "mock":
            logger.info("Explicit INFERENCE_MODE='mock' configured. Loading MockDefectModel.")
            self._model = MockDefectModel()
            return

        # 1. Attempt to load real YOLO model if weights exist
        candidate_paths = [
            weights_path,
            "weights/best.pt",
            "backend/weights/best.pt",
            os.path.join(os.path.dirname(__file__), "../../weights/best.pt"),
            os.path.join(os.path.dirname(__file__), "../../../backend/weights/best.pt"),
        ]
        resolved_path = None
        for p in candidate_paths:
            if p and os.path.exists(p):
                resolved_path = p
                break

        if resolved_path:
            try:
                yolo = YOLOSegmentationModel(resolved_path)
                if yolo.is_real_model:
                    self._model = yolo
                    logger.info("Loaded real YOLO segmentation model from %s", resolved_path)
                    return
            except Exception as e:
                logger.warning("Could not initialize YOLO model from %s: %s.", resolved_path, e)

        # 2. Use Brake Disc Vision Inspector Engine:
        logger.info("Initializing BrakeDiscVisionModel for disc brake geometry and defect analysis.")
        self._model = BrakeDiscVisionModel()

    def get_model(self) -> BaseDefectModel:
        if self._model is None:
            self._initialize_model()
        return self._model

    def set_weights_path(self, path: str) -> bool:
        """Dynamically load new weights if user provides them at runtime."""
        if os.path.exists(path):
            yolo = YOLOSegmentationModel(path)
            if yolo.is_real_model:
                self._model = yolo
                return True
        return False
