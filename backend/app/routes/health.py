"""DBや外部サービスに依存しない応答確認。"""

from flask import Blueprint

health_bp = Blueprint("health", __name__)


@health_bp.get("/health")
def health():
    return {"status": "ok"}
