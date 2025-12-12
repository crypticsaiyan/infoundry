"""
Oumi-Powered Data Generation for InFoundry Architect
Uses Oumi's inference to generate synthetic training data.

Usage:
  python oumi_synth.py --count 50
"""

from oumi import infer
from oumi.core.configs import InferenceConfig
from oumi.core.configs.params.model_params import ModelParams
from oumi.core.configs.params.generation_params import GenerationParams
import json
import random
from pathlib import Path
import argparse


# Attributes to sample from
ATTRIBUTES = {
    "service_count": [1, 2, 3, 4, 5, 6, 8],
    "database": ["postgres", "mysql", "mongodb", "dynamodb", "redis", "cassandra"],
    "cloud": ["aws", "gcp", "azure"],
    "language": ["python", "javascript", "go", "java", "typescript"],
    "app_type": ["startup", "e-commerce", "fintech", "saas", "enterprise", "iot", "mobile"],
}

SYSTEM_PROMPT = """You are an expert cloud architect. Given service specifications, recommend optimal architecture.
Respond ONLY with valid JSON in this format:
{"architecture": {"pattern": "serverless|microservices_ecs|kubernetes|event_driven", "components": ["list", "of", "components"], "topology": "description", "scaling_strategy": "horizontal_autoscaling|serverless_autoscaling|kubernetes_hpa", "estimated_cost_tier": "low|medium|high", "rationale": "explanation"}, "inputs": {"service_count": N, "cloud_provider": "provider"}, "source": "ai_recommendation"}"""


def generate_with_oumi(count: int = 50, output_path: str = "oumi_synth_data.jsonl"):
    """Generate training data using Oumi inference."""
    
    # Configure the inference engine
    config = InferenceConfig(
        model=ModelParams(
            model_name="Qwen/Qwen2.5-0.5B-Instruct",
            trust_remote_code=True,
        ),
        generation=GenerationParams(
            max_new_tokens=512,
            temperature=0.7,
            top_p=0.9,
        ),
    )
    
    print("=" * 60)
    print("  Oumi Synthetic Data Generator")
    print("=" * 60)
    print(f"  Model: Qwen/Qwen2.5-0.5B-Instruct")
    print(f"  Generating: {count} samples")
    print(f"  Output: {output_path}")
    print("=" * 60)
    
    examples = []
    
    for i in range(count):
        # Sample random attributes
        svc_count = random.choice(ATTRIBUTES["service_count"])
        db = random.choice(ATTRIBUTES["database"])
        cloud = random.choice(ATTRIBUTES["cloud"])
        lang = random.choice(ATTRIBUTES["language"])
        app = random.choice(ATTRIBUTES["app_type"])
        
        # Create user input
        user_input = f"Services: {svc_count} microservices, Language: {lang}, DB: {db}, Cloud: {cloud}, App type: {app}"
        
        # Full prompt
        prompt = f"{SYSTEM_PROMPT}\n\nUser: {user_input}\n\nArchitecture recommendation:"
        
        print(f"\n[{i+1}/{count}] Generating for {svc_count} services on {cloud}...")
        
        try:
            response = infer(config, [prompt])
            resp_text = str(response[0])
            
            # Clean up response
            if "ASSISTANT:" in resp_text:
                resp_text = resp_text.split("ASSISTANT:")[-1].strip()
            if "] metadata=" in resp_text:
                resp_text = resp_text.split("] metadata=")[0]
            
            # Create training example
            example = {
                "messages": [
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": user_input},
                    {"role": "assistant", "content": resp_text}
                ]
            }
            examples.append(example)
            print(f"    ✓ Generated")
            
        except Exception as e:
            print(f"    ✗ Error: {e}")
    
    # Save to file
    with open(output_path, "w") as f:
        for ex in examples:
            f.write(json.dumps(ex) + "\n")
    
    print("\n" + "=" * 60)
    print(f"✓ Generated {len(examples)} examples using Oumi")
    print(f"✓ Saved to: {output_path}")
    print("=" * 60)
    
    return examples


def main():
    parser = argparse.ArgumentParser(description="Generate training data with Oumi")
    parser.add_argument("--count", type=int, default=50, help="Number of samples")
    parser.add_argument("--output", type=str, default="oumi_synth_data.jsonl", help="Output file")
    args = parser.parse_args()
    
    generate_with_oumi(args.count, args.output)


if __name__ == "__main__":
    main()
