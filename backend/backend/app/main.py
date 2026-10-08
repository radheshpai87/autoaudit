import logging
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.config import settings
from app.api.routes import router as api_router

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("autoinspect")

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="AutoInspect AI - Automotive Component Quality Inspection REST API",
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Exception handlers
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error("Unhandled server exception: %s", exc, exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "An internal error occurred during component inspection. Please try again."},
    )

# Include routes under /api
app.include_router(api_router, prefix="/api")


@app.get("/")
def root():
    return {
        "message": "AutoInspect AI API is running",
        "docs_url": "/docs",
        "health_url": "/api/health",
        "inspect_url": "/api/inspect",
    }
