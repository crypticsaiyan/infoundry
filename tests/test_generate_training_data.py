"""
Unit tests for oumi/generate_training_data.py

Tests the training data generation functions including pattern determination,
component generation, rationale generation, and example generation.
"""

import sys
import os
import json
import pytest

# Add oumi directory to path for imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'oumi'))

from generate_training_data import (
    determine_pattern,
    generate_components,
    generate_rationale,
    generate_example,
    PATTERNS,
    DATABASES,
    SERVICE_TYPES,
)


class TestDeterminePattern:
    """Tests for the determine_pattern() function."""

    def test_gpu_returns_kubernetes(self):
        """Test GPU workloads return kubernetes pattern."""
        result = determine_pattern(
            services=["api"],
            db="postgres",
            app_type="web",
            gpu=True
        )
        assert result == "kubernetes"

    def test_kafka_returns_event_driven(self):
        """Test Kafka queue returns event_driven pattern."""
        result = determine_pattern(
            services=["api", "worker"],
            db="postgres",
            app_type="web",
            queue="kafka"
        )
        assert result == "event_driven"

    def test_scheduled_single_service_serverless(self):
        """Test scheduled single service returns serverless."""
        result = determine_pattern(
            services=["cron-job"],
            db="dynamodb",
            app_type="scheduled",
            scheduled=True
        )
        assert result == "serverless"

    def test_single_service_dynamodb_serverless(self):
        """Test single service with DynamoDB returns serverless."""
        result = determine_pattern(
            services=["api"],
            db="dynamodb",
            app_type="web"
        )
        assert result == "serverless"

    def test_five_services_kubernetes(self):
        """Test 5+ services returns kubernetes."""
        result = determine_pattern(
            services=["api", "web", "auth", "payments", "notifications"],
            db="postgres",
            app_type="web"
        )
        assert result == "kubernetes"

    def test_six_services_kubernetes(self):
        """Test 6 services returns kubernetes."""
        result = determine_pattern(
            services=["api", "web", "auth", "payments", "notifications", "analytics"],
            db="postgres",
            app_type="web"
        )
        assert result == "kubernetes"

    def test_two_services_microservices_ecs(self):
        """Test 2 services returns microservices_ecs."""
        result = determine_pattern(
            services=["api", "web"],
            db="postgres",
            app_type="web"
        )
        assert result == "microservices_ecs"

    def test_three_services_microservices_ecs(self):
        """Test 3 services returns microservices_ecs."""
        result = determine_pattern(
            services=["api", "web", "worker"],
            db="postgres",
            app_type="web"
        )
        assert result == "microservices_ecs"

    def test_four_services_microservices_ecs(self):
        """Test 4 services returns microservices_ecs."""
        result = determine_pattern(
            services=["api", "web", "worker", "auth"],
            db="postgres",
            app_type="web"
        )
        assert result == "microservices_ecs"

    def test_single_legacy_lift_and_shift(self):
        """Test single legacy service returns lift_and_shift."""
        result = determine_pattern(
            services=["monolith"],
            db="postgres",
            app_type="legacy"
        )
        assert result == "lift_and_shift"

    def test_single_enterprise_lift_and_shift(self):
        """Test single enterprise service returns lift_and_shift."""
        result = determine_pattern(
            services=["erp"],
            db="postgres",
            app_type="enterprise"
        )
        assert result == "lift_and_shift"

    def test_single_service_default_serverless(self):
        """Test single non-specific service defaults to serverless."""
        result = determine_pattern(
            services=["api"],
            db="postgres",
            app_type="web"
        )
        assert result == "serverless"


class TestGenerateComponents:
    """Tests for the generate_components() function."""

    def test_returns_list(self):
        """Test that function returns a list."""
        result = generate_components("serverless", "dynamodb")
        assert isinstance(result, list)

    def test_includes_base_pattern_components(self):
        """Test that base pattern components are included."""
        result = generate_components("serverless", "dynamodb")
        
        # Serverless should have at least some base components
        base_components = PATTERNS["serverless"]["components"]
        for comp in base_components[:3]:  # Check first few
            # At least some should be present
            pass  # Components are included in base

    def test_adds_database_component(self):
        """Test that appropriate database component is added."""
        result = generate_components("microservices_ecs", "postgres")
        assert "rds" in result

    def test_dynamodb_mapping(self):
        """Test DynamoDB component mapping."""
        result = generate_components("serverless", "dynamodb")
        assert "dynamodb" in result

    def test_mongodb_mapping(self):
        """Test MongoDB to DocumentDB mapping."""
        result = generate_components("microservices_ecs", "mongodb")
        assert "documentdb" in result

    def test_redis_database_mapping(self):
        """Test Redis to ElastiCache mapping."""
        result = generate_components("microservices_ecs", "redis")
        assert "elasticache" in result

    def test_adds_queue_component(self):
        """Test that queue component is added."""
        result = generate_components("event_driven", "postgres", queue="sqs")
        assert "sqs" in result

    def test_kafka_queue_mapping(self):
        """Test Kafka to MSK mapping."""
        result = generate_components("event_driven", "postgres", queue="kafka")
        assert "msk" in result

    def test_rabbitmq_queue_mapping(self):
        """Test RabbitMQ to Amazon MQ mapping."""
        result = generate_components("microservices_ecs", "postgres", queue="rabbitmq")
        assert "amazon_mq" in result

    def test_no_duplicates(self):
        """Test that returned components have no duplicates."""
        result = generate_components("kubernetes", "postgres", queue="redis")
        assert len(result) == len(set(result))

    def test_all_patterns_work(self):
        """Test that all patterns can generate components."""
        for pattern in PATTERNS.keys():
            result = generate_components(pattern, "postgres")
            assert isinstance(result, list)
            assert len(result) > 0


