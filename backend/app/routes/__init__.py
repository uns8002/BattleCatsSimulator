"""APIのBlueprint登録。"""

from .health import health_bp
from .characters import characters_bp


def register_blueprints(app):
    app.register_blueprint(health_bp, url_prefix="/api")
    app.register_blueprint(characters_bp, url_prefix="/api")
