"""
Simple inference script for the trained Oumi model.
Uses the EXACT same prompt format as training for proper output.
"""

from oumi import infer
from oumi.core.configs import InferenceConfig
from oumi.core.configs.params.model_params import ModelParams
from oumi.core.configs.params.generation_params import GenerationParams

# Exact same system prompt used in training
SYSTEM_PROMPT = '''You are an expert cloud architect. Given service profiles, recommend the optimal architecture.

You MUST respond with ONLY valid JSON in this EXACT format:
{
  "architecture": {
    "pattern": "serverless" or "microservices_ecs" or "kubernetes" or "event_driven" or "lift_and_shift",
    "components": ["api_gateway", "lambda", "ecs_cluster", "alb", "rds", "elasticache", etc.],
    "topology": "N services with PATTERN pattern on CLOUD",
    "scaling_strategy": "horizontal_autoscaling" or "serverless_autoscaling" or "kubernetes_hpa",
    "estimated_cost_tier": "low" or "medium" or "high",
    "rationale": "Brief explanation of why this architecture"
  },
  "inputs": {
    "service_count": NUMBER,
    "cloud_provider": "aws" or "gcp" or "azure"
  },
  "source": "ai_recommendation"
}

Do NOT include any text outside the JSON. Components must be strings, not objects.'''

# Create config with proper dataclass objects
config = InferenceConfig(
    model=ModelParams(
        model_name="Qwen/Qwen2.5-1.5B-Instruct",
        adapter_model="./trained_model",
        trust_remote_code=True,
    ),
    generation=GenerationParams(
        max_new_tokens=400,
        temperature=0.1,  # Very low for deterministic JSON
    ),
)

# Test prompts in the exact format used for training
test_inputs = [
    "Services: [api, auth, users], Language: python, DB: postgres, Cloud: aws, Latency p95: 200ms, Cost: $100/day",
    "Services: [api], Language: javascript, DB: dynamodb, Cloud: aws, Latency p95: 50ms, Cost: $20/day",
    "Services: [web, api, worker, scheduler, notifications, payments], Language: go, DB: postgres, Cloud: aws, Latency p95: 300ms, Cost: $500/day",
]

print("=" * 60)
print("InFoundry Architect - Model Inference")
print("=" * 60)

for user_input in test_inputs:
    print(f"\nInput: {user_input}\n")
    
    # Create a properly formatted prompt (system + user in one string)
    prompt = f"{SYSTEM_PROMPT}\n\nUser Input: {user_input}\n\nJSON Response:"
    
    response = infer(config, [prompt])
    
    # Extract the response content
    result = str(response[0])
    
    # Clean up any metadata artifacts
    if "] metadata=" in result:
        result = result.split("] metadata=")[0]
    if result.startswith("["):
        result = result[1:]
    
    # Clean up markdown code blocks if present
    result = result.strip()
    if result.startswith("```json"):
        result = result[7:]
    if result.startswith("```"):
        result = result[3:]
    if result.endswith("```"):
        result = result[:-3]
    result = result.strip()
    
    print(f"Response: {result}")
    print("-" * 60)
