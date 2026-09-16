import re
from typing import List, Dict, Any


class GroundingValidator:
    """
    Hallucination Detection & Answer Grounding Engine.
    Verifies that generated answers do not fabricate facts outside retrieved statutory context.
    """

    @staticmethod
    def extract_propositions(text: str) -> List[str]:
        """Splits answer text into discrete factual sentences."""
        sentences = re.split(r"(?<=[.!?])\s+", text)
        return [s.strip() for s in sentences if len(s.strip()) > 15]

    def evaluate_grounding(
        self,
        answer: str,
        retrieved_contexts: List[str]
    ) -> Dict[str, Any]:
        """
        Evaluates the degree of factual grounding between the answer and retrieved passages.
        Returns grounding_score, is_grounded, and unsupported_claims.
        """
        if not answer or not retrieved_contexts:
            return {
                "grounding_score": 0.5,
                "is_grounded": False,
                "unsupported_claims": ["No retrieved context provided for verification."],
                "total_claims": 0
            }

        combined_context = " ".join(retrieved_contexts).lower()
        propositions = self.extract_propositions(answer)
        if not propositions:
            return {
                "grounding_score": 1.0,
                "is_grounded": True,
                "unsupported_claims": [],
                "total_claims": 0
            }

        supported_count = 0
        unsupported = []

        for prop in propositions:
            # Extract key informative words (nouns/verbs/numbers)
            tokens = [w.lower() for w in re.findall(r"\w+", prop) if len(w) > 3]
            if not tokens:
                supported_count += 1
                continue

            matches = sum(1 for t in tokens if t in combined_context)
            token_support_ratio = matches / len(tokens)

            if token_support_ratio >= 0.40:
                supported_count += 1
            else:
                unsupported.append(prop)

        grounding_score = supported_count / len(propositions)
        is_grounded = grounding_score >= 0.65

        return {
            "grounding_score": round(grounding_score, 2),
            "is_grounded": is_grounded,
            "unsupported_claims": unsupported,
            "total_claims": len(propositions),
            "supported_claims": supported_count
        }


grounding_validator = GroundingValidator()
