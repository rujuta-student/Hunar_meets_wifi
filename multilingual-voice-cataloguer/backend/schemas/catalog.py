from typing import List, Optional
from pydantic import BaseModel, Field


class CatalogItem(BaseModel):
    title: str = Field(..., description="Concise, marketable product title")
    description: str = Field(..., description="Detailed artisan product story and craft description")
    category: str = Field(..., description="Product category (e.g., Apparel, Home Decor, Pottery, Textile)")
    material: str = Field(..., description="Primary materials used (e.g., Mulberry Silk, Clay, Teakwood, Cotton)")
    craft_type: str = Field(..., description="Specific textile weaving or embellishment technique (e.g., Bandhani, Paithani, Banarasi, Chanderi, Chikankari)")
    color: str = Field(..., description="Colors or palette mentioned")
    design: str = Field(..., description="Motif, pattern, or design elements")
    production_time: str = Field(..., description="Time taken to produce (or 'Not specified by artisan' if unmentioned)")
    material_cost: str = Field(default="Not specified by artisan", description="Cost of raw materials (or 'Not specified by artisan')")
    labor_cost: str = Field(default="Not specified by artisan", description="Cost of artisan labor/workmanship (or 'Not specified by artisan')")
    minimum_price: str = Field(default="Not specified by artisan", description="Minimum fair selling price (or 'Not specified by artisan')")
    cultural_significance: str = Field(..., description="Cultural, historical, or festive significance")
    keywords: List[str] = Field(default_factory=list, description="Search and catalog keywords")


class CatalogBilingual(BaseModel):
    english: CatalogItem = Field(..., description="English catalog item")
    hindi: CatalogItem = Field(..., description="Hindi catalog item")


class Translations(BaseModel):
    hindi: str = Field(..., description="Hindi translation of the source transcript")
    english: str = Field(..., description="English translation of the source transcript")


class CatalogResponse(BaseModel):
    success: bool = True
    input_language: str = Field(..., description="Source language: 'gu' (Gujarati), 'mr' (Marathi), or 'hi' (Hindi)")
    input_method: str = Field(..., description="Input method: 'audio' or 'text'")
    transcript: str = Field(..., description="Transcribed audio or input text in source language")
    translations: Translations = Field(..., description="Translations in Hindi and English")
    catalog: CatalogBilingual = Field(..., description="Structured bilingual catalog")
    error: Optional[str] = None


class TextGenerateRequest(BaseModel):
    text: str = Field(..., min_length=2, description="Artisan input text in Gujarati, Marathi, or Hindi")
    language: str = Field(..., description="Language code: 'gu', 'mr', or 'hi'")


class LanguageInfo(BaseModel):
    code: str
    name: str
    native_name: str
