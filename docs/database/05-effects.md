# 特性・本能・本能玉・コンボ・補正

[共通ルール](00-common.md) / [全体一覧](../database-design.md)

効果は検証済みの効果コードとパラメータで保存する。以下のJSONにはschema_versionを含め、倍率、確率、持続フレーム、対象条件、重複グループ等を型検証する。

### attributes — 属性

| 論理名     | 物理名               | 型     | 制約・用途                                                  |
| ---------- | -------------------- | ------ | ----------------------------------------------------------- |
| 属性ID     | attribute_id         | ID     | PK                                                          |
| 属性コード | attribute_code       | 文字列 | UQ                                                          |
| 属性名     | attribute_name       | 文字列 | 表示名                                                      |
| 属性略称   | attribute_short_name | 文字列 | 属性の短縮表示名                                            |
| 画像ID     | image_id             | ID     | 任意、FK → image_assets.image_id、属性を表す画像（最大1枚） |

通常属性と特殊な対象分類を同一マスタで管理する。赤い敵・浮いてる敵・黒い敵・メタルな敵・天使・エイリアン・ゾンビ・悪魔・超獣・超生命体・超賢者等を含め、現時点では通常属性と特殊分類を別テーブルに分離しない。


### abilities — 特性・能力

| 論理名         | 物理名                   | 型     | 制約・用途                                                        |
| -------------- | ------------------------ | ------ | ----------------------------------------------------------------- |
| 特性・能力ID   | ability_id               | ID     | PK                                                                |
| 特性・能力コード | ability_code             | 文字列 | UQ、計算処理と対応                                                |
| 特性・能力名   | ability_name             | 文字列 | 名称                                                              |
| パラメータ定義 | ability_parameter_schema | JSON   | パラメータの型と必須項目                                          |
| 画像ID         | image_id                 | ID     | 任意、FK → image_assets.image_id、特性・能力を表す画像（最大1枚） |

ability_parameter_schemaは、form_abilities.ability_parametersに格納できるキー、型、必須項目等を定義する。abilities側は「どのような値を持つ能力なのか」という定義を持ち、form_abilities.ability_parametersは実際のキャラクター形態ごとの値を持つ。

「動きを遅くする」の説明例（schema_version等の共通項目は省略）：

ability_parameter_schema（定義の概念例。最終的なJSONスキーマ形式ではない）：

```json
{
  "probability": "...",
  "duration_frames": "..."
}
```

form_abilities.ability_parameters：

```json
{
  "probability": 50,
  "duration_frames": 120
}
```

上記の数値は説明用。確率等の単位・値形式とJSON内部の最終キー名はJSONスキーマ設計時に統一する。

### form_abilities — 形態特性・能力

| 論理名         | 物理名             | 型   | 制約・用途                           |
| -------------- | ------------------ | ---- | ------------------------------------ |
| 形態特性ID     | form_ability_id    | ID   | PK                                   |
| 形態ID         | form_id            | ID   | 形態                                 |
| 版ID           | revision_id        | ID   | データ版                             |
| 特性・能力ID   | ability_id         | ID   | FK → abilities                       |
| 適用攻撃順     | attack_order       | 整数 | 任意、連続攻撃のうち特定の攻撃にだけ適用する場合（1＝1撃目、2＝2撃目、3＝3撃目） |
| 効果パラメータ | ability_parameters | JSON | 確率・倍率・持続時間等               |
| 出典ID         | source_id          | ID   | 任意、FK → sources                   |

FK(form_id, revision_id) → form_stats。attack_orderがNULLの場合は特定の攻撃に限定しない。

UQ(form_id, revision_id, ability_id, attack_order)。attack_orderがNULLの場合のUNIQUE制約の具体的な実装方法は、DB製品決定後に検討する。

### form_ability_targets — 形態特性・能力対象属性

| 論理名     | 物理名          | 型  | 制約・用途                    |
| ---------- | --------------- | --- | ----------------------------- |
| 形態特性ID | form_ability_id | ID  | PKの一部、FK → form_abilities |
| 属性ID     | attribute_id    | ID  | PKの一部、FK → attributes     |

対象行が0件の意味はform_abilities.ability_parameters.target_modeでnone / all等を明記し、全属性と対象不明を混同しない。

### talents — 本能

| 論理名     | 物理名      | 型     | 制約・用途                                                  |
| ---------- | ----------- | ------ | ----------------------------------------------------------- |
| 本能ID     | talent_id   | ID     | PK                                                          |
| 本能コード | talent_code | 文字列 | UQ                                                          |
| 本能名     | talent_name | 文字列 | 表示名                                                      |
| 本能種別   | talent_type | 文字列 | normal / super                                              |
| 画像ID     | image_id    | ID     | 任意、FK → image_assets.image_id、本能を表す画像（最大1枚） |

