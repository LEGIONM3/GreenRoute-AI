import re
import math
import hashlib
from typing import List, Dict, Any, Optional
import numpy as np


class EmbeddingService:
    def __init__(self, dimension: int = 384):
        self.dimension = dimension

    def chunk_text(self, text: str, chunk_size: int = 500, overlap: int = 100) -> List[str]:
        """
        Splits text into chunks preserving sentence boundaries where possible.
        """
        if not text:
            return []
        
        # Split by paragraph or sentence boundaries
        paragraphs = [p.strip() for p in re.split(r"\n\n+", text) if p.strip()]
        chunks = []
        current_chunk = ""

        for para in paragraphs:
            if len(current_chunk) + len(para) <= chunk_size:
                current_chunk = f"{current_chunk}\n\n{para}".strip()
            else:
                if current_chunk:
                    chunks.append(current_chunk)
                # If a single paragraph is larger than chunk_size, split by sentences
                if len(para) > chunk_size:
                    sentences = re.split(r"(?<=[.!?])\s+", para)
                    sub_chunk = ""
                    for s in sentences:
                        if len(sub_chunk) + len(s) <= chunk_size:
                            sub_chunk = f"{sub_chunk} {s}".strip()
                        else:
                            if sub_chunk:
                                chunks.append(sub_chunk)
                            sub_chunk = s
                    if sub_chunk:
                        chunks.append(sub_chunk)
                    current_chunk = ""
                else:
                    current_chunk = para

        if current_chunk:
            chunks.append(current_chunk)

        # Apply overlap between consecutive chunks if applicable
        if len(chunks) <= 1:
            return chunks

        overlapped_chunks = [chunks[0]]
        for i in range(1, len(chunks)):
            prev_tail = chunks[i - 1][-overlap:] if len(chunks[i - 1]) > overlap else chunks[i - 1]
            overlapped_chunks.append(f"...{prev_tail}...\n{chunks[i]}")

        return overlapped_chunks

    def get_embedding(self, text: str) -> List[float]:
        """
        Deterministic, localized semantic embedding vector (L2-normalized 384-d).
        Combines word-level n-grams and hashed feature projections.
        """
        if not text:
            return [0.0] * self.dimension

        cleaned = text.lower()
        words = re.findall(r"\b[a-z0-9_-]{2,}\b", cleaned)
        
        vector = np.zeros(self.dimension, dtype=np.float32)

        # 1. Word feature hashing
        for i, word in enumerate(words):
            # Term weight with position decay
            weight = 1.0 / math.log2(i + 2)
            # Hash to index
            h = int(hashlib.md5(word.encode("utf-8")).hexdigest(), 16)
            idx = h % self.dimension
            sign = 1.0 if ((h >> 8) & 1) == 0 else -1.0
            vector[idx] += sign * weight

            # Bigram feature
            if i > 0:
                bigram = f"{words[i-1]}_{word}"
                h_bi = int(hashlib.sha256(bigram.encode("utf-8")).hexdigest(), 16)
                idx_bi = h_bi % self.dimension
                sign_bi = 1.0 if ((h_bi >> 8) & 1) == 0 else -1.0
                vector[idx_bi] += sign_bi * 1.5

        # 2. Character 3-grams for morphology (e.g. "recycl" in "recycle", "recycling", "recyclable")
        for i in range(len(cleaned) - 2):
            trigram = cleaned[i:i+3]
            h_tri = int(hashlib.sha1(trigram.encode("utf-8")).hexdigest(), 16)
            idx_tri = h_tri % self.dimension
            vector[idx_tri] += 0.2

        # L2 Normalize
        norm = np.linalg.norm(vector)
        if norm > 0:
            vector = vector / norm

        return vector.tolist()

    @staticmethod
    def cosine_similarity(vec_a: List[float], vec_b: List[float]) -> float:
        if not vec_a or not vec_b or len(vec_a) != len(vec_b):
            return 0.0
        
        a = np.array(vec_a, dtype=np.float32)
        b = np.array(vec_b, dtype=np.float32)
        
        norm_a = np.linalg.norm(a)
        norm_b = np.linalg.norm(b)
        
        if norm_a == 0 or norm_b == 0:
            return 0.0
        
        return float(np.dot(a, b) / (norm_a * norm_b))


embedding_service = EmbeddingService()
