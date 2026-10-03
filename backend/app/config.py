"""DB接続設定。資格情報をエラーやログへ出力しない。"""

import os

from sqlalchemy import URL

DB_VARIABLES = ("DB_HOST", "DB_PORT", "DB_NAME", "DB_USER", "DB_PASSWORD")


def database_url_from_env():
    values = {key: os.environ.get(key) for key in DB_VARIABLES}
    missing = [key for key, value in values.items() if value is None or value == ""]
    if missing:
        raise ValueError("DB設定が不足しています: " + ", ".join(missing))
    try:
        port = int(values["DB_PORT"])
        if not 1 <= port <= 65535:
            raise ValueError
    except ValueError:
        raise ValueError("DB_PORTには1〜65535の整数を指定してください") from None
    return URL.create(
        "mysql+pymysql",
        username=values["DB_USER"],
        password=values["DB_PASSWORD"],
        host=values["DB_HOST"],
        port=port,
        database=values["DB_NAME"],
        query={"charset": "utf8mb4"},
    )


def configure_database(app):
    if "SQLALCHEMY_DATABASE_URI" not in app.config:
        app.config["SQLALCHEMY_DATABASE_URI"] = database_url_from_env()
    elif not app.config["SQLALCHEMY_DATABASE_URI"]:
        raise ValueError("SQLALCHEMY_DATABASE_URIには接続先を指定してください")
    options = {"pool_pre_ping": True}
    options.update(app.config.get("SQLALCHEMY_ENGINE_OPTIONS", {}))
    app.config["SQLALCHEMY_ENGINE_OPTIONS"] = options
