# 開発準備・データ整備ツール

このディレクトリは、Battle Cats SimulatorのWebアプリを作るために使うツールの置き場です。サイト利用者向けのAPI・画面・シミュレーション処理はbackend/・frontend/に置きます。

```text
tools/
└── data_collection/
    └── character_images.py  # 外部サイトから形態画像を収集してDBへ登録
```

今後のデータ収集・変換・インポート用ツールも、必要になった時点で用途別にここへ追加します。Webアプリの起動や本番配布には含めません。画像認識はWebアプリの正式機能なのでbackend/app/recognition/に維持します。

## キャラクター形態画像の取得

既存のPython環境・backend/.env・SSHトンネルを使用する。リポジトリルートで実行する。初回セットアップは [ルートREADME](../README.md) を参照。バックエンドをeditable installした既存の仮想環境（`pip install -e "./backend[dev]"`）を使う。ツールが `backend/.env` を明示的に読み込み、既存の環境変数を優先する。

ID指定なしでは全キャラクターが対象になる。

```bash
.venv/bin/python -m tools.data_collection.character_images
```

通常実行で画像を `images/allies/af_md_{character_id}_{form_number}.png` に保存し、実DBの `image_assets` と `forms.image_id` を更新する。確認プロンプトや必須ドライランはない。DBの監査日時はUTC、更新者は `batch`。日時・結果・IDは `output/character-images-*.csv` から追跡できる。

1キャラクターの全形態を取得する場合は `character_id` を指定する。

```bash
.venv/bin/python -m tools.data_collection.character_images --character-id 138
```

指定キャラクターのDB上の未削除形態すべてを事前照合する。一意に照合できない形態があれば画像取得・登録を開始せず停止する。照合後の取得・登録エラーは形態単位で記録して継続する。既存画像参照がある形態はスキップする。`--form-id` との同時指定は不可。

1形態だけ試す場合はDBの `form_id` を指定する（取得元の番号ではない）。例えば提供JSONのかさじぞう第1形態は393。実DBでも対象IDを確認して使用する。

```bash
.venv/bin/python -m tools.data_collection.character_images --form-id 393
```

一覧HTMLは全体を1回取得するが、画像取得・DB登録は指定の1形態だけ。取得元・DBで一意に照合できない場合は停止し、別形態へ切り替えない。画像参照が既にある場合はスキップする。この実行も画像保存とDB更新を伴う。

オプション：`--interval 2` でリクエスト間隔を変更（最低1秒）。`--image-dir PATH` でalliesの実保存先、`--log-file PATH` でCSV出力先を指定できる。既存ログは上書きしない。

macOSで `CERTIFICATE_VERIFY_FAILED` が出る場合は、確認済みのシステムCA証明書を指定する。証明書検証は無効化しない。

```bash
SSL_CERT_FILE=/etc/ssl/cert.pem .venv/bin/python -m tools.data_collection.character_images --character-id 138
```

以前の `flask --app app import-character-images` は廃止。ツールはFlaskアプリを生成せず、`app.config.database_url_from_env()` だけを共用してSQLAlchemy接続を作る。

## 取得・照合

- 対象は https://battlecats.anypupil.com/catsuni.php?page=all&lang=ja の1ページのみ。各カードの画像src・日本語名称・明示された形態番号を使用する。
- 形態名をNFKC正規化・前後空白除去して `forms.form_name` と完全一致照合する。一意一致し、形態番号も一致するものだけを登録する。元サイトのCAT番号はDBのIDに使用しない。
- 論理削除されたキャラクター・形態は除外する。版違い等で複数候補がある場合も推測せずスキップする。
- 取得元に独立した系列名の項目がないため、キャラクター名＋形態番号による補助照合は行わない。第1形態名を系列名と決めつけない。実DBに別名テーブルもないため別名照合は未対応。CSVの取得元キャラクター名は空欄になる。
- robots.txtを実行時に確認し、禁止URLは取得しない。取得間隔・Crawl-delay・Request-rateを尊重し、並列取得や自動リトライは行わない。

## 登録と再実行

`storage_key` の一意制約とInnoDBを必須とする。同一DBの本バッチはMariaDBの名前付きロックで同時実行を防ぐ。形態行もロックして既存画像参照を再確認し、設定済みなら上書きせずスキップする。

OpenCVでPNG化し、完成ファイルを上書きなしで公開する。同じ保存先・同じ内容のファイルは再利用する。異なる内容や削除済みの同一保存キーは競合エラー。同一保存キーの登録済み画像が同じハッシュなら再利用する。別形態の保存キーまでハッシュだけで統合しない。

保存後のPNGからSHA256・寸法・サイズを取得する。画像INSERTと形態UPDATEは同一トランザクション。DB失敗時はロールバックするが、ファイルシステムとの完全なトランザクションはないためPNGを残す。再実行時に同一内容であることを検証して登録を再開できる。

個別の取得・登録エラーはCSVに記録して継続する。DB・HTTP例外は資格情報やSQL内容を漏らさないよう例外種別を記録する。全体の接続・HTML構造・事前確認エラーはバッチを停止する。正常終了でも個別エラーがあり得るため集計とCSVを確認する。

## 利用条件・対象外

2026-11-03確認時、一般クローラー向けrobots.txtでは対象パスを禁止していない。サイト説明には画像等の権利がPONOSに帰属する旨があり、画像転載の明示的な許諾は確認できていない。robots.txtの許可は転載許諾ではない。

- https://battlecats.anypupil.com/robots.txt
- https://battlecats.anypupil.com/about.php?lang=ja

このバッチはDB・画像保存のみを扱う。フロントエンドのJSONや画像配信対応表は自動更新しない。DBスキーマ・既存画像・別名定義の追加変更もしない。
