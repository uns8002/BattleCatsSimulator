# 入手・解放・進化条件

[共通ルール](00-common.md) / [全体一覧](../database-design.md)

キャラを入手する条件と、所持キャラの形態を解放する条件を分ける。

### condition_groups — 条件グループ

| 論理名         | 物理名               | 型     | 制約・用途            |
| -------------- | -------------------- | ------ | --------------------- |
| 条件グループID | condition_group_id   | ID     | PK                    |
| 版ID           | revision_id          | ID     | FK → master_revisions |
| 条件グループ名 | condition_group_name | 文字列 | 内容の説明            |
| 出典ID         | source_id            | ID     | 任意、FK → sources    |

グループ内の条件はすべて必要（AND）。選択可能な別ルートは別グループ・別ルールとして登録する。

### condition_items — 条件項目

| 論理名         | 物理名               | 型     | 制約・用途                                             |
| -------------- | -------------------- | ------ | ------------------------------------------------------ |
| 条件項目ID     | condition_item_id    | ID     | PK                                                     |
| 条件グループID | condition_group_id   | ID     | FK → condition_groups                                  |
| 条件種別       | condition_type       | 文字列 | level / user_rank / stage_clear / item / event / other |
| 条件パラメータ | condition_parameters | JSON   | 条件種別ごとの入力。未知の種別は評価不可               |

例: levelなら通常レベルと合計レベルのどちらを見るかと下限値、stage_clearならvariant_id、itemならmaterial_idと必要数。ID参照をアプリで検証。複雑なOR条件は勝手に平坦化せずスキーマを拡張する。

### materials — 素材

| 論理名 | 物理名        | 型     | 制約・用途              |
| ------ | ------------- | ------ | ----------------------- |
| 素材ID | material_id   | ID     | PK                      |
| 素材名 | material_name | 文字列 | 名称                    |
| 画像ID | image_id      | ID     | 任意、FK → image_assets |

### acquisition_methods — 入手経路

| 論理名             | 物理名             | 型     | 制約・用途                                      |
| ------------------ | ------------------ | ------ | ----------------------------------------------- |
| 入手経路ID         | acquisition_id     | ID     | PK                                              |
| キャラクターID     | character_id       | ID     | FK → characters                                 |
| 版ID               | revision_id        | ID     | FK → master_revisions                           |
| 入手方法種別       | acquisition_type   | 文字列 | gacha / stage_reward / purchase / event / other |
| 入手経路名         | acquisition_name   | 文字列 | ガチャやイベント等の名前                        |
| 入手条件グループID | condition_group_id | ID     | 任意、FK → condition_groups                     |
| 出典ID             | source_id          | ID     | 任意、FK → sources                              |

1キャラに複数の入手経路を登録可能。ガチャ経路は入手保証ではない。開催期間等はcondition_group_idで参照する条件グループのcondition_items.condition_parametersに保存する。

### evolution_rules — 進化ルール

| 論理名             | 物理名             | 型  | 制約・用途            |
| ------------------ | ------------------ | --- | --------------------- |
| 進化ルールID       | evolution_id       | ID  | PK                    |
| キャラクターID     | character_id       | ID  | 対象キャラ            |
| 進化元形態ID       | from_form_id       | ID  | 進化元                |
| 進化先形態ID       | to_form_id         | ID  | 進化先                |
| 版ID               | revision_id        | ID  | FK → master_revisions |
| 進化条件グループID | condition_group_id | ID  | FK → condition_groups |
| 出典ID             | source_id          | ID  | 任意、FK → sources    |

FK(character_id, from_form_id)およびFK(character_id, to_form_id) → character_forms。元と先は異なること。同じ版の条件グループを参照。素材の必要数はitem条件で保存。ユーザーの解放済み事実はowned_formsに保存する。
