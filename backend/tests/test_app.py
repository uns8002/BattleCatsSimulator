from app import create_app


def test_default_app_without_db_settings(monkeypatch):
    for key in ("DB_HOST", "DB_PORT", "DB_NAME", "DB_USER", "DB_PASSWORD"):
        monkeypatch.delenv(key, raising=False)
    app = create_app()
    assert app.testing is False
    assert app.debug is False
    assert app.test_client().get("/api/health").get_json() == {"status": "ok"}


def test_factory_config_isolation():
    first = create_app({"TESTING": True, "CUSTOM_SETTING": "first"})
    second = create_app()
    assert first is not second
    assert first.testing is True
    assert first.config["CUSTOM_SETTING"] == "first"
    assert second.testing is False
    assert "CUSTOM_SETTING" not in second.config
    assert second.test_client().get("/api/health").status_code == 200
