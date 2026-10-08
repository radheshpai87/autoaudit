from fastapi import APIRouter, UploadFile, File, HTTPException
from app.models.schemas import InspectionResponse, HealthResponse
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
async def inspect_component(image: UploadFile = File(...)):
    """
    POST /api/inspect
    Accepts an automotive component image (JPG, JPEG, PNG),
    executes defect detection/segmentation inference,
    calculates severity & overall QA status,
    and returns detected defects with annotated base64 overlays.
    """
    image_bgr, ext = await InspectionService.validate_and_read_image(image)
    result = InspectionService.process_inspection(image_bgr, image.filename or "part.jpg", ext)
    return result


@router.get("/sample/{sample_name}")
def get_sample_image(sample_name: str):
    """Returns actual sample images for 1-click frontend UI preset testing."""
    import os
    from fastapi.responses import FileResponse
    valid_samples = {
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
    }
    rel_path = valid_samples.get(sample_name.lower())
    if not rel_path or not os.path.exists(rel_path):
        # Fallback check relative to backend directory
        alt_path = os.path.join(os.path.dirname(__file__), "../../../", rel_path) if rel_path else None
        if alt_path and os.path.exists(alt_path):
            return FileResponse(alt_path, media_type="image/jpeg")
        # Check in current dir
        if rel_path and os.path.exists(rel_path.replace("backend/", "")):
            return FileResponse(rel_path.replace("backend/", ""), media_type="image/jpeg")
        raise HTTPException(status_code=404, detail="Sample image not found")
    return FileResponse(rel_path, media_type="image/jpeg")
