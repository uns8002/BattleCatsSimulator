from sqlalchemy.exc import OperationalError

from app.extensions import db


def test_check_db_success(app):
    result = app.test_cli_runner().invoke(args=["check-db"])
    assert result.exit_code == 0
    assert "DB接続確認に成功しました。" in result.output


def test_check_db_failure_hides_details(app, monkeypatch):
    with app.app_context():
        def fail():
            raise OperationalError("secret SQL", {}, Exception("private-host password"))
        monkeypatch.setattr(db.engine, "connect", fail)
        result = app.test_cli_runner().invoke(args=["check-db"])
    assert result.exit_code != 0
    assert "DB接続確認に失敗しました" in result.output
    assert "private-host" not in result.output
    assert "password" not in result.output
    assert "secret SQL" not in result.output
