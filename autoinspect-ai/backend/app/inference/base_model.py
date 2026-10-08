from abc import ABC, abstractmethod
from typing import List, Dict, Any, Tuple
import numpy as np
from app.models.schemas import DefectDetection


class BaseDefectModel(ABC):
    """
    Abstract base class for automotive component defect detection models.
    Supports YOLO segmentation, DINOv2 + PatchCore, or mock engines.
    """

    @abstractmethod
    def load_model(self, weights_path: str = None) -> bool:
        """Loads weights from disk or initializes the model. Returns True if successful."""
        pass

    @abstractmethod
    def predict(
        self,
        image_np: np.ndarray,
        confidence_threshold: float = 0.35,
        unknown_threshold: float = 0.55,
    ) -> List[DefectDetection]:
        """
        Runs inference on an RGB/BGR numpy image.
        Returns a list of DefectDetection objects.
        """
        pass

    @property
    @abstractmethod
    def model_name(self) -> str:
        """Returns the human-readable identifier of the model."""
        pass

    @property
    @abstractmethod
    def is_real_model(self) -> bool:
        """Returns True if running real AI weights, False if running demo/mock."""
        pass
