# ユーザー・所持・編成

[共通ルール](00-common.md) / [全体一覧](../database-design.md)

### users — アカウント

| 列 | 型 | 制約・用途 |
|---|---|---|
| user_id | ID | PK |
| auth_subject | 文字列 | UQ、認証基盤のユーザー識別子 |
| display_name | 文字列 | 表示名 |
| collection_visibility | 文字列 | private / unlisted / public、初期値private |
| collection_share_token_hash | 文字列 | 任意、UQ、限定公開トークンのハッシュ |

認証方式は未決定。パスワード平文は保存しない。限定公開トークンは推測困難な値を発行し、失効・再発行を可能にする。

### owned_characters — 所持とレベル

| 列 | 型 | 制約・用途 |
|---|---|---|
| user_id | ID | PKの一部、FK → users |
| character_id | ID | PKの一部、FK → characters |
| level | 整数 | 任意、設定済みなら1以上 |
| plus_level | 整数 | 任意、設定済みなら0以上 |
| acquisition_source | 文字列 | manual / screenshot / import |

PK: `(user_id, character_id)`。行が存在すれば所持。未設定レベルはNULL。大量画像で同じキャラが見つかってもこのキーで重複排除し、既存の育成値は上書きしない。

### owned_forms — 解放済み形態

| 列 | 型 | 制約・用途 |
|---|---|---|
| user_id | ID | PKの一部 |
| character_id | ID | 所持・形態整合性確認用 |
| form_id | ID | PKの一部 |

FK: `(user_id, character_id)` → owned_characters。
FK: `(character_id, form_id)` → character_forms（参照先に同列組のUQを追加）。他キャラの形態を誤登録できないようにする。

### formations — 編成

| 列 | 型 | 制約・用途 |
|---|---|---|
| formation_id | ID | PK |
| user_id | ID | FK → users |
| name | 文字列 | 編成名 |
| visibility | 文字列 | private / unlisted / public、初期値private |
| share_token_hash | 文字列 | 任意、UQ |
| notes | 文字列 | 任意 |

### formation_slots — 編成枠

| 列 | 型 | 制約・用途 |
|---|---|---|
| formation_id | ID | PKの一部、FK → formations |
| slot_number | 整数 | PKの一部、1〜10（仕様確認後に確定） |
| character_id | ID | 同一キャラの重複を防ぐ |
| form_id | ID | 使用形態 |

UQ: `(formation_id, character_id)`。
FK: `(character_id, form_id)` → character_forms。所持・解放済みであることは編成所有者と合わせてアプリで検証。未所持込みの仮編成を許すかは将来の仕様判断。


### owned_talents — 解放・育成した本能

| 列 | 型 | 制約・用途 |
|---|---|---|
| user_id | ID | PKの一部 |
| character_id | ID | 所持と対象キャラの照合用 |
| talent_id | ID | PKの一部、FK → talent_options |
| level | 整数 | 0以上、0は未解放 |

FK(user_id, character_id) → owned_characters。FK(character_id, talent_id) → talent_options。行なしは未設定、0は確認済み未解放。選択中の版の上限と解放条件を検証する。

### equipped_orbs — 装着中の本能玉

| 列 | 型 | 制約・用途 |
|---|---|---|
| user_id | ID | PKの一部 |
| character_id | ID | PKの一部 |
| slot_number | 整数 | PKの一部、1以上 |
| orb_type_id | ID | FK → orb_types |

FK(user_id, character_id) → owned_characters。利用形態・版に対して装着可能かアプリで確認する。

### user_modifier_states — お宝・施設などの育成状態

| 列 | 型 | 制約・用途 |
|---|---|---|
| user_id | ID | PKの一部、FK → users |
| modifier_id | ID | PKの一部、FK → modifier_definitions |
| state | JSON | レベル・達成率など。定義のstate_schemaで検証 |

未登録は不明とする。明示的な0や未解放と区別する。
