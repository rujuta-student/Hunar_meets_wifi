import os
from typing import List, Optional
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

    # Whisper Speech-to-Text Configuration
    WHISPER_MODEL_SIZE: str = "base"
    WHISPER_DEVICE: str = "cpu"
    WHISPER_COMPUTE_TYPE: str = "int8"

    # LLM Provider Configuration ("anthropic" | "openai" | "gemini")
    LLM_PROVIDER: str = "anthropic"
    ANTHROPIC_API_KEY: Optional[str] = None
    ANTHROPIC_MODEL: str = "claude-3-5-sonnet-20241022"
    
    OPENAI_API_KEY: Optional[str] = None
    OPENAI_MODEL: str = "gpt-4o"

    GEMINI_API_KEY: Optional[str] = None
    GEMINI_MODEL: str = "gemini-1.5-flash"

    # Translation Configuration ("deep_translator" | "indictrans2" | "llm")
    TRANSLATION_PROVIDER: str = "deep_translator"

    # Audio upload restrictions
    MAX_AUDIO_SIZE_MB: int = 25
    UPLOAD_TEMP_DIR: str = "temp_audio"

    # CORS
    CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "*"
    ]


settings = Settings()
