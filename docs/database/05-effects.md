# 特性・本能・本能玉・コンボ・補正

[共通ルール](00-common.md) / [全体一覧](../database-design.md)

効果は検証済みの効果コードとパラメータで保存する。以下のJSONにはschema_versionを含め、倍率、確率、持続フレーム、対象条件、重複グループ等を型検証する。

### attributes — 対象属性

| 列 | 型 | 制約・用途 |
|---|---|---|
| attribute_id | ID | PK |
| code | 文字列 | UQ |
| name | 文字列 | 表示名 |



### abilities — 効果の種類

| 列 | 型 | 制約・用途 |
|---|---|---|
| ability_id | ID | PK |
| code | 文字列 | UQ、計算処理と対応 |
| name | 文字列 | 名称 |
| parameter_schema | JSON | パラメータの型と必須項目 |
| image_id | ID | 任意、FK → image_assets.image_id、特性・能力を表す画像（最大1枚） |



### form_abilities — 形態の特性

| 列 | 型 | 制約・用途 |
|---|---|---|
| form_ability_id | ID | PK |
| form_id | ID | 形態 |
| revision_id | ID | データ版 |
| ability_id | ID | FK → abilities |
| attack_id | ID | 任意、特定の攻撃段にだけ適用する場合 |
| parameters | JSON | 確率・倍率・持続時間等 |
| source_id | ID | 任意、FK → sources |

FK(form_id, revision_id) → form_stats。attack_id設定時はFK(attack_id, form_id, revision_id) → form_attacks。NULLは形態全体の特性。

### form_ability_targets — 特性の対象属性

| 列 | 型 | 制約・用途 |
|---|---|---|
| form_ability_id | ID | PKの一部、FK → form_abilities |
| attribute_id | ID | PKの一部、FK → attributes |

対象行が0件の意味はparameters.target_modeでnone / all等を明記し、全属性と対象不明を混同しない。

### talent_options — 本能の識別情報

| 列 | 型 | 制約・用途 |
|---|---|---|
| talent_id | ID | PK |
| character_id | ID | FK → characters |
| code | 文字列 | キャラ内の識別コード |
| name | 文字列 | 表示名 |
| kind | 文字列 | normal / super |
| image_id | ID | 任意、FK → image_assets.image_id、本能を表す画像（最大1枚） |

UQ(character_id, code)、UQ(character_id, talent_id)。ここには形態依存の適用条件を置かない。

### talent_versions — 本能の版別仕様

| 列 | 型 | 制約・用途 |
|---|---|---|
| talent_id | ID | PKの一部、FK → talent_options |
| revision_id | ID | PKの一部、FK → master_revisions |
| max_level | 整数 | 1以上 |
| unlock_condition_group_id | ID | 任意、FK → condition_groups |
| source_id | ID | 任意、FK → sources |



### talent_levels — 各本能レベルの効果

| 列 | 型 | 制約・用途 |
|---|---|---|
| talent_id | ID | PKの一部 |
| revision_id | ID | PKの一部 |
| level | 整数 | PKの一部、1以上 |
| np_cost | 整数 | 0以上、その段階へ上げる費用 |
| effects | JSON | そのレベル時点の累積効果。差分ではない |

FK(talent_id, revision_id) → talent_versions。level<=max_level。効果JSON内の能力IDを検証。

### talent_form_applications — 本能が適用される形態

| 列 | 型 | 制約・用途 |
|---|---|---|
| talent_id | ID | PKの一部 |
| revision_id | ID | PKの一部 |
| form_id | ID | PKの一部 |
| character_id | ID | 同一キャラの形態であることを保証 |
| condition_group_id | ID | 任意、FK → condition_groups |

FK(talent_id, revision_id) → talent_versions。FK(form_id, revision_id) → form_stats。FK(character_id, talent_id) → talent_options。FK(character_id, form_id) → character_forms。形態が変わっただけで全本能を無条件に適用しない。

### orb_types — 本能玉の種類

| 列 | 型 | 制約・用途 |
|---|---|---|
| orb_type_id | ID | PK |
| code | 文字列 | 種類コード |
| rank | 整数 | 1以上 |
| name | 文字列 | 表示名 |
| image_id | ID | 任意、FK → image_assets.image_id、本能玉を表す画像（最大1枚） |

UQ(code, rank)。

### orb_effects — 本能玉の版別効果

| 列 | 型 | 制約・用途 |
|---|---|---|
| orb_type_id | ID | PKの一部、FK → orb_types |
| revision_id | ID | PKの一部、FK → master_revisions |
| effects | JSON | 対象属性と効果 |
| source_id | ID | 任意、FK → sources |



### form_orb_slots — 形態の装着枠

| 列 | 型 | 制約・用途 |
|---|---|---|
| form_id | ID | PKの一部 |
| revision_id | ID | PKの一部 |
| slot_number | 整数 | PKの一部、1以上 |
| constraints | JSON | 装着可能な玉の条件 |

FK(form_id, revision_id) → form_stats。装着単位は要仕様確認。

### combos — にゃんコンボ

| 列 | 型 | 制約・用途 |
|---|---|---|
| combo_id | ID | PK |
| name | 文字列 | 正式名 |



### combo_versions — コンボの効果と解放条件

| 列 | 型 | 制約・用途 |
|---|---|---|
| combo_id | ID | PKの一部、FK → combos |
| revision_id | ID | PKの一部、FK → master_revisions |
| effects | JSON | 効果種類・強さ・重複規則 |
| unlock_condition_group_id | ID | 任意、FK → condition_groups |
| placement_conditions | JSON | 発動対象となる編成位置等 |
| source_id | ID | 任意、FK → sources |



### combo_members — コンボに必要なキャラ

| 列 | 型 | 制約・用途 |
|---|---|---|
| combo_id | ID | PKの一部 |
| revision_id | ID | PKの一部 |
| character_id | ID | PKの一部、FK → characters |

FK(combo_id, revision_id) → combo_versions。全メンバーが必要（AND）。

### combo_member_forms — メンバーとして認める形態

| 列 | 型 | 制約・用途 |
|---|---|---|
| combo_id | ID | PKの一部 |
| revision_id | ID | PKの一部 |
| character_id | ID | メンバーのキャラ |
| form_id | ID | PKの一部 |

FK(combo_id, revision_id, character_id) → combo_members。FK(character_id, form_id) → character_forms。同じメンバー内の形態はOR。最低形態番号で推測せず、有効な形態を列挙する。各メンバーに1件以上必要。

### modifier_definitions — お宝・施設などの補正項目

| 列 | 型 | 制約・用途 |
|---|---|---|
| modifier_id | ID | PK |
| code | 文字列 | UQ |
| name | 文字列 | 名称 |
| kind | 文字列 | treasure / facility / other |
| state_schema | JSON | 達成率や施設レベル等の入力定義 |



### modifier_versions — 版別の補正効果

| 列 | 型 | 制約・用途 |
|---|---|---|
| modifier_id | ID | PKの一部、FK → modifier_definitions |
| revision_id | ID | PKの一部、FK → master_revisions |
| effects | JSON | 入力状態から効果へ変換する検証済みルール |
| source_id | ID | 任意、FK → sources |

ユーザー状態はuser_modifier_states、計算順・丸めはcalculation_specs。
