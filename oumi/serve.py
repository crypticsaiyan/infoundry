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
USE_OLLAMA = os.environ.get("USE_OLLAMA", "false").lower() == "true"
USE_OUMI = os.environ.get("USE_OUMI", "true").lower() == "true"
OUMI_MODEL = "Qwen/Qwen2.5-1.5B-Instruct"
OUMI_ADAPTER = "./trained_model"

# Lazy-loaded Oumi model
_oumi_config = None

def get_oumi_config():
    """Get or create Oumi inference config (lazy load)."""
    global _oumi_config
    if _oumi_config is None:
        try:
            from oumi import infer
            from oumi.core.configs import InferenceConfig
            from oumi.core.configs.params.model_params import ModelParams
            from oumi.core.configs.params.generation_params import GenerationParams
            
            _oumi_config = InferenceConfig(
                model=ModelParams(
                    model_name=OUMI_MODEL,
                    adapter_model=OUMI_ADAPTER if os.path.exists(OUMI_ADAPTER) else None,
                    trust_remote_code=True,
                ),
                generation=GenerationParams(
                    max_new_tokens=400,
                    temperature=0.1,
                ),
            )
            print(f"✓ Loaded Oumi model: {OUMI_MODEL}")
        except Exception as e:
            print(f"Failed to load Oumi: {e}")
            _oumi_config = False
    return _oumi_config


def call_oumi(prompt: str) -> Optional[str]:
    """Call the trained Oumi model for inference."""
    config = get_oumi_config()
    if not config:
        return None
    try:
        from oumi import infer
        response = infer(config, [prompt])
        result = str(response[0])
        if "ASSISTANT:" in result:
            result = result.split("ASSISTANT:")[-1].strip()
        if "] metadata=" in result:
            result = result.split("] metadata=")[0]
        return result
    except Exception as e:
        print(f"Oumi error: {e}")
        return None


def call_ollama(prompt: str, model: str = "codellama") -> Optional[str]:
    """
    Request a text completion from the configured Ollama server.
    
    Parameters:
        prompt (str): The prompt to send to Ollama.
        model (str): The Ollama model name to use (defaults to "codellama").
    
    Returns:
        response (str) if Ollama returned a response, `None` if the request failed or no response was available.
    """
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
    """
    Generate a heuristic architecture recommendation based on a text prompt.
    
    Parameters:
        prompt (str): Natural-language description of application requirements or constraints used to infer an architecture pattern.
    
    Returns:
        dict: A dictionary with the following keys:
            - pattern (str): The selected deployment pattern name (e.g., "event_driven", "kubernetes", "serverless", "microservices_ecs").
            - components (list[str]): A unique list of suggested infrastructure components.
            - rationale (str): A short explanation of why the pattern was selected.
    """
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
    """
    Serve an OpenAI-compatible chat completions endpoint that produces a JSON architectural recommendation.
    
    Extracts the prompt from the last message in `request.messages` or from `request.prompt`; if neither is provided, raises an HTTPException with status 400. Prepends a system instruction requiring a JSON object with keys `pattern`, `components`, and `rationale`. Attempts to obtain a model-generated response via Ollama when enabled; if that fails or returns no result, falls back to a heuristic response. Returns the result wrapped in an OpenAI-like response object.
    
    Parameters:
        request (CompletionRequest): Input payload containing either `messages` (uses the last message's content), or `prompt`; may include `model` to select the model used when calling Ollama.
    
    Returns:
        dict: OpenAI-style response with an `"id"` of `"cmpl-infoundry"` and a single choice whose `message` (role `"assistant"`) `content` is the JSON recommendation and whose `finish_reason` is `"stop"`.
    
    Raises:
        HTTPException: Raised with status 400 when no prompt is provided in the request.
    """
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
    
    # Try Oumi first (trained model)
    if USE_OUMI:
        response = call_oumi(full_prompt)
    
    # Fall back to Ollama
    if not response and USE_OLLAMA:
        response = call_ollama(full_prompt, request.model)
    
    # Ultimate fallback to heuristics
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
    """
    Handle legacy completions requests and produce a single text choice.
    
    Uses the configured Ollama service to generate text for the provided prompt; if Ollama is disabled or returns no result, falls back to a heuristic-derived response.
    
    Parameters:
        request (CompletionRequest): Request object containing at least `prompt` (string) and optional `model`.
    
    Returns:
        dict: A response object with a `choices` list containing a single item with keys:
            - `text`: the generated response string (JSON-serialized when from the heuristic fallback)
            - `finish_reason`: the string "stop"
    """
    prompt = request.prompt or ""
    
    response = None
    
    # Try Oumi first
    if USE_OUMI:
        response = call_oumi(prompt)
    
    # Fall back to Ollama
    if not response and USE_OLLAMA:
        response = call_ollama(prompt, request.model)
    
    # Ultimate fallback
    if not response:
        response = json.dumps(heuristic_response(prompt))
    
    return {
        "choices": [{"text": response, "finish_reason": "stop"}]
    }


@app.get("/health")
async def health():
    # Check if Ollama is available
    """
    Return overall service health and whether the configured Ollama service is reachable.
    
    Performs a quick availability probe of the configured Ollama URL and reports the result.
    
    Returns:
        dict: A mapping with keys:
            - "status": the service health string ("healthy").
            - "ollama_available": `True` if Ollama responded to the probe, `False` otherwise.
            - "ollama_url": the configured Ollama base URL.
    """
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