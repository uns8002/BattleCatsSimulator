import pytest

from app import create_app


@pytest.fixture
def app():
    return create_app({"TESTING": True, "SQLALCHEMY_DATABASE_URI": "sqlite:///:memory:"})


@pytest.fixture
def client(app):
    return app.test_client()


def pytest_addoption(parser):
    parser.addoption("--run-integration", action="store_true", default=False,
                     help="Run read-only tests against the configured MariaDB")


def pytest_collection_modifyitems(config, items):
    if not config.getoption("--run-integration"):
        skip = pytest.mark.skip(reason="requires --run-integration and MariaDB settings")
        for item in items:
            if "integration" in item.keywords:
                item.add_marker(skip)
