# 本能・超本能スクレイピング（目視検証用）

指定した1つのcatidだけを取得する独立CLIです。Webアプリのコード・依存関係・起動処理は使用／変更しません。DBには `START TRANSACTION READ ONLY` を指定し、SELECT・SHOWだけを発行、最後にROLLBACKします。SQL出力を実行する機能はありません。

## 実行

リポジトリルートから実行します。

```bash
python3 -m venv tools/talent_scraper/.venv
tools/talent_scraper/.venv/bin/pip install -r tools/talent_scraper/requirements.txt
tools/talent_scraper/.venv/bin/python tools/talent_scraper/scrape_talents.py --catid 106
```

仮想環境をactivate済みの場合は `python tools/talent_scraper/scrape_talents.py --catid 106` でも実行できます。

接続は既存の `backend/.env` の `DB_HOST / DB_PORT / DB_NAME / DB_USER / DB_PASSWORD` を読みます。環境変数が優先されます。既存環境にSSHトンネルが必要な場合は先に起動してください。接続情報は出力しません。

- `--interval 2`: HTTPアクセス間隔。1〜60秒。robots.txtのCrawl-delay・Request-rateが長い場合はそちらを優先。
- `--retries 2`: 接続エラー・タイムアウト・5xxの再試行上限（0〜3）。401/403/429は再試行せず停止。リダイレクトも追従しません。
- `--mappings PATH`: 仮マッピングJSONの指定。標準は本ディレクトリの `mappings.json`。
- `--output-dir PATH`: 出力親ディレクトリ。標準は本ディレクトリの `output/`。
- `--html PATH --db-snapshot PATH`: 保存HTMLと参照済みDBスナップショットで再検証。ライブ取得と区別して記録します。DBスナップショットの各テーブルは `{ddl, columns, rows}` 形式（columnsはSHOW FULL COLUMNSの結果）。

終了コード: 0=出力完了（警告を含む場合あり）、1=未解決本能あり、2=取得・DB・構造等の実行エラー。取得失敗を「本能0件の正常結果」とみなさず、summaryのerrors/fetch_succeededを確認してください。

## 出力

`output/catid_106/` に以下を保存します。同じcatidを再実行すると更新します。過去の結果を残す場合は `--output-dir` を変えてください。

- `talents_raw.json`: 全形態名、原文HTML／文字列、説明、レベル、数値範囲と数値トークン、NP、取得元・日時、照合結果。
- `talents_normalized.json`: 変換できた本能。`registration` が現行DDLへの登録予定行。`source` / `calculations` / `mapping` は検証用情報です。
- `talents_unresolved.json`: `items` に未解決本能、`errors` に実行全体のエラー。
- `talents_insert.sql`: 未解決を除いた新規行のINSERT文のみ。DBへの実行は禁止。
- `talents_review.md`: 全形態照合、各本能の値・計算過程・全Lv・NP・登録予定JSON・既存差分・警告。
- `talents_summary.json`: 通常／超本能数、変換数・警告数・未解決数・SQL数・NP一致数。
- `source.html` / `robots.txt` / `about.html` / `schema_snapshot.json`: 取得時のHTML・利用条件・実DDLの検証資料。

`converted_count` は警告付き変換を含み、`normal_converted_count` は警告のない正常件数です。警告数は警告のある本能数で、メッセージ数ではありません。Lv1だけの解放型はbase/stepを計算しません。サイトにない値はNULL／未設定のまま保持します。

## 仮マッピングと登録方針

ユーザーの追加指示により、`game_version_id` と `revision_group_id` はNULLにします。名称対応は [MAPPINGS.md](MAPPINGS.md) の対応を仮作成しています。編集する正本は [mappings.json](mappings.json) です。未知の名称を自動追加しません。

IDを固定せず、マスタコードから実DBのIDを一意に解決します。parameter_keysは説明文内に出現する数値範囲の順番です。複数パラメータは明示されたキーと1対1対応させます。単位・schema・個数が一致しなければ未解決。parameter_schemaにあるキーは固定値も含めて全て必須とし、不足があればSQLを生成しません。定数など範囲以外の数値は原文とトークンに残し、マッピングで扱えないものを黙って落とさず未解決にします。停止時間は明示した変換規則（1秒=30F）に対応します。その他の未対応の単位変換やコスト符号は推測しません。

今回の8件は追加型（action=add）、攻撃順指定なし（NULL）と推定し、全件に警告を付けます。既存データのJSON形 `{action, key: {base, step}}` に合わせています。属性追加テーブルにはparameter_valuesカラムがないため出力しません。確認後は対象mappingのprovisionalをfalseにできます。

現行DDLは `forms` と character_idを持つ3種の本能テーブルです。form_stat_talentsテーブルは存在しないため、基本攻撃力・体力は既存abilitiesマスタに対応させます。古い論理設計資料より実DBのDDLを優先します。

