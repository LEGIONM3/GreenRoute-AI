import os
import logging
from typing import List, Dict, Any, Tuple, Generator, Optional
from groq import Groq
from app.core.config import settings

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """You are the EcoGuide AI Assistant, an authoritative municipal and environmental waste management expert operating under the Smart Waste Management & Disposal Platform.

Your guidelines:
1. Provide scientifically accurate, practical, and regulation-compliant waste disposal advice.
2. Align with standard 3-stream segregation rules:
   - Green Bin (Wet/Biodegradable): Kitchen waste, vegetables, fruit peels, leftovers, garden waste, tea leaves.
   - Blue Bin (Dry/Recyclable): Paper, cardboard, clean plastics, glass bottles, metal cans, milk pouches (rinsed).
   - Red Bin / Black Bin (Domestic Hazardous & Sanitary): Diapers, sanitary pads, expired medicine, batteries, chemicals, paint.
   - Designated E-Waste / Authorized Recyclers: Electronics, circuit boards, CFL/LED bulbs, cables.
3. Be respectful, encouraging, and actionable. Suggest nearby disposal centers and municipal collection guidelines when appropriate.
4. If relevant context documents or policies are provided in the prompt, cite them clearly using bracketed numbers or titles.
"""


class GroqService:
    def __init__(self):
        self.api_key = settings.GROQ_API_KEY
        self.client: Optional[Groq] = None
        if self.api_key:
            try:
                self.client = Groq(api_key=self.api_key)
            except Exception as e:
                logger.error(f"Failed to initialize Groq client: {e}")
        
        # Candidate model cascade order
        self.models_to_try = [
            settings.GROQ_PRIMARY_MODEL,
            *settings.GROQ_FALLBACK_MODELS,
            "llama3-8b-8192",
            "gemma2-9b-it"
        ]

    def calculate_token_budget(
        self,
        system_prompt: str,
        context_text: str,
        user_query: str,
        response_mode: str = "auto",
        model_context_limit: int = 8192,
        default_max_tokens: int = 1024
    ) -> Dict[str, Any]:
        """
        Dynamic Response Budgeting:
        Calculates input token consumption and allocates available completion headroom.
        Prioritizes:
        1. Disposal recommendation (bin color & instructions)
        2. Safety warning (hazards, toxicities)
        3. Nearest facility
        4. Source citation
        """
        # Character heuristic estimation (approx 3.8 chars per token)
        sys_tokens = int(len(system_prompt) / 3.8)
        ctx_tokens = int(len(context_text) / 3.8)
        query_tokens = int(len(user_query) / 3.8)
        total_prompt_tokens = sys_tokens + ctx_tokens + query_tokens

        available_headroom = max(100, min(default_max_tokens, model_context_limit - total_prompt_tokens - 150))

        effective_mode = response_mode.lower() if response_mode else "auto"
        if effective_mode == "auto":
            if available_headroom < 350:
                effective_mode = "short"
            elif len(user_query.split()) > 18:
                effective_mode = "detailed"
            else:
                effective_mode = "normal"

        # Mode-based token ceilings
        if effective_mode == "short":
            target_completion_tokens = min(220, available_headroom)
            mode_instruction = (
                "Provide a concise, high-priority summary in 3 clear bullet points:\n"
                "1. Segregation Bin designation\n"
                "2. Step-by-step disposal action\n"
                "3. Crucial safety warning or hazard\n"
                "Omit verbose preambles and historical background."
            )
        elif effective_mode == "detailed":
            target_completion_tokens = min(1024, available_headroom)
            mode_instruction = (
                "Provide a comprehensive, authoritative breakdown covering:\n"
                "1. Specific bin color and statutory segregation rule (CPCB / SWM 2016)\n"
                "2. Thorough cleaning, dismantling, or collection protocols\n"
                "3. Chemical, fire, or environmental hazards of improper handling\n"
                "4. Authorized recycling processing mechanics and facility types."
            )
        else:  # normal
            target_completion_tokens = min(550, available_headroom)
            mode_instruction = (
                "Provide balanced citizen guidance covering designated bin color, proper preparation steps, "
                "safety precautions, and recycling potential."
            )

        return {
            "system_prompt_tokens": sys_tokens,
            "context_tokens": ctx_tokens,
            "query_tokens": query_tokens,
            "total_prompt_tokens": total_prompt_tokens,
            "available_headroom": available_headroom,
            "effective_mode": effective_mode,
            "target_completion_tokens": target_completion_tokens,
            "mode_instruction": mode_instruction,
            "is_constrained": available_headroom < 350
        }

    def generate_completion(
        self,
        messages: List[Dict[str, str]],
        temperature: float = 0.2,
        max_tokens: int = 1024,
        response_mode: str = "auto"
    ) -> Tuple[str, str]:
        """Cascades through available Groq models with dynamic response budgeting."""
        if not self.client:
            return self._local_fallback(messages, response_mode=response_mode), "local-fallback"

        # Prepend system prompt if not present
        formatted_messages = list(messages)
        if not formatted_messages or formatted_messages[0].get("role") != "system":
            formatted_messages.insert(0, {"role": "system", "content": SYSTEM_PROMPT})

        # Calculate dynamic budget based on prompt content
        user_content = next((m.get("content", "") for m in reversed(formatted_messages) if m.get("role") == "user"), "")
        budget = self.calculate_token_budget(
            system_prompt=SYSTEM_PROMPT,
            context_text=user_content,
            user_query=user_content,
            response_mode=response_mode,
            default_max_tokens=max_tokens
        )
        effective_max_tokens = budget["target_completion_tokens"]

        last_error = None
        for model in self.models_to_try:
            try:
                logger.info(f"Attempting Groq model: {model} with max_tokens={effective_max_tokens} (mode={budget['effective_mode']})")
                response = self.client.chat.completions.create(
                    model=model,
                    messages=formatted_messages,
                    temperature=temperature,
                    max_tokens=effective_max_tokens,
                )
                answer = response.choices[0].message.content
                logger.info(f"Successfully generated response with model: {model}")
                return answer, model
            except Exception as e:
                last_error = e
                logger.warning(f"Groq model {model} failed: {e}. Trying next fallback...")
                continue

        logger.error(f"All Groq models exhausted. Last error: {last_error}. Invoking local fallback.")
        return self._local_fallback(messages, response_mode=response_mode), "local-fallback"

    def stream_completion(
        self,
        messages: List[Dict[str, str]],
        temperature: float = 0.2,
        max_tokens: int = 1024,
        response_mode: str = "auto"
    ) -> Generator[str, None, None]:
        """Streams completion tokens with budget constraints using first responsive Groq model."""
        if not self.client:
            yield self._local_fallback(messages, response_mode=response_mode)
            return

        formatted_messages = list(messages)
        if not formatted_messages or formatted_messages[0].get("role") != "system":
            formatted_messages.insert(0, {"role": "system", "content": SYSTEM_PROMPT})

        user_content = next((m.get("content", "") for m in reversed(formatted_messages) if m.get("role") == "user"), "")
        budget = self.calculate_token_budget(
            system_prompt=SYSTEM_PROMPT,
            context_text=user_content,
            user_query=user_content,
            response_mode=response_mode,
            default_max_tokens=max_tokens
        )
        effective_max_tokens = budget["target_completion_tokens"]

        for model in self.models_to_try:
            try:
                stream = self.client.chat.completions.create(
                    model=model,
                    messages=formatted_messages,
                    temperature=temperature,
                    max_tokens=effective_max_tokens,
                    stream=True,
                )
                for chunk in stream:
                    delta = chunk.choices[0].delta.content
                    if delta:
                        yield delta
                return
            except Exception as e:
                logger.warning(f"Streaming failed for Groq model {model}: {e}")
                continue

        # If all streaming failed
        yield self._local_fallback(messages, response_mode=response_mode)

    def _local_fallback(self, messages: List[Dict[str, str]], response_mode: str = "auto") -> str:
        """Deterministic high-quality fallback synthesis formatted cleanly without markdown artifacts."""
        user_query = ""
        for m in reversed(messages):
            if m.get("role") == "user":
                user_query = m.get("content", "")
                break
                
        # Clean clean text without raw hash headers or noisy symbols
        if response_mode == "short":
            return (
                f"Disposal Guidance for {user_query}:\n\n"
                f"• Segregation Bin: Green for organic/wet, Blue for dry recyclables, Red for hazardous and batteries.\n"
                f"• Disposal Method: Clean and rinse before putting in dry bin. Ensure battery terminals are taped.\n"
                f"• Safety Precaution: Never burn plastic, electronics, or chemical containers."
            )
        
        return (
            f"Official Statutory Guidance for {user_query}:\n\n"
            f"1. Segregation Bin Assignment:\n"
            f"• Green Bin (Wet Waste): Biodegradable kitchen and food scraps for scientific composting.\n"
            f"• Blue Bin (Dry Recyclables): Rinsed plastics, paper, cardboard, glass containers, and metals.\n"
            f"• Red Bin (Hazardous & Sanitary): Batteries, medicines, chemicals, CFL bulbs, and sanitary products.\n"
            f"• E-Waste Kiosk: Computers, mobile phones, chargers, and circuit boards.\n\n"
            f"2. Recommended Preparation:\n"
            f"Rinse food residues from containers and dry before placing in blue recycling bins. "
            f"Electronic and chemical items must be handed over to authorized collection centers.\n\n"
            f"3. Safety Precaution:\n"
            f"Open burning of waste releases carcinogenic dioxins and is strictly prohibited under National Solid Waste Management Rules."
        )


groq_service = GroqService()
