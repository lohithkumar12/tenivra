"""
Server-Sent Events (SSE) hub for real-time clinic/patient notifications.

Each tenant and each patient maintains an in-memory set of asyncio.Queue
listeners. When an event fires (new booking, status change, cancellation)
all connected listeners for that scope receive the JSON payload instantly.

Thread-safety: sync FastAPI endpoints run in a threadpool where no event
loop is available. We capture the main loop at import time and always use
loop.call_soon_threadsafe to push into asyncio queues from any thread.
"""

from __future__ import annotations

import asyncio
import json
import logging
import time
from collections import defaultdict
from typing import Any, AsyncGenerator

logger = logging.getLogger(__name__)

_tenant_listeners: dict[str, set[asyncio.Queue]] = defaultdict(set)
_patient_listeners: dict[str, set[asyncio.Queue]] = defaultdict(set)

_main_loop: asyncio.AbstractEventLoop | None = None


def set_main_loop(loop: asyncio.AbstractEventLoop):
    global _main_loop
    _main_loop = loop


def _broadcast(pool: dict[str, set[asyncio.Queue]], key: str, event: str, data: dict[str, Any]):
    payload = json.dumps({"event": event, "data": data, "ts": time.time()})

    if _main_loop is None:
        print(f"[sse] WARN: main loop not set, dropping {event} for {key}")
        return

    dead: list[asyncio.Queue] = []
    for q in pool.get(key, set()):
        try:
            _main_loop.call_soon_threadsafe(q.put_nowait, payload)
        except asyncio.QueueFull:
            dead.append(q)
        except RuntimeError:
            dead.append(q)
    for q in dead:
        pool[key].discard(q)


def notify_tenant(tenant_id: str, event: str, data: dict[str, Any]):
    _broadcast(_tenant_listeners, tenant_id, event, data)


def notify_patient(patient_user_id: str, event: str, data: dict[str, Any]):
    _broadcast(_patient_listeners, patient_user_id, event, data)


async def subscribe_tenant(tenant_id: str) -> AsyncGenerator[str, None]:
    q: asyncio.Queue = asyncio.Queue(maxsize=50)
    _tenant_listeners[tenant_id].add(q)
    logger.info("[sse] tenant %s subscribed (%d listeners)", tenant_id, len(_tenant_listeners[tenant_id]))
    try:
        while True:
            try:
                msg = await asyncio.wait_for(q.get(), timeout=25)
                yield f"data: {msg}\n\n"
            except (asyncio.TimeoutError, TimeoutError):
                yield ": heartbeat\n\n"
            except (asyncio.CancelledError, GeneratorExit):
                break
    finally:
        _tenant_listeners[tenant_id].discard(q)
        if not _tenant_listeners[tenant_id]:
            del _tenant_listeners[tenant_id]


async def subscribe_patient(patient_user_id: str) -> AsyncGenerator[str, None]:
    q: asyncio.Queue = asyncio.Queue(maxsize=50)
    _patient_listeners[patient_user_id].add(q)
    try:
        while True:
            try:
                msg = await asyncio.wait_for(q.get(), timeout=25)
                yield f"data: {msg}\n\n"
            except (asyncio.TimeoutError, TimeoutError):
                yield ": heartbeat\n\n"
            except (asyncio.CancelledError, GeneratorExit):
                break
    finally:
        _patient_listeners[patient_user_id].discard(q)
        if not _patient_listeners[patient_user_id]:
            del _patient_listeners[patient_user_id]
