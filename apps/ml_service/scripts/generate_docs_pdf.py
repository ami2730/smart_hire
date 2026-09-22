"""
Generate a professional PDF document detailing the SmartHire ML Service process description.
Uses ReportLab with custom canvas for dynamic page numbers (Page X of Y), running headers,
professional palettes, structured tables, and complete run instructions.
"""

from __future__ import annotations

import os
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.pdfgen import canvas
from reportlab.platypus import (
    HRFlowable,
    PageBreak,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)


class NumberedCanvas(canvas.Canvas):
    """Two-pass canvas to compute total page count and add running headers/footers."""

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_header_footer(num_pages)
            super().showPage()
        super().save()

    def draw_header_footer(self, page_count: int):
        self.saveState()
        self.setFont("Helvetica", 8)
        self.setFillColor(colors.HexColor("#64748B"))  # Slate 500

        # Don't draw header/footer on cover page if page == 1
        if self._pageNumber > 1:
            # Header
            self.drawString(54, 750, "SmartHire ML Service — System & Process Description")
            self.drawRightString(612 - 54, 750, "Architecture, Operations & Run Guide")
            self.setStrokeColor(colors.HexColor("#CBD5E1"))
            self.setLineWidth(0.5)
            self.line(54, 744, 612 - 54, 744)

            # Footer
            self.line(54, 48, 612 - 54, 48)
            self.drawString(54, 36, "SmartHire ML Service — Dedicated Gemini NLP Architecture")
            self.drawRightString(612 - 54, 36, f"Page {self._pageNumber} of {page_count}")

        self.restoreState()