「本能とは何か」を定義する純粋な本能マスタ。どのキャラクターが持つかはcharacter_talentsで管理し、ここには形態依存の適用条件を置かない。


### character_talents — キャラクター本能

| 論理名             | 物理名              | 型  | 制約・用途      |
| ------------------ | ------------------- | --- | --------------- |
| キャラクター本能ID | character_talent_id | ID  | PK              |
| キャラクターID     | character_id        | ID  | FK → characters |
| 本能ID             | talent_id           | ID  | FK → talents    |

UQ(character_id, talent_id)。例えばT001が「攻撃力アップ」であれば、CT001 / C001 / T001とCT002 / C002 / T001のように、複数のキャラクターが同じ本能種類を持てる。


### character_talent_versions — キャラクター本能版

| 論理名             | 物理名                    | 型   | 制約・用途                       |
| ------------------ | ------------------------- | ---- | -------------------------------- |
| キャラクター本能ID | character_talent_id       | ID   | PKの一部、FK → character_talents |
| 版ID               | revision_id               | ID   | PKの一部、FK → master_revisions  |
| 最大レベル         | max_level                 | 整数 | 1以上                            |
| 解放条件グループID | unlock_condition_group_id | ID   | 任意、FK → condition_groups      |
| 出典ID             | source_id                 | ID   | 任意、FK → sources               |

PK(character_talent_id, revision_id)。本能種類そのものではなく、そのキャラクターに設定された本能の版別仕様を管理する。


### character_talent_levels — キャラクター本能レベル

| 論理名             | 物理名              | 型   | 制約・用途                             |
| ------------------ | ------------------- | ---- | -------------------------------------- |
| キャラクター本能ID | character_talent_id | ID   | PKの一部                               |
| 版ID               | revision_id         | ID   | PKの一部                               |
| 本能レベル         | talent_level        | 整数 | PKの一部、1以上                        |
| 必要NP             | np_cost             | 整数 | 0以上、その段階へ上げる費用            |
| 累積効果           | talent_effects      | JSON | そのレベル時点の累積効果。差分ではない |

PK(character_talent_id, revision_id, talent_level)。FK(character_talent_id, revision_id) → character_talent_versions。talent_level<=max_level。効果JSON内の能力IDを検証。


### character_talent_form_applications — キャラクター本能形態適用

| 論理名             | 物理名              | 型  | 制約・用途                  |
| ------------------ | ------------------- | --- | --------------------------- |
| キャラクター本能ID | character_talent_id | ID  | PKの一部                    |
| 版ID               | revision_id         | ID  | PKの一部                    |
| 形態ID             | form_id             | ID  | PKの一部                    |
| 適用条件グループID | condition_group_id  | ID  | 任意、FK → condition_groups |

PK(character_talent_id, revision_id, form_id)。FK(character_talent_id, revision_id) → character_talent_versions。FK(form_id, revision_id) → form_stats。

どのキャラクターのどの本能が、どの形態で有効かを管理する。character_idはcharacter_talentsから取得できるため重複保持しない。character_talents.character_idとcharacter_forms.character_idが一致することを登録・更新時にアプリで検証する。形態が変わっただけで全本能を無条件に適用しない。


### orbs — 本能玉

| 論理名       | 物理名        | 型     | 制約・用途                                                    |
| ------------ | ------------- | ------ | ------------------------------------------------------------- |
| 本能玉ID | orb_id   | ID     | PK                                                            |
| 本能玉コード | orb_code | 文字列 | UQ                                                            |
| 本能玉名 | orb_name | 文字列 | 表示名                                                        |
| 画像ID       | image_id      | ID     | 任意、FK → image_assets.image_id、本能玉を表す画像（最大1枚） |

本能玉の基本マスタ。対象属性とランクはorb_variantsで管理する。


### orb_variants — 本能玉バリエーション

| 論理名       | 物理名       | 型     | 制約・用途          |
| ------------ | ------------ | ------ | ------------------- |
| 本能玉バリエーションID     | orb_variant_id       | ID     | PK                  |
| 本能玉ID | orb_id  | ID     | FK → orbs      |
| 属性ID       | attribute_id | ID     | FK → attributes     |
| 本能玉ランク | orb_rank     | 文字列 | S / A / B / C / D等 |

UQ(orb_id, attribute_id, orb_rank)。本能玉・対象属性・ランクによって決まる具体的なバリエーションを管理する。例えばOT001が「ダメージアップ」であれば、O001＝OT001 / 赤 / S、O002＝OT001 / 赤 / A、O003＝OT001 / 黒 / Sをそれぞれ別の本能玉バリエーションとして管理する。


### orb_variant_versions — 本能玉バリエーション版

| 論理名         | 物理名                | 型   | 制約・用途                      |
| -------------- | --------------------- | ---- | ------------------------------- |
| 本能玉バリエーションID       | orb_variant_id                | ID   | PKの一部、FK → orb_variants             |
| 版ID           | revision_id           | ID   | PKの一部、FK → master_revisions |
| 効果パラメータ | orb_effect_parameters | JSON | 効果量等を保存する              |
| 出典ID         | source_id             | ID   | 任意、FK → sources              |

