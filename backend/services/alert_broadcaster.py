import asyncio
import logging
from typing import Set, Optional

logger = logging.getLogger("alert_broadcaster")


class AlertBroadcaster:
    """
    In-memory pub/sub broker for SSE real-time broadcast of maintenance alerts.
    Thread-safe to allow background workers and sync routes to trigger notifications.
    """

    def __init__(self):
        self._subscribers: Set[asyncio.Queue] = set()
        self._loop: Optional[asyncio.AbstractEventLoop] = None

    def set_loop(self, loop: asyncio.AbstractEventLoop):
        self._loop = loop

    def subscribe(self) -> asyncio.Queue:
        q: asyncio.Queue = asyncio.Queue(maxsize=100)
        self._subscribers.add(q)
        return q

    def unsubscribe(self, q: asyncio.Queue):
        self._subscribers.discard(q)

    def broadcast_change(self, reason: str = "alert_update"):
        """
        Notifies all connected SSE streams that an alert was created, updated, or resolved.
        Can be called safely from async functions or sync worker threads.
        """
        if not self._subscribers:
            return

        def _push_all():
            dead = []
            for q in list(self._subscribers):
                try:
                    q.put_nowait(reason)
                except asyncio.QueueFull:
                    dead.append(q)
                except Exception:
                    dead.append(q)
            for q in dead:
                self._subscribers.discard(q)

        try:
            current_loop = None
            try:
                current_loop = asyncio.get_running_loop()
            except RuntimeError:
                pass

            if current_loop and current_loop.is_running():
                _push_all()
            elif self._loop and self._loop.is_running():
                self._loop.call_soon_threadsafe(_push_all)
            else:
                _push_all()
        except Exception as e:
            logger.warning(f"Failed to broadcast alert event: {e}")


alert_broadcaster = AlertBroadcaster()
