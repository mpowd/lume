"""
In-memory task progress tracking for long-running background operations.
"""

import logging
from datetime import datetime
from enum import Enum
from typing import Any

from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)


class TaskStatus(str, Enum):
    STARTING = "starting"
    RUNNING = "running"
    COMPLETE = "complete"
    ERROR = "error"


class ProgressStage(BaseModel):
    label: str
    current: int = 0
    total: int = 0
    unit: str = "items"
    is_current: bool = False
    current_item: str | None = None


class CompletionStat(BaseModel):
    label: str
    value: int
    variant: str = "info"


class TaskProgress(BaseModel):
    task_id: str
    status: TaskStatus = TaskStatus.STARTING
    title: str = ""
    message: str = ""
    stages: list[ProgressStage] = Field(default_factory=list)
    stats: list[CompletionStat] = Field(default_factory=list)
    failed: list[str] = Field(default_factory=list)
    created_at: datetime = Field(default_factory=datetime.now)


class TaskProgressManager:
    """Manages progress tracking for background tasks"""

    def __init__(self):
        self._tasks: dict[str, TaskProgress] = {}

    def create_task(
        self,
        task_id: str,
        title: str,
        message: str,
        stages: list[dict[str, Any]],
    ) -> TaskProgress:
        task = TaskProgress(
            task_id=task_id,
            title=title,
            message=message,
            stages=[ProgressStage(**s) for s in stages],
        )
        self._tasks[task_id] = task
        return task

    def get_task(self, task_id: str) -> TaskProgress | None:
        return self._tasks.get(task_id)

    def update_stage(
        self,
        task_id: str,
        stage_index: int,
        *,
        current: int | None = None,
        total: int | None = None,
        current_item: str | None = None,
        is_current: bool | None = None,
    ) -> None:
        task = self._tasks.get(task_id)
        if not task or stage_index >= len(task.stages):
            return

        stage = task.stages[stage_index]
        if current is not None:
            stage.current = current
        if total is not None:
            stage.total = total
        if current_item is not None:
            stage.current_item = current_item
        if is_current is not None:
            stage.is_current = is_current

    def advance_to_stage(self, task_id: str, stage_index: int) -> None:
        """Mark all previous stages as done, set the given stage as current."""
        task = self._tasks.get(task_id)
        if not task:
            return

        for i, stage in enumerate(task.stages):
            stage.is_current = i == stage_index

    def update_message(self, task_id: str, message: str) -> None:
        task = self._tasks.get(task_id)
        if task:
            task.message = message

    def complete(
        self,
        task_id: str,
        title: str,
        message: str,
        stats: list[dict[str, Any]],
        failed: list[str] | None = None,
    ) -> None:
        task = self._tasks.get(task_id)
        if not task:
            return

        task.status = TaskStatus.COMPLETE
        task.title = title
        task.message = message
        task.stats = [CompletionStat(**s) for s in stats]
        task.failed = failed or []

        for stage in task.stages:
            stage.is_current = False

    def fail(self, task_id: str, title: str, message: str) -> None:
        task = self._tasks.get(task_id)
        if not task:
            return

        task.status = TaskStatus.ERROR
        task.title = title
        task.message = message

    def cleanup(self, task_id: str) -> None:
        """Remove a completed/failed task to free memory."""
        self._tasks.pop(task_id, None)


# Singleton instance — injected via DI in dependencies.py
task_progress_manager = TaskProgressManager()
