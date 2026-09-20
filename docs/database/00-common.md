# 共通ルール

- 論理設計 v2。DB製品は未選定。SQL・DB・マイグレーションはまだ作成しない。
- PKは主キー、FKは外部キー、UQは重複禁止。型は論理型。任意と記載した列だけNULL可。
- IDは内部文字列ID。既存のpoc\_ IDを保持し、サイト記事番号やゲーム内番号と区別する。
- 全テーブルにcreated_at / updated_at（作成日時 / 更新日時、UTC日時、必須）を持つ。履歴・発行済み版は変更しない。
- 未確認値はNULL。0と混同しない。計算に必須な値が未確認なら結果も「計算不可」とする。
- FK列に索引。マスター参照は原則RESTRICT。子だけで意味を持たないデータの削除はトランザクションで処理する。
- 画像はファイルストレージ、DBにはstorage_keyとハッシュ。ストレージキーは公開URLとは別で、ユーザー画像へのアクセス権を検証する。
- characters / character_formsなどは安定ID。数値・効果は版別の行に分離。版付きテーブルのrevision_idはmaster_revisionsへのFK。
- 版別の親子は同じrevision_idを使用する。複合FKが明記されていない参照もアプリで同一版を検証する。
- master_revisionsのマニフェストはその版の全対象レコードと画像ハッシュの不変スナップショット。現在の名前や画像対応が変わっても履歴を復元する。
- 条件・効果のJSONはバージョン付きスキーマで検証する。任意コードや式をevalしない。参照IDは存在をアプリで検証する。
- 代表略称はcharacters.character_short_name（系列全体）/ character_forms.form_short_name（特定形態）に各最大1つ直接保持する。存在しない・未確認ならNULL。同じ値を許可し、UQは設定しない。複数の別名・検索語は管理せず、追加テーブルやJSONカラムは設けない。
- 出典のpermission_statusは記録であり、取得による利用許諾を意味しない。

## 命名規則

- テーブル名は原則複数形、物理カラム名はsnake_caseとする。自身の属性は原則 `<entity>_<attribute>` とし、entityは単数形にする。
- 語彙は名前=name、コード=code、種別=type、分類=category、状態=status、順序=order、番号=number、順位=rank、レベル=levelに統一する。順序・番号・順位は意味で区別する。
- JSON等は対象を明示し、効果=effects、パラメータ=parameters、条件=conditions、制約=constraints、状態データ=state、結果=result、公開範囲=visibility、補足=notesを用いる。出撃制限はstage_restrictions、幅・高さはimage_width / image_heightなど対象を付ける。
- entityにはテーブル名の修飾語を機械的にすべて含めない。character_formsはform、image_assetsはimage、master_revisionsはrevision、recognition_runs / inputs / detections / candidatesはrun / input / detection / candidate、stage_mapsはmap、stage_variantsはvariant、stage_spawnsはspawnを識別対象とする。
- acquisition_methodsはacquisition、evolution_rulesはevolution、modifier_definitionsはmodifier、battle_recordsはbattle_recordを識別対象とする。認識の実行パラメータはrecognition_parameters、攻略結果はbattle_resultのように、属性の対象に応じて明確な語を用いる。
- 本能種類の識別情報はtalentsで管理し、talent_id / talent_code / talent_name / talent_typeを使用する。キャラクターに設定された本能はcharacter_talentsで管理し、キャラクター本能そのものの識別にはcharacter_talent_idを使用する。character_talent_versions / character_talent_levels / character_talent_form_applicationsなど、キャラクターに設定された本能を参照するテーブルではcharacter_talent_idを使用する。
- 関連・版別テーブルは対象エンティティの語彙とFK名を引き継ぐ。orb_typesの識別情報はorb_type、ランク・効果・装着制約はorbを使用する。代表略称はcharacter_short_name / form_short_nameとする。
- すでに対象が明確なID・FK、base_hp等の性能値、form_number / slot_number、created_at等の日時、storage_key等の共通メタデータは不要に冗長化しない。count_modeやtarget_modeのように解釈・動作モードを表す語は維持する。
- 物理名の変更時はPK・FK・UQ・検証条件・ER図・本文・移行先の参照名も更新する。CSV列名やJSON内の列挙値はDBの物理カラム名と区別する。

