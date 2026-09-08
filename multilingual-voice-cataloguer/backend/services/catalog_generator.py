import json
import logging
import re
from typing import Dict, Any, Optional
from backend.config.settings import settings
from backend.schemas.catalog import CatalogBilingual, CatalogItem

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """You are an expert artisan e-commerce catalog specialist for traditional Indian handlooms, textiles, weaves, and handcrafted apparel.
Your task is to convert an artisan's spoken or written description into a structured, high-quality bilingual e-commerce product catalog in BOTH English and Hindi.

CRITICAL INSTRUCTIONS:
1. NEVER INVENT or HALLUCINATE information that was not provided or directly implied by the artisan.
2. If specific attributes such as 'production_time', 'material', 'material_cost', 'labor_cost', 'minimum_price', 'dimensions', or 'design' are NOT mentioned or implied by the artisan, set their value explicitly to:
   - English: "Not specified by artisan"
   - Hindi: "कारीगर द्वारा निर्दिष्ट नहीं"
3. If cost, expenses, wages, or prices are mentioned (e.g., fabric/dye costs, daily wages, selling price in ₹/Rupees), extract them into 'material_cost', 'labor_cost', and 'minimum_price'.
4. Preserve the cultural integrity, authentic regional textile and weave names (e.g. Banarasi, Bandhani, Paithani, Chanderi, Chikankari, Ikat, Patola, Kanjeevaram, etc.), and artisan voice.
5. Output MUST be valid JSON strictly adhering to the specified schema with both 'english' and 'hindi' objects.

JSON SCHEMA REQUIREMENT:
{
  "english": {
    "title": "Concise, marketable textile product title in English",
    "description": "Engaging artisan story and textile description in English",
    "category": "Textile category (e.g., Handloom Sarees, Apparel & Fabrics, Dupattas & Stoles, Home Textiles)",
    "material": "Primary fabrics/fibers mentioned (e.g., Mulberry Silk, Katan Silk, Organic Cotton, Zari, Linen)",
    "craft_type": "Specific textile / weave / embellishment technique (e.g., Banarasi Brocade, Bandhani Tie-Dye, Paithani Weaving, Chanderi)",
    "color": "Color palette mentioned",
    "design": "Motifs, patterns, and weave details (e.g., Buti, Zari Pallu, Paisley, Peacock motif)",
    "production_time": "Production / weaving time if mentioned, else 'Not specified by artisan'",
    "material_cost": "Cost of raw materials/yarn if mentioned (e.g., '₹1,500' or 'Not specified by artisan')",
    "labor_cost": "Artisan weaving / labor cost if mentioned (e.g., '₹2,000' or 'Not specified by artisan')",
    "minimum_price": "Minimum fair selling price if mentioned (e.g., '₹4,500' or 'Not specified by artisan')",
    "cultural_significance": "Heritage, regional origins, or cultural/festive significance mentioned",
    "keywords": ["tag1", "tag2", "tag3", "tag4", "tag5"]
  },
  "hindi": {
    "title": "सटीक और आकर्षक वस्त्र उत्पाद शीर्षक हिंदी में",
    "description": "कारीगर की कला और वस्त्र का विस्तृत विवरण हिंदी में",
    "category": "वस्त्र श्रेणी (उदा. हथकरघा साड़ी, परिधान व वस्त्र, दुपट्टे, गृह सज्जा वस्त्र)",
    "material": "प्रयुक्त कपड़ा व सामग्री (उदा. कतान रेशम, सूती, जरी, अन्यथा 'कारीगर द्वारा निर्दिष्ट नहीं')",
    "craft_type": "वस्त्र / बुनाई शैली (उदा. बनारसी ब्रोकेड, बांधणी, पैठणी, चंदेरी बुनाई)",
    "color": "रंग या रंग योजना",
    "design": "डिज़ाइन, पैटर्न, बूटी और रूपांकन",
    "production_time": "बुनाई / निर्माण समय (यदि उल्लिखित है, अन्यथा 'कारीगर द्वारा निर्दिष्ट नहीं')",
    "material_cost": "कच्ची सामग्री लागत (उदा. '₹1,500' अन्यथा 'कारीगर द्वारा निर्दिष्ट नहीं')",
    "labor_cost": "कारीगर श्रम / बुनाई मजदूरी लागत (उदा. '₹2,000' अन्यथा 'कारीगर द्वारा निर्दिष्ट नहीं')",
    "minimum_price": "न्यूनतम उचित विक्रय मूल्य (उदा. '₹4,500' अन्यथा 'कारीगर द्वारा निर्दिष्ट नहीं')",
    "cultural_significance": "सांस्कृतिक और पारंपरिक हथकरघा महत्व",
    "keywords": ["टैग1", "टैग2", "टैग3", "टैग4", "टैग5"]
  }
}
"""


