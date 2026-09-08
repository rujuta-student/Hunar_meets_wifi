# 🏺 VaniCraft AI — Multilingual Artisan Voice-to-Catalog System

An end-to-end full-stack AI system that empowers traditional Indian artisans speaking in **Gujarati** (`gu`) or **Marathi** (`mr`) to produce rich, structured e-commerce product catalogs in both **Hindi** and **English**.

---

## 🚀 System Architecture & Flow

```
User Voice (Gujarati / Marathi) or Audio File Upload
                           │
                           ▼
              React Frontend (Vite)
              - Language Selection (Gujarati: gu / Marathi: mr)
              - MediaRecorder Audio Recording & File Upload
              - Progressive Pipeline Status Tracker
                           │
                           │  HTTP POST /api/catalog/generate
                           │  multipart/form-data: { audio, language }
                           ▼
                 FastAPI Backend (Port 8000)
                           │
             ┌─────────────┴─────────────┐
             ▼                           ▼
    1. Audio Validation          2. Temporary Storage
    (Format, Size, Mime)         (Auto-cleaned on complete)
             │
             ▼
    3. Speech-to-Text (`faster-whisper`)
    - Explicit language passed: `gu` or `mr`
    - Cached singleton model
             │
             ▼
    4. Translation Service
    - Gujarati / Marathi ➔ Hindi
    - Gujarati / Marathi ➔ English
             │
             ▼
    5. AI Catalog Generator
    - Configurable LLM: Anthropic Claude / OpenAI / Gemini
    - Strict instruction: Never invent information not provided by artisan
    - Generates structured schema: English & Hindi catalogs
             │
             ▼
    6. Structured API Response
    - Original transcript, Hindi & English translations
    - Product titles, craft type, materials, cultural significance, keywords
             │
             ▼
       React Frontend Renders Interactive Bilingual Catalog
```

---

## 📁 Modular Project Structure

```
artisan-catalog-ai/
├── backend/
│   ├── main.py                    # FastAPI application & lifespan
│   ├── api/
│   │   └── routes/
│   │       └── catalog.py         # Endpoints: /generate, /generate-text, /languages, /health
│   ├── services/
│   │   ├── speech_to_text.py      # faster-whisper singleton with explicit language
│   │   ├── translation.py         # Multi-tier translation (gu/mr -> hi & en)
│   │   ├── catalog_generator.py   # LLM catalog generator with strict schema
│   │   └── pipeline.py            # Pipeline orchestrator
│   ├── schemas/
│   │   └── catalog.py             # Pydantic schemas (CatalogItem, CatalogBilingual, etc.)
│   ├── config/
│   │   └── settings.py            # Pydantic settings loading from .env
│   ├── utils/
│   │   └── audio.py               # Audio validation, temporary storage, and cleanup
│   ├── sample_audio/              # Pre-generated authentic voice samples (Gujarati & Marathi)
│   ├── tests/
│   │   ├── test_api.py            # Endpoint integration tests
│   │   ├── test_audio_utils.py    # Audio validation tests
│   │   ├── test_catalog_generator.py # Catalog generator tests
│   │   └── test_translation.py    # Translation engine tests
│   ├── generate_samples.py        # Script to generate sample voice notes
│   ├── .env.example               # Environment variables template
│   ├── .env                       # Active environment configuration
│   └── requirements.txt           # Python dependencies
│
└── frontend/
    ├── package.json
    ├── vite.config.js             # Vite config with backend proxy
    ├── index.html                 # Indic typography fonts & HTML shell
    └── src/
        ├── App.jsx                # Main interface & state coordinator
        ├── main.jsx               # React entry point
        ├── index.css              # Artisan-themed responsive styling
        ├── api/
        │   └── client.js          # Real API client making fetch requests
        └── components/
            ├── LanguageSelector.jsx # Gujarati / Marathi language selection
            ├── AudioRecorder.jsx    # MediaRecorder recording with timer
            ├── AudioUploader.jsx    # Drag-and-drop audio file uploader
            ├── SampleAudioPicker.jsx# One-click authentic voice note tester
            ├── StatusTracker.jsx    # Pipeline step-by-step progress
            ├── CatalogView.jsx      # Bilingual catalog viewer & JSON export
            └── TextInputDrawer.jsx  # Evaluator option for text testing
```

---

## ⚙️ Configuration (`backend/.env`)

Configure your LLM provider and Whisper model in `backend/.env`:

```env
# Whisper Speech-to-Text
WHISPER_MODEL_SIZE=base
WHISPER_DEVICE=cpu
WHISPER_COMPUTE_TYPE=int8

# LLM Configuration (Choose: anthropic | openai | gemini)
LLM_PROVIDER=anthropic

# Anthropic Claude Configuration
ANTHROPIC_API_KEY=your_anthropic_key_here
ANTHROPIC_MODEL=claude-3-5-sonnet-20241022

# OpenAI Configuration
OPENAI_API_KEY=your_openai_key_here
OPENAI_MODEL=gpt-4o

# Google Gemini Configuration
GEMINI_API_KEY=your_gemini_key_here
GEMINI_MODEL=gemini-1.5-flash

# Translation Configuration (deep_translator | indictrans2 | llm)
TRANSLATION_PROVIDER=deep_translator

# Audio Settings
MAX_AUDIO_SIZE_MB=25
UPLOAD_TEMP_DIR=temp_audio
```

> **Note:** If no API key is specified in `.env`, the system automatically falls back to a deterministic, high-fidelity rule-based generator that extracts authentic attributes directly from the artisan's text without hallucinating.

---

## 🏃 How to Run

### 1. Start the FastAPI Backend

From `artisan-catalog-ai`:
```bash
python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload
```
The backend will be live at `http://127.0.0.1:8000`.
Interactive Swagger API documentation: `http://127.0.0.1:8000/docs`.

### 2. Start the React Frontend

From `artisan-catalog-ai/frontend`:
```bash
npm run dev
```
The frontend will be live at `http://localhost:5173`.

---

## 🧪 Running Automated Tests

To run the complete automated test suite (15 unit and integration tests covering audio upload, Whisper STT, translation, catalog generator, and endpoints):

```bash
python -m pytest backend/tests/ -v
```

All 15 tests pass with 100% success.
