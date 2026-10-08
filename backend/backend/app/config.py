from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List, Optional


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
    )

    APP_NAME: str = "AutoInspect AI"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False

    # Server configuration
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "*",
    ]

    # File upload limits
    MAX_UPLOAD_SIZE_MB: int = 20
    ALLOWED_EXTENSIONS: List[str] = [".jpg", ".jpeg", ".png", ".webp"]

    # Inference settings
    # Inference mode: "yolo", "mock", or "auto"
    # "auto": tries to load weights; if absent or fails, falls back to demo/mock mode with clear labels
    INFERENCE_MODE: str = "auto"

    # YOLO model weights path
    YOLO_WEIGHTS_PATH: Optional[str] = "weights/best.pt"

    # Detection thresholds
    CONFIDENCE_THRESHOLD: float = 0.35
    UNKNOWN_ANOMALY_THRESHOLD: float = 0.55  # If anomaly score is high but class confidence is below this, classify as "unknown anomaly"
    IOU_THRESHOLD: float = 0.45

    # Target defect classes
    SUPPORTED_DEFECT_CLASSES: List[str] = [
        "crack",
        "scratch",
        "dent",
        "corrosion",
        "pitting",
        "deformation",
        "other anomaly",
        "unknown anomaly",
    ]


settings = Settings()