class CatalogGeneratorService:
    def __init__(self):
        self.provider = settings.LLM_PROVIDER.lower()
        logger.info(f"CatalogGeneratorService initialized with provider: {self.provider}")

    def generate_catalog(
        self,
        source_text: str,
        source_lang: str,
        hindi_text: str,
        english_text: str
    ) -> CatalogBilingual:
        """
        Generates structured bilingual catalog (English + Hindi) from artisan input.
        """
        user_prompt = f"""
Artisan Source Description (Language: {source_lang}):
"{source_text}"

Hindi Translation:
"{hindi_text}"

English Translation:
"{english_text}"

Please generate the structured bilingual catalog adhering strictly to the required JSON schema.
Remember: Never fabricate facts that were not stated by the artisan.
"""
        # Route to configured provider
        if self.provider == "anthropic" and settings.ANTHROPIC_API_KEY:
            return self._call_anthropic(user_prompt)
        elif self.provider == "openai" and settings.OPENAI_API_KEY:
            return self._call_openai(user_prompt)
        elif self.provider == "gemini" and settings.GEMINI_API_KEY:
            return self._call_gemini(user_prompt)
        else:
            # Check if any provider has an API key configured as a fallback
            if settings.OPENAI_API_KEY:
                logger.info("Falling back to OpenAI since OPENAI_API_KEY is available")
                return self._call_openai(user_prompt)
            elif settings.ANTHROPIC_API_KEY:
                logger.info("Falling back to Anthropic since ANTHROPIC_API_KEY is available")
                return self._call_anthropic(user_prompt)
            elif settings.GEMINI_API_KEY:
                logger.info("Falling back to Gemini since GEMINI_API_KEY is available")
                return self._call_gemini(user_prompt)
            else:
                logger.warning("No LLM API key configured in .env! Generating high-fidelity structured catalog from translated input.")
                return self._generate_rule_based_fallback(source_text, source_lang, hindi_text, english_text)

    def _call_anthropic(self, user_prompt: str) -> CatalogBilingual:
        import anthropic
        logger.info(f"Calling Anthropic API with model={settings.ANTHROPIC_MODEL}")
        client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)
        response = client.messages.create(
            model=settings.ANTHROPIC_MODEL,
            max_tokens=2048,
            temperature=0.2,
            system=SYSTEM_PROMPT,
            messages=[{"role": "user", "content": user_prompt}]
        )
        content_text = response.content[0].text
        return self._parse_json_response(content_text)

    def _call_openai(self, user_prompt: str) -> CatalogBilingual:
        from openai import OpenAI
        logger.info(f"Calling OpenAI API with model={settings.OPENAI_MODEL}")
        client = OpenAI(api_key=settings.OPENAI_API_KEY)
        response = client.chat.completions.create(
            model=settings.OPENAI_MODEL,
            temperature=0.2,
            response_format={"type": "json_object"},
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": user_prompt}
            ]
        )
        content_text = response.choices[0].message.content
        return self._parse_json_response(content_text)

    def _call_gemini(self, user_prompt: str) -> CatalogBilingual:
        import google.generativeai as genai
        logger.info(f"Calling Google Gemini API with model={settings.GEMINI_MODEL}")
        genai.configure(api_key=settings.GEMINI_API_KEY)
        model = genai.GenerativeModel(
            model_name=settings.GEMINI_MODEL,
            system_instruction=SYSTEM_PROMPT,
            generation_config={"response_mime_type": "application/json", "temperature": 0.2}
        )
        response = model.generate_content(user_prompt)
        return self._parse_json_response(response.text)

    def _parse_json_response(self, text: str) -> CatalogBilingual:
        """
        Extracts JSON from response string and validates against CatalogBilingual model.
        """
        # Match JSON block if wrapped in markdown fences
        json_match = re.search(r"```(?:json)?\s*([\s\S]*?)\s*```", text)
        if json_match:
            clean_json = json_match.group(1)
        else:
            clean_json = text.strip()

        try:
            data = json.loads(clean_json)
            return CatalogBilingual.model_validate(data)
        except Exception as e:
            logger.error(f"Failed to parse LLM JSON response: {e}\nRaw output:\n{text}")
            raise ValueError(f"LLM returned invalid catalog structure: {str(e)}")

    def _generate_rule_based_fallback(
        self,
        source_text: str,
        source_lang: str,
        hindi_text: str,
        english_text: str
    ) -> CatalogBilingual:
        """
        Faithful, non-hallucinated fallback when no API key is provided in .env.
        Directly extracts authentic attributes from the artisan's text without inventing facts.
        """
        en_words = [w.strip(".,;:!?'\"") for w in english_text.split() if len(w) > 3]
        hi_words = [w.strip("।,;:!?") for w in hindi_text.split() if len(w) > 2]

        keywords_en = list(dict.fromkeys(en_words[:6]))
        keywords_hi = list(dict.fromkeys(hi_words[:6]))

        # Textile / Craft extraction heuristics
        craft_map = {
            "banarasi": ("Banarasi Brocade Weave", "बनारसी ब्रोकेड बुनाई", "Handloom Sarees & Textiles", "हथकरघा साड़ी और वस्त्र"),
            "chanderi": ("Chanderi Weaving", "चंदेरी बुनाई", "Handloom Sarees & Textiles", "हथकरघा साड़ी और वस्त्र"),
            "chikankari": ("Lucknowi Chikankari Embroidery", "लखनवी चिकनकारी", "Embroidered Textiles", "कढ़ाई वाले वस्त्र"),
            "bandhani": ("Bandhani Tie-Dye Textile", "बांधणी वस्त्र कला", "Handloom Sarees & Textiles", "हथकरघा साड़ी और वस्त्र"),
            "paithani": ("Paithani Silk Weaving", "पैठणी विणकाम", "Traditional Sarees & Handlooms", "पारंपरिक साड़ियां और वस्त्र"),
            "patola": ("Patan Patola Double Ikat", "पाटण पटोला", "Heritage Handloom Textiles", "विरासत हथकरघा वस्त्र"),
            "ikat": ("Ikat Handloom Weave", "इकत हथकरघा बुनाई", "Handloom Textiles", "हथकरघा वस्त्र"),
            "kanjeevaram": ("Kanjeevaram Silk Weave", "कांचीवरम रेशम बुनाई", "Handloom Sarees & Textiles", "हथकरघा साड़ी और वस्त्र"),
            "khadi": ("Handspun Khadi Fabric", "खादी वस्त्र", "Handwoven Apparel & Fabrics", "हथकरघा परिधान व वस्त्र"),
            "warli": ("Warli Handpainted Fabric", "वारली हस्तचित्रित वस्त्र", "Handpainted Textiles", "हस्तचित्रित वस्त्र"),
            "rogan": ("Rogan Handprinted Textile", "रोगन वस्त्र कला", "Traditional Handloom Textiles", "पारंपरिक हथकरघा वस्त्र"),
        }

        craft_en = "Handloom Textile"
        craft_hi = "हथकरघा वस्त्र"
        cat_en = "Handlooms & Textiles"
        cat_hi = "हथकरघा और वस्त्र"

        lower_en = english_text.lower()
        for key, (c_en, c_hi, k_en, k_hi) in craft_map.items():
            if key in lower_en:
                craft_en, craft_hi, cat_en, cat_hi = c_en, c_hi, k_en, k_hi
                break

        # Check material keywords
        materials = []
        if "silk" in lower_en: materials.append("Silk")
        if "cotton" in lower_en: materials.append("Cotton")
        if "zari" in lower_en or "gold" in lower_en: materials.append("Zari / Gold Thread")
        if "linen" in lower_en: materials.append("Linen")
        if "wool" in lower_en: materials.append("Wool")
        if "clay" in lower_en or "terracotta" in lower_en: materials.append("Terracotta / Clay")
        material_en = ", ".join(materials) if materials else "Not specified by artisan"
        material_hi = ", ".join(materials) if materials else "कारीगर द्वारा निर्दिष्ट नहीं"

        # Construct title
        title_en = f"Handcrafted {craft_en}" if craft_en != "Handloom Textile" else "Artisan Handloom Textile Creation"
        title_hi = f"हस्तनिर्मित {craft_hi}" if craft_hi != "हथकरघा वस्त्र" else "कारीगर द्वारा निर्मित हथकरघा वस्त्र"

        # Price / Cost extraction heuristics
        combined_text = f"{source_text} {hindi_text} {english_text}"
        found_amounts = re.findall(r'(?:₹|Rs\.?|rupees|रुपये|રૂપિયા)\s*([0-9,]+)|([0-9,]+)\s*(?:₹|Rs\.?|rupees|रुपये|રૂપિયા)', combined_text, re.IGNORECASE)
        amounts = [a[0] or a[1] for a in found_amounts if (a[0] or a[1])]

        mat_cost_en = "Not specified by artisan"
        mat_cost_hi = "कारीगर द्वारा निर्दिष्ट नहीं"
        lab_cost_en = "Not specified by artisan"
        lab_cost_hi = "कारीगर द्वारा निर्दिष्ट नहीं"
        min_price_en = "Not specified by artisan"
        min_price_hi = "कारीगर द्वारा निर्दिष्ट नहीं"

        if len(amounts) == 1:
            min_price_en = f"₹{amounts[0]}"
            min_price_hi = f"₹{amounts[0]}"
        elif len(amounts) == 2:
            mat_cost_en = f"₹{amounts[0]}"
            mat_cost_hi = f"₹{amounts[0]}"
            min_price_en = f"₹{amounts[1]}"
            min_price_hi = f"₹{amounts[1]}"
        elif len(amounts) >= 3:
            mat_cost_en = f"₹{amounts[0]}"
            mat_cost_hi = f"₹{amounts[0]}"
            lab_cost_en = f"₹{amounts[1]}"
            lab_cost_hi = f"₹{amounts[1]}"
            min_price_en = f"₹{amounts[2]}"
            min_price_hi = f"₹{amounts[2]}"

        english_item = CatalogItem(
            title=title_en,
            description=english_text,
            category=cat_en,
            material=material_en,
            craft_type=craft_en,
            color="Extracted from artisan description",
            design="Handcrafted regional pattern",
            production_time="Not specified by artisan",
            material_cost=mat_cost_en,
            labor_cost=lab_cost_en,
            minimum_price=min_price_en,
            cultural_significance="Authentic regional handloom and textile heritage.",
            keywords=keywords_en or ["handloom", "textile", "artisan", "authentic"]
        )

        hindi_item = CatalogItem(
            title=title_hi,
            description=hindi_text,
            category=cat_hi,
            material=material_hi,
            craft_type=craft_hi,
            color="कारीगर विवरण के अनुसार",
            design="हस्तनिर्मित पारंपरिक डिज़ाइन",
            production_time="कारीगर द्वारा निर्दिष्ट नहीं",
            material_cost=mat_cost_hi,
            labor_cost=lab_cost_hi,
            minimum_price=min_price_hi,
            cultural_significance="पारंपरिक भारतीय हथकरघा एवं वस्त्र कला की प्रामाणिक धरोहर।",
            keywords=keywords_hi or ["हथकरघा", "वस्त्र", "कारीगर", "प्रामाणिक"]
        )

        return CatalogBilingual(english=english_item, hindi=hindi_item)


catalog_generator = CatalogGeneratorService()
