from fastapi import APIRouter, UploadFile, File, Form, Query, HTTPException
from typing import Optional
from app.models.schemas import InspectionResponse, HealthResponse
from app.models.historical_schemas import HistoricalAnalyticsResponse
from app.services.inspection_service import InspectionService
from app.inference.manager import ModelManager
from app.config import settings

router = APIRouter()


@router.get("/health", response_model=HealthResponse)
def get_health():
    """Health check endpoint displaying system state, active model, and weights status."""
    model = ModelManager.get_instance().get_model()
    return HealthResponse(
        status="ok",
        version=settings.APP_VERSION,
        app_name=settings.APP_NAME,
        inference_mode="real_ai" if model.is_real_model else "demo_mock",
        model_loaded=model.is_real_model,
        weights_path=settings.YOLO_WEIGHTS_PATH,
    )


@router.post("/inspect", response_model=InspectionResponse)
async def inspect_component(
    image: UploadFile = File(...),
    component_type: str = Form("brake_rotor")
):
    """
    POST /api/inspect
    Accepts an automotive component image (JPG, JPEG, PNG),
    executes defect detection/segmentation inference,
    calculates severity & overall QA status,
    and returns detected defects with annotated base64 overlays.
    Supports 'brake_rotor' and 'car_bonnet'.
    """
    image_bgr, ext = await InspectionService.validate_and_read_image(image)
    result = InspectionService.process_inspection(
        image_bgr=image_bgr,
        filename=image.filename or "part.jpg",
        ext=ext,
        component_type=component_type
    )
    return result


@router.get("/sample/{sample_name}")
def get_sample_image(sample_name: str):
    """Returns actual sample images for 1-click frontend UI preset testing."""
    import os
    from fastapi.responses import FileResponse
    valid_samples = {
        # Brake Rotor presets
        "good": "backend/samples/sample_rotor_good.jpg",
        "clean": "backend/samples/sample_rotor_clean.jpg",
        "almost_worn": "backend/samples/sample_rotor_almost_worn.jpg",
        "worn": "backend/samples/sample_rotor_almost_worn.jpg",
        "thermal_crack": "backend/samples/sample_rotor_crack.jpg",
        "crack": "backend/samples/sample_rotor_crack.jpg",
        "surface_defect": "backend/samples/sample_surface_defect.jpg",
        "surface": "backend/samples/sample_surface_defect.jpg",
        "unknown_anomaly": "backend/samples/sample_rotor_unknown_anomaly.jpg",
        "anomaly": "backend/samples/sample_rotor_unknown_anomaly.jpg",
        # Car Bonnet BIW Stamped Panel presets
        "bonnet_good": "backend/samples/sample_bonnet_good.jpg",
        "bonnet_clean": "backend/samples/sample_bonnet_good.jpg",
        "bonnet_dent": "backend/samples/sample_bonnet_dent.jpg",
        "bonnet_split": "backend/samples/sample_bonnet_split.jpg",
        "bonnet_pimple": "backend/samples/sample_bonnet_pimple.jpg",
        "bonnet_burr": "backend/samples/sample_bonnet_burr.jpg",
    }
    rel_path = valid_samples.get(sample_name.lower())
    if not rel_path or not os.path.exists(rel_path):
        alt_path = os.path.join(os.path.dirname(__file__), "../../../", rel_path) if rel_path else None
        if alt_path and os.path.exists(alt_path):
            return FileResponse(alt_path, media_type="image/jpeg")
        if rel_path and os.path.exists(rel_path.replace("backend/", "")):
            return FileResponse(rel_path.replace("backend/", ""), media_type="image/jpeg")
        raise HTTPException(status_code=404, detail="Sample image not found")
    return FileResponse(rel_path, media_type="image/jpeg")


@router.get("/analytics", response_model=HistoricalAnalyticsResponse)
def get_historical_analytics(
    component_type: str = Query("brake_rotor"),
    limit: int = 100
):
    """
    GET /api/analytics
    Returns aggregated quality analytics, component-specific defect heatmaps
    (Polar for brake rotors, Cartesian Press Die Grid for car bonnets),
    and active predictive early warnings for faulty machines.
    """
    from app.services.predictive_engine import PredictiveHeatmapEngine
    return PredictiveHeatmapEngine.generate_analytics_and_heatmaps(
        component_type=component_type,
        limit=limit
    )


@router.get("/history")
def get_inspection_history(
    component_type: Optional[str] = Query(None),
    limit: int = 50
):
    """
    GET /api/history
    Returns recent historical inspection records.
    """
    from app.services.historical_db import HistoricalDatabaseManager
    return HistoricalDatabaseManager.get_recent_inspections(
        limit=limit,
        component_type=component_type
    )


@router.post("/analytics/simulate")
def simulate_production_shift(
    component_type: str = Query("brake_rotor"),
    machine_code: Optional[str] = Query(None),
    count: int = 3
):
    """
    POST /api/analytics/simulate
    Simulates consecutive production parts for a specific machine to allow
    observing heatmap accumulation and early warning activation in real-time.
    """
    from app.services.predictive_engine import PredictiveHeatmapEngine
    if not machine_code:
        machine_code = "DC02" if component_type == "car_bonnet" else "PU01"
    return PredictiveHeatmapEngine.simulate_shift_batch(
        component_type=component_type,
        machine_code=machine_code,
        count=count
    )


@router.post("/analytics/reset")
def reset_historical_data(component_type: str = Query("brake_rotor")):
    """
    POST /api/analytics/reset
    Wipes the historical inspection database clean so testing starts from 0 parts.
    """
    from app.services.historical_db import HistoricalDatabaseManager
    from app.services.predictive_engine import PredictiveHeatmapEngine
    HistoricalDatabaseManager.clear_all_records()
    return PredictiveHeatmapEngine.generate_analytics_and_heatmaps(component_type=component_type)
