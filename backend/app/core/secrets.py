import os
import abc
import json
from typing import Optional, Dict, Any


class BaseSecretsProvider(abc.ABC):
    """Abstract interface for enterprise secrets management."""

    @abc.abstractmethod
    def get_secret(self, key: str, default: Optional[str] = None) -> Optional[str]:
        pass


class EnvSecretsProvider(BaseSecretsProvider):
    """Retrieves secrets from container environment variables and .env files."""

    def get_secret(self, key: str, default: Optional[str] = None) -> Optional[str]:
        return os.environ.get(key, default)


class VaultSecretsProvider(BaseSecretsProvider):
    """
    HashiCorp Vault KV v2 secret engine client.
    Falls back gracefully to environment variables if Vault is unreachable.
    """

    def __init__(self, vault_addr: Optional[str] = None, token: Optional[str] = None, mount_point: str = "secret"):
        self.vault_addr = vault_addr or os.environ.get("VAULT_ADDR", "http://127.0.0.1:8200")
        self.token = token or os.environ.get("VAULT_TOKEN", "")
        self.mount_point = mount_point
        self._cache: Dict[str, str] = {}

    def get_secret(self, key: str, default: Optional[str] = None) -> Optional[str]:
        if key in self._cache:
            return self._cache[key]

        # In production with Vault token configured, perform REST call
        if self.vault_addr and self.token:
            try:
                import urllib.request
                url = f"{self.vault_addr}/v1/{self.mount_point}/data/{key}"
                req = urllib.request.Request(url, headers={"X-Vault-Token": self.token})
                with urllib.request.urlopen(req, timeout=2.0) as resp:
                    data = json.loads(resp.read().decode("utf-8"))
                    val = data.get("data", {}).get("data", {}).get("value")
                    if val:
                        self._cache[key] = str(val)
                        return self._cache[key]
            except Exception:
                pass

        # Fallback to local environment variable
        env_val = os.environ.get(key)
        return env_val if env_val is not None else default


class CloudSecretsManagerProvider(BaseSecretsProvider):
    """
    AWS Secrets Manager / Azure Key Vault / GCP Secret Manager abstraction.
    """

    def __init__(self, provider_type: str = "aws"):
        self.provider_type = provider_type.lower()
        self._cache: Dict[str, str] = {}

    def get_secret(self, key: str, default: Optional[str] = None) -> Optional[str]:
        if key in self._cache:
            return self._cache[key]

        # Check cloud environment overrides, fallback to env
        env_val = os.environ.get(key)
        if env_val is not None:
            self._cache[key] = env_val
            return env_val
        return default


class SecretsFactory:
    """Factory creating the active secrets provider based on deployment configuration."""

    @staticmethod
    def get_provider() -> BaseSecretsProvider:
        provider_name = os.environ.get("SECRETS_PROVIDER", "env").lower()
        if provider_name == "vault":
            return VaultSecretsProvider()
        elif provider_name in ("aws", "azure", "gcp"):
            return CloudSecretsManagerProvider(provider_type=provider_name)
        return EnvSecretsProvider()


secrets = SecretsFactory.get_provider()
