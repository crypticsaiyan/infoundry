"""
Oumi Training Data Generator for InFoundry Architect
Generates high-quality synthetic training data for cloud architecture decisions.

Usage:
  python generate_training_data.py [--count N] [--output FILE]

Options:
  --count N      Number of training examples to generate (default: 50)
  --output FILE  Output file path (default: generated_training_data.jsonl)
"""

import json
import random
import argparse
from pathlib import Path
from typing import List, Dict, Any


# Architecture decision rules and patterns
PATTERNS = {
    "serverless": {
        "triggers": ["single_service", "low_cost", "scheduled", "event_based", "prototype"],
        "components": ["api_gateway", "lambda", "dynamodb", "s3", "eventbridge", "sqs", "sns"],
        "scaling": "auto_managed",
    },
    "microservices_ecs": {
        "triggers": ["2-4_services", "containerized", "moderate_traffic"],
        "components": ["ecs_cluster", "alb", "rds", "elasticache", "ecr", "cloudwatch"],
        "scaling": "service_autoscaling",
    },
    "kubernetes": {
        "triggers": ["5+_services", "high_complexity", "ml_workloads", "gpu_required", "multi_tenant"],
        "components": ["eks_cluster", "alb", "rds", "elasticache", "sqs", "s3", "karpenter"],
        "scaling": "hpa_vpa_karpenter",
    },
    "event_driven": {
        "triggers": ["kafka", "real_time", "streaming", "iot", "event_processing"],
        "components": ["msk", "kinesis", "lambda", "eventbridge", "dynamodb", "sqs"],
        "scaling": "partition_based",
    },
    "lift_and_shift": {
        "triggers": ["monolith", "legacy", "quick_migration"],
        "components": ["ec2", "alb", "rds", "efs", "elasticache"],
        "scaling": "ec2_autoscaling",
    },
}

# Service types for variety
SERVICE_TYPES = [
    ["api"], ["auth"], ["web"], ["backend"], ["frontend"],
    ["api", "web"], ["auth", "users"], ["backend", "frontend"],
    ["api", "worker"], ["auth", "payments"],
    ["web", "api", "worker"], ["auth", "users", "payments"],
    ["api", "consumer", "processor"], ["frontend", "backend", "gateway"],
    ["web", "api", "auth", "worker"], ["backend", "frontend", "scheduler", "notifications"],
    ["auth", "users", "products", "orders"], ["api", "worker", "scheduler", "reports"],
    ["web", "api", "worker", "scheduler", "notifications"],
    ["auth", "users", "products", "orders", "payments"],
    ["auth", "users", "products", "orders", "payments", "shipping"],
    ["gateway", "auth", "users", "catalog", "orders", "payments", "shipping", "notifications"],
]

# Database options
DATABASES = ["postgres", "mysql", "mongodb", "dynamodb", "redis", "cassandra", "documentdb"]

# Application types
APP_TYPES = [
    "startup", "e-commerce", "fintech", "saas", "enterprise",
    "mobile_backend", "iot", "analytics", "gaming", "healthcare",
    "media", "logistics", "crm", "erp", "social",
]

# Languages
LANGUAGES = ["python", "javascript", "typescript", "go", "java", "rust"]

# Queue systems
QUEUES = [None, "sqs", "rabbitmq", "kafka", "redis"]


def determine_pattern(services: List[str], db: str, app_type: str, 
                     queue: str = None, gpu: bool = False, 
                     scheduled: bool = False) -> str:
    """Determine the best architecture pattern based on requirements."""
    num_services = len(services)
    
    # GPU workloads need Kubernetes
    if gpu:
        return "kubernetes"
    
    # Kafka indicates event-driven
    if queue == "kafka":
        return "event_driven"
    
    # Scheduled single job is serverless
    if scheduled and num_services == 1:
        return "serverless"
    
    # Single service with DynamoDB is serverless
    if num_services == 1 and db == "dynamodb":
        return "serverless"
    
    # 5+ services need Kubernetes
    if num_services >= 5:
        return "kubernetes"
    
    # 2-4 services fit ECS well
    if 2 <= num_services <= 4:
        return "microservices_ecs"
    
    # Single monolith service is lift-and-shift
    if num_services == 1 and app_type in ["enterprise", "legacy"]:
        return "lift_and_shift"
    
    # Default for single service
    if num_services == 1:
        return "serverless"
    
    return "microservices_ecs"


