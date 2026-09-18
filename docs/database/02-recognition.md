# 画像取り込み・照合履歴

[共通ルール](00-common.md) / [全体一覧](../database-design.md)

以下はマスターではなく実行データ。20枚程度の画像を1回の取り込みとして扱える。

### recognition_runs — 取り込み単位

| 列 | 型 | 制約・用途 |
|---|---|---|
| run_id | ID | PK |
| user_id | ID | 任意、FK → users。ログイン前PoCではNULL |
| revision_id | ID | FK → master_revisions |
| algorithm_version | 文字列 | 検出・照合コードの版 |
| parameters | JSON | 正規化条件・threshold・review_threshold・marginなど実行時の値 |
| status | 文字列 | pending / running / completed / failed |
| error_message | 文字列 | 任意 |

### recognition_inputs — 入力スクショ

| 列 | 型 | 制約・用途 |
|---|---|---|
| input_id | ID | PK |
| run_id | ID | FK → recognition_runs |
| image_id | ID | FK → image_assets |
| position | 整数 | 1以上、投入順 |
| status | 文字列 | pending / completed / failed |
| error_message | 文字列 | 任意 |

UQ: `(run_id, position)`。画像ごとに失敗を記録し、他の画像の結果を残す。

### recognition_detections — 切り出し枠と判定

| 列 | 型 | 制約・用途 |
|---|---|---|
| detection_id | ID | PK |
| input_id | ID | FK → recognition_inputs |
| position | 整数 | 1以上、画面内の順序 |
| crop_image_id | ID | FK → image_assets |
| x | 整数 | 0以上、元画像左上基準の横座標 |
| y | 整数 | 0以上、縦座標 |
| width | 整数 | 1以上、切り出し幅 |
| height | 整数 | 1以上、切り出し高さ |
| status | 文字列 | matched / ambiguous / review / unknown |
| score_gap | 小数 | 任意、1位と2位の差 |
| confirmed_form_id | ID | 任意、FK → character_forms、人が確定した形態 |
| confirmed_at | 日時 | 任意 |

UQ: `(input_id, position)`。矩形が元画像内に収まることはアプリで検証。
ステータス表示は順に「一致候補」「複数候補」「要確認」「不明」。人の確定は自動判定を上書きせず別列に残す。

### recognition_candidates — 候補順位

| 列 | 型 | 制約・用途 |
|---|---|---|
| detection_id | ID | PKの一部、FK → recognition_detections |
| rank | 整数 | PKの一部、1以上 |
| form_id | ID | FK → character_forms.form_id、画像照合によって候補となった形態 |
| score | 小数 | 現行方式では-1〜1。確率ではない |

PK: `(detection_id, rank)`。UQ: `(detection_id, form_id)`。
character_forms.image_idが参照するimage_assets.image_idの画像と照合し、形態ごとのスコアで順位付けする。将来は同一キャラの形態違いをどう表示するかも定義する。


## 判定基準の記録

現行の初期値: 0.6未満は不明、0.6以上0.8未満は要確認、0.8以上で2位との差が0.1未満なら複数候補、それ以外は一致候補。マスター1件では差をNULLとしスコアで判定する。
値はゲーム仕様ではなくアプリの設定。実行時の値をrecognition_runs.parametersへ保存する。不明でも分析用候補順位は保持する。
