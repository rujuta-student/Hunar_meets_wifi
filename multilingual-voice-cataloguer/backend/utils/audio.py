import os
import uuid
import logging
from typing import Optional
from fastapi import UploadFile, HTTPException
from backend.config.settings import settings

logger = logging.getLogger(__name__)

ALLOWED_EXTENSIONS = {".wav", ".mp3", ".m4a", ".webm", ".ogg", ".flac", ".aac", ".opus"}
ALLOWED_MIME_PREFIXES = ("audio/", "video/webm", "application/octet-stream")


def validate_audio_file(file: UploadFile) -> None:
    """
    Validates uploaded audio file extension, content type, and filename.
    """
    if not file or not file.filename:
        raise HTTPException(status_code=400, detail="No audio file was uploaded.")

    # Check extension
    ext = os.path.splitext(file.filename)[1].lower()
    if ext and ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported audio format '{ext}'. Allowed formats: {', '.join(sorted(ALLOWED_EXTENSIONS))}"
        )

    # Check content type if available
    content_type = file.content_type or ""
    if content_type and not any(content_type.startswith(prefix) for prefix in ALLOWED_MIME_PREFIXES):
        logger.warning(f"Unusual audio content-type: {content_type} for file {file.filename}")


async def save_temp_audio(file: UploadFile) -> str:
    """
    Saves the uploaded file to a temporary location and returns the file path.
    Enforces maximum file size limit.
    """
    temp_dir = settings.UPLOAD_TEMP_DIR
    os.makedirs(temp_dir, exist_ok=True)

    ext = os.path.splitext(file.filename)[1].lower() if file.filename else ".webm"
    if not ext:
        ext = ".webm"

    temp_filename = f"audio_{uuid.uuid4().hex}{ext}"
    temp_path = os.path.join(temp_dir, temp_filename)

    max_bytes = settings.MAX_AUDIO_SIZE_MB * 1024 * 1024
    bytes_written = 0

    try:
        with open(temp_path, "wb") as out_file:
            while chunk := await file.read(1024 * 64):  # 64KB chunks
                bytes_written += len(chunk)
                if bytes_written > max_bytes:
                    raise HTTPException(
                        status_code=413,
                        detail=f"Audio file exceeds maximum allowed size of {settings.MAX_AUDIO_SIZE_MB}MB."
                    )
                out_file.write(chunk)

        if bytes_written == 0:
            raise HTTPException(status_code=400, detail="Uploaded audio file is empty.")

        logger.info(f"Saved temporary audio file ({bytes_written} bytes) to {temp_path}")
        return temp_path
    except Exception as e:
        cleanup_temp_file(temp_path)
        if isinstance(e, HTTPException):
            raise e
        logger.error(f"Error saving temporary audio file: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to process uploaded audio file: {str(e)}")


def cleanup_temp_file(filepath: Optional[str]) -> None:
    """
    Safely removes the temporary audio file.
    """
    if filepath and os.path.exists(filepath):
        try:
            os.remove(filepath)
            logger.info(f"Cleaned up temporary audio file: {filepath}")
        except Exception as e:
            logger.warning(f"Failed to remove temporary file {filepath}: {e}")
