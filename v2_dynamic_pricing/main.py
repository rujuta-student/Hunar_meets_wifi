from fastapi import FastAPI
from pydantic import BaseModel
from google import genai
import numpy as np
import json
import requests
import os
from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
ETSY_KEYSTRING = os.getenv("ETSY_KEYSTRING")
ETSY_SHARED_SECRET = os.getenv("ETSY_SHARED_SECRET")

if not GEMINI_API_KEY:
    raise RuntimeError("GEMINI_API_KEY environment variable is not set.")

if not ETSY_KEYSTRING or not ETSY_SHARED_SECRET:
    raise RuntimeError(
        "ETSY_KEYSTRING and ETSY_SHARED_SECRET environment variables are not set."
    )

# ============================================================
# INITIALIZE APP
# ============================================================
app = FastAPI(title="Artisan-First Agentic Pricing API")

# ============================================================
# 1. CONFIGURE GEMINI
# ============================================================
client = genai.Client(api_key=GEMINI_API_KEY)

# Keep your existing model ID.
MODEL_ID = "gemini-3.6-flash"

# ============================================================
# 2. LOAD EMBEDDING MODEL
# ============================================================
embedder = SentenceTransformer("all-MiniLM-L6-v2")


# ============================================================
# INPUT MODEL
# ============================================================
class ArtisanInput(BaseModel):
    description: str
    material_cost: float
    labor_cost: float
    artisan_min_price: float


# ============================================================
# 3. EXTRACT PRODUCT ATTRIBUTES USING GEMINI
# ============================================================
def extract_product_attributes(description: str):
    """Uses Gemini to understand the textile and generate an Etsy search query."""

    prompt = f"""
    You are an expert Indian textile curator.

    Analyze this artisan's product description:
    "{description}"

    Extract the following attributes and return ONLY a valid JSON object:

    - craft_type (e.g., Paithani, Chikankari, Ajrakh)
    - material (e.g., pure silk, cotton)
    - category (e.g., Saree, Kurta, Dupatta)
    - search_query (a clean 3-4 word query for Etsy search,
      e.g., "chikankari cotton kurta")
    """

    try:
        response = client.models.generate_content(
            model=MODEL_ID,
            contents=prompt
        )

        cleaned_text = (
            response.text
            .replace("```json", "")
            .replace("```", "")
            .strip()
        )

        return json.loads(cleaned_text)

    except Exception as e:
        print(f"Gemini attribute extraction error: {e}")

        return {
            "craft_type": "Unknown",
            "material": "Unknown",
            "category": "textile",
            "search_query": "handmade textile"
        }


# ============================================================
# 4. GET LIVE ETSY DATA
# ============================================================
def get_live_etsy_data(artisan_desc: str, search_query: str):
    """
    Pulls live marketplace data from Etsy and uses embeddings
    to filter out listings that are not sufficiently similar.
    """

    url = "https://openapi.etsy.com/v3/application/listings/active"

    # Etsy requires keystring:shared_secret in x-api-key.
    headers = {
        "x-api-key": f"{ETSY_KEYSTRING}:{ETSY_SHARED_SECRET}"
    }

    # findAllListingsActive supports API-key authentication.
    # Currency conversion is supported by the endpoint.
    params = {
        "keywords": search_query,
        "limit": 25,
        "currency": "INR"
    }

    try:
        response = requests.get(
            url,
            headers=headers,
            params=params,
            timeout=30
        )

        # Useful while debugging Etsy authentication/API problems.
        print("Etsy Status:", response.status_code)

        if response.status_code != 200:
            print("Etsy Response:", response.text[:2000])

        response.raise_for_status()

        data = response.json()
        results = data.get("results", [])

        print(f"Etsy listings received: {len(results)}")

        if not results:
            return None

        etsy_descriptions = []
        etsy_prices = []
        etsy_products = []

        for item in results:
            # ------------------------------------------------
            # PRICE
            # ------------------------------------------------
            #
            # When currency=INR is requested, Etsy may provide
            # converted_price. Fall back to price if necessary.
            price_data = item.get("converted_price") or item.get("price") or {}

            amount = price_data.get("amount", 0)
            divisor = price_data.get("divisor", 1)

            if divisor == 0:
                divisor = 1

            currency = price_data.get("currency_code", "INR")

            real_price = amount / divisor

            # ------------------------------------------------
            # PRODUCT INFORMATION
            # ------------------------------------------------
            title = str(item.get("title", ""))
            description = str(item.get("description", ""))

            title_and_desc = f"{title} {description}".strip()

            etsy_descriptions.append(title_and_desc)
            etsy_prices.append(real_price)

            etsy_products.append({
                "listing_id": item.get("listing_id"),
                "title": title,
                "price": round(real_price, 2),
                "currency": currency,
                "url": item.get("url", "")
            })

        # ----------------------------------------------------
        # SEMANTIC MATCHING
        # ----------------------------------------------------
        artisan_embedding = embedder.encode([artisan_desc])
        db_embeddings = embedder.encode(etsy_descriptions)

        similarities = cosine_similarity(
            artisan_embedding,
            db_embeddings
        )[0]

        # Keep listings with at least 65% semantic similarity.
        valid_indices = np.where(similarities > 0.65)[0]

        if len(valid_indices) == 0:
            print("No Etsy listings passed the 0.65 similarity threshold.")
            return None

        matched_prices = [
            etsy_prices[i]
            for i in valid_indices
        ]

        matched_products = [
            {
                **etsy_products[i],
                "similarity": round(float(similarities[i]), 3)
            }
            for i in valid_indices
        ]

        # ----------------------------------------------------
        # PRICE BAND
        # ----------------------------------------------------
        return {
            "comparable_items_found": len(valid_indices),
            "total_etsy_items_scanned": len(results),

            "comparable_products": matched_products,

            "price_band": {
                "currency": "INR",
                "market_low": float(np.percentile(matched_prices, 25)),
                "market_median": float(np.median(matched_prices)),
                "market_high": float(np.percentile(matched_prices, 75))
            }
        }

    except requests.exceptions.HTTPError as e:
        print(f"Etsy HTTP Error: {e}")
        return None

    except requests.exceptions.RequestException as e:
        print(f"Etsy Network Error: {e}")
        return None

    except Exception as e:
        print(f"Etsy API Error: {e}")
        return None


