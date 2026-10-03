"""NyankoSimulatorのバックエンドパッケージ。"""


def create_app(test_config=None):
    """アプリを生成する。認識CLIのimport時にはWebアプリを初期化しない。"""
    from flask import Flask

    from .routes import register_blueprints

    app = Flask(__name__)
    if test_config is not None:
        app.config.from_mapping(test_config)
    register_blueprints(app)
    return app
