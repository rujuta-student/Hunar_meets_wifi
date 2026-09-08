import logging
import threading
from typing import Optional
from faster_whisper import WhisperModel
from backend.config.settings import settings

logger = logging.getLogger(__name__)


class WhisperSTTService:
    _instance: Optional["WhisperSTTService"] = None
    _lock: threading.Lock = threading.Lock()

    def __init__(self):
        self._model: Optional[WhisperModel] = None
        self._model_lock = threading.Lock()

    @classmethod
    def get_instance(cls) -> "WhisperSTTService":
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = cls()
        return cls._instance

    def _get_model(self) -> WhisperModel:
        if self._model is None:
            with self._model_lock:
                if self._model is None:
                    logger.info(
                        f"Loading faster-whisper model: size={settings.WHISPER_MODEL_SIZE}, "
                        f"device={settings.WHISPER_DEVICE}, compute_type={settings.WHISPER_COMPUTE_TYPE}"
                    )
                    self._model = WhisperModel(
                        model_size_or_path=settings.WHISPER_MODEL_SIZE,
                        device=settings.WHISPER_DEVICE,
                        compute_type=settings.WHISPER_COMPUTE_TYPE
                    )
                    logger.info("faster-whisper model successfully loaded.")
        return self._model

    def transcribe(self, audio_path: str, language: str) -> str:
        """
        Transcribes the given audio file using faster-whisper.
        Explicitly passes the selected language ('gu', 'mr', or 'hi').
        """
        valid_languages = {"gu", "mr", "hi"}
        if language not in valid_languages:
            raise ValueError(f"Unsupported language code '{language}'. Must be one of: {valid_languages}")

        model = self._get_model()
        logger.info(f"Starting faster-whisper transcription for {audio_path} with explicit language='{language}'")

        segments, info = model.transcribe(
            audio_path,
            language=language,
            beam_size=5,
            task="transcribe",
            vad_filter=True,
            vad_parameters=dict(min_silence_duration_ms=500)
        )

        logger.info(f"Transcription info: duration={info.duration:.2f}s, language={info.language} (probability={info.language_probability:.2f})")

        transcript_parts = []
        for segment in segments:
            text = segment.text.strip()
            if text:
                transcript_parts.append(text)

        full_transcript = " ".join(transcript_parts).strip()
        logger.info(f"Transcribed {len(transcript_parts)} segment(s). Result length: {len(full_transcript)} characters.")
        return full_transcript


whisper_service = WhisperSTTService.get_instance()
