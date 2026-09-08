import logging
import os
from typing import List
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Depends
from backend.schemas.catalog import (
    CatalogResponse,
    TextGenerateRequest,
    LanguageInfo,
)
from backend.utils.audio import validate_audio_file, save_temp_audio, cleanup_temp_file
from backend.services.pipeline import pipeline
from backend.config.settings import settings

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/catalog", tags=["Catalog"])

SUPPORTED_LANGUAGES = [
    LanguageInfo(code="gu", name="Gujarati", native_name="ગુજરાતી"),
    LanguageInfo(code="mr", name="Marathi", native_name="मराठी"),
    LanguageInfo(code="hi", name="Hindi", native_name="हिंदी"),
]


@router.get("/languages", response_model=List[LanguageInfo])
async def get_supported_languages():
    """
    Returns the list of supported artisan spoken languages.
    """
    return SUPPORTED_LANGUAGES


@router.post("/generate", response_model=CatalogResponse)
async def generate_catalog_from_audio(
    audio: UploadFile = File(..., description="Recorded or uploaded artisan voice note"),
    language: str = Form(..., description="Language code: 'gu' (Gujarati), 'mr' (Marathi), or 'hi' (Hindi)")
):
    """
    Primary endpoint for Voice-to-Catalog generation:
    1. Receive audio
    2. Validate audio
    3. Save temporary file
    4. Run faster-whisper Speech-to-Text with explicit language
    5. Generate transcript
    6. Translate transcript (Gujarati/Marathi/Hindi -> Hindi & English)
    7. Generate structured bilingual catalog via LLM
    8. Return structured JSON
    9. Delete temporary audio file
    """
    clean_lang = language.strip().lower()
    if clean_lang not in {"gu", "mr", "hi"}:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid language '{language}'. Supported languages are 'gu' (Gujarati), 'mr' (Marathi), and 'hi' (Hindi)."
        )

    # Validate audio upload
    validate_audio_file(audio)

    temp_path = None
    try:
        # Save temporary audio file
        temp_path = await save_temp_audio(audio)

        # Run pipeline
        response = pipeline.process_audio(temp_path, language=clean_lang)
        return response

    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Unexpected error in generate_catalog_from_audio: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to generate catalog from voice: {str(e)}")
    finally:
        # Clean up temporary audio file
        if temp_path:
            cleanup_temp_file(temp_path)


@router.post("/generate-text", response_model=CatalogResponse)
async def generate_catalog_from_text(request: TextGenerateRequest):
    """
    Direct text input endpoint for testing, evaluation, and future integrations.
    """
    clean_lang = request.language.strip().lower()
    if clean_lang not in {"gu", "mr", "hi"}:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid language '{request.language}'. Supported languages are 'gu', 'mr', and 'hi'."
        )

    try:
        response = pipeline.process_text(request.text, language=clean_lang)
        return response
    except Exception as e:
        logger.exception(f"Unexpected error in generate_catalog_from_text: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to generate catalog from text: {str(e)}")
