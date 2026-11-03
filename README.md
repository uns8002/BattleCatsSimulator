# NyankoSimulator

にゃんこ大戦争のキャラクターステータス・編成・ステージ攻略のシミュレーションを目指すWebアプリケーションです。
現在は、図鑑スクリーンショットからの枠切り出しと、少数マスターによる画像照合PoCが動作します。FlaskのApplication FactoryとDB非依存の `GET /api/health` を提供します。MariaDB接続・ORM・migrationの基盤を備えています。業務モデル・業務APIは未実装です。フロントエンドはJSONデータによるキャラクター一覧・詳細画面を備えています。

## 現在の構成

```text
NyankoSimulator/
├── backend/
│   ├── app/
│   │   ├── __init__.py        # create_app(test_config=None)
│   │   ├── config.py         # DB環境変数・URL生成
│   │   ├── extensions.py     # SQLAlchemy・Migrate
│   │   ├── commands.py       # check-db
│   │   ├── routes/            # Blueprint登録・health API
│   │   └── recognition/
│   │       ├── __init__.py
│   │       ├── __main__.py    # 切り出しCLI・画像と座標JSONの保存
│   │       ├── detection.py   # 枠検出・座標変換
│   │       └── matching.py    # 照合・判定・レポート生成・照合CLI
│   ├── migrations/          # 標準Alembic環境（revisionなし）
│   ├── tests/                # Factory・health API・recognition/の既存8テスト
│   ├── pyproject.toml        # パッケージ・依存関係・pytest設定
│   ├── requirements.txt      # 通常インストールの入口
│   └── .env.example          # ローカル環境変数の例
├── frontend/                 # Web画面（React / TypeScript）
├── tools/                    # 開発準備・データ整備用。Webアプリには含めない
│   └── data_collection/
│       └── character_images.py # 形態画像の取得・DB登録CLI
├── data/                     # PoC用CSV・13件のマスター画像・出典
├── images/                   # 画面用画像・PoC入力画像（内容はGit管理外）
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

`backend/`・`frontend/` がWebアプリ本体、`tools/` がその開発に必要なデータ収集・整備ツールです。依存方向はツールからバックエンドの共通設定へ限定し、Webアプリからツールをimportしません。画像認識は正式機能として利用するため、引き続きバックエンド内に置きます。

ツールの実行方法・画像取得の仕様は [tools/README.md](tools/README.md) を参照してください。

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
# ローカルDB設定を用意（作成後に5つのDB_*を記入）
cp .env.example .env
# .envを編集してから起動
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

Factory・health API・DB設定・管理CLIと既存認識unittestの8件を実行します。通常テストは明示的なSQLiteインメモリ設定を使い、SSHトンネルやMariaDBを必要としません。integrationは明示指定時のみ実行します。既存unittestは書き換えていません。上記の認識テスト単独コマンドも利用できます。

## 環境変数

独自の `APP_ENV` 切替は導入していません。既定ではDEBUG・TESTINGとも無効で、開発時は `--debug`、テスト時は `create_app({"TESTING": True, "SQLALCHEMY_DATABASE_URI": "sqlite:///:memory:"})` を使用します。Factoryは全環境でDB・migration拡張を初期化します。

開発依存のpython-dotenvにより、Flask CLIは `.env` を読み込みます。OS環境変数は `.env` より優先されます。Factory自体とpytest・認識CLIは `.env` を読み込みません。本番ではcPanelのEnvironment variablesを使う予定で、Passenger設定は今回追加していません。
実際の `.env` はGit管理外です。`.env.example` に秘密情報の実値を記載しないでください。`SQLALCHEMY_DATABASE_URI` をアプリ設定で明示しない場合、`DB_HOST`・`DB_PORT`・`DB_NAME`・`DB_USER`・`DB_PASSWORD` は必須です。設定不足は起動時エラーですが、実際のDB接続はFactoryでは実行しません。

`flask --app app check-db` で読み取り専用の疎通確認ができます。接続・integration・migration運用は [DB基盤の手順](docs/backend-database.md) を参照してください。認識CLIはDB設定なしで引き続き実行できます。

## 今後の開発配置

予定技術はバックエンドがPython・Flask・SQLAlchemy・Alembic・MariaDB、フロントエンドがReact・TypeScriptです。UIコンポーネントライブラリは未選定です。
次のディレクトリは実装が必要になった段階で追加します。

| 追加予定の場所 | 役割 |
| --- | --- |
| `backend/app/models/` | 既存DB設計に基づくSQLAlchemyモデル |
| `backend/app/services/` | 所持管理・編成計算・一括登録・認証連携・公開などの処理 |
| `frontend/` | React・TypeScriptの独立したフロントエンド |
| `scripts/` | 開発・データ整備用スクリプト |

`backend/` は独立したPythonプロジェクトです。`pyproject.toml` に実行依存（Flask・NumPy・OpenCV・SQLAlchemy・Flask-SQLAlchemy・Alembic・Flask-Migrate・PyMySQL）、開発依存（pytest・python-dotenv）、Python対応範囲（3.11以上）、pytest設定を集約しています。認識用の依存範囲は従来のままです。
開発時はeditable installを使い、通常インストールでは `backend/` から `python -m pip install -r requirements.txt` を実行します。`requirements.txt` の `.` は作業ディレクトリのプロジェクトを指すため、必ず `backend/` で実行してください。依存関係は二重管理しません。

カラフルボックス/cPanelで `.` によるインストールに互換性上の問題が判明した場合は、デプロイ工程でインストール方法を見直します。現在の依存指定はバージョン範囲でありロックファイルではありません。本番のバージョン固定とPassengerのWSGI起動設定は後続工程です。

DB設計は [テーブル定義書](docs/database-design.md) にあります。既存設計書の「DB製品未選定」は作成時点の記録です。現在の予定はMariaDBですが、今回の構成整理では設計書・CSVの内容を変更していません。

## フロントエンド（キャラクター詳細）

`frontend/` はReact・TypeScript・Viteを使用しています。

```bash
cd frontend
npm install
npm run dev
```

`http://127.0.0.1:5173/characters/138` を開いてください。提供された `src/features/characters/fixtures/kasajizou_character_detail_display_v3.json` をローカルのレスポンスとして読み込みます。バックエンド・DB・SSHトンネルは不要です。本番ビルドでも同じJSONを表示します。以前のダミーデータ・仮計算は削除しました。

