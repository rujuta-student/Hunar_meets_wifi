import logging
import time
from backend.schemas.catalog import CatalogResponse, Translations, CatalogBilingual
from backend.services.speech_to_text import whisper_service
from backend.services.translation import translation_service
from backend.services.catalog_generator import catalog_generator

logger = logging.getLogger(__name__)


class CatalogPipeline:
    """
    End-to-end pipeline orchestrating:
    Audio / Text -> Speech-to-Text -> Translation -> AI Catalog Generation -> CatalogResponse
    """

    def process_audio(self, audio_path: str, language: str) -> CatalogResponse:
        start_time = time.time()
        logger.info(f"--- Starting pipeline for audio={audio_path}, language={language} ---")

        # Step 1: Speech-to-Text
        transcript = whisper_service.transcribe(audio_path, language=language)
        if not transcript or not transcript.strip():
            logger.warning("Whisper transcribed an empty audio segment.")
            transcript = "No audible artisan speech detected in recording."

        # Step 2: Translation to Hindi & English
        translations = translation_service.translate_to_hindi_and_english(transcript, source_lang=language)

        # Step 3: AI Catalog Generation
        catalog = catalog_generator.generate_catalog(
            source_text=transcript,
            source_lang=language,
            hindi_text=translations.hindi,
            english_text=translations.english
        )

        elapsed = time.time() - start_time
        logger.info(f"--- Audio pipeline finished successfully in {elapsed:.2f}s ---")

        return CatalogResponse(
            success=True,
            input_language=language,
            input_method="audio",
            transcript=transcript,
            translations=translations,
            catalog=catalog
        )

    def process_text(self, text: str, language: str) -> CatalogResponse:
        start_time = time.time()
        logger.info(f"--- Starting pipeline for text input (length={len(text)}), language={language} ---")

        clean_text = text.strip()

        # Step 1: Translation to Hindi & English
        translations = translation_service.translate_to_hindi_and_english(clean_text, source_lang=language)

        # Step 2: AI Catalog Generation
        catalog = catalog_generator.generate_catalog(
            source_text=clean_text,
            source_lang=language,
            hindi_text=translations.hindi,
            english_text=translations.english
        )

        elapsed = time.time() - start_time
        logger.info(f"--- Text pipeline finished successfully in {elapsed:.2f}s ---")

        return CatalogResponse(
            success=True,
            input_language=language,
            input_method="text",
            transcript=clean_text,
            translations=translations,
            catalog=catalog
        )


pipeline = CatalogPipeline()
