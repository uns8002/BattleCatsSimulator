# 既存CSVからの移行対応

[全体一覧](../database-design.md)

| 現在の列 | 移行先 |
|---|---|
| characters.csv: character_id, name | charactersの同名列 |
| forms.csv: form_id, character_id, form_number, name | character_formsの同名列 |
| forms.csv: icon_path | image_assets.storage_keyとして画像を登録し、対応するcharacter_forms.image_idにそのimage_idを設定 |
| forms.csv: source_page_url | sources.page_url |
| forms.csv: source_image_url | image_assets.source_image_url |
| forms.csv: retrieved_on | sources.retrieved_on（retrieved_atはNULL） |
| forms.csv: usage_permission | sources.permission_status |
| 形態と画像の対応 | character_forms.image_id → image_assets.image_id |

移行時に画像を読み、サイズ・形式・ハッシュを算出する。レア度やゲーム内IDなど未登録情報を推測で補わない。現状13キャラ・13形態・13画像が移行対象。
取得時刻を架空に精密化せず、日付しか分からない場合はretrieved_atをNULLにする。


## 移行時の確認

- 現在のキャラ・形態IDを維持し、参照切れや重複を検査する。
- 画像はファイル読み込み、寸法、ハッシュを確認する。
- 略称は確認できたものだけ追加し、全キャラ必須にしない。
- 計算に使う基礎値は未収集。攻撃力や体力を推測して埋めない。
- 出典・取得日・許諾状態を引き継ぐ。
- 先にキャラ・画像領域を移行し、計算マスターやユーザー機能は段階的に追加する。
