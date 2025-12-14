"""
Oumi Synthetic Data Generator for InFoundry Architect
Uses Oumi's synthesize feature to generate training data with a teacher model.

This leverages Oumi's data synthesis capabilities to create high-quality
training examples using a larger model as a teacher.
"""

from oumi import infer
from oumi.core.configs import InferenceConfig
from oumi.core.configs.params.model_params import ModelParams
from oumi.core.configs.params.generation_params import GenerationParams
import json
import random
from pathlib import Path
from typing import List, Dict


# Seed scenarios to generate data for
SCENARIOS = [
    {"services": 1, "db": "dynamodb", "type": "serverless", "cloud": "aws"},
    {"services": 2, "db": "postgres", "type": "startup", "cloud": "aws"},
    {"services": 2, "db": "mongodb", "type": "mobile", "cloud": "gcp"},
    {"services": 3, "db": "redis", "type": "fintech", "cloud": "aws"},
    {"services": 3, "db": "postgres", "type": "saas", "cloud": "azure"},
    {"services": 4, "db": "mysql", "type": "e-commerce", "cloud": "aws"},
    {"services": 5, "db": "postgres", "type": "enterprise", "cloud": "aws"},
    {"services": 6, "db": "postgres", "type": "platform", "cloud": "gcp"},
    {"services": 1, "db": "dynamodb", "type": "cron", "cloud": "aws", "scheduled": True},
    {"services": 2, "db": "postgres", "type": "ml", "cloud": "aws", "gpu": True},
    {"services": 3, "db": "cassandra", "type": "iot", "cloud": "aws"},
    {"services": 2, "db": "postgres", "type": "streaming", "cloud": "aws", "queue": "kafka"},
]


def create_prompt(scenario: Dict) -> str:
    """
    Builds a text prompt instructing an expert cloud architect to produce a JSON-formatted architecture recommendation for the given scenario.
    
    Parameters:
        scenario (Dict): Scenario specification with required keys:
            - "services" (int): number of microservices
            - "db" (str): database choice
            - "type" (str): application type
            - "cloud" (str): cloud provider
          Optional keys:
            - "scheduled" (bool): whether a scheduled/cron job is required
            - "gpu" (bool): whether GPU resources are required
            - "queue" (str): message queue type
    
    Returns:
        str: A single string prompt that includes the scenario details and an explicit instruction to respond with a JSON object in the required schema.
    """
    parts = [
        f"Services: {scenario['services']} microservices",
        f"Database: {scenario['db']}",
        f"Application type: {scenario['type']}",
        f"Cloud provider: {scenario['cloud']}"
    ]
    
    if scenario.get("scheduled"):
        parts.append("Scheduled/cron job: yes")
    if scenario.get("gpu"):
        parts.append("GPU required: yes")
    if scenario.get("queue"):
        parts.append(f"Message queue: {scenario['queue']}")
    
    scenario_text = ", ".join(parts)
    
    return f"""You are an expert cloud architect. Given the following requirements, recommend an architecture.

Requirements: {scenario_text}

Respond with a JSON object in this exact format:
{{
  "architecture": {{
    "pattern": "serverless|microservices_ecs|kubernetes|event_driven|lift_and_shift",
    "components": ["list", "of", "aws", "components"],
    "topology": "description of topology",
    "scaling_strategy": "horizontal_autoscaling|serverless_autoscaling|kubernetes_hpa",
    "estimated_cost_tier": "low|medium|high",
    "rationale": "explanation of why this architecture"
  }},
  "inputs": {{
    "service_count": number,
    "cloud_provider": "aws|gcp|azure"
  }},
  "source": "ai_recommendation"
}}

Architecture recommendation (JSON only):"""


