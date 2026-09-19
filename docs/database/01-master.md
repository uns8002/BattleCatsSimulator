# キャラ・形態・画像マスター

[共通ルール](00-common.md) / [全体一覧](../database-design.md)

### category_groups — 共通区分グループ

| 論理名 | 物理名 | 型 | 制約・用途 |
| ------ | ------ | -- | ---------- |
| 区分グループID | group_id | CHAR(3) | PK、固定3桁の数字文字列（例 `001`） |
| 区分グループ名 | group_name | 文字列 | NOT NULL、表示名 |
| 区分グループコード | group_code | 文字列 | NOT NULL、UQ、参照カラム名の接頭辞 |

group_codeとgroup_idの対応は[共通区分グループマスタデータ](category-master-data.md#category_groups--共通区分グループマスタ)で管理する。

### category_values — 共通区分値

| 論理名 | 物理名 | 型 | 制約・用途 |
| ------ | ------ | -- | ---------- |
| 区分グループID | group_id | CHAR(3) | NOT NULL、複合PK、FK → category_groups.group_id |
| 区分値ID | value_id | CHAR(3) | NOT NULL、複合PK、固定3桁の数字文字列（例 `001`） |
| 区分値名 | value_name | 文字列 | NOT NULL、表示名 |
| 区分値コード | value_code | 文字列 | NOT NULL、グループ内で一意な内部コード |
| 表示順 | display_order | 整数 | NOT NULL、グループ内の表示順 |

PK: `(group_id, value_id)`。FK: `(group_id)` → `category_groups.group_id`。UQ: `(group_id, value_code)`。
value_id単独は一意ではなく、異なるグループで同じ値を使用できる。
両テーブルにも共通ルールのcreated_at / updated_at（UTC日時、必須）を適用する。

マスタデータの設計例は[共通区分値マスタデータ](category-master-data.md#category_values--共通区分値マスタ)を参照する。

### characters — キャラクター

| 論理名 | 物理名 | 型 | 制約・用途 |
| ------ | ------ | -- | ---------- |
| キャラクターID | character_id | ID | PK、形態共通 |
| キャラクター名 | character_name | 文字列 | キャラクター系列の正式名称。名前で一意性を判定しない |
| キャラクター略称 | character_short_name | 文字列 | 任意、キャラクター系列を代表する略称 |
| レア区分ID | rarity_id | CHAR(3) | 任意、group_code = rarity（group_id = `001`）のvalue_id。通常のFKなし |
| 限定区分ID | limited_id | CHAR(3) | 任意、group_code = limited（group_id = `002`）のvalue_id。通常のFKなし |
| コラボ区分ID | collaboration_id | CHAR(3) | 任意、group_code = collaboration（group_id = `003`）のvalue_id。通常のFKなし |

利用側にはgroup_idを保存せず、各カラムが参照するグループを固定する。category_valuesへの通常の複合FKもvalue_id単独へのFKも設定しない。参照・検証は[共通区分参照ルール](00-common.md#共通区分参照)に従う。
既存のレア区分のNULL許容と未確認値の扱いを維持し、追加する2区分も未確認ならNULLとする。「通常」と未確認を混同せず、通常の値を初期値として補わない。

限定区分とコラボ区分は別概念で、それぞれ1キャラクターにつき1値（未確認ならNULL）を持つ。複数値が必要かどうかは実データで判明した時点で拡張を検討する。
分類と具体的な入手方法は分離し、charactersに対してacquisition_methodsが1:Nとなる既存設計を維持する。例えば限定区分が「コラボ限定」、コラボ区分が「コラボ」のキャラクターに、コラボガチャ・イベントステージ・ログイン報酬など複数の入手経路を登録できる。第2・第3形態などの解放条件はevolution_rulesで管理する。これら2テーブルの詳細構造は変更しない。

リリース済みキャラクター自体を無効化する要件はなく、現在の入手可否を有効・無効フラグで管理しない。将来の論理削除はマスターデータ全体の共通方針として別途検討する。

### character_forms — 形態

| 論理名         | 物理名       | 型     | 制約・用途                                           |
| -------------- | ------------ | ------ | ---------------------------------------------------- |
| 形態ID         | form_id      | ID     | PK                                                   |
| キャラクターID | character_id | ID     | FK → characters                                      |
| 形態番号       | form_number  | 整数   | 1以上。将来の形態追加を考慮し上限4を固定しない       |
| 形態名         | form_name    | 文字列 | 形態の正式名                                         |
| 形態略称       | form_short_name | 文字列 | 任意、その形態を代表する略称 |
| 画像ID         | image_id     | ID     | 任意、FK → image_assets.image_id、その形態を表す画像 |

UQ: `(character_id, form_number)` および `(character_id, form_id)`。所有・レベルはこのテーブルに持たせない。

1形態につき画像は最大1枚。通常の画面表示・一覧表示・画像認識と照合には同じ画像を使用する。画像未収集の形態も登録できるようimage_idはNULL可とする。

現在入手不可・期間限定・コラボ終了を形態の無効化として扱わず、有効・無効フラグは持たない。将来の論理削除はマスターデータ全体の共通方針として別途検討する。

#### 代表略称と検索

- `characters.character_short_name` は、キャラクター系列全体を一般的に呼ぶ際の代表略称を最大1つ保持する。
- `character_forms.form_short_name` は、特定形態を代表する略称を最大1つ保持する。
- 両カラムとも略称が存在しない、または未確認の場合はNULLとする。正式名称はそれぞれ `characters.character_name` / `character_forms.form_name` に保持し、略称への複製は必須としない。代表略称がNULLなら正式名称を表示する。
- キャラクター略称と形態略称が同じ値になることを許可する。略称にUQは設定せず、異なるキャラクター・形態間で同じ略称を持つことも許可する。
- 複数の別名・検索語を管理する用途には使用しない。複数略称の必要性が明確になった時点で別名管理の設計を再検討し、現時点では専用・汎用の別名テーブルやJSONカラム等を追加しない。

概念例：`characters.character_name = ネコエステ`、`characters.character_short_name = エステ` の系列に、以下の形態を登録できる。

| 形態 | form_name | form_short_name |
| ---- | --------- | --------------- |
| 第1形態 | ネコエステ | エステ |
| 第2形態 | ネコジェンヌ | ジェンヌ |
| 第3形態 | ネコパーフェクト | パフェ |

将来の検索では、必要に応じて `characters.character_name` / `characters.character_short_name` / `character_forms.form_name` / `character_forms.form_short_name` を対象にできる。形態名・形態略称で一致した場合も、`character_forms.character_id` を通じて対象キャラクターを特定する。

### form_descriptions — 形態の解説

| 論理名   | 物理名           | 型     | 制約・用途            |
| -------- | ---------------- | ------ | --------------------- |
| 解説ID   | description_id   | ID     | PK                    |
| 形態ID   | form_id          | ID     | FK → character_forms  |
| 版ID     | revision_id      | ID     | FK → master_revisions |
| 解説種別 | description_type | 文字列 | game_text / editorial |
| 解説本文 | description_body | 文字列 | 解説本文              |
| 出典ID   | source_id        | ID     | 任意、FK → sources    |

UQ: (form_id, revision_id, description_type)。ゲーム内説明と独自の解説を区別する。転載文章と自分で作成した解説の出典を混同しない。

### sources — 出典

| 論理名        | 物理名            | 型     | 制約・用途                           |
| ------------- | ----------------- | ------ | ------------------------------------ |
| 出典ID        | source_id         | ID     | PK                                   |
| 出典名        | source_name       | 文字列 | Game8、ユーザー提供スクショなど      |
| 出典ページURL | page_url          | 文字列 | 任意、出典ページ                     |
| 取得元外部ID  | external_id       | 文字列 | 任意、取得元の記事番号など           |
| 取得日        | retrieved_on      | 日付   | 取得日                               |
| 取得日時      | retrieved_at      | 日時   | 任意、取得時刻まで分かる場合         |
| 確認日時      | verified_at       | 日時   | 任意、内容を確認した日時             |
| 許諾状態      | permission_status | 文字列 | unconfirmed / permitted / restricted |
| 許諾範囲      | permission_scope  | 文字列 | 任意、利用を認められた範囲           |
| 証跡URL       | evidence_uri      | 文字列 | 任意、許諾や条件を確認できる場所     |
| 補足          | source_notes      | 文字列 | 任意                                 |

出典情報を保持しても権利許諾が得られたことにはならない。URLの一致だけで取得履歴を上書きしない。

### image_assets — 共通画像ファイルマスター

システム全体で使用する画像ファイルのメタデータを管理する。用途分類は持たず、画像が何を表すかは、そのimage_idを参照する専用テーブルで決まる。character_forms・abilities・talents・orb_types・materialsはimage_idを直接保持する。

| 論理名         | 物理名           | 型     | 制約・用途                                                     |
| -------------- | ---------------- | ------ | -------------------------------------------------------------- |
| 画像ID         | image_id         | ID     | PK                                                             |
| 保存キー       | storage_key      | 文字列 | UQ、例 `icons/poc_000005_form1.webp`。特定PCの絶対パスは避ける |
| 画像ハッシュ   | sha256           | 文字列 | 64桁、索引。同じ内容でも出典が異なる場合は重複可               |
| MIMEタイプ     | mime_type        | 文字列 | image/pngなど                                                  |
| 画像幅         | image_width      | 整数   | 1以上                                                          |
| 画像高さ       | image_height     | 整数   | 1以上                                                          |
| ファイルサイズ | byte_size        | 整数   | 1以上                                                          |
| 出典ID         | source_id        | ID     | 任意、FK → sources                                             |
| 元画像URL      | source_image_url | 文字列 | 任意、取得元の画像URL                                          |

### master_revisions — マスターの版

| 論理名               | 物理名               | 型     | 制約・用途                               |
| -------------------- | -------------------- | ------ | ---------------------------------------- |
| 版ID                 | revision_id          | ID     | PK                                       |
| 版番号               | revision_number      | 文字列 | UQ                                       |
| 対象ゲーム版         | game_version         | 文字列 | 任意、確認対象のゲーム版                 |
| マニフェスト保存キー | manifest_storage_key | 文字列 | その版のデータ・画像ハッシュ一覧の保存先 |
| 補足                 | revision_notes       | 文字列 | 任意                                     |

版を発行したら内容を変更せず新しい版を作る。過去の照合を再現するため画像も上書きしない。
