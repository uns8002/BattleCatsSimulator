# 既存CSVからの移行対応

[全体一覧](../database-design.md)

| 現在の列                                            | 移行先                                                                                                                       |
| --------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| characters.csv: character_id, name                  | characters.character_id / characters.character_name（順に対応）                                                              |
| forms.csv: form_id, character_id, form_number, name | character_forms.form_id / character_forms.character_id / character_forms.form_number / character_forms.form_name（順に対応） |
| forms.csv: icon_path                                | image_assets.storage_keyとして画像を登録し、対応するcharacter_forms.image_idにそのimage_idを設定                             |
| forms.csv: source_page_url                          | sources.page_url                                                                                                             |
| forms.csv: source_image_url                         | image_assets.source_image_url                                                                                                |
| forms.csv: retrieved_on                             | sources.retrieved_on（retrieved_atはNULL）                                                                                   |
| forms.csv: usage_permission                         | sources.permission_status                                                                                                    |
| 形態と画像の対応                                    | character_forms.image_id → image_assets.image_id                                                                             |

移行時に画像を読み、サイズ・形式・ハッシュを算出する。レア度やゲーム内IDなど未登録情報を推測で補わない。現状13キャラ・13形態・13画像が移行対象。
取得時刻を架空に精密化せず、日付しか分からない場合はretrieved_atをNULLにする。


CSVの列名は現行形式を維持する。上表のnameは移行元CSVの列名であり、移行先DBではcharacter_name / form_nameへ対応付ける。

## 移行時の確認

- 現在のキャラ・形態IDを維持し、参照切れや重複を検査する。
- 画像はファイル読み込み、寸法、ハッシュを確認する。
- 略称は確認できたものだけ追加し、全キャラ必須にしない。
- 計算に使う基礎値は未収集。攻撃力や体力を推測して埋めない。
- 出典・取得日・許諾状態を引き継ぐ。
- 先にキャラ・画像領域を移行し、計算マスターやユーザー機能は段階的に追加する。

## 共通区分の移行方針

- キャラクターの移行前にcategory_groupsを登録し、[共通区分定義](01-master.md#category_groups--共通区分グループ)の対応（rarity = `001`、limited = `002`、collaboration = `003`）を検証する。category_valuesの掲載値は設計例として確認後に登録する。
- category_valuesはPK(group_id, value_id)、FK(group_id) → category_groups.group_id、UQ(group_id, value_code)を検証する。group_id / value_idは先頭ゼロを保持したCHAR(3)とする。
- 旧レア区分のデータが別途存在する場合は、コード・名称・表示順を確認し、レア区分グループのvalue_code / value_name / display_orderへ対応付ける。旧IDをそのまま流用せず、確認済み対応表でcharacters.rarity_idを同グループのvalue_idへ変換する。旧専用マスターは移行先に作らない。
- 現行characters.csvには3区分の情報がないため、characters.rarity_id / limited_id / collaboration_idは未確認ならNULLとする。名前や入手経路から推測したり、「通常」を自動設定したりしない。
- 利用側にgroup_idを追加せず、区分カラムから通常のFKは設定しない。非NULL値はアプリでカラムに固定されたグループ内に存在するか検証する。異なるグループに同じvalue_idが存在するだけでは有効と判定しない。
- characters / character_formsに有効・無効フラグは移行・生成しない。入手不可やイベント終了をキャラ・形態の無効化に変換しない。
- 分類と入手経路を分離し、acquisition_methodsの1:Nとevolution_rulesによる形態解放を維持する。両テーブルの詳細構造は変更しない。

今回は定義書の更新のみとし、CSV・コード・DB・実行用マイグレーションは変更・作成しない。
