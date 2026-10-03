import pytest
from sqlalchemy.engine import make_url

from app import create_app
from app.config import DB_VARIABLES, database_url_from_env


@pytest.fixture
def db_env(monkeypatch):
    values = dict(zip(DB_VARIABLES, ("127.0.0.1", "3307", "test_db", "test_user", " p@ss:/%#?word ")))
    for key, value in values.items():
        monkeypatch.setenv(key, value)
    return values


def test_url_preserves_special_characters(db_env):
    url = database_url_from_env()
    assert url.drivername == "mysql+pymysql"
    assert url.port == 3307
    assert url.query["charset"] == "utf8mb4"
    assert url.password == db_env["DB_PASSWORD"]
    assert make_url(url.render_as_string(hide_password=False)) == url


def test_missing_variables_do_not_expose_values(monkeypatch, db_env):
    monkeypatch.delenv("DB_NAME")
    monkeypatch.setenv("DB_USER", "")
    with pytest.raises(ValueError) as error:
        create_app()
    assert str(error.value) == "DB設定が不足しています: DB_NAME, DB_USER"
    assert db_env["DB_PASSWORD"] not in str(error.value)


@pytest.mark.parametrize("port", ["0", "65536", "bad-secret", "3.5"])
def test_invalid_port(monkeypatch, db_env, port):
    monkeypatch.setenv("DB_PORT", port)
    with pytest.raises(ValueError, match="DB_PORTには1〜65535の整数を指定してください"):
        database_url_from_env()


def test_explicit_uri_wins_over_environment(monkeypatch):
    for key in DB_VARIABLES:
        monkeypatch.delenv(key, raising=False)
    app = create_app({"SQLALCHEMY_DATABASE_URI": "sqlite:///:memory:"})
    assert app.config["SQLALCHEMY_DATABASE_URI"] == "sqlite:///:memory:"
    assert app.config["SQLALCHEMY_ENGINE_OPTIONS"]["pool_pre_ping"] is True


@pytest.mark.parametrize("uri", [None, ""])
def test_empty_explicit_uri_is_error(uri):
    with pytest.raises(ValueError, match="SQLALCHEMY_DATABASE_URIには接続先を指定してください"):
        create_app({"SQLALCHEMY_DATABASE_URI": uri})


def test_factory_does_not_connect(db_env, monkeypatch):
    import pymysql
    def forbidden(*args, **kwargs):
        raise AssertionError("Factory must not connect")
    monkeypatch.setattr(pymysql, "connect", forbidden)
    app = create_app()
    assert "sqlalchemy" in app.extensions
    assert "migrate" in app.extensions
    assert app.test_client().get("/api/health").status_code == 200