## 共通区分参照

- 小規模かつ固定的な区分値は、個別マスタを作成せずcategory_groups / category_valuesで管理する。今回の対象はレア区分・限定区分・コラボ区分のみとし、その他の既存マスターの移行は別途判断する。
- 共通区分を参照するカラムの物理名は `<category_groups.group_code>_id` とし、対応するcategory_values.value_idをCHAR(3)で格納する。rarity_idはrarity、limited_idはlimited、collaboration_idはcollaborationに対応する。
- group_id / value_idは `001` のような固定3桁の数字文字列であり、通常の内部IDとは区別する。先頭ゼロを保持する。
- 利用側にはgroup_idを保存せず、参照グループはカラム定義で固定する。[共通区分マスタデータ](category-master-data.md#category_groups--共通区分グループマスタ)でgroup_codeとgroup_idの対応を一元管理し、各所にgroup_idをハードコードしない。
- category_valuesのPKは(group_id, value_id)であり、value_id単独は一意でない。利用側から通常の複合FKやvalue_id単独へのFKは設定しない。これは利用側にgroup_idを持たせず、区分カラムをCHAR(3)に統一するための意図的な設計である。
- 非NULLの区分値は、登録・更新・移行時にアプリで固定グループ内の存在を検証する。区分値の削除・識別子変更時も利用側の参照切れを検証する。DBの通常のFKではこの整合性を保証しない。

限定区分の参照例（説明用SQL。DDLやマイグレーションの作成は今回の対象外）：

```sql
SELECT characters.character_id, limited.value_name
FROM characters
LEFT JOIN category_groups limited_group
  ON limited_group.group_code = 'limited'
LEFT JOIN category_values limited
  ON limited.group_id = limited_group.group_id
 AND limited.value_id = characters.limited_id;
```

この参照は共通区分定義の `limited → 002` を使うことに相当する。レア区分・コラボ区分も各カラムに対応するgroup_codeで解決する。

## 画像管理方針

- image_assetsはシステム全体で共通の画像ファイルマスターとし、用途分類は持たせない。画像の意味は参照元の専用テーブルで決まる。
- character_forms・abilities・talents・orb_types・materialsは、任意のimage_idでimage_assets.image_idを直接参照する。1形態・1能力／特性・1本能・1本能玉種別・1素材につき最大1画像とし、画像中間テーブルは作らない。
- キャラクター形態の通常表示・一覧表示・画像認識と照合には同じ画像を使用する。
- サムネイル専用画像やその管理用テーブル・カラムは持たない。元画像は小さい想定で、一覧等でも同じファイルの表示サイズだけを変更する。
- 特定用途で複数画像や別種類の画像が必要になった場合は、用途が明確になった時点で専用設計を追加する。未所持枠・空枠・その他UI用の専用テーブルも現時点では作らない。

## 計算値の保存方針

マスターは計算の元データと名前・解説などの非計算情報を保存する。ユーザーの最終体力・最終攻撃力・DPS、各レベルの完成値一覧は保存しない。
レベル未設定はLv1に置き換えない。お宝や施設の未設定も最大と仮定しない。仮定して試算する場合は入力条件に明示する。
計算結果をキャッシュする場合はマスター版・計算プログラム版・全入力のハッシュをキーにし、正本にしない。

## 未確定事項

- DB・認証基盤・公開範囲・削除時の保存期間。
- 実データの基礎値の定義、成長区間、時間単位、丸め順序、コスト基準とお宝・施設補正。
- 本能玉の装着単位がキャラ共通か形態別か。現状はキャラ単位の仮案。
- コンボの配置・重複・発動制約、進化条件のOR/AND構造などのゲーム仕様。
- 未所持キャラを含む仮編成を許すか。

これらは仕様確認前の設計案であり、特定のゲーム計算式を全キャラ共通として固定しない。
