# DB接続・migration基盤

Python 3.11、Flask-SQLAlchemy、SQLAlchemy 2.x、Flask-Migrate（Alembic）、PyMySQLを使用します。業務モデル・revisionはまだありません。認識CLIはFactoryを呼ばず、DB設定なしで利用できます。

## セットアップ・接続確認

仮想環境を有効化し、`backend/` で実行します。

```bash
python -m pip install -e ".[dev]"
cp .env.example .env
```

`.env` に開発DBの値を設定します。Gitには登録しません。

```dotenv
DB_HOST=127.0.0.1
DB_PORT=3307
DB_NAME=<開発DB名>
DB_USER=<開発DBユーザー>
DB_PASSWORD=<パスワード>
```

ローカルでは別途SSHトンネルを起動し、127.0.0.1:3307からサーバー側localhost:3306へ転送してください。トンネルを外部インターフェースへ公開しないでください。

```bash
flask --app app check-db
flask --app app run --debug
```

`check-db` は `SELECT 1` のみ実行し、接続を返却します。成功時は終了コード0、接続失敗時は非0と一般化したメッセージを返します。資格情報・生のDB例外は表示しません。
`GET /api/health` はDB非依存です。DB停止・トンネル切断中でも、設定が正しければFactoryとhealthは動作します。公開DB確認APIはありません。

## 設定と初期化

`create_app(test_config=None)` は常に `db.init_app(app)`、`migrate.init_app(app, db)` を実行します。接続・DDL・migrationは起動時に実行しません。

1. `test_config` の `SQLALCHEMY_DATABASE_URI` が明示されていれば優先します。空文字・Noneはエラーです。
2. 指定がなければ5つの `DB_*` が必須です。未設定・空文字は変数名だけを列挙してエラーにします。
3. `DB_PORT` は1〜65535の整数に変換します。
4. `URL.create("mysql+pymysql", ...)` でURLオブジェクトを作り、`charset=utf8mb4` を指定します。パスワードを加工・手動エンコードしません。

OS環境変数をFactory呼び出し時に読み取ります。Flask CLIは開発依存python-dotenvにより `.env` を読み込みますが、Factory自体とpytestは自動読込しません。既存OS環境変数が優先されます。dotenvでは特殊文字・変数展開の規則があるため、値を正しく引用してください。

Engine設定として `pool_pre_ping=True` のみ明示します。`SQLALCHEMY_ENGINE_OPTIONS` による明示的な上書きも可能です。pool_size、max_overflow、pool_recycle、timeoutは今回独自指定せず、ライブラリ既定値を使用します。Flask-SQLAlchemyにはMySQL系のpool_recycle既定値があるため、未指定は無制限を意味しません。

## テスト

```bash
python -m pytest
```

通常テストは明示的なSQLiteインメモリURIまたは接続のモックを使います。DB拡張はテストでも初期化します。SQLiteはFactory・CLIの検証用であり、MariaDB互換性の保証には使いません。integrationは通常skipされます。

実MariaDBの読み取り専用検証は、トンネルと5変数を用意して明示実行します。

```bash
python -m pytest --run-integration tests/integration
```

pytestは `.env` を自動読込しません。OSへ供給済みの値を使用するか、開発用python-dotenvでファイルを明示的に読み込みます（既存環境変数を上書きしない）。

```bash
python -c 'from dotenv import load_dotenv; load_dotenv(".env", override=False); import pytest; raise SystemExit(pytest.main(["--run-integration", "tests/integration"]))'
```

integrationは `SELECT 1` とSQLAlchemyのMariaDB判定を確認します。明示実行時の設定不足・接続不能はskipせず失敗です。テーブル作成・更新・削除・migration適用は実行しません。

## migration

`migrations/` はFlask-Migrate標準の `flask db init` で生成しています。今回revisionは作成していません。接続URLをalembic.iniへ保存せず、アプリのEngineを使用します。標準env.pyのURL処理を維持し、パスワード中の `%` を壊さないようにします。

今後、業務モデルを分割するときは、全モデルをFactoryの初期化経路から読み込み、metadataへ登録してください。SQLAlchemy 2.xの `Mapped` / `mapped_column` を使い、テーブル・カラム名は既存設計に従います。

以下は業務モデル導入後の運用手順であり、今回実行するものではありません。

```bash
# 開発DBに対して生成
flask --app app db migrate -m "describe schema change"
# 生成されたupgrade/downgradeをレビュー後に実行
flask --app app db upgrade
flask --app app db current
flask --app app db heads
```

モデルとmigrationを一緒にGit管理し、本番では同じコミットの `db upgrade` を実行します。本番で自動生成しません。既適用revisionは変更せず、複数headは解消してから反映します。autogenerateはモデルimport漏れを削除候補と認識し得るため、意図しないDROP・型変更を必ず確認してください。

`create_all()`・起動時upgradeは使用しません。`db upgrade` はAlembic管理テーブル `alembic_version` を作成し得ます。基盤確認目的でもDB変更になるため、適用工程として明示して実行してください。

## デプロイ工程で確認する事項

- MariaDBバージョン・認証方式・PyMySQLの対応、localhostへのTCP接続と権限。
- cPanel接頭辞付きのDB名・ユーザー名、文字セット・照合順序・SQL mode・タイムゾーン。
- Passengerのプロセス数、最大接続数、接続切断条件に合わせたpool_size・max_overflow・pool_recycle・timeout。
- cPanelのEnvironment variablesをPassengerとmigration用SSH CLIへ供給する方法。自動共有を仮定しない。
- Python 3.11の依存固定、requirements.txtの `.` 方式とmigrationファイルの配置。migrations/はappパッケージ外なので、wheel単体の配布では別途同じコミットのディレクトリを配置する。
- 実行ユーザーとDDL権限、適用前バックアップ・復旧手順。MariaDBのDDLが一括ロールバックできる前提にしない。

接続URL・秘密情報・生のDB例外を公開しません。本番と開発の資格情報を分離し、将来は通常アプリ用とmigration用の権限分離を検討します。
