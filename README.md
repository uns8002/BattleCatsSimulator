# NyankoSimulator

にゃんこ大戦争のキャラクター・所持情報の管理と編成シミュレーションを目指すプロジェクトです。
現在は、図鑑スクリーンショットからの枠切り出しと、少数マスターによる画像照合PoCが動作します。FlaskのApplication FactoryとDB非依存の `GET /api/health` を提供します。DB・業務API・フロントエンドは未実装です。

## 現在の構成

```text
NyankoSimulator/
├── backend/
│   ├── app/
│   │   ├── __init__.py        # create_app(test_config=None)
│   │   ├── routes/            # Blueprint登録・health API
│   │   └── recognition/
│   │       ├── __init__.py
│   │       ├── __main__.py    # 切り出しCLI・画像と座標JSONの保存
│   │       ├── detection.py   # 枠検出・座標変換
│   │       └── matching.py    # 照合・判定・レポート生成・照合CLI
│   ├── tests/                # Factory・health API・recognition/の既存8テスト
│   ├── pyproject.toml        # パッケージ・依存関係・pytest設定
│   ├── requirements.txt      # 通常インストールの入口
│   └── .env.example          # ローカル環境変数の例
├── data/                     # PoC用CSV・13件のマスター画像・出典
├── images/                   # ローカル入力画像（内容はGit管理外）
├── output/                   # 実行結果（内容はGit管理外）
├── docs/
│   ├── recognition-poc.md    # PoC実行方法・制約・検証記録
│   ├── database-design.md    # DB論理設計の入口
│   └── database/             # 分野別設計書・CSV移行対応
├── .gitignore
└── README.md
```

画像認識は今後も正式機能として利用するため、`backend/app/recognition/` に配置しています。現時点ではFlaskに依存せず、CLIおよびPython関数として利用できます。
`data/`・`images/`・`output/` は既存PoCとの互換性のため現位置を維持しています。本番の恒久的な配置ではなく、将来はMariaDBや画像ストレージへの移行を検討します。

## セットアップと実行

リポジトリルートで仮想環境を用意します（本番予定に合わせPython 3.11を基準に検証）。既存の別バージョンの仮想環境を使っている場合は、別の場所に新規作成してください。

```bash
python3.11 -m venv .venv
source .venv/bin/activate
cd backend
python -m pip install -e ".[dev]"
```

以降は `backend/` から実行します。`PYTHONPATH` の指定は不要です。

```bash
# 枠の切り出し（入力画像は各自で配置）
python -m app.recognition "../images/図鑑.png" --output ../output

# 切り出し結果を照合（フォルダ名は実際の保存先に置き換える）
python -m app.recognition.matching "../output/図鑑_実行日時" \
  --master ../data/forms.csv --output ../output

# 既存8テスト
python -m unittest discover -s tests/recognition -v
```

相対パスは作業ディレクトリ基準です。CLIの既定値は従来どおり `data/forms.csv` と `output/` のため、`backend/` からは上記のように `--master`・`--output` を指定してください。
上記のeditable install後は、ルートからも `python -m app.recognition ...` で実行できます。この場合、入力は `images/...`、既定のマスターと出力はルートの `data/`・`output/` になります。

詳細は [画像認識PoCの手順](docs/recognition-poc.md)、データの説明は [data/README.md](data/README.md) を参照してください。

## Flaskの起動と確認

セットアップ後、`backend/` から実行します。

```bash
# 任意: ローカル設定が必要な場合のみ作成
cp .env.example .env
flask --app app run --debug
```

別のターミナルで確認します。

```bash
curl -i http://127.0.0.1:5000/api/health
```

HTTP 200、JSON `{"status":"ok"}` を返します。DBや外部サービスの疎通確認は行いません。
`create_app(test_config=None)` がアプリを生成し、Blueprintを登録します。グローバルなFlaskインスタンスは生成しません。APIを増やす際は `app/routes/` に機能単位のBlueprintを追加します。

## テスト

`backend/` から実行します。

```bash
python -m pytest
```

Factory・health APIの4件と既存認識unittestの8件を合わせた12件を実行します。既存unittestは書き換えていません。上記の認識テスト単独コマンドも利用できます。

## 環境変数

独自の `APP_ENV` 切替は導入していません。既定ではDEBUG・TESTINGとも無効で、開発時は `--debug`、テスト時は `create_app({"TESTING": True})` を使用します。将来設定が増えたらFactoryのBlueprint登録前に設定読込を追加できます。

開発依存のpython-dotenvにより、Flask CLIは `.env` を読み込みます。OS環境変数は `.env` より優先されます。Factory自体とpytest・認識CLIは `.env` を読み込みません。本番ではcPanelのEnvironment variablesを使う予定で、Passenger設定は今回追加していません。
実際の `.env` はGit管理外です。`.env.example` に秘密情報の実値を記載しないでください。`DB_HOST`・`DB_PORT`・`DB_NAME`・`DB_USER`・`DB_PASSWORD` は次工程用のコメントのみで、現在は読み込み・検証・接続を行いません。

## 今後の開発配置

予定技術はバックエンドがPython・Flask・SQLAlchemy・Alembic・MariaDB、フロントエンドがReact・TypeScriptです。UIコンポーネントライブラリは未選定です。
次のディレクトリは実装が必要になった段階で追加します。

| 追加予定の場所 | 役割 |
| --- | --- |
| `backend/app/models/` | 既存DB設計に基づくSQLAlchemyモデル |
| `backend/app/services/` | 所持管理・編成計算・一括登録・認証連携・公開などの処理 |
| `backend/migrations/` | Alembic導入時のマイグレーション |
| `frontend/` | React・TypeScriptの独立したフロントエンド |
| `scripts/` | 開発・データ整備用スクリプト |

`backend/` は独立したPythonプロジェクトです。`pyproject.toml` に実行依存（Flask・NumPy・OpenCV）、開発依存（pytest・python-dotenv）、Python対応範囲（3.11以上）、pytest設定を集約しています。認識用の依存範囲は従来のままです。
開発時はeditable installを使い、通常インストールでは `backend/` から `python -m pip install -r requirements.txt` を実行します。`requirements.txt` の `.` は作業ディレクトリのプロジェクトを指すため、必ず `backend/` で実行してください。依存関係は二重管理しません。

カラフルボックス/cPanelで `.` によるインストールに互換性上の問題が判明した場合は、デプロイ工程でインストール方法を見直します。現在の依存指定はバージョン範囲でありロックファイルではありません。本番のバージョン固定とPassengerのWSGI起動設定は後続工程です。

DB設計は [テーブル定義書](docs/database-design.md) にあります。既存設計書の「DB製品未選定」は作成時点の記録です。現在の予定はMariaDBですが、今回の構成整理では設計書・CSVの内容を変更していません。
