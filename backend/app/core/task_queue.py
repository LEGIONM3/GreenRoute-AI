import time
import secrets
from typing import Callable, Any, Dict, Optional
from concurrent.futures import ThreadPoolExecutor


class TaskQueue:
    """
    Asynchronous Background Task Queue with Celery/Redis architecture compatibility.
    Executes non-blocking long-running jobs (PDF chunking, vector embedding, CSV imports).
    """

    def __init__(self, max_workers: int = 4):
        self._executor = ThreadPoolExecutor(max_workers=max_workers, thread_name_prefix="wastecare_worker")
        self._tasks: Dict[str, Dict[str, Any]] = {}

    def enqueue(self, task_name: str, fn: Callable, *args, **kwargs) -> str:
        """Schedules a function to execute asynchronously in the background queue."""
        task_id = f"task_{secrets.token_hex(8)}"
        self._tasks[task_id] = {
            "id": task_id,
            "name": task_name,
            "status": "PENDING",
            "enqueued_at": time.time(),
            "result": None,
            "error": None
        }

        def _runner():
            self._tasks[task_id]["status"] = "RUNNING"
            self._tasks[task_id]["started_at"] = time.time()
            try:
                res = fn(*args, **kwargs)
                self._tasks[task_id]["status"] = "SUCCESS"
                self._tasks[task_id]["result"] = res
            except Exception as e:
                self._tasks[task_id]["status"] = "FAILURE"
                self._tasks[task_id]["error"] = str(e)
            finally:
                self._tasks[task_id]["completed_at"] = time.time()

        self._executor.submit(_runner)
        return task_id

    def get_status(self, task_id: str) -> Optional[Dict[str, Any]]:
        """Checks current task lifecycle state."""
        return self._tasks.get(task_id)


task_queue = TaskQueue()
