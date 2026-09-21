# ステータス計算の元データ

[共通ルール](00-common.md) / [全体一覧](../database-design.md)

## 計算の流れ

1. 形態の補正前基礎値と、適用するマスター版を選ぶ。
2. ユーザーの通常レベル・＋値と、キャラの成長ルールからレベル倍率を求める。
3. お宝・施設・本能・本能玉・コンボなどを、適用条件と計算順に従って反映する。
4. 必要なら敵属性等を指定して実効ダメージを求める。
5. 各攻撃の威力と攻撃周期からDPSを求める。

レベルごとの完成済み体力・攻撃力・DPSは正本マスターに持たない。成長係数は直前レベルの完成値に掛ける複利として決め打ちしない。
整数や固定小数を使い、丸め方は版付きの計算処理で管理する。

## 基準と単位

- 基礎体力・攻撃力: Lv1相当、お宝・本能・玉・コンボなどを除いた値を正規の保存形式とする。実際にLv1で使えない形態も計算上の基準として扱う。
- 取得元がLv30・お宝最大などの表示値なら、条件と丸めを確認してから変換する。逆算で一意に戻らない場合は未確認として扱い、適当な基礎値を作らない。
- 時間: 整数フレーム。1秒あたりのフレーム数を計算仕様に記録し、秒へ変換して表示する。
- 速度: ゲーム内距離単位／フレームに正規化する。取得元の表示速度との変換規則を記録する。
- 射程: ゲーム内距離単位。感知射程と攻撃の当たり判定範囲は別の列。
- コスト: ゲーム内通貨。どのステージ基準・補正前の値かを明記する。
- 再生産: 基準条件での時間。施設・コンボ補正後の値を基礎値として混在させない。

### calculation_specs — 計算基準

| 論理名       | 物理名                   | 型     | 制約・用途                           |
| ------------ | ------------------------ | ------ | ------------------------------------ |
| 計算基準ID   | calculation_spec_id      | ID     | PK                                   |
| 版ID         | revision_id              | ID     | FK → master_revisions                |
| 計算コード版 | calculation_code_version | 文字列 | 検証済み計算プログラムの版           |
| FPS          | frames_per_second        | 整数   | 1以上、実データで確認した値          |
| 基礎値条件   | base_stat_conditions     | JSON   | 基礎値のレベル・補正なし条件         |
| コスト条件   | cost_conditions          | JSON   | コストの基準ステージ・倍率条件       |
| 再生産条件   | respawn_conditions       | JSON   | 再生産の基準施設状態・下限条件       |
| 単位変換規則 | conversion_rules         | JSON   | 取得元の単位から保存単位への変換仕様 |
| 丸め規則     | rounding_rules           | JSON   | 各段階の整数化と補正順序             |
| 出典ID       | source_id                | ID     | 任意、FK → sources                   |

UQ(calculation_spec_id, revision_id)。未検証の式は実行しない。

### growth_rules — 成長ルール

| 論理名         | 物理名           | 型     | 制約・用途            |
| -------------- | ---------------- | ------ | --------------------- |
| 成長ルールID   | growth_rule_id   | ID     | PK                    |
| 版ID           | revision_id      | ID     | FK → master_revisions |
| 成長パターン名 | growth_rule_name | 文字列 | パターン名            |
| 出典ID         | source_id        | ID     | 任意、FK → sources    |

成長率や区間が同じキャラは同じルールを参照できる。UQ(growth_rule_id, revision_id)。

### growth_rule_segments — 成長ルール区間

| 論理名           | 物理名                 | 型     | 制約・用途                                |
| ---------------- | ---------------------- | ------ | ----------------------------------------- |
| 成長ルールID     | growth_rule_id         | ID     | PKの一部、FK → growth_rules               |
| ステータス種別   | stat_type              | 文字列 | PKの一部、hp / attack                     |
| レベル開始       | level_from             | 整数   | PKの一部、2以上。到達レベルの下限（含む） |
| レベル終了       | level_to               | 整数   | level_from以上、上限（含む）              |
| 増加率（基準点） | increment_basis_points | 整数   | 0以上、基礎値に対する加算率。10000=100%   |

同じルール・stat_typeの区間重複と対応レベル内の欠落を禁止。Lv1の倍率は100%。倍率=10000+Lv2から対象レベルまでの増加率の累積。20%なら2000だが全キャラ固定にはしない。特殊な成長がこの方式で表せなければ別方式として仕様追加する。

### character_level_rules — キャラクターレベルルール

