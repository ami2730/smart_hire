"""
Train TF-IDF Vectorizer.

Fits a TfidfVectorizer(stop_words='english', ngram_range=(1, 2)) on domain
resumes and job descriptions, and saves the artifact using ModelManager.

Usage:
    python scripts/train_tfidf.py
"""

from __future__ import annotations

import sys
from pathlib import Path

# Add project root to sys.path
ROOT_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT_DIR))

from app.ml.model_manager import ModelManager
from app.ml.tfidf import TfidfModel

TRAINING_CORPUS: list[str] = [
    # Backend Engineering
    "backend software engineer with python django fastapi postgresql rest api and docker containers",
    "senior backend developer designing restful web services microservices architecture sql optimization",
    "python backend developer experienced in sqlalchemy redis celery async programming and linux",
    "software engineer building distributed systems caching relational databases mysql postgresql",
    # Frontend & Full-Stack
    "frontend developer specializing in react next.js typescript javascript redux tailwind html css",
    "full stack developer with node.js express react next.js postgresql rest api and git",
    "senior frontend engineer building responsive web interfaces component libraries performance optimization",
    "web developer proficient in modern javascript typescript single page applications state management",
    # Data Science & Machine Learning
    "data scientist developing machine learning predictive models using scikit-learn pandas numpy and python",
    "machine learning engineer training deep learning nlp models transformers model deployment evaluation",
    "ai researcher working on natural language processing text classification tokenization feature extraction",
    "data engineer building etl pipelines data warehousing apache spark kafka sql analytics",
    # DevOps & Cloud Infrastructure
    "devops engineer managing ci/cd pipelines docker containers kubernetes clusters terraform aws cloud",
    "cloud infrastructure engineer architecting scalable aws azure gcp linux automated deployments",
    "site reliability engineer monitoring system availability metrics logging alerts docker linux",
    # General Software Engineering & Roles
    "computer science graduate with foundations in algorithms data structures object oriented programming",
    "software developer with experience in unit testing automated testing git version control agile scrum",
    "technical lead mentoring developers conducting code reviews designing scalable system architectures",
]


def train_and_save(version: str = "v1") -> None:
    print(f"Starting TF-IDF training on {len(TRAINING_CORPUS)} domain documents...")

    model = TfidfModel(
        stop_words="english",
        ngram_range=(1, 2),
        max_features=10000,
    )
    model.fit(TRAINING_CORPUS)

    print(f"Vocabulary size: {len(model.vectorizer.vocabulary_)} n-grams")
    print(f"Sample n-grams: {list(model.vectorizer.vocabulary_.keys())[:10]}")

    manager = ModelManager(base_dir=str(ROOT_DIR / "models"))
    saved_path = manager.save_model(
        model=model.vectorizer,
        model_name="tfidf_vectorizer",
        version=version,
        subfolder="tfidf",
    )
    print(f"Model saved successfully to: {saved_path}")


if __name__ == "__main__":
    train_and_save()