PK(orb_variant_id, revision_id)。対象属性はJSONには保存せず、orb_variants.attribute_idで管理する。


### form_orb_slots — 形態の装着枠

| 論理名       | 物理名          | 型   | 制約・用途         |
| ------------ | --------------- | ---- | ------------------ |
| 形態ID       | form_id         | ID   | PKの一部           |
| 版ID         | revision_id     | ID   | PKの一部           |
| スロット番号 | slot_number     | 整数 | PKの一部、1以上    |
| 装着制約     | orb_constraints | JSON | 装着可能な玉の条件 |

FK(form_id, revision_id) → form_stats。装着単位は要仕様確認。

関連テーブルの参照変更について、owned_talents（03-users.md）はtalent_id直接参照からcharacter_talent_id基準への変更が必要。版別の上限・解放条件はcharacter_talent_versionsを参照する。具体的な本能玉バリエーションの参照先はorb_variants.orb_variant_id、版別効果の参照先はorb_variant_versions、本能玉の基本マスタの参照先はorbs.orb_idとなる。equipped_orbs（03-users.md）は未レビュー・要参照変更であり、具体的な本能玉バリエーションを参照するための変更はレビュー待ちとする。これらの未レビューの関連テーブルとform_orb_slotsの構造は今回変更せず、参照変更の詳細は別途検討する。

### combos — にゃんコンボ

| 論理名         | 物理名     | 型     | 制約・用途 |
| -------------- | ---------- | ------ | ---------- |
| にゃんコンボID | combo_id   | ID     | PK         |
| にゃんコンボ名 | combo_name | 文字列 | 正式名     |

### combo_versions — コンボの効果と解放条件

| 論理名             | 物理名                    | 型   | 制約・用途                      |
| ------------------ | ------------------------- | ---- | ------------------------------- |
| にゃんコンボID     | combo_id                  | ID   | PKの一部、FK → combos           |
| 版ID               | revision_id               | ID   | PKの一部、FK → master_revisions |
| コンボ効果         | combo_effects             | JSON | 効果種類・強さ・重複規則        |
| 解放条件グループID | unlock_condition_group_id | ID   | 任意、FK → condition_groups     |
| 発動位置条件       | placement_conditions      | JSON | 発動対象となる編成位置等        |
| 出典ID             | source_id                 | ID   | 任意、FK → sources              |

### combo_members — コンボに必要なキャラ

| 論理名         | 物理名       | 型  | 制約・用途                |
| -------------- | ------------ | --- | ------------------------- |
| にゃんコンボID | combo_id     | ID  | PKの一部                  |
| 版ID           | revision_id  | ID  | PKの一部                  |
| キャラクターID | character_id | ID  | PKの一部、FK → characters |

FK(combo_id, revision_id) → combo_versions。全メンバーが必要（AND）。

### combo_member_forms — メンバーとして認める形態

| 論理名         | 物理名       | 型  | 制約・用途       |
| -------------- | ------------ | --- | ---------------- |
| にゃんコンボID | combo_id     | ID  | PKの一部         |
| 版ID           | revision_id  | ID  | PKの一部         |
| キャラクターID | character_id | ID  | メンバーのキャラ |
| 許可形態ID     | form_id      | ID  | PKの一部         |

FK(combo_id, revision_id, character_id) → combo_members。FK(character_id, form_id) → character_forms。同じメンバー内の形態はOR。最低形態番号で推測せず、有効な形態を列挙する。各メンバーに1件以上必要。

### modifier_definitions — お宝・施設などの補正項目

| 論理名       | 物理名                | 型     | 制約・用途                     |
| ------------ | --------------------- | ------ | ------------------------------ |
| 補正項目ID   | modifier_id           | ID     | PK                             |
| 補正コード   | modifier_code         | 文字列 | UQ                             |
| 補正項目名   | modifier_name         | 文字列 | 名称                           |
| 補正種別     | modifier_type         | 文字列 | treasure / facility / other    |
| 状態スキーマ | modifier_state_schema | JSON   | 達成率や施設レベル等の入力定義 |

### modifier_versions — 版別の補正効果

| 論理名     | 物理名           | 型   | 制約・用途                               |
| ---------- | ---------------- | ---- | ---------------------------------------- |
| 補正項目ID | modifier_id      | ID   | PKの一部、FK → modifier_definitions      |
| 版ID       | revision_id      | ID   | PKの一部、FK → master_revisions          |
| 補正効果   | modifier_effects | JSON | 入力状態から効果へ変換する検証済みルール |
| 出典ID     | source_id        | ID   | 任意、FK → sources                       |

ユーザー状態はuser_modifier_states、計算順・丸めはcalculation_specs。
