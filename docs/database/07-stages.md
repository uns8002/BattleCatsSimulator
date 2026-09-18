# 敵・ステージ・攻略実績（拡張案）

[共通ルール](00-common.md) / [全体一覧](../database-design.md)

この範囲は今後の実装用の論理案。キャラ画像マスターのDB化には不要。

### enemies — 敵キャラ

| 列 | 型 | 制約・用途 |
|---|---|---|
| enemy_id | ID | PK |
| name | 文字列 | 名前 |
| image_id | ID | 任意、FK → image_assets |



### enemy_stats — 敵の基礎値

| 列 | 型 | 制約・用途 |
|---|---|---|
| enemy_id | ID | PKの一部、FK → enemies |
| revision_id | ID | PKの一部、FK → master_revisions |
| base_hp | 整数 | 任意、100%時の体力 |
| attacks | JSON | 各段の基礎攻撃力・発生時間・周期・範囲 |
| move_speed | 小数 | 任意、距離単位／フレーム |
| detection_range | 小数 | 任意、感知射程 |
| abilities | JSON | 特性・耐性 |
| source_id | ID | 任意、FK → sources |

連続攻撃の正規化は敵計算の実装時に行う。

### enemy_attributes — 敵属性

| 列 | 型 | 制約・用途 |
|---|---|---|
| enemy_id | ID | PKの一部、FK → enemies |
| attribute_id | ID | PKの一部、FK → attributes |



### stage_maps — マップ

| 列 | 型 | 制約・用途 |
|---|---|---|
| map_id | ID | PK |
| name | 文字列 | 名前 |
| category | 文字列 | 章・イベント等の分類 |



### stages — ステージ

| 列 | 型 | 制約・用途 |
|---|---|---|
| stage_id | ID | PK |
| map_id | ID | FK → stage_maps |
| name | 文字列 | 名前 |
| position | 整数 | 1以上、並び順 |

UQ(map_id, position)。

### stage_variants — 難易度・版別の条件

| 列 | 型 | 制約・用途 |
|---|---|---|
| variant_id | ID | PK |
| stage_id | ID | FK → stages |
| revision_id | ID | FK → master_revisions |
| difficulty_code | 文字列 | 難易度コード |
| width | 整数 | 任意、ゲーム内距離 |
| enemy_castle_hp | 整数 | 任意、敵城体力 |
| restrictions | JSON | 出撃制限等 |
| source_id | ID | 任意、FK → sources |

UQ(stage_id, difficulty_code, revision_id)。

### stage_spawns — 敵出現設定

| 列 | 型 | 制約・用途 |
|---|---|---|
| spawn_id | ID | PK |
| variant_id | ID | FK → stage_variants |
| enemy_id | ID | FK → enemies |
| hp_multiplier | 小数 | 任意、1.0=100% |
| attack_multiplier | 小数 | 任意、1.0=100% |
| count_mode | 文字列 | finite / unlimited / unknown |
| count | 整数 | 任意、finiteの場合のみ1以上 |
| spawn_conditions | JSON | 開始時刻・出現間隔・城体力条件等 |
| verification_status | 文字列 | unverified / verified |

finiteの場合のみcount必須。unlimitedとunknownはNULLだがcount_modeで区別。敵の基礎値はvariantと同じ版から選ぶ。

### battle_records — 攻略実績

| 列 | 型 | 制約・用途 |
|---|---|---|
| record_id | ID | PK |
| user_id | ID | FK → users |
| variant_id | ID | FK → stage_variants |
| result | 文字列 | clear / failure |
| loadout_snapshot | JSON | 当時の編成・レベル・本能・玉・お宝・施設・マスター版 |
| calculation_version | 文字列 | 計算プログラム版 |
| played_at | 日時 | プレイ日時 |
| visibility | 文字列 | private / unlisted / public |
| share_token_hash | 文字列 | 任意、UQ |
| verification_status | 文字列 | self_reported / verified |

ユーザーが後から育成や編成を変えても当時の記録を保持。公開時の個人情報・アクセス制御を別途実装。