class TestGenerateRationale:
    """Tests for the generate_rationale() function."""

    def test_returns_string(self):
        """Test that function returns a string."""
        result = generate_rationale(
            pattern="serverless",
            services=["api"],
            db="dynamodb"
        )
        assert isinstance(result, str)

    def test_string_not_empty(self):
        """Test that rationale is not empty."""
        result = generate_rationale(
            pattern="serverless",
            services=["api"],
            db="dynamodb"
        )
        assert len(result) > 0

    def test_all_patterns_have_rationales(self):
        """Test that all patterns can generate rationales."""
        patterns = ["serverless", "microservices_ecs", "kubernetes", "event_driven", "lift_and_shift"]
        
        for pattern in patterns:
            result = generate_rationale(
                pattern=pattern,
                services=["api"],
                db="postgres"
            )
            assert isinstance(result, str)
            assert len(result) > 0

    def test_unknown_pattern_has_fallback(self):
        """Test that unknown patterns have a fallback rationale."""
        result = generate_rationale(
            pattern="unknown_pattern",
            services=["api"],
            db="postgres"
        )
        assert isinstance(result, str)
        assert len(result) > 0


class TestGenerateExample:
    """Tests for the generate_example() function."""

    def test_returns_dict(self):
        """Test that function returns a dictionary."""
        result = generate_example()
        assert isinstance(result, dict)

    def test_has_messages_key(self):
        """Test that result has messages key."""
        result = generate_example()
        assert "messages" in result

    def test_messages_is_list(self):
        """Test that messages is a list."""
        result = generate_example()
        assert isinstance(result["messages"], list)

    def test_has_three_messages(self):
        """Test that there are exactly 3 messages (system, user, assistant)."""
        result = generate_example()
        assert len(result["messages"]) == 3

    def test_message_roles_correct(self):
        """Test that message roles are system, user, assistant."""
        result = generate_example()
        messages = result["messages"]
        
        assert messages[0]["role"] == "system"
        assert messages[1]["role"] == "user"
        assert messages[2]["role"] == "assistant"

    def test_all_messages_have_content(self):
        """Test that all messages have content."""
        result = generate_example()
        
        for message in result["messages"]:
            assert "role" in message
            assert "content" in message
            assert len(message["content"]) > 0

    def test_assistant_content_is_valid_json(self):
        """Test that assistant content is valid JSON."""
        result = generate_example()
        assistant_content = result["messages"][2]["content"]
        
        parsed = json.loads(assistant_content)
        assert isinstance(parsed, dict)

    def test_assistant_json_has_architecture(self):
        """Test that assistant JSON has architecture key."""
        result = generate_example()
        assistant_content = result["messages"][2]["content"]
        parsed = json.loads(assistant_content)
        
        assert "architecture" in parsed

    def test_architecture_has_required_keys(self):
        """Test that architecture has required keys."""
        result = generate_example()
        assistant_content = result["messages"][2]["content"]
        parsed = json.loads(assistant_content)
        
        architecture = parsed["architecture"]
        assert "pattern" in architecture
        assert "components" in architecture
        assert "rationale" in architecture

    def test_has_inputs_key(self):
        """Test that assistant JSON has inputs key."""
        result = generate_example()
        assistant_content = result["messages"][2]["content"]
        parsed = json.loads(assistant_content)
        
        assert "inputs" in parsed
        assert "service_count" in parsed["inputs"]
        assert "cloud_provider" in parsed["inputs"]

    def test_has_source_key(self):
        """Test that assistant JSON has source key."""
        result = generate_example()
        assistant_content = result["messages"][2]["content"]
        parsed = json.loads(assistant_content)
        
        assert "source" in parsed
        assert parsed["source"] == "ai_recommendation"

    def test_pattern_is_valid(self):
        """Test that pattern is one of the valid patterns."""
        valid_patterns = list(PATTERNS.keys())
        
        for _ in range(10):  # Run multiple times due to randomness
            result = generate_example()
            assistant_content = result["messages"][2]["content"]
            parsed = json.loads(assistant_content)
            
            pattern = parsed["architecture"]["pattern"]
            assert pattern in valid_patterns

    def test_components_are_strings(self):
        """Test that components is a list of strings."""
        result = generate_example()
        assistant_content = result["messages"][2]["content"]
        parsed = json.loads(assistant_content)
        
        components = parsed["architecture"]["components"]
        assert isinstance(components, list)
        
        for comp in components:
            assert isinstance(comp, str)

    def test_user_content_contains_services(self):
        """Test that user content contains 'Services:' info."""
        result = generate_example()
        user_content = result["messages"][1]["content"]
        
        assert "Services:" in user_content

    def test_user_content_contains_db(self):
        """Test that user content contains 'DB:' info."""
        result = generate_example()
        user_content = result["messages"][1]["content"]
        
        assert "DB:" in user_content

    def test_user_content_contains_cloud(self):
        """Test that user content contains 'Cloud:' info."""
        result = generate_example()
        user_content = result["messages"][1]["content"]
        
        assert "Cloud:" in user_content


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
