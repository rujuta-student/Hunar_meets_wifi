import pytest
from backend.services.translation import translation_service


def test_translation_gujarati():
    sample_gu = "આ એક સુંદર હાથથી બનાવેલી બાંધણી સાડી છે."
    result = translation_service.translate_to_hindi_and_english(sample_gu, source_lang="gu")

    assert result.hindi is not None and len(result.hindi) > 0
    assert result.english is not None and len(result.english) > 0
    # Verify meaningful words are present
    assert any(term in result.english.lower() for term in ["saree", "sari", "bandhani", "hand"])
    assert any(term in result.hindi for term in ["साड़ी", "सुंदर", "हाथ", "बांधणी"])


def test_translation_marathi():
    sample_mr = "ही एक पारंपरिक येवला पैठणी साडी आहे."
    result = translation_service.translate_to_hindi_and_english(sample_mr, source_lang="mr")

    assert result.hindi is not None and len(result.hindi) > 0
    assert result.english is not None and len(result.english) > 0
    assert any(term in result.english.lower() for term in ["paithani", "saree", "sari", "traditional"])
    assert any(term in result.hindi for term in ["पैठणी", "साड़ी", "पारंपरिक"])


def test_translation_hindi():
    sample_hi = "यह एक शुद्ध बनारसी कतान सिल्क साड़ी है।"
    result = translation_service.translate_to_hindi_and_english(sample_hi, source_lang="hi")

    assert result.hindi == sample_hi
    assert result.english is not None and len(result.english) > 0
    assert any(term in result.english.lower() for term in ["banarasi", "silk", "saree", "sari", "pure"])


def test_translation_empty():
    result = translation_service.translate_to_hindi_and_english("", source_lang="gu")
    assert result.hindi == ""
    assert result.english == ""
