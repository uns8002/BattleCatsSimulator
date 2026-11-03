"""DB管理コマンド。"""

import click
from flask.cli import with_appcontext
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError

from .extensions import db


@click.command("check-db")
@with_appcontext
def check_db():
    """SELECT 1で接続を確認する。接続情報や生の例外は表示しない。"""
    try:
        with db.engine.connect() as connection:
            result = connection.execute(text("SELECT 1")).scalar_one()
    except SQLAlchemyError:
        raise click.ClickException("DB接続確認に失敗しました。接続設定と接続経路を確認してください。") from None
    if result != 1:
        raise click.ClickException("DB接続確認で予期しない結果を受け取りました。")
    click.echo("DB接続確認に成功しました。")


def register_commands(app):
    app.cli.add_command(check_db)
