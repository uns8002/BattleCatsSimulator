# キャラ・形態・画像マスター

[共通ルール](00-common.md) / [全体一覧](../database-design.md)

### rarities — レア度

| 論理名       | 物理名       | 型     | 制約・用途     |
| ------------ | ------------ | ------ | -------------- |
| レア度ID     | rarity_id    | ID     | PK             |
| レア度コード | rarity_code  | 文字列 | UQ、内部コード |
| レア度名     | rarity_name  | 文字列 | 表示名         |
| 表示順       | rarity_order | 整数   | 表示順         |

### characters — キャラクター

| 論理名         | 物理名         | 型     | 制約・用途                       |
| -------------- | -------------- | ------ | -------------------------------- |
| キャラクターID | character_id   | ID     | PK、形態共通                     |
| キャラクター名 | character_name | 文字列 | 代表名。名前で一意性を判定しない |
| レア度ID       | rarity_id      | ID     | 任意、FK → rarities              |
| 有効フラグ     | is_active      | 真偽   | 廃止・非表示管理、初期値true     |

### character_aliases — 略称・別名

| 論理名           | 物理名          | 型     | 制約・用途                      |
| ---------------- | --------------- | ------ | ------------------------------- |
| 略称ID           | alias_id        | ID     | PK                              |
| キャラクターID   | character_id    | ID     | FK → characters                 |
| キャラクター別名 | character_alias | 文字列 | 形態を限定しない検索用別名      |
| 代表略称フラグ   | is_preferred    | 真偽   | 表示用の代表略称か。初期値false |

UQ: `(character_id, character_alias)`。同じ略称を複数キャラが持つことは許可。

### character_forms — 形態

| 論理名         | 物理名       | 型     | 制約・用途                                           |
| -------------- | ------------ | ------ | ---------------------------------------------------- |
| 形態ID         | form_id      | ID     | PK                                                   |
| キャラクターID | character_id | ID     | FK → characters                                      |
| 形態番号       | form_number  | 整数   | 1以上。将来の形態追加を考慮し上限4を固定しない       |
| 形態名         | form_name    | 文字列 | 形態の正式名                                         |
| 画像ID         | image_id     | ID     | 任意、FK → image_assets.image_id、その形態を表す画像 |
| 有効フラグ     | is_active    | 真偽   | 初期値true                                           |

UQ: `(character_id, form_number)` および `(character_id, form_id)`。所有・レベルはこのテーブルに持たせない。

1形態につき画像は最大1枚。通常の画面表示・一覧表示・画像認識と照合には同じ画像を使用する。画像未収集の形態も登録できるようimage_idはNULL可とする。

### form_aliases — 形態の略称・別名

| 論理名         | 物理名       | 型     | 制約・用途                      |
| -------------- | ------------ | ------ | ------------------------------- |
| 略称ID         | alias_id     | ID     | PK                              |
| 形態ID         | form_id      | ID     | FK → character_forms            |
| 形態別名       | form_alias   | 文字列 | 特定形態を指す略称・検索用別名  |
| 代表略称フラグ | is_preferred | 真偽   | 表示用の代表略称か。初期値false |

UQ: (form_id, form_alias)。character_aliasesと同様に複数登録可。代表略称未登録なら正式名を表示する。characters / character_formsにshort_nameを重複保存しない。
正式名はcharacter_forms.form_nameに保存し、略称として必ず複製する必要はない。

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