| 論理名             | 物理名                    | 型   | 制約・用途                                |
| ------------------ | ------------------------- | ---- | ----------------------------------------- |
| キャラクターID     | character_id              | ID   | PKの一部、FK → characters                 |
| 版ID               | revision_id               | ID   | PKの一部、FK → master_revisions           |
| 成長ルールID       | growth_rule_id            | ID   | 同じ版の成長ルール                        |
| 最大通常レベル     | max_level                 | 整数 | 1以上、到達可能な通常レベル上限           |
| 最大＋値           | max_plus_level            | 整数 | 0以上                                     |
| 解放条件グループID | unlock_condition_group_id | ID   | 任意、FK → condition_groups、上限解放条件 |

FK(growth_rule_id, revision_id) → growth_rules。段階ごとの上限解放は条件JSONで管理。通常レベルと＋値は別保存し、能力計算時の合算方法をcalculation_specsで定義する。

### form_stats — 形態ステータス

| 論理名           | 物理名              | 型     | 制約・用途                                |
| ---------------- | ------------------- | ------ | ----------------------------------------- |
| 形態ID           | form_id             | ID     | PKの一部、FK → character_forms            |
| 版ID             | revision_id         | ID     | PKの一部、FK → master_revisions           |
| 計算基準ID       | calculation_spec_id | ID     | 同じ版の計算基準                          |
| 基礎体力         | base_hp             | 整数   | 任意、確認済みなら1以上                   |
| 移動速度         | move_speed          | 小数   | 任意、距離単位／フレーム、0以上           |
| ノックバック回数 | knockback_count     | 整数   | 任意、1以上                               |
| 感知射程         | detection_range     | 小数   | 任意、感知射程                            |
| 攻撃周期フレーム | attack_cycle_frames | 整数   | 任意、攻撃開始から次の攻撃開始まで、1以上 |
| 基準再生産時間   | base_respawn_frames | 整数   | 任意、基準条件での再生産時間、0以上       |
| 基準コスト       | base_cost           | 整数   | 任意、基準条件でのコスト、0以上           |
| 検証状態         | verification_status | 文字列 | unverified / verified                     |
| 出典ID           | source_id           | ID     | 任意、FK → sources                        |

FK(calculation_spec_id, revision_id) → calculation_specs。verifiedは計算に必要な項目が揃ってから設定。攻撃力は連続攻撃を扱うためform_attacksに保存。

### form_attacks — 形態攻撃

| 論理名       | 物理名         | 型     | 制約・用途                            |
| ------------ | -------------- | ------ | ------------------------------------- |
| 攻撃ID       | attack_id      | ID     | PK                                    |
| 形態ID       | form_id        | ID     | 形態                                  |
| 版ID         | revision_id    | ID     | データ版                              |
| 攻撃順序     | attack_order   | 整数   | 1以上、攻撃段番号                     |
| 基礎攻撃力   | base_damage    | 整数   | 任意、補正前威力、0以上               |
| 攻撃発生時点 | trigger_frames | 整数   | 任意、攻撃動作開始から発生まで、0以上 |
| 攻撃対象種別 | target_mode    | 文字列 | single / area                         |
| 攻撃範囲開始 | range_start    | 小数   | 任意、攻撃が届く範囲の始点            |
| 攻撃範囲終了 | range_end      | 小数   | 任意、攻撃が届く範囲の終点            |
| 出典ID       | source_id      | ID     | 任意、FK → sources                    |

FK(form_id, revision_id) → form_stats。UQ(form_id, revision_id, attack_order)、UQ(attack_id, form_id, revision_id)。範囲が両方設定済みならrange_start<=range_end。NULLは未確認。通常攻撃も確認後に範囲を設定し、感知射程と混同しない。

## DPSと表示値

基本DPS = 1周期の各攻撃の威力の合計 ÷ (attack_cycle_frames / frames_per_second)。
すべての攻撃が命中する前提の基本値。実効DPSは命中範囲・敵属性・発動確率・追加攻撃などの条件を別途定義して計算する。
攻撃発生はtrigger_frames、攻撃頻度の時間表示はattack_cycle_framesを秒に変換した値。後隙などが別途必要なら元データを追加し、攻撃頻度から推測しない。

## 項目の対応

| 表示項目                       | 計算の元データ                         |
| ------------------------------ | -------------------------------------- |
| 体力                           | form_stats.base_hp + 成長 + 補正       |
| 攻撃力                         | form_attacks.base_damage + 成長 + 補正 |
| KB・速度・感知射程             | form_statsの各列 + 適用される補正      |
| 攻撃発生・攻撃範囲・単体／範囲 | form_attacks                           |
| 攻撃頻度・再生産・コスト       | form_stats + 条件別補正                |
| DPS                            | 計算結果。専用の正本列なし             |
