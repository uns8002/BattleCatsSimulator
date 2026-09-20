# ユーザー・所持・編成

[共通ルール](00-common.md) / [全体一覧](../database-design.md)

### users — アカウント

| 論理名               | 物理名                      | 型     | 制約・用途                                 |
| -------------------- | --------------------------- | ------ | ------------------------------------------ |
| ユーザーID           | user_id                     | ID     | PK                                         |
| 認証主体             | auth_subject                | 文字列 | UQ、認証基盤のユーザー識別子               |
| 表示名               | user_name                   | 文字列 | 表示名                                     |
| コレクション公開範囲 | collection_visibility       | 文字列 | private / unlisted / public、初期値private |
| 共有トークンハッシュ | collection_share_token_hash | 文字列 | 任意、UQ、限定公開トークンのハッシュ       |

認証方式は未決定。パスワード平文は保存しない。限定公開トークンは推測困難な値を発行し、失効・再発行を可能にする。

### owned_characters — 所持とレベル

| 論理名         | 物理名             | 型     | 制約・用途                   |
| -------------- | ------------------ | ------ | ---------------------------- |
| ユーザーID     | user_id            | ID     | PKの一部、FK → users         |
| キャラクターID | character_id       | ID     | PKの一部、FK → characters    |
| 通常レベル     | character_level    | 整数   | 任意、設定済みなら1以上      |
| ＋値           | plus_level         | 整数   | 任意、設定済みなら0以上      |
| 取得経路       | acquisition_source | 文字列 | manual / screenshot / import |

PK: `(user_id, character_id)`。行が存在すれば所持。未設定レベルはNULL。大量画像で同じキャラが見つかってもこのキーで重複排除し、既存の育成値は上書きしない。

### owned_forms — 解放済み形態

| 論理名         | 物理名       | 型  | 制約・用途             |
| -------------- | ------------ | --- | ---------------------- |
| ユーザーID     | user_id      | ID  | PKの一部               |
| キャラクターID | character_id | ID  | 所持・形態整合性確認用 |
| 形態ID         | form_id      | ID  | PKの一部               |

FK: `(user_id, character_id)` → owned_characters。
FK: `(character_id, form_id)` → character_forms（参照先に同列組のUQを追加）。他キャラの形態を誤登録できないようにする。

### formations — 編成

| 論理名               | 物理名               | 型     | 制約・用途                                 |
| -------------------- | -------------------- | ------ | ------------------------------------------ |
| 編成ID               | formation_id         | ID     | PK                                         |
| ユーザーID           | user_id              | ID     | FK → users                                 |
| 編成名               | formation_name       | 文字列 | 編成名                                     |
| 公開範囲             | formation_visibility | 文字列 | private / unlisted / public、初期値private |
| 共有トークンハッシュ | share_token_hash     | 文字列 | 任意、UQ                                   |
| メモ                 | formation_notes      | 文字列 | 任意                                       |

### formation_slots — 編成枠

| 論理名         | 物理名       | 型   | 制約・用途                          |
| -------------- | ------------ | ---- | ----------------------------------- |
| 編成ID         | formation_id | ID   | PKの一部、FK → formations           |
| スロット番号   | slot_number  | 整数 | PKの一部、1〜10（仕様確認後に確定） |
| キャラクターID | character_id | ID   | 同一キャラの重複を防ぐ              |
| 形態ID         | form_id      | ID   | 使用形態                            |

UQ: `(formation_id, character_id)`。
FK: `(character_id, form_id)` → character_forms。所持・解放済みであることは編成所有者と合わせてアプリで検証。未所持込みの仮編成を許すかは将来の仕様判断。

### owned_talents — 解放・育成した本能

| 論理名         | 物理名       | 型   | 制約・用途               |
| -------------- | ------------ | ---- | ------------------------ |
| ユーザーID     | user_id      | ID   | PKの一部                 |
| キャラクターID | character_id | ID   | 所持と対象キャラの照合用 |
| 本能ID         | talent_id    | ID   | PKの一部、FK → talents   |
| 本能レベル     | talent_level | 整数 | 0以上、0は未解放         |

FK(user_id, character_id) → owned_characters。FK(character_id, talent_id) → talents。行なしは未設定、0は確認済み未解放。選択中の版の上限と解放条件を検証する。

### equipped_orbs — 装着中の本能玉

未レビュー・要参照変更：以下のカラム・FK定義は旧参照を意図的に維持している。具体的な本能玉の参照先は現在orb_variants.orb_variant_idだが、このテーブルの参照先変更はレビュー待ちであり、今回の名称変更では構造を変更しない。

| 論理名         | 物理名       | 型   | 制約・用途      |
| -------------- | ------------ | ---- | --------------- |
| ユーザーID     | user_id      | ID   | PKの一部        |
| キャラクターID | character_id | ID   | PKの一部        |
| スロット番号   | slot_number  | 整数 | PKの一部、1以上 |
| 本能玉種別ID   | orb_type_id  | ID   | FK → orb_types  |

FK(user_id, character_id) → owned_characters。利用形態・版に対して装着可能かアプリで確認する。

### user_modifier_states — お宝・施設などの育成状態

| 論理名     | 物理名         | 型   | 制約・用途                                            |
| ---------- | -------------- | ---- | ----------------------------------------------------- |
| ユーザーID | user_id        | ID   | PKの一部、FK → users                                  |
| 補正項目ID | modifier_id    | ID   | PKの一部、FK → modifier_definitions                   |
| 育成状態   | modifier_state | JSON | レベル・達成率など。定義のmodifier_state_schemaで検証 |

未登録は不明とする。明示的な0や未解放と区別する。
