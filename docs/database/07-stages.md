# 敵・ステージ・攻略実績（拡張案）

[共通ルール](00-common.md) / [全体一覧](../database-design.md)

この範囲は今後の実装用の論理案。キャラ画像マスターのDB化には不要。

### enemies — 敵キャラ

| 論理名           | 物理名     | 型     | 制約・用途              |
| ---------------- | ---------- | ------ | ----------------------- |
| 敵キャラクターID | enemy_id   | ID     | PK                      |
| 敵キャラクター名 | enemy_name | 文字列 | 名前                    |
| 画像ID           | image_id   | ID     | 任意、FK → image_assets |

### enemy_stats — 敵の基礎値

| 論理名           | 物理名          | 型   | 制約・用途                             |
| ---------------- | --------------- | ---- | -------------------------------------- |
| 敵キャラクターID | enemy_id        | ID   | PKの一部、FK → enemies                 |
| 版ID             | revision_id     | ID   | PKの一部、FK → master_revisions        |
| 基礎体力         | base_hp         | 整数 | 任意、100%時の体力                     |
| 敵攻撃定義       | enemy_attacks   | JSON | 各段の基礎攻撃力・発生時間・周期・範囲 |
| 移動速度         | move_speed      | 小数 | 任意、距離単位／フレーム               |
| 感知射程         | detection_range | 小数 | 任意、感知射程                         |
| 敵特性           | enemy_abilities | JSON | 特性・耐性                             |
| 出典ID           | source_id       | ID   | 任意、FK → sources                     |

連続攻撃の正規化は敵計算の実装時に行う。

### enemy_attributes — 敵属性

| 論理名           | 物理名       | 型  | 制約・用途                |
| ---------------- | ------------ | --- | ------------------------- |
| 敵キャラクターID | enemy_id     | ID  | PKの一部、FK → enemies    |
| 属性ID           | attribute_id | ID  | PKの一部、FK → attributes |

### stage_maps — マップ

| 論理名     | 物理名       | 型     | 制約・用途           |
| ---------- | ------------ | ------ | -------------------- |
| マップID   | map_id       | ID     | PK                   |
| マップ名   | map_name     | 文字列 | 名前                 |
| マップ分類 | map_category | 文字列 | 章・イベント等の分類 |

### stages — ステージ

| 論理名     | 物理名      | 型     | 制約・用途      |
| ---------- | ----------- | ------ | --------------- |
| ステージID | stage_id    | ID     | PK              |
| マップID   | map_id      | ID     | FK → stage_maps |
| ステージ名 | stage_name  | 文字列 | 名前            |
| 表示順     | stage_order | 整数   | 1以上、並び順   |

UQ(map_id, stage_order)。

### stage_variants — 難易度・版別の条件

| 論理名                   | 物理名             | 型     | 制約・用途            |
| ------------------------ | ------------------ | ------ | --------------------- |
| ステージバリエーションID | variant_id         | ID     | PK                    |
| ステージID               | stage_id           | ID     | FK → stages           |
| 版ID                     | revision_id        | ID     | FK → master_revisions |
| 難易度コード             | difficulty_code    | 文字列 | 難易度コード          |
| マップ幅                 | stage_width        | 整数   | 任意、ゲーム内距離    |
| 敵城体力                 | enemy_castle_hp    | 整数   | 任意、敵城体力        |
| 出撃制約                 | stage_restrictions | JSON   | 出撃制限等            |
| 出典ID                   | source_id          | ID     | 任意、FK → sources    |

UQ(stage_id, difficulty_code, revision_id)。

### stage_spawns — 敵出現設定

| 論理名                   | 物理名              | 型     | 制約・用途                       |
| ------------------------ | ------------------- | ------ | -------------------------------- |
| 出現設定ID               | spawn_id            | ID     | PK                               |
| ステージバリエーションID | variant_id          | ID     | FK → stage_variants              |
| 敵キャラクターID         | enemy_id            | ID     | FK → enemies                     |
| HP倍率                   | hp_multiplier       | 小数   | 任意、1.0=100%                   |
| 攻撃倍率                 | attack_multiplier   | 小数   | 任意、1.0=100%                   |
| 出現数種別               | count_mode          | 文字列 | finite / unlimited / unknown     |
| 出現数                   | spawn_count         | 整数   | 任意、finiteの場合のみ1以上      |
| 出現条件                 | spawn_conditions    | JSON   | 開始時刻・出現間隔・城体力条件等 |
| 検証状態                 | verification_status | 文字列 | unverified / verified            |

finiteの場合のみspawn_count必須。unlimitedとunknownはNULLだがcount_modeで区別。敵の基礎値はvariantと同じ版から選ぶ。

### battle_records — 攻略実績

| 論理名                   | 物理名                   | 型     | 制約・用途                                           |
| ------------------------ | ------------------------ | ------ | ---------------------------------------------------- |
| 攻略実績ID               | battle_record_id         | ID     | PK                                                   |
| ユーザーID               | user_id                  | ID     | FK → users                                           |
| ステージバリエーションID | variant_id               | ID     | FK → stage_variants                                  |
| 結果                     | battle_result            | 文字列 | clear / failure                                      |
| 編成スナップショット     | loadout_snapshot         | JSON   | 当時の編成・レベル・本能・玉・お宝・施設・マスター版 |
| 計算コード版             | calculation_code_version | 文字列 | 計算プログラム版                                     |
| プレイ日時               | played_at                | 日時   | プレイ日時                                           |
| 公開範囲                 | battle_visibility        | 文字列 | private / unlisted / public                          |
| 共有トークンハッシュ     | share_token_hash         | 文字列 | 任意、UQ                                             |
| 検証状態                 | verification_status      | 文字列 | self_reported / verified                             |

ユーザーが後から育成や編成を変えても当時の記録を保持。公開時の個人情報・アクセス制御を別途実装。