def generate_components(pattern: str, db: str, queue: str = None) -> List[str]:
    """Generate AWS components for the architecture."""
    base_components = PATTERNS[pattern]["components"].copy()
    
    # Add database-specific components
    db_mapping = {
        "postgres": "rds",
        "mysql": "rds",
        "mongodb": "documentdb",
        "dynamodb": "dynamodb",
        "redis": "elasticache",
        "cassandra": "keyspaces",
        "documentdb": "documentdb",
    }
    
    db_component = db_mapping.get(db, "rds")
    if db_component not in base_components:
        base_components.append(db_component)
    
    # Add queue if specified
    queue_mapping = {
        "sqs": "sqs",
        "rabbitmq": "amazon_mq",
        "kafka": "msk",
        "redis": "elasticache",
    }
    
    if queue and queue_mapping.get(queue) not in base_components:
        base_components.append(queue_mapping.get(queue, "sqs"))
    
    # Remove duplicates and return
    return list(set(base_components))


def generate_rationale(pattern: str, services: List[str], db: str, 
                       queue: str = None, gpu: bool = False) -> str:
    """Generate a rationale for the architecture decision."""
    num_services = len(services)
    
    rationales = {
        "serverless": [
            f"Single service with {db} is ideal for serverless architecture",
            f"Low cost and scalability needs make Lambda the best choice",
            f"Scheduled workloads are perfect for Lambda with EventBridge",
            f"Simple API with {db} benefits from serverless auto-scaling",
        ],
        "microservices_ecs": [
            f"{num_services} services with {db} fit well in ECS containers",
            f"Moderate complexity with {db} suits ECS orchestration",
            f"Containerized {num_services}-service architecture optimal for ECS",
            f"ECS provides good balance of control and managed infrastructure for {num_services} services",
        ],
        "kubernetes": [
            f"{num_services} services require Kubernetes for proper orchestration",
            f"Complex architecture with {num_services} services needs EKS",
            f"GPU workloads require EKS with specialized node groups",
            f"Multi-service platform benefits from Kubernetes service mesh",
        ],
        "event_driven": [
            f"Kafka integration indicates event-driven architecture",
            f"Real-time streaming with {queue} needs event-driven pattern",
            f"Event-based processing with {db} suits MSK and Lambda",
            f"Asynchronous workflows benefit from event-driven design",
        ],
        "lift_and_shift": [
            f"Monolith application suits EC2-based deployment",
            f"Legacy {db} workload best migrated to EC2 with RDS",
            f"Single service monolith optimal on EC2 instances",
        ],
    }
    
    return random.choice(rationales.get(pattern, ["Optimal architecture for requirements"]))


