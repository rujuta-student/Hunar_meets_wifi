import pytest
from backend.services.catalog_generator import catalog_generator
from backend.schemas.catalog import CatalogBilingual


def test_catalog_generator_fallback():
    source_text = "આ એક પરંપરાગત કચ્છી બાંધણી સાડી છે, જે શુદ્ધ ગજી સિલ્કમાંથી બનાવેલી છે."
    hindi_text = "यह एक पारंपरिक कच्छी बांधणी साड़ी है, जो शुद्ध गजी सिल्क से बनी है।"
    english_text = "This is a traditional Kutchi Bandhani saree made of pure Gaji silk."

    catalog = catalog_generator.generate_catalog(
        source_text=source_text,
        source_lang="gu",
        hindi_text=hindi_text,
        english_text=english_text
    )

    assert isinstance(catalog, CatalogBilingual)
    # Check English fields
    assert catalog.english.title
    assert catalog.english.description
    assert "Bandhani" in catalog.english.craft_type or "Bandhani" in catalog.english.title
    assert "Silk" in catalog.english.material
    assert catalog.english.material_cost is not None
    assert catalog.english.labor_cost is not None
    assert catalog.english.minimum_price is not None
    assert len(catalog.english.keywords) > 0

    # Check Hindi fields
    assert catalog.hindi.title
    assert catalog.hindi.description
    assert catalog.hindi.material_cost is not None
    assert catalog.hindi.labor_cost is not None
    assert catalog.hindi.minimum_price is not None
    assert len(catalog.hindi.keywords) > 0


def test_catalog_marathi():
    source_text = "ही एक अस्सल पैठणी साडी आहे, जी येवला येथे शुद्ध रेशीम आणि सोन्याच्या जरीने विણलेली आहे."
    hindi_text = "यह एक प्रामाणिक पैठणी साड़ी है, जो शुद्ध रेशम और सोने की ज़री से बुनी गई है।"
    english_text = "This is an authentic Paithani saree woven with pure silk and gold zari."

    catalog = catalog_generator.generate_catalog(
        source_text=source_text,
        source_lang="mr",
        hindi_text=hindi_text,
        english_text=english_text
    )

    assert isinstance(catalog, CatalogBilingual)
    assert "Paithani" in catalog.english.craft_type or "Paithani" in catalog.english.title
    assert "पैठणी" in catalog.hindi.craft_type or "पैठणी" in catalog.hindi.title
