"""
Unit tests for oumi/serve.py

Tests the FastAPI server endpoints and heuristic response function.
Uses FastAPI's TestClient for endpoint testing.
"""

import sys
import os
import json
import pytest

# Add oumi directory to path for imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'oumi'))

# Import the FastAPI app and functions
from serve import app, heuristic_response

# Import TestClient for API testing
from fastapi.testclient import TestClient

client = TestClient(app)


class TestHeuristicResponse:
    """Tests for the heuristic_response() function."""

    def test_returns_dict_with_required_keys(self):
        """Test that function returns dict with pattern, components, rationale."""
        result = heuristic_response("test prompt")
        
        assert isinstance(result, dict)
        assert "pattern" in result
        assert "components" in result
        assert "rationale" in result

    def test_kafka_pattern_detection(self):
        """Test that kafka triggers event_driven pattern."""
        result = heuristic_response("my app uses kafka")
        
        assert result["pattern"] == "event_driven"
        assert "msk" in result["components"]

    def test_queue_pattern_detection(self):
        """Test that queue keyword triggers event_driven pattern."""
        result = heuristic_response("need a message queue system")
        
        assert result["pattern"] == "event_driven"

    def test_kubernetes_pattern_detection(self):
        """Test that kubernetes keyword triggers kubernetes pattern."""
        result = heuristic_response("deploy on kubernetes cluster")
        
        assert result["pattern"] == "kubernetes"
        assert "eks_cluster" in result["components"]

    def test_five_services_kubernetes(self):
        """Test that 5+ services triggers kubernetes pattern."""
        result = heuristic_response("we have 5 microservices")
        
        assert result["pattern"] == "kubernetes"

    def test_six_services_kubernetes(self):
        """Test that 6+ services triggers kubernetes pattern."""
        result = heuristic_response("we have 6 microservices")
        
        assert result["pattern"] == "kubernetes"

    def test_serverless_pattern_detection(self):
        """Test that serverless keyword triggers serverless pattern."""
        result = heuristic_response("want a serverless backend")
        
        assert result["pattern"] == "serverless"
        assert "api_gateway" in result["components"]
        assert "lambda_functions" in result["components"]

    def test_lambda_pattern_detection(self):
        """Test that lambda keyword triggers serverless pattern."""
        result = heuristic_response("deploy lambda functions")
        
        assert result["pattern"] == "serverless"

    def test_default_microservices_ecs(self):
        """Test default pattern when no specific keywords match."""
        result = heuristic_response("build a simple web app")
        
        assert result["pattern"] == "microservices_ecs"
        assert "ecs_cluster" in result["components"]

    def test_high_latency_adds_components(self):
        """Test that 'high' keyword adds extra components."""
        result = heuristic_response("need high performance")
        
        # Should add elasticache, cdn, or hpa
        extended_components = ["elasticache", "cdn", "hpa"]
        has_extended = any(c in result["components"] for c in extended_components)
        assert has_extended

    def test_latency_keyword_adds_components(self):
        """Test that 'latency' keyword adds extra components."""
        result = heuristic_response("low latency is important")
        
        extended_components = ["elasticache", "cdn", "hpa"]
        has_extended = any(c in result["components"] for c in extended_components)
        assert has_extended

    def test_components_are_unique(self):
        """Test that components list has no duplicates."""
        result = heuristic_response("high latency kubernetes cluster")
        
        components = result["components"]
        assert len(components) == len(set(components))

    def test_rationale_contains_pattern(self):
        """Test that rationale mentions the selected pattern."""
        result = heuristic_response("test prompt")
        
        assert result["pattern"] in result["rationale"]


