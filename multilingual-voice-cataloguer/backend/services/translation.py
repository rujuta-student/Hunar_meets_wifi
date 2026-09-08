import logging
from typing import Optional
from deep_translator import GoogleTranslator, MyMemoryTranslator
from backend.config.settings import settings
from backend.schemas.catalog import Translations

logger = logging.getLogger(__name__)

# Language code mappings
LANGUAGE_CODE_MAP = {
    "gu": "gu",  # Gujarati
    "mr": "mr",  # Marathi
    "hi": "hi",  # Hindi
    "en": "en",  # English
}

MYMEMORY_LOCALE_MAP = {
    "gu": "gu-IN",
    "mr": "mr-IN",
    "hi": "hi-IN",
    "en": "en-GB",
}


class TranslationService:
    """
    Robust translation service supporting Indic languages:
    - Gujarati -> Hindi & English
    - Marathi -> Hindi & English
    - Hindi -> English (Hindi preserved as original)
    Includes multi-tier fallbacks (Google Translator -> MyMemory Translator -> Pivot via Hindi).
    """

    def __init__(self):
        self.provider = settings.TRANSLATION_PROVIDER
        logger.info(f"TranslationService initialized with provider: {self.provider}")

    def translate_to_hindi_and_english(self, text: str, source_lang: str) -> Translations:
        """
        Translates source text in Gujarati ('gu'), Marathi ('mr'), or Hindi ('hi')
        into both Hindi and English.
        """
        if not text or not text.strip():
            return Translations(hindi="", english="")

        source_code = LANGUAGE_CODE_MAP.get(source_lang, source_lang)
        logger.info(f"Translating text from {source_code} to Hindi ('hi') and English ('en')")

        # Translate to Hindi
        try:
            hindi_text = self._translate_text(text, source_lang=source_code, target_lang="hi")
        except Exception as e:
            logger.error(f"Failed all translation attempts for {source_code}->hi: {e}")
            hindi_text = text

        # Translate to English
        try:
            english_text = self._translate_text(text, source_lang=source_code, target_lang="en")
        except Exception as e:
            logger.warning(f"Direct {source_code}->en translation failed ({e}), attempting pivot via Hindi...")
            try:
                # Pivot through Hindi if Hindi was successfully translated
                if hindi_text and hindi_text != text:
                    english_text = self._translate_text(hindi_text, source_lang="hi", target_lang="en")
                else:
                    english_text = text
            except Exception as e_pivot:
                logger.error(f"Pivot translation failed: {e_pivot}")
                english_text = text

        return Translations(hindi=hindi_text, english=english_text)

    def _translate_text(self, text: str, source_lang: str, target_lang: str) -> str:
        """
        Executes translation using primary GoogleTranslator with MyMemory fallback.
        """
        if source_lang == target_lang:
            return text

        # Tier 1: Google Translator
        try:
            translator = GoogleTranslator(source=source_lang, target=target_lang)
            if len(text) > 4000:
                chunks = [text[i:i + 4000] for i in range(0, len(text), 4000)]
                translated_chunks = [translator.translate(chunk) for chunk in chunks]
                result = " ".join(translated_chunks)
            else:
                result = translator.translate(text)
            if result and result.strip():
                return result.strip()
        except Exception as err:
            logger.warning(f"GoogleTranslator failed for {source_lang}->{target_lang}: {err}. Trying MyMemoryTranslator...")

        # Tier 2: MyMemoryTranslator fallback
        try:
            src_locale = MYMEMORY_LOCALE_MAP.get(source_lang, source_lang)
            tgt_locale = MYMEMORY_LOCALE_MAP.get(target_lang, target_lang)
            mm_translator = MyMemoryTranslator(source=src_locale, target=tgt_locale)
            result = mm_translator.translate(text)
            if result and result.strip():
                logger.info(f"Successfully translated via MyMemoryTranslator ({source_lang}->{target_lang})")
                return result.strip()
        except Exception as err2:
            logger.warning(f"MyMemoryTranslator also failed for {source_lang}->{target_lang}: {err2}")

        raise RuntimeError(f"All translation engines failed for {source_lang}->{target_lang}")


translation_service = TranslationService()