def create_pdf(output_path: str):
    doc = SimpleDocTemplate(
        output_path,
        pagesize=letter,
        leftMargin=54,
        rightMargin=54,
        topMargin=54,
        bottomMargin=54,
    )

    styles = getSampleStyleSheet()

    # Custom color palette
    primary_color = colors.HexColor("#0F172A")    # Slate 900
    accent_color = colors.HexColor("#0284C7")     # Sky 600
    text_color = colors.HexColor("#334155")       # Slate 700
    code_bg = colors.HexColor("#F8FAFC")          # Slate 50
    callout_bg = colors.HexColor("#F0F9FF")       # Sky 50
    callout_border = colors.HexColor("#0EA5E9")   # Sky 500

    title_style = ParagraphStyle(
        "CoverTitle",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=24,
        leading=29,
        textColor=primary_color,
        spaceAfter=8,
    )

    subtitle_style = ParagraphStyle(
        "CoverSubtitle",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=11.5,
        leading=15,
        textColor=colors.HexColor("#475569"),
        spaceAfter=14,
    )

    h1_style = ParagraphStyle(
        "Heading1_Custom",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=13,
        leading=17,
        textColor=primary_color,
        spaceBefore=10,
        spaceAfter=5,
        keepWithNext=True,
    )

    h2_style = ParagraphStyle(
        "Heading2_Custom",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=10,
        leading=13,
        textColor=accent_color,
        spaceBefore=8,
        spaceAfter=4,
        keepWithNext=True,
    )

    body_style = ParagraphStyle(
        "Body_Custom",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=8.5,
        leading=12,
        textColor=text_color,
        spaceAfter=5,
    )

    code_style = ParagraphStyle(
        "Code_Custom",
        parent=styles["Normal"],
        fontName="Courier",
        fontSize=7.5,
        leading=10,
        textColor=colors.HexColor("#0F172A"),
    )

    callout_style = ParagraphStyle(
        "Callout_Custom",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=8,
        leading=11.5,
        textColor=colors.HexColor("#0369A1"),
    )

    story = []

    # =============================================================
    # PAGE 1: COVER, SYSTEM OVERVIEW & PIPELINE
    # =============================================================
    story.append(Spacer(1, 8))
    story.append(Paragraph("SmartHire ML Service", title_style))
    story.append(Paragraph("Process Description, Modular Architecture, Run Guide & API Specification", subtitle_style))

    meta_table_data = [
        [
            Paragraph("<b>Version:</b> 1.1.0", body_style),
            Paragraph("<b>Runtime:</b> Python 3.11+ / FastAPI", body_style),
            Paragraph("<b>NLP Engine:</b> Google Gemini (Dedicated)", body_style),
        ],
        [
            Paragraph("<b>Boundary:</b> Microservice (REST)", body_style),
            Paragraph("<b>ML & Scoring:</b> scikit-learn, TF-IDF", body_style),
            Paragraph("<b>Verification:</b> 113 Tests (100% Pass)", body_style),
        ],
    ]
    meta_table = Table(meta_table_data, colWidths=[168, 168, 168])
    meta_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor("#F1F5F9")),
        ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor("#CBD5E1")),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#E2E8F0")),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('LEFTPADDING', (0, 0), (-1, -1), 7),
        ('RIGHTPADDING', (0, 0), (-1, -1), 7),
    ]))
    story.append(meta_table)
    story.append(Spacer(1, 10))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#CBD5E1"), spaceAfter=8))

    story.append(Paragraph("1. System Architectural Overview", h1_style))
    story.append(Paragraph(
        "SmartHire ML Service is a dedicated, stateless Python microservice designed for AI-assisted candidate screening, "
        "resume parsing, multi-criteria scoring, and deterministic ranking. "
        "<b>All Natural Language Processing (NLP)</b> tasks—including text normalization, tokenization, canonical section parsing, "
        "and profile entity extraction (job titles, education, work experience)—are delegated exclusively to <b>Google Gemini</b>. "
        "Legacy regex heuristics and dependencies like spaCy have been completely eliminated.",
        body_style
    ))

    arch_box = [
        [Paragraph(
            "<b>Core Design Principles:</b><br/>"
            "• <b>Dedicated Gemini NLP:</b> Natural language processing tasks rely exclusively on Google Gemini.<br/>"
            "• <b>AI-Assisted, Not Autonomous:</b> Provides scoring insights and transparent explanations to recruiters; never autonomously rejects candidates.<br/>"
            "• <b>Fairness & Privacy:</b> Protected characteristics (gender, race, age, religion) are never extracted or evaluated.<br/>"
            "• <b>Zero Database Coupling:</b> The service owns no direct PostgreSQL connection; all data is exchanged via REST.<br/>"
            "• <b>Zero Stack Trace Leakage:</b> Domain exceptions are mapped to unified, sanitized JSON error models.",
            callout_style
        )]
    ]
    t_arch = Table(arch_box, colWidths=[504])
    t_arch.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), callout_bg),
        ('BOX', (0, 0), (-1, -1), 1, callout_border),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('LEFTPADDING', (0, 0), (-1, -1), 7),
        ('RIGHTPADDING', (0, 0), (-1, -1), 7),
    ]))
    story.append(t_arch)
    story.append(Spacer(1, 8))

    story.append(Paragraph("2. End-to-End Processing Pipeline", h1_style))
    story.append(Paragraph(
        "Candidate resumes and job requirements flow sequentially through 6 core phases:",
        body_style
    ))

    steps_data = [
        ["Phase", "Module / Service", "Description & Algorithmic Process"],
        [
            "1. Ingestion & Validation",
            "app.services.document_service",
            "Accepts PDF/DOCX files (<=10MB). Inspects binary magic bytes (%PDF or PK ZIP) to prevent spoofing. Extracts raw text via PyMuPDF (fitz) or python-docx."
        ],
        [
            "2. Gemini NLP Engine",
            "app.nlp.normalizer\napp.nlp.tokenizer\napp.nlp.section_parser\napp.nlp.entity_extractor",
            "Delegates normalization, tokenization, section parsing (Summary, Experience, Education, Skills), and entity extraction (job titles, degrees, milestones) exclusively to Google Gemini."
        ],
        [
            "3. Gemini Skill & Alias Engine",
            "app.services.skill_service\napp.services.gemini_service",
            "Extracts technical skills and standardizes aliases (e.g. 'nodejs' -> 'Node.js', 'k8s' -> 'Kubernetes', 'py' -> 'Python') exclusively using Google Gemini."
        ],
        [
            "4. Feature Vectorization",
            "app.ml.tfidf\napp.services.vectorization_service",
            "Converts preprocessed text into numerical vectors using sublinear TF-IDF (unigrams + bigrams) cached in memory."
        ],
        [
            "5. Multi-Criteria Scoring",
            "app.ml.scoring\napp.services.scoring_service",
            "Computes four weighted component scores: Skill Match (50%), Experience Match (25%), Education Match (15%), and Semantic Cosine Similarity (10%)."
        ],
        [
            "6. Ranking & Explanation",
            "app.ml.ranking\napp.services.explanation_service",
            "Applies deterministic tie-breaking to batch-ordered candidates. Produces human-interpretable score summaries and Gemini narrative explanations."
        ],
    ]
    t_steps = Table(steps_data, colWidths=[85, 135, 284])
    t_steps.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#0F172A")),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 7.5),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#CBD5E1")),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor("#F8FAFC")]),
        ('TOPPADDING', (0, 0), (-1, -1), 3),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
        ('LEFTPADDING', (0, 0), (-1, -1), 5),
        ('RIGHTPADDING', (0, 0), (-1, -1), 5),
    ]))
    story.append(t_steps)

    story.append(PageBreak())

    # =============================================================
    # PAGE 2: SCORING FORMULATION & RECOMMENDATION LOGIC
    # =============================================================
    story.append(Paragraph("3. Scoring Mathematical Formulation & Thresholds", h1_style))
    story.append(Paragraph(
        "Candidate evaluation uses a transparent, explainable formula rather than an opaque black box. "
        "The composite score (0 to 100) is calculated as:",
        body_style
    ))

    formula_text = [
        [Paragraph(
            "<b>Overall Score Formula:</b><br/>"
            "Score = (0.50 × Skill_Score) + (0.25 × Experience_Score) + (0.15 × Education_Score) + (0.10 × Semantic_Similarity)<br/><br/>"
            "• <b>Skill Score:</b> |Candidate_Skills ∩ Job_Skills| / |Job_Skills| × 100<br/>"
            "• <b>Experience Score:</b> min(1.0, Candidate_Years / Required_Years) × 100<br/>"
            "• <b>Education Score:</b> Compatibility level matching (Exact: 100%, Exceeds: 100%, Related/Lower: 70%, None: 40%)<br/>"
            "• <b>Semantic Similarity:</b> Cosine similarity of TF-IDF vectors (Resume vs Job Description) × 100",
            callout_style
        )]
    ]
    t_formula = Table(formula_text, colWidths=[504])
    t_formula.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor("#F8FAFC")),
        ('BOX', (0, 0), (-1, -1), 1, colors.HexColor("#94A3B8")),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('RIGHTPADDING', (0, 0), (-1, -1), 8),
    ]))
    story.append(t_formula)
    story.append(Spacer(1, 8))

    rec_data = [
        ["Score Range", "Recommendation Tier", "Recruiter Advisory Meaning"],
        ["80.0 – 100.0", "strong_match", "Candidate meets or exceeds all core skills and experience prerequisites."],
        ["65.0 – 79.9", "good_match", "Candidate satisfies primary criteria with minor qualification gaps."],
        ["50.0 – 64.9", "moderate_match", "Candidate possesses foundational skills but lacks depth or specific stack tools."],
        ["0.0 – 49.9", "low_match", "Significant divergence between candidate background and job requirements."],
    ]
    t_rec = Table(rec_data, colWidths=[85, 115, 304])
    t_rec.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#334155")),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 7.5),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#CBD5E1")),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor("#F8FAFC")]),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('LEFTPADDING', (0, 0), (-1, -1), 5),
        ('RIGHTPADDING', (0, 0), (-1, -1), 5),
    ]))
    story.append(t_rec)
    story.append(Spacer(1, 10))

    score_notes = [
        [Paragraph(
            "<b>Scoring Component Explanations:</b><br/>"
            "• <b>Skill Match (50%):</b> Direct evaluation of canonical required technologies against candidate proficiencies.<br/>"
            "• <b>Experience Match (25%):</b> Linear scaling up to the required threshold; candidates with surplus experience achieve full points.<br/>"
            "• <b>Education Match (15%):</b> Graded tier matching recognizing equivalent computer science degrees.<br/>"
            "• <b>Semantic Similarity (10%):</b> Unsupervised TF-IDF cosine comparison capturing overall contextual overlap.",
            callout_style
        )]
    ]
    t_score_notes = Table(score_notes, colWidths=[504])
    t_score_notes.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), callout_bg),
        ('BOX', (0, 0), (-1, -1), 1, callout_border),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ('LEFTPADDING', (0, 0), (-1, -1), 7),
        ('RIGHTPADDING', (0, 0), (-1, -1), 7),
    ]))
    story.append(t_score_notes)

    story.append(PageBreak())

    # =============================================================
    # PAGE 3: REST API SPECIFICATIONS (PART 1: Routes 1 to 4)
    # =============================================================
    story.append(Paragraph("4. REST API Route Specifications (Part 1)", h1_style))
    story.append(Paragraph(
        "All endpoints are prefixed under <code>/api/v1</code> (except <code>/health</code>) and produce standardized JSON responses.",
        body_style
    ))

    routes_part1 = [
        {
            "ep": "GET /health",
            "desc": "Public liveness and readiness probe.",
            "req": "No body required.",
            "resp": '{"status": "healthy", "service": "smart-hire-ml-service", "version": "1.1.0", "uptime_seconds": 120.4}',
        },
        {
            "ep": "POST /api/v1/resume/extract",
            "desc": "Uploads PDF/DOCX resume file (max 10MB) and returns extracted plain text.",
            "req": "multipart/form-data with `file` binary.",
            "resp": '{"success": true, "document_type": "pdf", "text": "Jane Doe\\nSoftware Engineer...", "page_count": 2}',
        },
        {
            "ep": "POST /api/v1/resume/analyze",
            "desc": "Executes full extraction pipeline via Gemini and returns structured candidate profile.",
            "req": "multipart/form-data with `file` binary.",
            "resp": '{"candidate_profile": {"skills": ["Python", "Docker"], "experience": ["Senior Engineer at Tech"], "education": ["B.Sc."]}}',
        },
        {
            "ep": "GET /api/v1/skills",
            "desc": "Retrieves list of all canonical technical skills supported in controlled dictionary.",
            "req": "No parameters.",
            "resp": '{"count": 69, "skills": ["Python", "React", "TypeScript", "Docker", "FastAPI", "Kubernetes", ...]}',
        },
    ]

    for r in routes_part1:
        r_table = [
            [Paragraph(f"<b>Endpoint:</b> <code>{r['ep']}</code>", h2_style)],
            [Paragraph(f"<b>Description:</b> {r['desc']}", body_style)],
            [Paragraph(f"<b>Request:</b> <code>{r['req']}</code>", body_style)],
            [Paragraph(f"<b>Response Sample:</b><br/><code>{r['resp']}</code>", code_style)],
        ]
        t_r = Table(r_table, colWidths=[504])
        t_r.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor("#F8FAFC")),
            ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor("#CBD5E1")),
            ('TOPPADDING', (0, 0), (-1, -1), 3),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
            ('LEFTPADDING', (0, 0), (-1, -1), 6),
            ('RIGHTPADDING', (0, 0), (-1, -1), 6),
        ]))
        story.append(t_r)
        story.append(Spacer(1, 5))

    story.append(PageBreak())

    # =============================================================
    # PAGE 4: REST API SPECIFICATIONS (PART 2: Routes 5 to 8)
    # =============================================================
    story.append(Paragraph("4. REST API Route Specifications (Part 2)", h1_style))
    story.append(Paragraph(
        "Core matching, screening evaluation, and candidate batch ranking routes:",
        body_style
    ))

    routes_part2 = [
        {
            "ep": "POST /api/v1/skills/extract",
            "desc": "Extracts skills from unstructured raw text and normalizes aliases using Gemini.",
            "req": '{"text": "Experienced in ReactJS, Node.js, and Amazon AWS"}',
            "resp": '{"skills": ["React", "Node.js", "AWS"]}',
        },
        {
            "ep": "POST /api/v1/skills/resolve-aliases",
            "desc": "Resolves raw skill aliases (e.g. nodejs, k8s, py) into canonical names using Gemini.",
            "req": '{"skills": ["nodejs", "k8s", "py"]}',
            "resp": '{"canonical_skills": ["Node.js", "Kubernetes", "Python"]}',
        },
        {
            "ep": "POST /api/v1/job/analyze",
            "desc": "Normalizes job posting requirements into structured JobProfile for matching.",
            "req": '{"job_title": "Backend Dev", "description": "...", "required_skills": ["python", "fastapi"]}',
            "resp": '{"job_profile": {"job_title": "Backend Dev", "skills": ["Python", "FastAPI"], "processed_text": "..."}}',
        },
        {
            "ep": "POST /api/v1/screening/evaluate",
            "desc": "Scores a single candidate against job criteria with full transparent explanation.",
            "req": '{"job": {"title": "...", "required_skills": [...]}, "candidate": {"id": "c1", "skills": [...]}}',
            "resp": '{"match_score": 88.5, "recommendation": "strong_match", "matching_skills": ["Python"], "missing_skills": []}',
        },
        {
            "ep": "POST /api/v1/screening/rank",
            "desc": "Evaluates and deterministically ranks a batch of candidates for a job posting.",
            "req": '{"job_id": "j1", "job": {...}, "candidates": [{...}, {...}]}',
            "resp": '{"job_id": "j1", "total_candidates": 2, "ranked_candidates": [{"rank": 1, "match_score": 91.2, ...}]}',
        },
    ]

    for r in routes_part2:
        r_table = [
            [Paragraph(f"<b>Endpoint:</b> <code>{r['ep']}</code>", h2_style)],
            [Paragraph(f"<b>Description:</b> {r['desc']}", body_style)],
            [Paragraph(f"<b>Request:</b> <code>{r['req']}</code>", body_style)],
            [Paragraph(f"<b>Response Sample:</b><br/><code>{r['resp']}</code>", code_style)],
        ]
        t_r = Table(r_table, colWidths=[504])
        t_r.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor("#F8FAFC")),
            ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor("#CBD5E1")),
            ('TOPPADDING', (0, 0), (-1, -1), 2),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 2),
            ('LEFTPADDING', (0, 0), (-1, -1), 5),
            ('RIGHTPADDING', (0, 0), (-1, -1), 5),
        ]))
        story.append(t_r)
        story.append(Spacer(1, 3))

    story.append(PageBreak())

    # =============================================================
    # PAGE 5: MODULE DIRECTORY & FILE ARCHITECTURE
    # =============================================================
    story.append(Paragraph("5. Module Architecture & Source File Reference", h1_style))
    story.append(Paragraph(
        "Every file in the ML service has a dedicated single responsibility with Google Gemini handling NLP:",
        body_style
    ))

    mod_data = [
        ["Directory / Package", "File Name", "Role & Functional Responsibility"],
        ["app.core", "config.py", "Pydantic BaseSettings loading .env (ports, CORS, Gemini API key, weights)."],
        ["app.core", "logging.py", "Configures structured logging and masks PII (emails/phones)."],
        ["app.core", "exceptions.py", "Domain error hierarchy mapped to proper HTTP status codes."],
        ["app.nlp", "normalizer.py", "Delegates text normalization exclusively to Google Gemini (zero local regex)."],
        ["app.nlp", "tokenizer.py", "Delegates technical tokenization exclusively to Google Gemini."],
        ["app.nlp", "section_parser.py", "Segments resume sections (Summary, Skills, Exp, Edu) via Google Gemini."],
        ["app.nlp", "entity_extractor.py", "Extracts job titles, degrees, and experience items via Google Gemini."],
        ["app.ml", "tfidf.py", "TfidfModel (unigrams + bigrams) for sparse document representation."],
        ["app.ml", "similarity.py", "BaseSimilarityEngine abstract class & CosineSimilarityEngine."],
        ["app.ml", "scoring.py", "Sub-score formulas for skills, experience, education, and composite score."],
        ["app.ml", "ranking.py", "Deterministic ranking algorithm with stable tie-breaking logic."],
        ["app.ml", "model_manager.py", "Loads and persists serialized models with joblib."],
        ["app.services", "document_service.py", "PyMuPDF (PDF) and python-docx (DOCX) byte-level extraction."],
        ["app.services", "skill_service.py", "Extracts technical skills and resolves aliases exclusively using Google Gemini."],
        ["app.services", "preprocessing_service.py", "Coordinates Gemini-powered text normalization and tokenization."],
        ["app.services", "candidate_service.py", "Orchestrates resume bytes -> Gemini extraction -> CandidateProfile."],
        ["app.services", "job_service.py", "Normalizes job posting requirements -> Gemini extraction -> JobProfile."],
        ["app.services", "vectorization_service.py", "Maintains active TF-IDF model and caches feature matrices."],
        ["app.services", "similarity_service.py", "Computes cosine & semantic similarity between texts."],
        ["app.services", "scoring_service.py", "Coordinates multi-criteria scoring with configurable weights."],
        ["app.services", "ranking_service.py", "Batch candidate ranking with fault-isolated execution."],
        ["app.services", "explanation_service.py", "Generates human-readable feedback and Gemini narrative explanations."],
        ["app.services", "gemini_service.py", "Dedicated Google Gemini HTTP client for all NLP tasks and LLM generation."],
        ["app.data", "skills/skills.json", "Canonical dictionary of technical skills and categories."],
        ["app.data", "mappings/skill_aliases.json", "Mappings from acronyms/variations to canonical skills."],
    ]

    t_mod = Table(mod_data, colWidths=[70, 110, 324])
    t_mod.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#0F172A")),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 7),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#CBD5E1")),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor("#F8FAFC")]),
        ('TOPPADDING', (0, 0), (-1, -1), 2.5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 2.5),
        ('LEFTPADDING', (0, 0), (-1, -1), 4),
        ('RIGHTPADDING', (0, 0), (-1, -1), 4),
    ]))
    story.append(t_mod)

    story.append(PageBreak())

    # =============================================================
    # PAGE 6: INSTRUCTIONS FOR RUNNING (SETUP & CONFIGURATION)
    # =============================================================
    story.append(Paragraph("6. Instructions for Running the Service (Setup & Config)", h1_style))
    story.append(Paragraph(
        "Follow these complete instructions to install dependencies, configure environment variables, and prepare the microservice.",
        body_style
    ))

    # 6.1 Prerequisites
    story.append(Paragraph("6.1 Prerequisites & System Requirements", h2_style))
    prereq_box = [
        [Paragraph(
            "• <b>Python Version:</b> Python 3.11, 3.12, 3.13, or 3.14 (64-bit).<br/>"
            "• <b>Google Gemini API Key:</b> Obtain a free API key from Google AI Studio (https://aistudio.google.com).<br/>"
            "• <b>Operating System:</b> Windows 10/11, Ubuntu/Debian Linux, or macOS.",
            callout_style
        )]
    ]
    t_prereq = Table(prereq_box, colWidths=[504])
    t_prereq.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), callout_bg),
        ('BOX', (0, 0), (-1, -1), 1, callout_border),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
    ]))
    story.append(t_prereq)
    story.append(Spacer(1, 6))

    # 6.2 Installation Steps
    story.append(Paragraph("6.2 Virtual Environment Setup & Dependency Installation", h2_style))
    story.append(Paragraph(
        "Open a terminal in the project repository and initialize the dedicated virtual environment:",
        body_style
    ))

    setup_steps = [
        ["Step", "PowerShell (Windows)", "Bash (Linux / macOS)"],
        [
            "1. Navigate",
            "cd apps\\ml_service",
            "cd apps/ml_service"
        ],
        [
            "2. Create venv",
            "python -m venv .venv",
            "python3 -m venv .venv"
        ],
        [
            "3. Activate venv",
            ".\\.venv\\Scripts\\Activate.ps1",
            "source .venv/bin/activate"
        ],
        [
            "4. Upgrade pip",
            "python -m pip install --upgrade pip",
            "python -m pip install --upgrade pip"
        ],
        [
            "5. Install deps",
            "pip install -r requirements.txt",
            "pip install -r requirements.txt"
        ],
    ]
    t_setup = Table(setup_steps, colWidths=[65, 219, 220])
    t_setup.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#0F172A")),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 7.5),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#CBD5E1")),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor("#F8FAFC")]),
        ('TOPPADDING', (0, 0), (-1, -1), 3),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
        ('LEFTPADDING', (0, 0), (-1, -1), 5),
        ('RIGHTPADDING', (0, 0), (-1, -1), 5),
    ]))
    story.append(t_setup)
    story.append(Spacer(1, 6))

    # 6.3 Environment Configuration
    story.append(Paragraph("6.3 Environment Configuration (.env)", h2_style))
    story.append(Paragraph(
        "Copy <code>.env.example</code> to <code>.env</code> in <code>apps/ml_service/</code> and configure your Gemini API key:",
        body_style
    ))

    env_content = (
        "# SmartHire ML Service — Environment Configuration\n"
        "ML_SERVICE_HOST=0.0.0.0\n"
        "ML_SERVICE_PORT=8000\n"
        "ENVIRONMENT=development\n"
        "LOG_LEVEL=INFO\n"
        "MAX_FILE_SIZE_MB=10\n"
        "MODEL_DIR=./models\n"
        "SKILLS_FILE=./app/data/skills/skills.json\n"
        "SKILL_ALIASES_FILE=./app/data/mappings/skill_aliases.json\n"
        "NODE_BACKEND_URL=http://localhost:3000\n"
        "# Dedicated Google Gemini NLP Engine\n"
        "GEMINI_API_KEY=AIzaSyYourActualKeyHere...\n"
        "GEMINI_MODEL=gemini-1.5-flash\n"
        "USE_GEMINI_NLP=true"
    )
    t_env = Table([[Paragraph(f"<code>{env_content.replace(chr(10), '<br/>')}</code>", code_style)]], colWidths=[504])
    t_env.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), code_bg),
        ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor("#CBD5E1")),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
    ]))
    story.append(t_env)

    story.append(PageBreak())

    # =============================================================
    # PAGE 7: INSTRUCTIONS FOR RUNNING (EXECUTION & TESTING)
    # =============================================================
    story.append(Paragraph("6. Instructions for Running the Service (Execution & Verification)", h1_style))
    story.append(Paragraph(
        "Use these operational commands to start the microservice, verify live endpoints, and run tests.",
        body_style
    ))

    # 6.4 Execution Commands
    story.append(Paragraph("6.4 Starting the Server", h2_style))
    cmd_data = [
        ["Execution Mode", "Command", "Description"],
        [
            "Development (Hot Reload)",
            "python run.py",
            "Starts Uvicorn server with hot-reload watching code changes at http://0.0.0.0:8000."
        ],
        [
            "Direct (Without Activate)",
            ".\\.venv\\Scripts\\python.exe run.py",
            "Executes the server directly using virtual environment python executable on Windows."
        ],
        [
            "Direct (Linux / macOS)",
            "./.venv/bin/python run.py",
            "Executes the server directly using virtual environment python binary on Unix."
        ],
        [
            "Production Mode",
            "uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4",
            "Launches multiple worker processes for high-concurrency production deployments."
        ],
        [
            "Execute Test Suite",
            ".\\.venv\\Scripts\\python.exe -m pytest -v",
            "Runs all 113 automated unit, integration, and e2e tests (100% pass rate)."
        ],
    ]
    t_cmd = Table(cmd_data, colWidths=[110, 180, 214])
    t_cmd.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#334155")),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 7.5),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#CBD5E1")),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor("#F8FAFC")]),
        ('TOPPADDING', (0, 0), (-1, -1), 3),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
        ('LEFTPADDING', (0, 0), (-1, -1), 5),
        ('RIGHTPADDING', (0, 0), (-1, -1), 5),
    ]))
    story.append(t_cmd)
    story.append(Spacer(1, 8))

    # 6.5 Interactive Testing & Verification
    story.append(Paragraph("6.5 Live Testing & Verification Commands", h2_style))
    story.append(Paragraph(
        "Once the server is running, verify health and test endpoints using your browser or terminal:",
        body_style
    ))

    verify_box = [
        [Paragraph(
            "• <b>Health Check URL:</b> Open <code>http://localhost:8000/health</code> in your browser.<br/>"
            "• <b>Interactive Swagger UI:</b> Open <code>http://localhost:8000/docs</code> to test all endpoints live.<br/>"
            "• <b>ReDoc API Reference:</b> Open <code>http://localhost:8000/redoc</code> for OpenAPI documentation.<br/><br/>"
            "<b>PowerShell Verification Commands:</b><br/>"
            "1. <i>Check Health:</i><br/>"
            "&nbsp;&nbsp;&nbsp;&nbsp;<code>Invoke-RestMethod -Uri http://localhost:8000/health</code><br/>"
            "2. <i>List Supported Skills:</i><br/>"
            "&nbsp;&nbsp;&nbsp;&nbsp;<code>Invoke-RestMethod -Uri http://localhost:8000/api/v1/skills</code><br/>"
            "3. <i>Extract Skills via Gemini:</i><br/>"
            "&nbsp;&nbsp;&nbsp;&nbsp;<code>Invoke-RestMethod -Uri http://localhost:8000/api/v1/skills/extract -Method Post -ContentType 'application/json' -Body '{\"text\":\"Skilled in Python, Docker, and AWS\"}'</code><br/>"
            "4. <i>Resolve Skill Aliases via Gemini:</i><br/>"
            "&nbsp;&nbsp;&nbsp;&nbsp;<code>Invoke-RestMethod -Uri http://localhost:8000/api/v1/skills/resolve-aliases -Method Post -ContentType 'application/json' -Body '{\"skills\":[\"nodejs\",\"k8s\",\"py\"]}'</code><br/>"
            "5. <i>Evaluate Candidate:</i><br/>"
            "&nbsp;&nbsp;&nbsp;&nbsp;<code>Invoke-RestMethod -Uri http://localhost:8000/api/v1/screening/evaluate -Method Post -ContentType 'application/json' -InFile payload.json</code>",
            callout_style
        )]
    ]
    t_verify = Table(verify_box, colWidths=[504])
    t_verify.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), callout_bg),
        ('BOX', (0, 0), (-1, -1), 1, callout_border),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
    ]))
    story.append(t_verify)

    doc.build(story, canvasmaker=NumberedCanvas)
    print(f"Successfully generated PDF at: {output_path}")


if __name__ == "__main__":
    script_dir = os.path.dirname(os.path.abspath(__file__))
    ml_service_dir = os.path.dirname(script_dir)
    target_pdf = os.path.join(ml_service_dir, "SmartHire_ML_Service_Process_Description.pdf")
    create_pdf(target_pdf)
