from app.models.schemas import SeverityLevel
from typing import Dict, Any


class SeverityEngine:
    """
    Configurable severity engine for automotive component defect inspection.
    Evaluates severity (Low, Medium, High, Critical) based on:
    - Defect type (inherent structural hazard)
    - Detection confidence
    - Relative defect area (% of component/image)
    - Defect bounding box dimensions / aspect ratio

    Architecture Note:
    This engine is deliberately encapsulated in a modular class to allow replacement
    or ensembling with trained machine-learning severity estimators in Phase 3/4.
    """

    # Inherent structural hazard weights for automotive parts
    CRITICAL_DEFECT_TYPES = {"crack", "deformation"}
    HIGH_DEFECT_TYPES = {"corrosion", "pitting"}
    MEDIUM_DEFECT_TYPES = {"dent"}
    LOW_DEFECT_TYPES = {"scratch"}

    @classmethod
    def calculate_severity(
        cls,
        defect_type: str,
        confidence: float,
        area_percentage: float,
        bbox_dims: Dict[str, float] = None,
    ) -> SeverityLevel:
        d_type = defect_type.lower()
        
        # 1. Structural cracks: Cracks in automotive components are high-risk failure points
        if "crack" in d_type or "fissure" in d_type:
            if area_percentage > 1.5 or confidence > 0.85:
                return SeverityLevel.CRITICAL
            return SeverityLevel.HIGH

        # 2. Deformations: Compromises mechanical tolerances and fitment
        if d_type == "deformation":
            if area_percentage > 2.0:
                return SeverityLevel.CRITICAL
            return SeverityLevel.HIGH

        # 3. Corrosion: Can lead to catastrophic fatigue failure if deep
        if d_type == "corrosion":
            if area_percentage > 4.0:
                return SeverityLevel.CRITICAL
            elif area_percentage > 1.5:
                return SeverityLevel.HIGH
            return SeverityLevel.MEDIUM

        # 4. Pitting: High stress concentrations in bearing/piston surfaces
        if d_type == "pitting":
            if area_percentage > 3.0:
                return SeverityLevel.HIGH
            return SeverityLevel.MEDIUM

        # 5. Dents: Surface integrity impact
        if d_type == "dent":
            if area_percentage > 5.0:
                return SeverityLevel.HIGH
            elif area_percentage > 1.5:
                return SeverityLevel.MEDIUM
            return SeverityLevel.LOW

        # 6. Scratches: Cosmetic unless large/deep
        if d_type == "scratch":
            if area_percentage > 5.0:
                return SeverityLevel.MEDIUM
            return SeverityLevel.LOW

        # 7. Unknown Anomaly or Other Anomaly: Conservative fail-safe rating
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