def generate_example() -> Dict[str, Any]:
    """Generate a single training example matching sample_architecture_plan.json format."""
    # Random selections
    services = random.choice(SERVICE_TYPES)
    db = random.choice(DATABASES)
    app_type = random.choice(APP_TYPES)
    language = random.choice(LANGUAGES)
    queue = random.choice(QUEUES) if random.random() > 0.6 else None
    gpu = random.random() < 0.1  # 10% chance of GPU requirement
    scheduled = random.random() < 0.15 and len(services) == 1  # 15% chance for single services
    cloud_provider = random.choice(["aws", "gcp", "azure"])
    
    # Generate latency and cost data
    latency = random.choice([50, 100, 150, 200, 250, 300, 400, 500])
    cost = random.randint(10, 500)
    
    # Determine architecture
    num_services = len(services)
    pattern = determine_pattern(services, db, app_type, queue, gpu, scheduled)
    components = generate_components(pattern, db, queue)
    rationale = generate_rationale(pattern, services, db, queue, gpu)
    scaling = PATTERNS[pattern]["scaling"]
    
    # Determine cost tier
    if cost < 50:
        cost_tier = "low"
    elif cost < 200:
        cost_tier = "medium"
    else:
        cost_tier = "high"
    
    # Scaling strategy mapping for output
    scaling_strategies = {
        "auto_managed": "serverless_autoscaling",
        "service_autoscaling": "horizontal_autoscaling",
        "hpa_vpa_karpenter": "kubernetes_hpa",
        "partition_based": "event_driven_scaling",
        "ec2_autoscaling": "vertical_autoscaling",
    }
    
    # Build the prompt
    prompt_parts = [f"Services: [{', '.join(services)}]"]
    prompt_parts.append(f"Language: {language}")
    prompt_parts.append(f"DB: {db}")
    prompt_parts.append(f"Cloud: {cloud_provider}")
    
    if queue:
        prompt_parts.append(f"Queues: {queue}")
    if gpu:
        prompt_parts.append("GPU: required")
    if scheduled:
        prompt_parts.append("Scheduled: true")
    
    prompt_parts.append(f"Latency p95: {latency}ms")
    prompt_parts.append(f"Cost: ${cost}/day")
    
    user_content = ", ".join(prompt_parts)
    
    # Build the response matching sample_architecture_plan.json format
    response = {
        "architecture": {
            "pattern": pattern,
            "components": components,
            "topology": f"{num_services} services with {pattern} pattern on {cloud_provider}",
            "scaling_strategy": scaling_strategies.get(scaling, "horizontal_autoscaling"),
            "estimated_cost_tier": cost_tier,
            "rationale": rationale
        },
        "inputs": {
            "service_count": num_services,
            "cloud_provider": cloud_provider,
            "database": db,
            "language": language
        },
        "source": "ai_recommendation"
    }
    
    # Create the training example in chat format with EXPLICIT schema
    system_prompt = '''You are an expert cloud architect. Given service profiles, recommend the optimal architecture.

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
    
    example = {
        "messages": [
            {
                "role": "system",
                "content": system_prompt
            },
            {
                "role": "user",
                "content": user_content
            },
            {
                "role": "assistant",
                "content": json.dumps(response)
            }
        ]
    }
    
    return example


def generate_dpo_example() -> Dict[str, Any]:
    """Generate a DPO (preference) training example."""
    # Generate a regular example first
    services = random.choice(SERVICE_TYPES)
    db = random.choice(DATABASES)
    app_type = random.choice(APP_TYPES)
    queue = random.choice(QUEUES) if random.random() > 0.6 else None
    gpu = random.random() < 0.1
    
    # Correct pattern
    pattern = determine_pattern(services, db, app_type, queue, gpu, False)
    components = generate_components(pattern, db, queue)
    rationale = generate_rationale(pattern, services, db, queue, gpu)
    
    # Generate a suboptimal "rejected" response
    wrong_patterns = [p for p in PATTERNS.keys() if p != pattern]
    wrong_pattern = random.choice(wrong_patterns)
    wrong_components = PATTERNS[wrong_pattern]["components"][:2]
    wrong_rationales = [
        "Just use this",
        "Should work fine",
        "Simple solution",
        "Default choice",
    ]
    
    # Build prompt
    prompt = f"You are a cloud architect. Services: [{', '.join(services)}], DB: {db}."
    if queue:
        prompt += f" Queues: {queue}."
    if gpu:
        prompt += " GPU: required."
    prompt += " Recommend architecture."
    
    chosen = json.dumps({
        "pattern": pattern,
        "components": components,
        "rationale": rationale
    })
    
    rejected = json.dumps({
        "pattern": wrong_pattern,
        "components": wrong_components,
        "rationale": random.choice(wrong_rationales)
    })
    
    return {
        "prompt": prompt,
        "chosen": chosen,
        "rejected": rejected
    }


def main():
    parser = argparse.ArgumentParser(description="Generate Oumi training data")
    parser.add_argument("--count", type=int, default=50, 
                        help="Number of training examples to generate")
    parser.add_argument("--output", type=str, default="generated_training_data.jsonl",
                        help="Output file path")
    parser.add_argument("--dpo", action="store_true",
                        help="Generate DPO preference data instead")
    parser.add_argument("--dpo-output", type=str, default="generated_dpo_data.jsonl",
                        help="DPO output file path")
    args = parser.parse_args()
    
    print("=" * 60)
    print("  InFoundry Architect - Training Data Generator")
    print("=" * 60)
    
    # Generate SFT data
    sft_examples = []
    for i in range(args.count):
        example = generate_example()
        sft_examples.append(example)
    
    output_path = Path(args.output)
    with open(output_path, "w") as f:
        for example in sft_examples:
            f.write(json.dumps(example) + "\n")
    
    print(f"\n✓ Generated {len(sft_examples)} SFT training examples")
    print(f"✓ Saved to: {output_path}")
    
    # Generate DPO data if requested
    if args.dpo:
        dpo_examples = []
        for i in range(args.count):
            example = generate_dpo_example()
            dpo_examples.append(example)
        
        dpo_path = Path(args.dpo_output)
        with open(dpo_path, "w") as f:
            for example in dpo_examples:
                f.write(json.dumps(example) + "\n")
        
        print(f"\n✓ Generated {len(dpo_examples)} DPO training examples")
        print(f"✓ Saved to: {dpo_path}")
    
    print("\n" + "=" * 60)
    print("  Sample training example:")
    print("=" * 60)
    sample = sft_examples[0]
    print(f"  User: {sample['messages'][1]['content']}")
    print(f"  Assistant: {sample['messages'][2]['content']}")
    print("=" * 60)


if __name__ == "__main__":
    main()