現行DDLには本能の自然キーUNIQUE制約がありません。このためキャラクター・対応マスタ・本能区分を保守的な重複識別単位にし、版をまたいで既存行があればINSERTを出しません。既存行の版、改訂、攻撃順、JSON、NP等は全件比較して差分を報告します。生成SQLも同じ3項目をNOT EXISTSで再確認します。同時実行時の一意性を保証するSQLではありません（今回は実行禁止のレビュー用）。監査項目は既存バッチ同様にUTC・batchを使用します。

## 取得の境界

requestsとBeautifulSoupのみで静的HTMLを読みます。robots.txt、aboutページ、指定詳細ページだけを取得します。一覧巡回・ブラウザ自動化・制限回避・定期実行はありません。利用条件は実行時に保存します。今回確認したaboutページに自動取得を禁じる記載はありませんでした。robots.txtの禁止パスを尊重します。条件変更時は保存したabout.htmlも確認してください。

本能なしは専用の空表示、または本能パネルの明示的な0件表示がある場合のみ正常として扱います。単にパネルが消えていた場合は構造変更の可能性があるため未解決です。今回ライブ確認したのはcatid=106だけで、通常のみ／本能なし等の別キャラは巡回していません。

## 最小限のロジックテスト

```bash
tools/talent_scraper/.venv/bin/python -m unittest discover -s tools/talent_scraper -p 'test_*.py' -v
```

計算・完全一致照合・NP全列照合・HTML変種・未解決のSQL除外・既存差分・アクセス拒否時の停止を検証します。UIテストはありません。出力・取得HTML・DBスナップショット・仮想環境はGit追跡対象外です。

## Excelで確認する

`output/catid_106/talents_review_excel.txt` をテキストエディタで開き、全選択・コピーしてExcelのA1セルへ貼り付けてください。タブ区切り、UTF-8 BOM付きで、1本能が1行になります。通常実行時に自動生成します。

最初に「サイト本能名」と「DBマスタ名」、次に「サイト説明」と「最小／最大効果値・base・step」、最後に「NP照合・判定・警告」を見比べてください。左端の「確認結果」「修正メモ」はExcel上で記入する空欄です。貼り付け後、先頭行を固定し、フィルターを付けると確認しやすくなります。編集した確認結果は.xlsxとして別保存してください。

1列にまとまる場合は、Excelの「データ → 区切り位置」でタブを選ぶか、「テキスト/CSVから」でUTF-8・タブ区切りとして取り込んでください。複数パラメータは対応する値を同順で「 / 」区切りにしています。空欄は取得値なし／適用なしを表し、0とは区別します。セル内改行・タブは空白化し、数式と解釈される先頭文字にはアポストロフィを付けます。詳細な各Lv計算は従来のMarkdownレポートに残しています。

## 攻撃間隔短縮の暫定仕様（2026-11-23）

ユーザー指定の式を採用します。ゲーム内部との一致は未確認です。

```text
target_frames = attack_frequency_frames - attack_startup_frames
reduction_frames = floor(target_frames * reduction_percent / 100 + 0.5)
result_frames = attack_frequency_frames - reduction_frames
```

Pythonのround（偶数丸め）は使用せず、有理数で0.5以上切り上げを計算します。攻撃発生は変更しません。各Lv・各形態の元の短縮率と計算結果をレポートに保持します。短縮後の頻度FがDPSの分母になります。

DBには既存キー `attack_frequency_reduction_frames` の短縮量Fを格納するSQLを生成します。全形態で短縮量が一致し、四捨五入後の全レベルをbase/stepで正確に表せる場合だけ変換します。基準値欠落・形態差・非線形の丸め結果は未解決にし、近似しません。ガネーシャは全Lvで6F刻みなのでbase=0 / step=6、Lv10は279−60=219Fです。

今回の追加依頼に伴い、フロントエンドの本能補正もこの保存キーに対応しました。Lv0は未適用、攻撃発生は維持し、短縮した攻撃頻度を表示とDPS計算に使用します。DBへの登録は引き続き行わないため、生成した本能データがAPIに存在しない間は実画面には新たな本能は出現しません。

## 全パラメータの検証

マスタ定義の全キーをparameter_valuesに必須とします。固定値は `{base: 値, step: 0}`、可変値は従来のbase/step形式。actionは既存の制御情報として別途保持します。空schemaの無効系には数値を創作せずactionのみを出力します。schema_checkに必須・格納済み・不足キーを記録します。

攻撃力アップは発動体力割合と上昇率を独立抽出します。アキラは33%固定と23〜50%（base=20 / step=3）。烈波は確率10〜100%（base=0 / step=10）、Lv1、範囲開始430・終了780の4項目を格納します。掲載値の抽出とゲーム内の加算・置換処理は分離し、今回戦闘計算の仕様は変更していません。

ガネーシャ（catid=272）の攻撃力アップだけは既知のサイト・DB不一致によりSQL対象外を維持します。共通マッピングのsource_issuesでcatidを限定しており、他キャラクターには波及しません。これは補正ではなく除外理由の記録で、原文100%を80%へ書き換えません。