データの流れは `features/characters/api/characters.ts`（取得）→ `features/characters/state/CharacterProvider.tsx`（取得状態管理）→ 画面です。JSONのプロパティ名を保持した型は `features/characters/api/characterDto.ts` に定義しています。正式APIへ切り替える際は取得先を変更します。

体力・攻撃力はLv1基準値のまま表示します。レベルや本能の選択は保持しますが、成長・補正計算とDPSは未対応です。NPだけはJSONの費用表から集計します。詳細は [画面実装の記録](docs/character-detail-ui.md) を参照してください。

画像はルートの `images/` を管理元とし、Viteが `src/shared/images/imagePaths.json` の対応表にあるファイルだけを `/images/...` から直接配信します。`frontend/public/` へのコピーは不要です。本番デプロイでは対応表と同じURLで画像を配信する設定が必要です（画像はビルドに含めません）。

### テスト・ビルド

```bash
cd frontend
npm test
npm run build
npm run test:e2e -- --workers=1
```

E2EはChromeを使用し、開発5183・プレビュー5184のサーバーを自動起動・終了します。この2ポートを空け、先にビルドしてください。通常の開発サーバー5173は別途起動できます。

### コード整形

```bash
cd frontend
npm run format
npm run format:check
```

Prettierのルールは `.prettierrc.json`（2スペース・行幅目安100文字）に定義しています。生成物・ロックファイル・提供JSON原本は整形対象外です。VS Codeではルートを開き、推奨拡張 `esbenp.prettier-vscode` を使用すると保存時に整形します。Pythonには適用しません。

### 実装とテストの配置

`frontend/src/` はアプリ本体です。テストコードはすべて `frontend/tests/` にまとめています。

```text
frontend/
├── src/            # アプリ本体
└── tests/
    ├── unit/       # 関数・データ取得のテスト（npm test）
    └── e2e/        # ブラウザ操作テスト（npm run test:e2e）
```

単体テストの型チェックも従来どおりビルド時に実行します。

### フロントエンド内の配置ルール

- `src/app/`：ルーティングとアプリ全体の組み立て。起動だけを `main.tsx` に置きます。
- `src/shared/layout/`：サイト共通のヘッダー・フッター・レイアウト。
- `src/shared/ui/`：画面を問わず使える画像・アイコン表示部品。
- `src/shared/images/`：画像キーと配信URLの対応。
- `src/features/characters/`：キャラクター機能。`pages/` に一覧・詳細画面、`components/` に詳細画面のカード類、`api/` に取得処理・DTO・検証、`state/` に取得状態管理、`model/` に表示・NP集計、`fixtures/` に提供JSONを配置します。
- `src/features/settings/pages/`：設定画面。
- `tests/`：テスト専用。アプリ本体には置きません。

画面固有の処理はその機能の配下に置きます。`shared/` から `features/` は参照しません。キャラクター一覧へのリンクを固定したパンくずは共通部品ではなく `features/characters/components/CharacterBreadcrumbs.tsx` に配置しています。
