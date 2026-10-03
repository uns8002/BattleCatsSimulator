"""NyankoSimulatorのバックエンドパッケージ。"""


def create_app(test_config=None):
    """アプリを生成する。認識CLIのimport時にはWebアプリを初期化しない。"""
    from flask import Flask

    from .commands import register_commands
    from .config import configure_database
    from .extensions import db, migrate
    from .routes import register_blueprints

    app = Flask(__name__)
    if test_config is not None:
        app.config.from_mapping(test_config)
    configure_database(app)
    db.init_app(app)
    migrate.init_app(app, db)
    register_commands(app)
    register_blueprints(app)
    return app