# ============================================================
# 5. MAIN PRICE PREDICTION ENDPOINT
# ============================================================
@app.post("/api/v3/predict_price")
def predict_agentic_price(data: ArtisanInput):

    # --------------------------------------------------------
    # STEP 1: COST SAFEGUARD
    # --------------------------------------------------------
    overhead = (
        data.material_cost + data.labor_cost
    ) * 0.10

    true_floor = (
        data.material_cost
        + data.labor_cost
        + overhead
    )

    is_undervalued = (
        data.artisan_min_price < true_floor
    )

    # --------------------------------------------------------
    # STEP 2: UNDERSTAND THE PRODUCT
    # --------------------------------------------------------
    attributes = extract_product_attributes(
        data.description
    )

    # --------------------------------------------------------
    # STEP 3: FETCH LIVE ETSY DATA
    # --------------------------------------------------------
    market_data = get_live_etsy_data(
        data.description,
        attributes["search_query"]
    )

    # --------------------------------------------------------
    # STEP 4: FALLBACK IF ETSY RETURNS NO USABLE RESULTS
    # --------------------------------------------------------
    if not market_data:
        market_data = {
            "comparable_items_found": 0,
            "total_etsy_items_scanned": 0,
            "comparable_products": [],
            "price_band": {
                "currency": "INR",
                "market_low": true_floor * 1.3,
                "market_median": true_floor * 1.8,
                "market_high": true_floor * 2.5
            }
        }

    median_price = market_data["price_band"]["market_median"]

    # --------------------------------------------------------
    # STEP 5: GENERATE EXPLANATION
    # --------------------------------------------------------
    rationale_prompt = f"""
    Write a 2-sentence encouraging message to the artisan.

    Their floor cost is ₹{true_floor:.2f}.
    They asked for ₹{data.artisan_min_price:.2f}.
    The market median for comparable
    '{attributes["search_query"]}' Etsy listings is
    ₹{median_price:.2f}.

    Tell them exactly what price range they should sell it
    for based on the available market data.
    """

    try:
        rationale = client.models.generate_content(
            model=MODEL_ID,
            contents=rationale_prompt
        ).text.strip()

    except Exception as e:
        print(f"Gemini rationale error: {e}")

        rationale = (
            f"Your minimum cost should be at least ₹{true_floor:.2f}. "
            f"Based on the available market data, consider pricing "
            f"the product around ₹{median_price:.2f}."
        )

    # --------------------------------------------------------
    # STEP 6: RETURN FINAL RESULT
    # --------------------------------------------------------
    return {
        "cost_safeguard": {
            "true_cost_floor": round(true_floor, 2),
            "is_undervalued": is_undervalued
        },

        "extracted_attributes": attributes,

        "market_analysis": market_data,

        "final_recommendation": {
            "suggested_wholesale": round(
                max(
                    true_floor * 1.20,
                    data.artisan_min_price
                ),
                2
            ),

            "suggested_retail_range": (
                f"₹{round(market_data['price_band']['market_low'])} - "
                f"₹{round(market_data['price_band']['market_high'])}"
            )
        },

        "agent_rationale": rationale
    }
