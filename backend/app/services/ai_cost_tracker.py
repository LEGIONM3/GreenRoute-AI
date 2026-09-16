from typing import Dict, Any, Optional
from threading import Lock


class AICostTracker:
    """
    Tracks token consumption, estimated financial costs, and usage quotas per tenant.
    Groq LPU pricing estimates:
    - llama-3.3-70b-versatile: ~$0.59 / 1M prompt tokens, ~$0.79 / 1M completion tokens
    - qwen/qwen3.8-27b: ~$0.20 / 1M prompt tokens, ~$0.40 / 1M completion tokens
    """

    PRICE_PER_MILLION_PROMPT = 0.59
    PRICE_PER_MILLION_COMPLETION = 0.79

    def __init__(self):
        self._lock = Lock()
        self._total_prompt_tokens = 0
        self._total_completion_tokens = 0
        self._tenant_usage: Dict[str, Dict[str, int]] = {}

    def record_usage(
        self,
        tenant_id: str,
        prompt_tokens: int,
        completion_tokens: int,
        model: str = "llama-3.3-70b-versatile"
    ) -> Dict[str, Any]:
        with self._lock:
            self._total_prompt_tokens += prompt_tokens
            self._total_completion_tokens += completion_tokens

            t_stats = self._tenant_usage.get(tenant_id, {"prompt": 0, "completion": 0, "queries": 0})
            t_stats["prompt"] += prompt_tokens
            t_stats["completion"] += completion_tokens
            t_stats["queries"] += 1
            self._tenant_usage[tenant_id] = t_stats

            cost = (
                (prompt_tokens / 1_000_000 * self.PRICE_PER_MILLION_PROMPT) +
                (completion_tokens / 1_000_000 * self.PRICE_PER_MILLION_COMPLETION)
            )

            return {
                "prompt_tokens": prompt_tokens,
                "completion_tokens": completion_tokens,
                "estimated_cost_usd": round(cost, 6),
                "model": model,
                "tenant_id": tenant_id
            }

    def get_summary(self) -> Dict[str, Any]:
        with self._lock:
            total_tokens = self._total_prompt_tokens + self._total_completion_tokens
            total_cost = (
                (self._total_prompt_tokens / 1_000_000 * self.PRICE_PER_MILLION_PROMPT) +
                (self._total_completion_tokens / 1_000_000 * self.PRICE_PER_MILLION_COMPLETION)
            )
            return {
                "total_prompt_tokens": self._total_prompt_tokens,
                "total_completion_tokens": self._total_completion_tokens,
                "total_tokens": total_tokens,
                "estimated_total_cost_usd": round(total_cost, 4),
                "tenants_count": len(self._tenant_usage),
                "tenant_breakdown": self._tenant_usage
            }


ai_cost_tracker = AICostTracker()
