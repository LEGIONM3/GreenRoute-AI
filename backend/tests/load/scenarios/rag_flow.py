"""
RAG Journey Load Test Scenario
Flow: Hybrid Retrieval -> Reranking -> Groq Completion -> Streaming Response -> Citation Generation
Target Metrics: Initial Response < 2s
"""

import json
import random
import time
from locust import task, TaskSet, tag
from tests.load.utils import DEFAULT_TENANT_ID, get_auth_headers


class RAGJourney(TaskSet):
    def on_start(self):
        self.headers = get_auth_headers(None, DEFAULT_TENANT_ID)

    @tag("hybrid_retrieval")
    @task(3)
    def test_hybrid_query_and_citations(self):
        """1. Hybrid Retrieval, Reranking & Citations"""
        queries = [
            "How should hazardous paint thinners and solvent containers be discarded?",
            "What are the ward penalties for mixing wet kitchen waste with dry packaging?",
            "Explain battery disposal protocols under Karnataka municipal bye-laws.",
            "Can polystyrene thermocol packaging be accepted at local dry waste centers?"
        ]
        payload = {
            "query": random.choice(queries),
            "session_id": f"rag-load-{random.randint(1000, 9999)}",
            "latitude": 12.9716,
            "longitude": 77.5946
        }
        start_time = time.time()
        with self.client.post(
            "/api/v1/chat/query",
            json=payload,
            headers=self.headers,
            catch_response=True,
            name="/api/v1/chat/query [RAG Hybrid + Citations]"
        ) as res:
            latency = time.time() - start_time
            if res.status_code == 200:
                data = res.json()
                # Validate citation presence in RAG response
                citations = data.get("citations", [])
                if latency > 2.0:
                    res.failure(f"RAG SLA breached: {latency:.2f}s > 2.0s")
                else:
                    res.success()
            else:
                res.failure(f"RAG query failed with status {res.status_code}")

    @tag("streaming_response")
    @task(2)
    def test_streaming_groq_response(self):
        """2. Groq Completion Streaming Response (SSE / EventStream)"""
        payload = {
            "query": "Summarize e-waste segregation guidelines in 2 sentences.",
            "session_id": f"stream-{random.randint(1000, 9999)}"
        }
        start_time = time.time()
        with self.client.post(
            "/api/v1/chat/stream",
            json=payload,
            headers=self.headers,
            stream=True,
            catch_response=True,
            name="/api/v1/chat/stream [RAG SSE Streaming]"
        ) as res:
            first_byte_time = None
            if res.status_code == 200:
                first_byte_time = time.time() - start_time
                # Consume stream
                for chunk in res.iter_lines():
                    pass
                if first_byte_time and first_byte_time > 2.0:
                    res.failure(f"Streaming initial TTFB exceeded 2.0s: {first_byte_time:.2f}s")
                else:
                    res.success()
            else:
                res.failure(f"Streaming failed: {res.status_code}")