def generate_with_oumi(model_name: str = "Qwen/Qwen2.5-1.5B-Instruct", 
                       use_trained: bool = False,
                       num_examples: int = 50) -> List[Dict]:
    """
                       Generate a set of synthetic chat-style training examples by prompting Oumi and collecting its JSON-formatted architecture recommendations.
                       
                       This function configures an Oumi inference model (optionally with a trained adapter), repeatedly selects and slightly randomizes seed scenarios, builds prompts, calls Oumi to generate an assistant response, and wraps each result into a chat-style example containing system/user/assistant messages plus the scenario under `metadata`. Failures for individual examples are caught and do not stop the overall run.
                       
                       Parameters:
                           model_name (str): Base model identifier used for inference.
                           use_trained (bool): If True, attach a local trained adapter at "./trained_model" to the base model.
                           num_examples (int): Number of synthetic examples to generate.
                       
                       Returns:
                           List[Dict]: A list of examples where each example is a dict with keys:
                               - "messages": List of message dicts with roles ("system", "user", "assistant") and corresponding content.
                               - "metadata": The scenario dictionary used to generate the prompt for that example.
                       """
    
    # Configure the model
    config = InferenceConfig(
        model=ModelParams(
            model_name=model_name,
            adapter_model="./trained_model" if use_trained else None,
            trust_remote_code=True,
        ),
        generation=GenerationParams(
            max_new_tokens=512,
            temperature=0.7,  # Some creativity for variety
            top_p=0.9,
        ),
    )
    
    print("=" * 60)
    print("  Oumi Synthetic Data Generator")
    print("=" * 60)
    print(f"  Model: {model_name}")
    print(f"  Using trained adapter: {use_trained}")
    print(f"  Generating: {num_examples} examples")
    print("=" * 60)
    
    training_examples = []
    
    for i in range(num_examples):
        # Pick a random scenario or create variations
        scenario = random.choice(SCENARIOS).copy()
        
        # Add some randomness
        scenario["services"] = random.randint(1, 8)
        scenario["db"] = random.choice(["postgres", "mysql", "mongodb", "dynamodb", "redis"])
        scenario["cloud"] = random.choice(["aws", "gcp", "azure"])
        
        prompt = create_prompt(scenario)
        
        print(f"\n[{i+1}/{num_examples}] Generating for {scenario['type']} with {scenario['services']} services...")
        
        try:
            # Use Oumi to generate
            response = infer(config, [prompt])
            
            # Extract the response
            resp_text = str(response[0])
            
            # Try to extract JSON from response
            if "ASSISTANT:" in resp_text:
                resp_text = resp_text.split("ASSISTANT:")[-1].strip()
            
            # Remove metadata artifacts
            if "] metadata=" in resp_text:
                resp_text = resp_text.split("] metadata=")[0]
            
            # Create training example in chat format
            user_content = f"Services: [{', '.join(['svc' + str(j) for j in range(scenario['services'])])}], Language: python, DB: {scenario['db']}, Cloud: {scenario['cloud']}"
            
            example = {
                "messages": [
                    {
                        "role": "system",
                        "content": "You are an expert cloud architect. Given service profiles and requirements, recommend the optimal architecture. Respond with valid JSON."
                    },
                    {
                        "role": "user", 
                        "content": user_content
                    },
                    {
                        "role": "assistant",
                        "content": resp_text
                    }
                ],
                "metadata": scenario
            }
            
            training_examples.append(example)
            print(f"    ✓ Generated")
            
        except Exception as e:
            print(f"    ✗ Error: {e}")
    
    return training_examples


def main():
    """
    Run the CLI to generate synthetic training examples with Oumi and save them as a JSONL file.
    
    Parses command-line arguments (--count, --output, --use-trained, --model), invokes generate_with_oumi with those options to produce the requested number of examples, and writes each example as a separate JSON object line to the specified output file.
    """
    import argparse
    
    parser = argparse.ArgumentParser(description="Generate synthetic training data with Oumi")
    parser.add_argument("--count", type=int, default=20, help="Number of examples")
    parser.add_argument("--output", type=str, default="oumi_synthetic_data.jsonl", help="Output file")
    parser.add_argument("--use-trained", action="store_true", help="Use the trained model adapter")
    parser.add_argument("--model", type=str, default="Qwen/Qwen2.5-1.5B-Instruct", help="Base model")
    args = parser.parse_args()
    
    # Generate data
    examples = generate_with_oumi(
        model_name=args.model,
        use_trained=args.use_trained,
        num_examples=args.count
    )
    
    # Save to file
    output_path = Path(args.output)
    with open(output_path, "w") as f:
        for example in examples:
            f.write(json.dumps(example) + "\n")
    
    print("\n" + "=" * 60)
    print(f"✓ Generated {len(examples)} examples using Oumi")
    print(f"✓ Saved to: {output_path}")
    print("=" * 60)


if __name__ == "__main__":
    main()