class TestHealthEndpoint:
    """Tests for the /health endpoint."""

    def test_health_returns_200(self):
        """Test that health endpoint returns HTTP 200."""
        response = client.get("/health")
        
        assert response.status_code == 200

    def test_health_response_structure(self):
        """Test that health response has required keys."""
        response = client.get("/health")
        data = response.json()
        
        assert "status" in data
        assert "ollama_available" in data
        assert "ollama_url" in data

    def test_health_status_is_healthy(self):
        """Test that status is 'healthy'."""
        response = client.get("/health")
        data = response.json()
        
        assert data["status"] == "healthy"

    def test_ollama_available_is_boolean(self):
        """Test that ollama_available is a boolean."""
        response = client.get("/health")
        data = response.json()
        
        assert isinstance(data["ollama_available"], bool)


class TestChatCompletionsEndpoint:
    """Tests for the /v1/chat/completions endpoint."""

    def test_returns_200_with_messages(self):
        """Test endpoint returns 200 with valid messages input."""
        response = client.post(
            "/v1/chat/completions",
            json={
                "model": "test",
                "messages": [{"role": "user", "content": "build a simple api"}]
            }
        )
        
        assert response.status_code == 200

    def test_returns_200_with_prompt(self):
        """Test endpoint returns 200 with prompt input."""
        response = client.post(
            "/v1/chat/completions",
            json={
                "model": "test",
                "prompt": "build a simple api"
            }
        )
        
        assert response.status_code == 200

    def test_returns_400_without_prompt(self):
        """Test endpoint returns 400 when no prompt provided."""
        response = client.post(
            "/v1/chat/completions",
            json={"model": "test"}
        )
        
        assert response.status_code == 400

    def test_response_has_correct_id(self):
        """Test response has cmpl-infoundry id."""
        response = client.post(
            "/v1/chat/completions",
            json={"prompt": "test"}
        )
        data = response.json()
        
        assert data["id"] == "cmpl-infoundry"

    def test_response_has_choices(self):
        """Test response has choices array with message."""
        response = client.post(
            "/v1/chat/completions",
            json={"prompt": "test"}
        )
        data = response.json()
        
        assert "choices" in data
        assert len(data["choices"]) > 0
        assert "message" in data["choices"][0]

    def test_message_role_is_assistant(self):
        """Test message role is assistant."""
        response = client.post(
            "/v1/chat/completions",
            json={"prompt": "test"}
        )
        data = response.json()
        
        message = data["choices"][0]["message"]
        assert message["role"] == "assistant"

    def test_finish_reason_is_stop(self):
        """Test finish_reason is stop."""
        response = client.post(
            "/v1/chat/completions",
            json={"prompt": "test"}
        )
        data = response.json()
        
        assert data["choices"][0]["finish_reason"] == "stop"

    def test_content_is_valid_json(self):
        """Test that message content is valid JSON (heuristic fallback)."""
        response = client.post(
            "/v1/chat/completions",
            json={"prompt": "simple web service"}
        )
        data = response.json()
        
        content = data["choices"][0]["message"]["content"]
        # Should be able to parse as JSON
        parsed = json.loads(content)
        assert "pattern" in parsed


class TestCompletionsEndpoint:
    """Tests for the /v1/completions endpoint."""

    def test_returns_200(self):
        """Test endpoint returns 200 with prompt."""
        response = client.post(
            "/v1/completions",
            json={"prompt": "build an api"}
        )
        
        assert response.status_code == 200

    def test_response_has_choices(self):
        """Test response has choices array."""
        response = client.post(
            "/v1/completions",
            json={"prompt": "build an api"}
        )
        data = response.json()
        
        assert "choices" in data
        assert len(data["choices"]) > 0

    def test_choice_has_text(self):
        """Test that choice has text field."""
        response = client.post(
            "/v1/completions",
            json={"prompt": "build an api"}
        )
        data = response.json()
        
        assert "text" in data["choices"][0]

    def test_finish_reason_is_stop(self):
        """Test finish_reason is stop."""
        response = client.post(
            "/v1/completions",
            json={"prompt": "test"}
        )
        data = response.json()
        
        assert data["choices"][0]["finish_reason"] == "stop"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
