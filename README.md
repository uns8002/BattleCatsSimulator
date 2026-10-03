# NyankoSimulator

にゃんこ大戦争のキャラクター・所持情報の管理と編成シミュレーションを目指すプロジェクトです。
現在は、図鑑スクリーンショットからの枠切り出しと、少数マスターによる画像照合PoCが動作します。Web API・DB・フロントエンドは未実装です。

## 現在の構成

```text
NyankoSimulator/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   └── recognition/
│   │       ├── __init__.py
│   │       ├── __main__.py    # 切り出しCLI・画像と座標JSONの保存
│   │       ├── detection.py   # 枠検出・座標変換
│   │       └── matching.py    # 照合・判定・レポート生成・照合CLI
│   ├── tests/recognition/     # 画像認識の既存unittest（8件）
│   └── requirements.txt      # 現在のPython依存（NumPy・OpenCV）
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

リポジトリルートで仮想環境を用意します（Python 3.12推奨）。

```bash
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r backend/requirements.txt
cd backend
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
ルートから実行したい場合は `PYTHONPATH=backend python -m app.recognition ...` も利用できます。この場合、入力は `images/...`、既定のマスターと出力はルートの `data/`・`output/` になります。

詳細は [画像認識PoCの手順](docs/recognition-poc.md)、データの説明は [data/README.md](data/README.md) を参照してください。

## 今後の開発配置

予定技術はバックエンドがPython・Flask・SQLAlchemy・Alembic・MariaDB、フロントエンドがReact・TypeScriptです。UIコンポーネントライブラリは未選定です。
次のディレクトリは実装が必要になった段階で追加します。

| 追加予定の場所 | 役割 |
| --- | --- |
| `backend/app/models/` | 既存DB設計に基づくSQLAlchemyモデル |
| `backend/app/routes/` | Flask APIの入口 |
| `backend/app/services/` | 所持管理・編成計算・一括登録・認証連携・公開などの処理 |
| `backend/migrations/` | Alembic導入時のマイグレーション |
| `frontend/` | React・TypeScriptの独立したフロントエンド |
| `scripts/` | 開発・データ整備用スクリプト |

`backend/` は独立したPythonプロジェクトの境界とし、将来の依存管理・pytest設定・ビルド設定をここに集約します。今回は `pyproject.toml` を導入していません。パッケージ化・本番デプロイ時に導入し、開発時のeditable installや本番環境へのパッケージインストールを整備する方針です。恒常的な `PYTHONPATH` 設定は前提にしません。

`python -m` は通常、作業ディレクトリをモジュール検索パスに追加するため、現在は `backend/` から実行できます（[Python公式ドキュメント](https://docs.python.org/3/using/cmdline.html#cmdoption-m)）。パッケージとしてのFlaskアプリ構成については [Flask公式ドキュメント](https://flask.palletsprojects.com/en/stable/patterns/packages/) も参照してください。

DB設計は [テーブル定義書](docs/database-design.md) にあります。既存設計書の「DB製品未選定」は作成時点の記録です。現在の予定はMariaDBですが、今回の構成整理では設計書・CSVの内容を変更していません。
