# SmartHire ML Service — Machine Learning & Resume Screening Microservice

SmartHire is an AI-assisted candidate screening and resume skill-matching platform.
This service is an independent Python microservice that handles document processing, text preprocessing, skill extraction, candidate profile generation, TF-IDF vectorization, similarity computation, multi-criteria candidate scoring, deterministic ranking, and explainable recommendations.

---

## Table of Contents

1. [Architectural Overview](#1-architectural-overview)
2. [Project Constraints & AI-Assisted Principles](#2-project-constraints--ai-assisted-principles)
3. [Folder Structure](#3-folder-structure)
4. [Prerequisites & Dependencies](#4-prerequisites--dependencies)
5. [Installation & Setup](#5-installation--setup)
6. [Environment Configuration](#6-environment-configuration)
7. [Running the Service](#7-running-the-service)
8. [API Endpoints & Documentation](#8-api-endpoints--documentation)
9. [Detailed API Request & Response Examples](#9-detailed-api-request--response-examples)
10. [Machine Learning & Preprocessing Methodology](#10-machine-learning--preprocessing-methodology)
11. [Candidate Scoring & Ranking Formula](#11-candidate-scoring--ranking-formula)
12. [Testing & Quality Assurance](#12-testing--quality-assurance)
13. [Model Evaluation & Benchmarking](#13-model-evaluation--benchmarking)
14. [Production Hardening & Deployment](#14-production-hardening--deployment)
15. [Security & Privacy Considerations](#15-security--privacy-considerations)
16. [Future Improvements & Semantic Models](#16-future-improvements--semantic-models)

---

## 1. Architectural Overview

The ML service is designed to communicate with the main Node.js/TypeScript backend exclusively over REST APIs.

```text
Next.js Frontend
       │
       ▼
Node.js + TypeScript + Express Backend
(Authentication, User/Job DB, File Storage, Business Logic, API Security)
       │
       │ REST API (/api/v1/...)
       ▼
Python FastAPI ML Service
       ├── Document Processing (PyMuPDF for PDF, python-docx for DOCX)
       ├── NLP Engine (Google Gemini for Section Parsing, Entity & Skill Extraction)
       ├── Controlled Skill Canonicalization & Alias Resolution (Controlled Dictionary)
       ├── Feature Extraction & Reusable TF-IDF Vectorization
       ├── Similarity Engine (Cosine Similarity, Abstract Base Interface)
       ├── Multi-Criteria Scoring Engine (Skill, Experience, Education, Semantic)
       ├── Deterministic Candidate Ranking Engine
       ├── Transparent Score Explanation Engine (Derived Metrics + Gemini Narratives)
       └── ML Model Lifecycle & Artifact Management (joblib)
```

> **Design Boundary**: The Python service does **not** own or directly connect to PostgreSQL. The Node.js backend passes candidate and job data to the ML service and receives structured, explainable ML evaluations in response.

---

## 2. Project Constraints & AI-Assisted Principles

- **AI-Assisted, Not Autonomous**: The ML service provides recommendations and transparent score explanations to human recruiters. It never makes autonomous hiring decisions and does not implement automatic candidate rejection.
- **Fairness & Non-Discrimination**: Protected personal characteristics (e.g. gender, age, race, nationality, religion) are never used or parsed for ranking.
- **No Stack Trace Leakage**: Internal Python stack traces and exceptions are converted into uniform, machine-readable JSON error payloads.

---

## 3. Folder Structure

```text
ml_service/
├── app/
│   ├── __init__.py
│   ├── main.py                         # FastAPI app factory, lifespan, CORS, error handling
│   ├── api/
│   │   ├── __init__.py
│   │   └── routes/
│   │       ├── __init__.py
│   │       ├── health.py               # GET /health
│   │       ├── resume.py               # POST /api/v1/resume/extract, /analyze
│   │       ├── skills.py               # GET /api/v1/skills, POST /api/v1/skills/extract
│   │       ├── matching.py             # POST /api/v1/job/analyze
│   │       └── screening.py            # POST /api/v1/screening/evaluate, /rank
│   ├── core/
│   │   ├── __init__.py
│   │   ├── config.py                   # Pydantic Settings (.env configuration)
│   │   ├── logging.py                  # Structured, PII-safe logging
│   │   └── exceptions.py               # Custom domain exception hierarchy
│   ├── schemas/                        # Pydantic request & response models
│   │   ├── __init__.py
│   │   ├── resume.py
│   │   ├── candidate.py
│   │   ├── job.py
│   │   ├── matching.py
│   │   └── screening.py
│   ├── services/                       # Business & ML service orchestration
│   │   ├── __init__.py
│   │   ├── document_service.py         # PyMuPDF & python-docx extraction
│   │   ├── preprocessing_service.py    # Technical-term-preserving text pipeline
│   │   ├── skill_service.py            # Controlled dictionary & alias matching
│   │   ├── candidate_service.py        # Candidate profile generator
│   │   ├── job_service.py              # Job requirement normalization
│   │   ├── vectorization_service.py    # Reusable TF-IDF feature manager
│   │   ├── similarity_service.py       # Cosine & semantic similarity
│   │   ├── scoring_service.py          # Multi-criteria scoring engine
│   │   ├── ranking_service.py          # Batch candidate ranking & fault isolation
│   │   └── explanation_service.py      # Transparent score explanation generator
│   ├── ml/                             # Low-level ML algorithms & persistence
│   │   ├── __init__.py
│   │   ├── tfidf.py                    # TfidfModel (1-gram & 2-gram)
│   │   ├── similarity.py               # Cosine similarity & BaseSimilarityEngine
│   │   ├── scoring.py                  # Component score calculations
│   │   ├── ranking.py                  # Deterministic ranking & tie-breaking
│   │   └── model_manager.py            # Joblib model versioning & storage
│   ├── nlp/                            # NLP components
│   │   ├── __init__.py
│   │   ├── tokenizer.py                # Technical-term-aware tokenizer
│   │   ├── normalizer.py               # Unicode & punctuation normalization
│   │   ├── entity_extractor.py         # Job title, education, & experience extractor
│   │   └── section_parser.py           # Canonical resume section parser
│   ├── data/                           # Dictionaries & Mappings
│   │   ├── __init__.py
│   │   ├── skills/skills.json          # Controlled canonical skill dictionary (70+ skills)
│   │   └── mappings/skill_aliases.json # Skill aliases, abbreviations, & synonyms
│   └── utils/
│       ├── __init__.py
│       ├── text.py                     # Whitespace & Unicode helpers
│       └── validation.py               # Extension, MIME, magic-bytes, & size checks
├── models/
│   ├── tfidf/                          # Serialized TF-IDF artifacts (*.joblib)
│   └── trained/                        # Checkpoints and future embeddings
├── tests/                              # Pytest test suite (unit, integration, e2e)
│   ├── __init__.py
│   ├── test_health.py
│   ├── test_document.py
│   ├── test_preprocessing.py
│   ├── test_skills.py
│   ├── test_job.py
│   ├── test_similarity.py
│   ├── test_scoring.py
│   ├── test_screening.py
│   ├── test_evaluation.py
│   └── test_e2e.py
├── scripts/
│   ├── train_tfidf.py                  # Offline TF-IDF vectorizer training script
│   └── evaluate_model.py               # Offline benchmark evaluation script
├── .env.example
├── .gitignore
├── requirements.txt
├── README.md
└── run.py
```

---

## 4. Prerequisites & Dependencies

- **Python**: 3.11 or higher (verified on 3.11, 3.12, 3.13, 3.14)
- **Key Python Libraries**:
  - `fastapi`, `uvicorn`, `python-multipart`
  - `pydantic`, `pydantic-settings`
  - `scikit-learn`, `numpy`, `scipy`, `pandas`, `joblib`
  - `PyMuPDF` (fitz)
  - `python-docx`
  - `httpx`, `pytest`, `pytest-asyncio`

---

## 5. Installation & Setup

```powershell
# Navigate to the ML service directory
cd apps/ml_service

# Create a virtual environment
python -m venv .venv

# Activate the virtual environment
# Windows PowerShell:
.venv\Scripts\Activate.ps1
# Linux / macOS:
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

---

## 6. Environment Configuration

Copy `.env.example` to `.env`:

```powershell
cp .env.example .env
```

| Variable | Default | Purpose |
| :--- | :--- | :--- |
| `ML_SERVICE_HOST` | `0.0.0.0` | Host interface to bind |
| `ML_SERVICE_PORT` | `8000` | Port for the HTTP server |
| `ENVIRONMENT` | `development` | `development`, `staging`, or `production` |
| `LOG_LEVEL` | `INFO` | `DEBUG`, `INFO`, `WARNING`, `ERROR` |
| `MAX_FILE_SIZE_MB` | `10` | Maximum file upload size in MB |
| `MODEL_DIR` | `./models` | Directory for serialized model artifacts |
| `SKILLS_FILE` | `./app/data/skills/skills.json` | Path to skills dictionary |
| `SKILL_ALIASES_FILE` | `./app/data/mappings/skill_aliases.json` | Path to alias mappings |
| `NODE_BACKEND_URL` | `http://localhost:3000` | URL of the main Node.js backend |
| `ALLOWED_ORIGINS` | `http://localhost:3000` | Comma-separated CORS allowed origins |
| `WEIGHT_SKILL_MATCH` | `0.50` | Weight for explicit skill matching |
| `WEIGHT_EXPERIENCE_MATCH` | `0.25` | Weight for experience match |
| `WEIGHT_EDUCATION_MATCH` | `0.15` | Weight for educational qualifications |
| `WEIGHT_SEMANTIC_SIMILARITY` | `0.10` | Weight for semantic TF-IDF cosine similarity |
| `GEMINI_API_KEY` | `None` | Google Gemini API key (primary NLP engine) |
| `GEMINI_MODEL` | `gemini-1.5-flash` | Gemini model name |
| `USE_GEMINI_NLP` | `true` | When true, uses Gemini as dedicated NLP provider |

---

## 7. Running the Service

### Development Mode (with hot-reload)

```powershell
python run.py
```
*or via Uvicorn CLI:*
```powershell
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Production Mode

```powershell
uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4
```

---

## 8. API Endpoints & Documentation

Interactive API documentation is automatically exposed by FastAPI:
- **Swagger UI**: `http://localhost:8000/docs`
- **ReDoc**: `http://localhost:8000/redoc`
- **OpenAPI Schema**: `http://localhost:8000/openapi.json`

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/health` | Service health status and version metadata |
| `POST` | `/api/v1/resume/extract` | Validates file and extracts text from PDF or DOCX |
| `POST` | `/api/v1/resume/analyze` | Generates structured candidate profile from resume file |
| `GET` | `/api/v1/skills` | Lists all supported canonical skills |
| `POST` | `/api/v1/skills/extract` | Extracts and resolves skills from raw text |
| `POST` | `/api/v1/job/analyze` | Normalizes job requirements using symmetric NLP pipeline |
| `POST` | `/api/v1/screening/evaluate` | Evaluates a single candidate with explainable scoring |
| `POST` | `/api/v1/screening/rank` | Scores and deterministically ranks multiple candidates |

---

## 9. Detailed API Request & Response Examples

### 9.1 Health Check
`GET /health`
```json
{
  "status": "ok",
  "service": "smarthire-ml-service",
  "version": "1.0.0"
}
```

### 9.2 Extract Resume Text
`POST /api/v1/resume/extract` (multipart/form-data with file)
```json
{
  "success": true,
  "document_type": "pdf",
  "text": "Jane Doe\nSenior Backend Developer with 5 years experience in Python and PostgreSQL.",
  "page_count": 1
}
```

### 9.3 Analyze Resume Document
`POST /api/v1/resume/analyze` (multipart/form-data with file)
```json
{
  "candidate_profile": {
    "skills": ["Django", "Docker", "FastAPI", "PostgreSQL", "Python", "REST API"],
    "education": ["Bachelor of Science in Computer Science"],
    "experience": ["Senior Backend Developer at CloudCorp (5 years of experience)"],
    "job_titles": ["Backend Developer", "Software Engineer"],
    "sections": {
      "summary": "Senior Backend Developer with 5 years experience in cloud systems.",
      "skills": "Python, Django, FastAPI, PostgreSQL, REST API, Docker",
      "experience": "Senior Backend Developer at CloudCorp (5 years of experience)...",
      "education": "Bachelor of Science in Computer Science...",
      "projects": null,
      "certifications": null,
      "languages": null
    },
    "raw_text": "...",
    "processed_text": "..."
  }
}
```

### 9.4 Analyze Job Requirements
`POST /api/v1/job/analyze`
```json
// Request
{
  "job_title": "Senior Backend Engineer",
  "description": "Looking for a Python engineer with PostgreSQL and Docker knowledge.",
  "required_skills": ["Python", "postgres db", "REST API", "Docker"],
  "education": ["Bachelor in Computer Science"],
  "minimum_experience_years": 3.0
}

// Response
{
  "job_profile": {
    "job_title": "Senior Backend Engineer",
    "skills": ["Docker", "PostgreSQL", "Python", "REST API"],
    "education": ["Bachelor in Computer Science"],
    "experience_requirements": {
      "minimum_years": 3.0
    },
    "processed_text": "senior backend engineer looking for a python engineer with postgresql and docker knowledge docker postgresql python rest api"
  }
}
```

### 9.5 Evaluate Candidate Fit
`POST /api/v1/screening/evaluate`
```json
// Request
{
  "job": {
    "title": "Backend Engineer",
    "description": "APIs with Python and PostgreSQL.",
    "required_skills": ["Python", "PostgreSQL", "REST API", "Docker"],
    "minimum_experience_years": 3.0,
    "education_requirements": ["Bachelor in Computer Science"]
  },
  "candidate": {
    "id": "cand-001",
    "resume_text": "Senior Backend Engineer with 5 years experience in Python, PostgreSQL, REST API, Docker.",
    "skills": ["Python", "PostgreSQL", "REST API", "Docker"],
    "experience": ["5 years of experience"],
    "education": ["B.S. in Computer Science"]
  }
}

// Response
{
  "candidate_id": "cand-001",
  "match_score": 94.69,
  "recommendation": "strong_match",
  "components": {
    "skill_match": 100.0,
    "experience_match": 100.0,
    "education_match": 100.0,
    "semantic_similarity": 46.9
  },
  "matching_skills": ["Docker", "PostgreSQL", "Python", "REST API"],
  "missing_skills": [],
  "explanation": {
    "overall_score": 94.69,
    "components": {
      "skill_match": 100.0,
      "experience_match": 100.0,
      "education_match": 100.0,
      "semantic_similarity": 46.9
    },
    "matching_skills": ["Docker", "PostgreSQL", "Python", "REST API"],
    "missing_skills": [],
    "experience": {
      "required": 3.0,
      "candidate": 5.0,
      "meets_requirement": true,
      "score": 100.0
    },
    "education": {
      "score": 100.0,
      "matched": true,
      "details": "Candidate meets or exceeds the required educational degree level."
    },
    "summary_text": "Overall score: 94.7/100 (Strong Match). Matched 4/4 required skills (100.0%). Candidate has 5.0 years experience, which meets the 3.0 years requirement. Semantic similarity score: 46.9/100. Education: Candidate meets or exceeds the required educational degree level."
  }
}
```

---

## 10. Machine Learning & Preprocessing Methodology

### Technical Term Preservation
Standard NLP tokenizers destroy programming languages and technical terms containing non-alphanumeric punctuation (e.g. `C++`, `C#`, `.NET`, `Node.js`, `Next.js`, `scikit-learn`, `CI/CD`).

The SmartHire `TextNormalizer` and `TechnicalTokenizer` employ a protected placeholder substitution pipeline:
- `C++` $\rightarrow$ protected token $\rightarrow$ `c++`
- `C#` $\rightarrow$ protected token $\rightarrow$ `c#`
- `Node.js` $\rightarrow$ protected token $\rightarrow$ `node.js`
- `Next.js` $\rightarrow$ protected token $\rightarrow$ `next.js`
- `scikit-learn` $\rightarrow$ protected token $\rightarrow$ `scikit-learn`
- Single-letter languages (`C`, `R`) are protected from standard stop-word removal.

### TF-IDF Vectorizer
Configured with unigrams and bigrams:
```python
TfidfVectorizer(
    stop_words="english",
    ngram_range=(1, 2),
    sublinear_tf=True
)
```
Captures composite phrases (`machine learning`, `software engineer`, `backend developer`) alongside individual words. The model is saved and versioned via `joblib` in `models/tfidf/`.

---

## 11. Candidate Scoring & Ranking Formula

### Multi-Criteria Formula
All component dimensions are normalized to $[0, 100]$:

$$\text{Final Score} = w_{\text{skill}} \cdot S + w_{\text{exp}} \cdot E + w_{\text{edu}} \cdot A + w_{\text{sem}} \cdot T$$

Default weights:
- $S$: **50% Skill Match** — $\frac{|\text{Matched}|}{|\text{Required}|} \times 100$
- $E$: **25% Experience Match** — 100% if $\text{candidate} \ge \text{required}$; $\frac{\text{candidate}}{\text{required}} \times 100$ otherwise
- $A$: **15% Education Match** — Tier comparison (Ph.D. > Master's > Bachelor's > Associate)
- $T$: **10% Semantic Similarity** — Cosine similarity of TF-IDF vectors normalized to $0 - 100$

### Recommendation Categories
- **`strong_match`**: Score $\ge 85.0$
- **`good_match`**: $70.0 \le \text{Score} < 85.0$
- **`moderate_match`**: $50.0 \le \text{Score} < 70.0$
- **`low_match`**: $\text{Score} < 50.0$

### Deterministic Ranking
Candidates in batch screening are ordered deterministically:
1. `score` descending
2. `skill_score` descending (tie-breaker)
3. `candidate_id` ascending (stable tie-breaker)

---

## 12. Testing & Quality Assurance

The test suite covers unit tests, pipeline integrations, and end-to-end user journeys:

```powershell
# Run full pytest suite
pytest -v
```

Test breakdown (89 tests):
- `tests/test_health.py`: Health status, OpenAPI, Swagger, ReDoc.
- `tests/test_document.py`: PDF & DOCX extraction, size limits, binary headers.
- `tests/test_preprocessing.py`: Technical term preservation, Unicode, stop words.
- `tests/test_skills.py`: Controlled dictionary, alias mapping, false positive elimination.
- `tests/test_job.py`: Job parsing, description skill extraction, normalization.
- `tests/test_similarity.py`: TF-IDF unigrams/bigrams, vectorizer reusability, cosine similarity.
- `tests/test_scoring.py`: Skill, experience, education, and composite formula.
- `tests/test_screening.py`: Single candidate evaluation, ranking tie-breakers, explanations.
- `tests/test_evaluation.py`: Precision, Recall, F1, P@K, R@K, Spearman, Kendall.
- `tests/test_e2e.py`: End-to-end recruitment lifecycle from PDF upload to batch ranking.

---

## 13. Model Evaluation & Benchmarking

Run the evaluation script against benchmark datasets:

```powershell
# Evaluate on built-in multi-domain benchmark
python scripts/evaluate_model.py

# Evaluate on custom labeled dataset with custom K
python scripts/evaluate_model.py --data path/to/dataset.json --k 3 --output results/report.json
```

Evaluated metrics:
- **Precision, Recall, F1-Score, Accuracy**
- **Precision@K & Recall@K** (ranking quality)
- **Spearman Rank Correlation ($\rho$) & Kendall's Tau ($\tau$)**
- **Cosine Similarity distribution**

---

## 14. Production Hardening & Deployment

### 1. Docker Deployment
```dockerfile
FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Run pre-training of TF-IDF artifact
RUN python scripts/train_tfidf.py

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "4"]
```

### 2. Startup Model Warm-Up
`app/main.py` uses the FastAPI `lifespan` hook to pre-load the TF-IDF vectorizer and compile skill regexes on process startup, eliminating cold-start latency on user requests.

---

## 15. Security & Privacy Considerations

- **Strict File Type Verification**: Files are validated against extensions (`.pdf`, `.docx`) and binary signatures (`%PDF-` and `PK\x03\x04`). Executables and scripts are rejected with HTTP 422.
- **Upload Size Protection**: Uploads are restricted to 10MB (`MAX_FILE_SIZE_MB`).
- **PII-Safe Logging**: Resumes, candidate names, contact details, and credentials are never logged.
- **Controlled CORS**: Restricted to the Node.js backend and authorized frontend hosts.
- **Safe Error Responses**: Python stack traces are intercepted and replaced with structured error payloads.

---

## 16. Future Improvements & Semantic Models

The service includes `BaseSimilarityEngine` and `SentenceTransformerSimilarityEngine` abstractions. Upgrading to dense embeddings (such as `all-MiniLM-L6-v2`) requires zero changes to `ScoringService`, `RankingService`, `ExplanationService`, or API contracts.
