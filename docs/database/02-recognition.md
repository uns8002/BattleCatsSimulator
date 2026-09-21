# 画像取り込み・照合履歴

[共通ルール](00-common.md) / [全体一覧](../database-design.md)

以下はマスターではなく実行データ。20枚程度の画像を1回の取り込みとして扱える。

### recognition_runs — 実行

| 論理名           | 物理名                 | 型     | 制約・用途                                                    |
| ---------------- | ---------------------- | ------ | ------------------------------------------------------------- |
| 実行ID           | run_id                 | ID     | PK                                                            |
| ユーザーID       | user_id                | ID     | 任意、FK → users。ログイン前PoCではNULL                       |
| 版ID             | revision_id            | ID     | FK → master_revisions                                         |
| 認識コード版     | algorithm_version      | 文字列 | 検出・照合コードの版                                          |
| 実行パラメータ   | recognition_parameters | JSON   | 正規化条件・threshold・review_threshold・marginなど実行時の値 |
| 実行状態         | run_status             | 文字列 | pending / running / completed / failed                        |
| エラーメッセージ | error_message          | 文字列 | 任意                                                          |

### recognition_inputs — 入力

| 論理名           | 物理名        | 型     | 制約・用途                   |
| ---------------- | ------------- | ------ | ---------------------------- |
| 入力ID           | input_id      | ID     | PK                           |
| 実行ID           | run_id        | ID     | FK → recognition_runs        |
| 画像ID           | image_id      | ID     | FK → image_assets            |
| 投入順           | input_order   | 整数   | 1以上、投入順                |
| 取り込み状態     | input_status  | 文字列 | pending / completed / failed |
| エラーメッセージ | error_message | 文字列 | 任意                         |

UQ: `(run_id, input_order)`。画像ごとに失敗を記録し、他の画像の結果を残す。

### recognition_detections — 検出

| 論理名         | 物理名            | 型     | 制約・用途                                   |
| -------------- | ----------------- | ------ | -------------------------------------------- |
| 検出ID         | detection_id      | ID     | PK                                           |
| 入力ID         | input_id          | ID     | FK → recognition_inputs                      |
| 画面内順序     | detection_order   | 整数   | 1以上、画面内の順序                          |
| 切り出し画像ID | crop_image_id     | ID     | FK → image_assets                            |
| 左上X座標      | detection_x       | 整数   | 0以上、元画像左上基準の横座標                |
| 左上Y座標      | detection_y       | 整数   | 0以上、縦座標                                |
| 切り出し幅     | detection_width   | 整数   | 1以上、切り出し幅                            |
| 切り出し高さ   | detection_height  | 整数   | 1以上、切り出し高さ                          |
| 判定状態       | detection_status  | 文字列 | matched / ambiguous / review / unknown       |
| 候補スコア差   | score_gap         | 小数   | 任意、1位と2位の差                           |
| 確定形態ID     | confirmed_form_id | ID     | 任意、FK → character_forms、人が確定した形態 |
| 確定日時       | confirmed_at      | 日時   | 任意                                         |

UQ: `(input_id, detection_order)`。矩形が元画像内に収まることはアプリで検証。
ステータス表示は順に「一致候補」「複数候補」「要確認」「不明」。人の確定は自動判定を上書きせず別列に残す。

### recognition_candidates — 候補

| 論理名     | 物理名          | 型   | 制約・用途                                                     |
| ---------- | --------------- | ---- | -------------------------------------------------------------- |
| 検出ID     | detection_id    | ID   | PKの一部、FK → recognition_detections                          |
| 候補順位   | candidate_rank  | 整数 | PKの一部、1以上                                                |
| 形態ID     | form_id         | ID   | FK → character_forms.form_id、画像照合によって候補となった形態 |
| 照合スコア | candidate_score | 小数 | 現行方式では-1〜1。確率ではない                                |

PK: `(detection_id, candidate_rank)`。UQ: `(detection_id, form_id)`。
character_forms.image_idが参照するimage_assets.image_idの画像と照合し、形態ごとのスコアで順位付けする。将来は同一キャラの形態違いをどう表示するかも定義する。

## 判定基準の記録

現行の初期値: 0.6未満は不明、0.6以上0.8未満は要確認、0.8以上で2位との差が0.1未満なら複数候補、それ以外は一致候補。マスター1件では差をNULLとしスコアで判定する。
値はゲーム仕様ではなくアプリの設定。実行時の値をrecognition_runs.recognition_parametersへ保存する。不明でも分析用候補順位は保持する。
