import pytest
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError

from app import create_app
from app.extensions import db

pytestmark = pytest.mark.integration


def test_mariadb_connection():
    app = create_app({"TESTING": True})
    with app.app_context():
        try:
            with db.engine.connect() as connection:
                assert connection.execute(text("SELECT 1")).scalar_one() == 1
                assert db.engine.dialect.is_mariadb, "Configured server is not MariaDB"
        except SQLAlchemyError:
            pytest.fail("MariaDB connection failed; check settings and SSH tunnel", pytrace=False)
        finally:
            db.engine.dispose()
