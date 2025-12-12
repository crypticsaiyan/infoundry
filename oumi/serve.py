"""
Oumi Model Server for InFoundry

Can use either:
1. Ollama (if running)
2. Local trained model
3. Heuristic fallback
"""

import json
import os
import urllib.request
from typing import Optional

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

app = FastAPI(title="InFoundry Architecture Brain")


class Message(BaseModel):
    role: str
    content: str


class CompletionRequest(BaseModel):
    model: str = "codellama"
    messages: Optional[list[Message]] = None
    prompt: Optional[str] = None
    max_tokens: int = 2000
    temperature: float = 0.7


# Configuration
OLLAMA_URL = os.environ.get("OLLAMA_URL", "http://localhost:11434")
USE_OLLAMA = os.environ.get("USE_OLLAMA", "true").lower() == "true"


def call_ollama(prompt: str, model: str = "codellama") -> Optional[str]:
    """Call Ollama API."""
    try:
        payload = {
            "model": model,
            "prompt": prompt,
            "stream": False
        }
        req = urllib.request.Request(
            f"{OLLAMA_URL}/api/generate",
            data=json.dumps(payload).encode(),
            headers={"Content-Type": "application/json"}
        )
        with urllib.request.urlopen(req, timeout=120) as resp:
            result = json.load(resp)
            return result.get("response", "")
    except Exception as e:
        print(f"Ollama error: {e}")
        return None


def heuristic_response(prompt: str) -> dict:
    """Fallback heuristic."""
    prompt_lower = prompt.lower()
    
    # Simple pattern matching
    if "kafka" in prompt_lower or "queue" in prompt_lower:
        pattern = "event_driven"
        components = ["msk", "lambda_functions", "eventbridge"]
    elif "kubernetes" in prompt_lower or "5" in prompt or "6" in prompt:
        pattern = "kubernetes"
        components = ["eks_cluster", "alb", "rds", "elasticache"]
    elif "lambda" in prompt_lower or "serverless" in prompt_lower:
        pattern = "serverless"
        components = ["api_gateway", "lambda_functions", "dynamodb"]
    else:
        pattern = "microservices_ecs"
        components = ["ecs_cluster", "alb", "rds"]
    
    if "high" in prompt_lower or "latency" in prompt_lower:
        components.extend(["elasticache", "cdn", "hpa"])
    
    return {
        "pattern": pattern,
        "components": list(set(components)),
        "rationale": f"Selected {pattern} based on input analysis"
    }


@app.post("/v1/chat/completions")
async def chat_completions(request: CompletionRequest):
    """OpenAI-compatible endpoint."""
    if request.messages:
        prompt = request.messages[-1].content
    elif request.prompt:
        prompt = request.prompt
    else:
        raise HTTPException(400, "No prompt provided")
    
    # Add system prompt for architecture
    full_prompt = f"""You are an expert cloud architect. Given the input, respond with ONLY a JSON object containing:
- pattern: serverless, microservices_ecs, kubernetes, or event_driven
- components: list of AWS components
- rationale: brief explanation

Input: {prompt}

JSON Response:"""
    
    response = None
    if USE_OLLAMA:
        response = call_ollama(full_prompt, request.model)
    
    if not response:
        response = json.dumps(heuristic_response(prompt))
    
    return {
        "id": "cmpl-infoundry",
        "choices": [{
            "message": {"role": "assistant", "content": response},
            "finish_reason": "stop"
        }]
    }


@app.post("/v1/completions")
async def completions(request: CompletionRequest):
    """Legacy completions endpoint."""
    prompt = request.prompt or ""
    
    response = None
    if USE_OLLAMA:
        response = call_ollama(prompt, request.model)
    
    if not response:
        response = json.dumps(heuristic_response(prompt))
    
    return {
        "choices": [{"text": response, "finish_reason": "stop"}]
    }


@app.get("/health")
async def health():
    # Check if Ollama is available
    ollama_ok = False
    try:
        req = urllib.request.Request(f"{OLLAMA_URL}/api/tags")
        with urllib.request.urlopen(req, timeout=5) as resp:
            ollama_ok = resp.status == 200
    except:
        pass
    
    return {
        "status": "healthy",
        "ollama_available": ollama_ok,
        "ollama_url": OLLAMA_URL
    }


if __name__ == "__main__":
    import uvicorn
    print(f"Starting server... Ollama URL: {OLLAMA_URL}")
    uvicorn.run(app, host="0.0.0.0", port=8000)
