"""
Oumi Training Data Generator for InFoundry Architect
Generates high-quality synthetic training data for cloud architecture decisions.

Usage:
  python generate_training_data.py [--count N] [--output FILE]

Options:
  --count N      Number of training examples to generate (default: 50)
  --output FILE  Output file path (default: generated_training_data.jsonl)
"""

import random
import argparse
import json
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
    """
                     Selects an architecture pattern string that fits the provided deployment requirements.
                     
                     Determines the most appropriate pattern from common architecture choices:
                     - Returns "kubernetes" for GPU workloads or large (5+) service counts.
                     - Returns "event_driven" when the queue is "kafka".
                     - Returns "serverless" for single-service cases (including scheduled single jobs or when using DynamoDB).
                     - Returns "microservices_ecs" for 2–4 services.
                     - Returns "lift_and_shift" for a single legacy or enterprise application.
                     
                     Parameters:
                         services (List[str]): List of service roles/components included in the application.
                         db (str): Primary database choice (e.g., "dynamodb", "postgres").
                         app_type (str): Application domain/type (e.g., "enterprise", "legacy", "web").
                         queue (str, optional): Queue system name if used (e.g., "kafka"); defaults to None.
                         gpu (bool, optional): True if the workload requires GPU resources; defaults to False.
                         scheduled (bool, optional): True if the workload is a scheduled/background job; defaults to False.
                     
                     Returns:
                         str: One of "kubernetes", "event_driven", "serverless", "microservices_ecs", or "lift_and_shift" indicating the chosen architecture pattern.
                     """
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
    """
    Produce component identifiers for a given architecture pattern, adjusted for the specified database and optional queue.
    
    Parameters:
        pattern (str): Key name of the architecture pattern (must exist in PATTERNS).
        db (str): Selected database type (used to include a matching database component).
        queue (str, optional): Selected queue system; when provided, a corresponding queue component is included.
    
    Returns:
        components (List[str]): List of unique component identifiers to include for the architecture.
    """
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
    """
                       Selects a concise rationale explaining why a particular architecture pattern was chosen.
                       
                       Parameters:
                           pattern (str): Architecture pattern name (e.g., "serverless", "microservices_ecs", "kubernetes", "event_driven", "lift_and_shift").
                           services (List[str]): List of service roles or components used to tailor the rationale (affects wording such as service count).
                           db (str): Database choice to include in the rationale when relevant.
                           queue (str, optional): Queue or streaming system to mention in event-driven rationales.
                           gpu (bool, optional): Whether GPU requirements should influence the rationale.
                       
                       Returns:
                           str: A single-sentence rationale chosen from candidate messages for the given pattern; returns a generic rationale if the pattern is not recognized.
                       """
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
    """
    Generate a single synthetic training example in the chat-based format that conforms to the sample_architecture_plan.json schema.
    
    The returned example contains a "messages" list with three entries:
    - system: an instruction enforcing an exact JSON schema for the response,
    - user: a concise scenario describing services, language, database, cloud, optional queue/GPU/schedule, latency, and cost,
    - assistant: a JSON string containing the recommended architecture, inputs metadata, and source.
    
    Returns:
        example (Dict[str, Any]): A dictionary with a "messages" key whose value is a list of three message objects (system, user, assistant). The assistant message content is a JSON string with the keys "architecture", "inputs", and "source".
    """
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
    """
    Create a DPO-style preference training example containing a prompt, a preferred solution, and a rejected alternative.
    
    The generated example simulates a human prompt describing services and constraints and two JSON-serialized responses: a chosen (correct) architecture and a rejected (suboptimal) alternative.
    
    Returns:
        example (Dict[str, Any]): A dictionary with:
            - "prompt" (str): A short human-facing prompt describing services, database, optional queue, and optional GPU requirement.
            - "chosen" (str): A JSON string with keys "pattern", "components", and "rationale" representing the recommended architecture.
            - "rejected" (str): A JSON string with keys "pattern", "components", and "rationale" representing a deliberately suboptimal alternative.
    """
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
    """
    Generate synthetic SFT training examples and optional DPO preference examples, write them as newline-delimited JSON objects to disk, and print a summary and a sample example to stdout.
    
    Parses command-line arguments:
        --count: number of examples to generate.
        --output: file path for SFT JSONL output.
        --dpo: when present, also generate DPO preference data.
        --dpo-output: file path for DPO JSONL output.
    
    Side effects:
        - Writes SFT examples to the specified output file in JSON Lines format.
        - If --dpo is set, writes DPO examples to the specified DPO output file in JSON Lines format.
        - Prints progress, saved file paths, and a sample training example to stdout.
    """
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