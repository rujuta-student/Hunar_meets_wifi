import logging
import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from backend.config.settings import settings
from backend.api.routes.catalog import router as catalog_router

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("artisan_backend")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Ensure temp dir exists
    os.makedirs(settings.UPLOAD_TEMP_DIR, exist_ok=True)
    logger.info("Starting Artisan Voice Catalog Backend Service")
    logger.info(f"Configuration: Whisper={settings.WHISPER_MODEL_SIZE} ({settings.WHISPER_DEVICE}), LLM={settings.LLM_PROVIDER}, Translation={settings.TRANSLATION_PROVIDER}")
    yield
    logger.info("Shutting down Artisan Voice Catalog Backend Service")


app = FastAPI(
    title="Artisan Voice Catalog AI API",
    description="Multilingual (Gujarati/Marathi) Voice-to-Catalog AI backend for traditional artisans.",
    version="1.0.0",
    lifespan=lifespan
)

# Configure CORS for frontend access
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API routes
app.include_router(catalog_router)

# Mount sample audio files statically
sample_audio_dir = os.path.join(os.path.dirname(__file__), "sample_audio")
if os.path.exists(sample_audio_dir):
    app.mount("/sample_audio", StaticFiles(directory=sample_audio_dir), name="sample_audio")


@app.get("/api/health")
async def health():
    return {
        "status": "healthy",
        "whisper_config": {
            "model_size": settings.WHISPER_MODEL_SIZE,
            "device": settings.WHISPER_DEVICE,
            "compute_type": settings.WHISPER_COMPUTE_TYPE
        },
        "llm_provider": settings.LLM_PROVIDER,
        "llm_configured": bool(settings.ANTHROPIC_API_KEY or settings.OPENAI_API_KEY or settings.GEMINI_API_KEY),
        "translation_provider": settings.TRANSLATION_PROVIDER
    }


@app.get("/api/info")
async def api_info():
    return {
        "service": "Artisan Voice Catalog AI",
        "status": "online",
        "documentation": "/docs",
        "supported_languages": ["gu", "mr"],
        "endpoints": {
            "generate_from_audio": "POST /api/catalog/generate",
            "generate_from_text": "POST /api/catalog/generate-text",
            "languages": "GET /api/catalog/languages",
            "health": "GET /api/health"
        }
    }


# Frontend integration: serve built React SPA if available
frontend_dist_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "frontend", "dist"))
if os.path.exists(frontend_dist_dir):
    assets_dir = os.path.join(frontend_dist_dir, "assets")
    if os.path.exists(assets_dir):
        app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

    @app.get("/")
    @app.get("/demo")
    @app.get("/demo/")
    async def serve_frontend():
        return FileResponse(os.path.join(frontend_dist_dir, "index.html"))
else:
    @app.get("/")
    async def root_fallback():
        return await api_info()


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=True)
