import time
from typing import Dict, Tuple, List
from threading import Lock


class MetricsRegistry:
    """
    Thread-safe Prometheus metrics collector and text exposition renderer.
    No heavy external C-extensions required; zero latency overhead.
    """

    def __init__(self):
        self._lock = Lock()
        # Counters: (name, tuple_of_labels) -> float
        self._counters: Dict[Tuple[str, Tuple[Tuple[str, str], ...]], float] = {}
        # Gauges: (name, tuple_of_labels) -> float
        self._gauges: Dict[Tuple[str, Tuple[Tuple[str, str], ...]], float] = {}
        # Histograms: (name, tuple_of_labels) -> list of recorded values
        self._histogram_sums: Dict[Tuple[str, Tuple[Tuple[str, str], ...]], float] = {}
        self._histogram_counts: Dict[Tuple[str, Tuple[Tuple[str, str], ...]], int] = {}

    def inc_counter(self, name: str, value: float = 1.0, labels: Dict[str, str] = None) -> None:
        """Increments a counter metric."""
        lbl_tuple = tuple(sorted((labels or {}).items()))
        key = (name, lbl_tuple)
        with self._lock:
            self._counters[key] = self._counters.get(key, 0.0) + value

    def set_gauge(self, name: str, value: float, labels: Dict[str, str] = None) -> None:
        """Sets a gauge metric."""
        lbl_tuple = tuple(sorted((labels or {}).items()))
        key = (name, lbl_tuple)
        with self._lock:
            self._gauges[key] = value

    def observe_histogram(self, name: str, value: float, labels: Dict[str, str] = None) -> None:
        """Records an observation for latency / duration."""
        lbl_tuple = tuple(sorted((labels or {}).items()))
        key = (name, lbl_tuple)
        with self._lock:
            self._histogram_sums[key] = self._histogram_sums.get(key, 0.0) + value
            self._histogram_counts[key] = self._histogram_counts.get(key, 0) + 1

    def generate_prometheus_text(self) -> str:
        """Generates valid Prometheus 0.0.4 text format output."""
        lines: List[str] = []
        with self._lock:
            # Render Counters
            counter_names = set(k[0] for k in self._counters.keys())
            for c_name in sorted(counter_names):
                lines.append(f"# TYPE {c_name} counter")
                for (name, labels), val in self._counters.items():
                    if name == c_name:
                        lbl_str = ",".join(f'{k}="{v}"' for k, v in labels)
                        lbl_part = f"{{{lbl_str}}}" if lbl_str else ""
                        lines.append(f"{name}{lbl_part} {val}")

            # Render Gauges
            gauge_names = set(k[0] for k in self._gauges.keys())
            for g_name in sorted(gauge_names):
                lines.append(f"# TYPE {g_name} gauge")
                for (name, labels), val in self._gauges.items():
                    if name == g_name:
                        lbl_str = ",".join(f'{k}="{v}"' for k, v in labels)
                        lbl_part = f"{{{lbl_str}}}" if lbl_str else ""
                        lines.append(f"{name}{lbl_part} {val}")

            # Render Histograms
            hist_names = set(k[0] for k in self._histogram_counts.keys())
            for h_name in sorted(hist_names):
                lines.append(f"# TYPE {h_name} histogram")
                for (name, labels), count in self._histogram_counts.items():
                    if name == h_name:
                        total_sum = self._histogram_sums.get((name, labels), 0.0)
                        lbl_str = ",".join(f'{k}="{v}"' for k, v in labels)
                        prefix = f"{{{lbl_str}}}" if lbl_str else ""
                        lines.append(f"{name}_count{prefix} {count}")
                        lines.append(f"{name}_sum{prefix} {total_sum:.4f}")

        return "\n".join(lines) + "\n"


metrics = MetricsRegistry()

# Initialize baseline counters
metrics.inc_counter("http_requests_total", 0, {"method": "GET", "status": "200"})
metrics.set_gauge("system_up", 1.0)
metrics.set_gauge("active_tenants_total", 3.0)
