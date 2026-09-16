"""
Enterprise Multi-Tier Cache Service
Phase 11: Performance Engineering

Provides:
- L1 Local In-Memory TTL Cache (zero network overhead, instant retrieval)
- L2 Redis Distributed Cache (cross-worker consistency)
- Graceful degradation: falls back to L1 if Redis is unavailable
- Automatic serialization/deserialization for JSON payloads
- Tenant-aware key namespacing
"""

import json
import logging
import time
from typing import Any, Optional, Dict
from threading import Lock

logger = logging.getLogger("enterprise.cache")

try:
    import redis
    REDIS_INSTALLED = True
except ImportError:
    REDIS_INSTALLED = False


class InMemoryCache:
    """Thread-safe in-memory cache with TTL support."""

    def __init__(self, max_items: int = 5000):
        self._store: Dict[str, Dict[str, Any]] = {}
        self._lock = Lock()
        self._max_items = max_items

    def get(self, key: str) -> Optional[Any]:
        with self._lock:
            item = self._store.get(key)
            if not item:
                return None
            if time.time() > item["expires_at"]:
                del self._store[key]
                return None
            return item["data"]

    def set(self, key: str, value: Any, ttl: int = 300) -> None:
        with self._lock:
            # Simple eviction if oversized
            if len(self._store) >= self._max_items:
                # Evict oldest 10%
                now = time.time()
                expired = [k for k, v in self._store.items() if now > v["expires_at"]]
                for k in expired:
                    del self._store[k]
                if len(self._store) >= self._max_items:
                    # Evict first 10 items
                    for k in list(self._store.keys())[:50]:
                        del self._store[k]

            self._store[key] = {
                "data": value,
                "expires_at": time.time() + ttl
            }

    def delete(self, key: str) -> None:
        with self._lock:
            self._store.pop(key, None)

    def invalidate_prefix(self, prefix: str) -> int:
        with self._lock:
            keys_to_del = [k for k in self._store if k.startswith(prefix)]
            for k in keys_to_del:
                del self._store[k]
            return len(keys_to_del)

    def clear(self) -> None:
        with self._lock:
            self._store.clear()

    def size(self) -> int:
        with self._lock:
            return len(self._store)


class EnterpriseCacheService:
    """Multi-tier caching service combining L1 Memory and L2 Redis."""

    def __init__(self):
        self.l1 = InMemoryCache()
        self._redis_client = None
        self._redis_connected = False
        self._init_redis()

    def _init_redis(self):
        if not REDIS_INSTALLED:
            logger.info("Redis library not available. Operating in L1 In-Memory Cache mode.")
            return

        try:
            from app.core.config import settings
            redis_url = getattr(settings, "REDIS_URL", "redis://localhost:6379/0")
            self._redis_client = redis.Redis.from_url(
                redis_url,
                decode_responses=True,
                socket_timeout=1.5,
                socket_connect_timeout=2.0
            )
            # Test ping with short timeout
            self._redis_client.ping()
            self._redis_connected = True
            logger.info("Connected to Redis L2 Cache.")
        except Exception:
            self._redis_connected = False
            logger.warning("Redis L2 Cache unavailable. Operating in L1 In-Memory mode.")

    def build_key(self, tenant_id: str, namespace: str, key_data: str) -> str:
        """Construct a standardized, tenant-isolated cache key."""
        clean_tenant = tenant_id or "default"
        return f"{clean_tenant}:{namespace}:{key_data}"

    def get(self, key: str) -> Optional[Any]:
        """Fetch from L1 then L2."""
        # 1. Check L1 Memory
        val = self.l1.get(key)
        if val is not None:
            return val

        # 2. Check L2 Redis
        if self._redis_connected and self._redis_client:
            try:
                raw = self._redis_client.get(key)
                if raw is not None:
                    parsed = json.loads(raw)
                    # Populate L1 for subsequent hot reads
                    self.l1.set(key, parsed, ttl=60)
                    return parsed
            except Exception as e:
                logger.debug(f"Redis get failed: {e}")

        return None

    def set(self, key: str, value: Any, ttl: int = 300) -> None:
        """Set in both L1 Memory and L2 Redis."""
        # Set in L1
        self.l1.set(key, value, ttl=ttl)

        # Set in L2
        if self._redis_connected and self._redis_client:
            try:
                serialized = json.dumps(value, default=str)
                self._redis_client.setex(key, ttl, serialized)
            except Exception as e:
                logger.debug(f"Redis set failed: {e}")

    def delete(self, key: str) -> None:
        """Delete from both cache layers."""
        self.l1.delete(key)
        if self._redis_connected and self._redis_client:
            try:
                self._redis_client.delete(key)
            except Exception as e:
                logger.debug(f"Redis delete failed: {e}")

    def invalidate_prefix(self, prefix: str) -> int:
        """Invalidate keys matching prefix."""
        count = self.l1.invalidate_prefix(prefix)
        if self._redis_connected and self._redis_client:
            try:
                keys = self._redis_client.keys(f"{prefix}*")
                if keys:
                    self._redis_client.delete(*keys)
                    count += len(keys)
            except Exception as e:
                logger.debug(f"Redis prefix invalidation failed: {e}")
        return count

    def get_stats(self) -> Dict[str, Any]:
        """Cache diagnostic telemetry."""
        return {
            "l1_memory_items": self.l1.size(),
            "l2_redis_connected": self._redis_connected,
            "mode": "hybrid_l1_l2" if self._redis_connected else "l1_memory_only"
        }


# Singleton instance
cache_service = EnterpriseCacheService()
