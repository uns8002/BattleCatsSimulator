# 入手・解放・進化条件

[共通ルール](00-common.md) / [全体一覧](../database-design.md)

キャラを入手する条件と、所持キャラの形態を解放する条件を分ける。

### condition_groups — 条件の集合

| 列 | 型 | 制約・用途 |
|---|---|---|
| condition_group_id | ID | PK |
| revision_id | ID | FK → master_revisions |
| name | 文字列 | 内容の説明 |
| source_id | ID | 任意、FK → sources |

グループ内の条件はすべて必要（AND）。選択可能な別ルートは別グループ・別ルールとして登録する。

### condition_items — 個別条件

| 列 | 型 | 制約・用途 |
|---|---|---|
| condition_item_id | ID | PK |
| condition_group_id | ID | FK → condition_groups |
| condition_type | 文字列 | level / user_rank / stage_clear / item / event / other |
| parameters | JSON | 条件種別ごとの入力。未知の種別は評価不可 |

例: levelなら通常レベルと合計レベルのどちらを見るかと下限値、stage_clearならvariant_id、itemならmaterial_idと必要数。ID参照をアプリで検証。複雑なOR条件は勝手に平坦化せずスキーマを拡張する。

### materials — 進化素材・アイテム

| 列 | 型 | 制約・用途 |
|---|---|---|
| material_id | ID | PK |
| name | 文字列 | 名称 |
| image_id | ID | 任意、FK → image_assets |



### acquisition_methods — キャラ入手経路

| 列 | 型 | 制約・用途 |
|---|---|---|
| acquisition_id | ID | PK |
| character_id | ID | FK → characters |
| revision_id | ID | FK → master_revisions |
| method_type | 文字列 | gacha / stage_reward / purchase / event / other |
| name | 文字列 | ガチャやイベント等の名前 |
| condition_group_id | ID | 任意、FK → condition_groups |
| source_id | ID | 任意、FK → sources |

1キャラに複数の入手経路を登録可能。ガチャ経路は入手保証ではない。開催期間等はconditionsに保存する。

### evolution_rules — 形態の進化・解放ルート

| 列 | 型 | 制約・用途 |
|---|---|---|
| evolution_id | ID | PK |
| character_id | ID | 対象キャラ |
| from_form_id | ID | 進化元 |
| to_form_id | ID | 進化先 |
| revision_id | ID | FK → master_revisions |
| condition_group_id | ID | FK → condition_groups |
| source_id | ID | 任意、FK → sources |

FK(character_id, from_form_id)およびFK(character_id, to_form_id) → character_forms。元と先は異なること。同じ版の条件グループを参照。素材の必要数はitem条件で保存。ユーザーの解放済み事実はowned_formsに保存する。
