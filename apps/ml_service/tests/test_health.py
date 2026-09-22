"""
Tests for the /health endpoint.

Phase 1 verification: FastAPI starts, /health responds correctly.
"""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from app.main import app


@pytest.fixture(scope="module")
def client() -> TestClient:
    """Return a test client for the application."""
    return TestClient(app)


class TestHealthEndpoint:
    """Tests for GET /health."""

    def test_health_returns_200(self, client: TestClient) -> None:
        response = client.get("/health")
        assert response.status_code == 200

    def test_health_response_has_ok_status(self, client: TestClient) -> None:
        response = client.get("/health")
        body = response.json()
        assert body["status"] == "ok"

    def test_health_response_has_correct_service_name(self, client: TestClient) -> None:
        response = client.get("/health")
        body = response.json()
        assert body["service"] == "smarthire-ml-service"

    def test_health_response_has_version(self, client: TestClient) -> None:
        response = client.get("/health")
        body = response.json()
        assert "version" in body
        assert body["version"] == "1.0.0"

    def test_health_response_schema(self, client: TestClient) -> None:
        """Ensure the response matches exactly the expected schema."""
        response = client.get("/health")
        body = response.json()
        assert set(body.keys()) == {"status", "service", "version"}

    def test_health_content_type_is_json(self, client: TestClient) -> None:
        response = client.get("/health")
        assert "application/json" in response.headers["content-type"]

    def test_docs_endpoint_accessible(self, client: TestClient) -> None:
        """Swagger UI should be accessible."""
        response = client.get("/docs")
        assert response.status_code == 200

    def test_redoc_endpoint_accessible(self, client: TestClient) -> None:
        """ReDoc should be accessible."""
        response = client.get("/redoc")
        assert response.status_code == 200

    def test_openapi_json_accessible(self, client: TestClient) -> None:
        """OpenAPI schema should be accessible."""
        response = client.get("/openapi.json")
        assert response.status_code == 200
        schema = response.json()
        assert schema["info"]["title"] == "SmartHire ML Service"
        assert schema["info"]["version"] == "1.0.0"
