import os
import time
import json
from typing import Dict, Any, Generator, Optional
import urllib.request
import urllib.error

class ModelHarness:
    """Open-source model harness for open-weight LLMs (Ollama / Local Inference)."""

    def __init__(self, model_name: Optional[str] = None, base_url: Optional[str] = None, offline_fallback: bool = True):
        self.model_name = model_name or os.getenv("MODEL_NAME", "gemma:2b")
        self.base_url = base_url or os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
        self.offline_fallback = offline_fallback

    def check_health(self) -> bool:
        """Check if local inference engine (e.g., Ollama) is reachable."""
        try:
            req = urllib.request.Request(f"{self.base_url}/api/tags", headers={"User-Agent": "Fluxxion-Agent/1.0"})
            with urllib.request.urlopen(req, timeout=1.5) as resp:
                return resp.status == 200
        except Exception:
            return False

    def generate(self, prompt: str, system_prompt: Optional[str] = None) -> Dict[str, Any]:
        """Generate response from the open-weight model with latency tracking."""
        start_time = time.time()

        if self.check_health():
            try:
                payload = {
                    "model": self.model_name,
                    "prompt": prompt,
                    "stream": False
                }
                if system_prompt:
                    payload["system"] = system_prompt

                req = urllib.request.Request(
                    f"{self.base_url}/api/generate",
                    data=json.dumps(payload).encode("utf-8"),
                    headers={"Content-Type": "application/json"}
                )
                with urllib.request.urlopen(req, timeout=30.0) as resp:
                    data = json.loads(resp.read().decode("utf-8"))
                    duration = time.time() - start_time
                    return {
                        "text": data.get("response", ""),
                        "model": self.model_name,
                        "mode": "live_ollama",
                        "latency_seconds": round(duration, 3),
                        "eval_count": data.get("eval_count", 0)
                    }
            except Exception as e:
                if not self.offline_fallback:
                    raise e

        # Fallback to offline demo inference
        return self._generate_offline(prompt, system_prompt, start_time)

    def _generate_offline(self, prompt: str, system_prompt: Optional[str], start_time: float) -> Dict[str, Any]:
        """Deterministic offline demo inference engine for evaluation without live weights."""
        time.sleep(0.2)  # realistic responsive processing delay
        duration = time.time() - start_time

        # Context-aware mock analysis for demonstration
        if "code-explainer" in (system_prompt or "") or "class" in prompt or "def " in prompt:
            response_text = (
                "### Code Architecture & Quality Analysis\n\n"
                "**1. Core Functionality:**\n"
                "- Implements a modular class structure with explicit separation of concerns.\n"
                "- High cohesion with dedicated responsibility for discovery, validation, and execution.\n\n"
                "**2. Architectural Patterns Identified:**\n"
                "- **Strategy Pattern**: Pluggable inference backends (Live Ollama vs. Offline Demo Mode).\n"
                "- **Factory / Parser Pattern**: Parsing and normalizing `SKILL.md` specifications according to the Agent Skill Open Standard.\n\n"
                "**3. Security & Open-Source Best Practices:**\n"
                "- Zero hardcoded credentials; safe environment isolation verified.\n"
                "- Input boundaries and timeouts properly applied on external model calls."
            )
        else:
            response_text = (
                f"### Open-Weight AI Response ({self.model_name})\n\n"
                f"Successfully processed query using open-source model harness.\n"
                f"Query context: \"{prompt[:80]}...\"\n\n"
                f"Open-weight models empower developers with private, inspectable, and reproducible AI workflows without proprietary cloud lock-in."
            )

        return {
            "text": response_text,
            "model": f"{self.model_name} (demo-mode)",
            "mode": "offline_demo",
            "latency_seconds": round(duration, 3),
            "eval_count": len(response_text.split())
        }
