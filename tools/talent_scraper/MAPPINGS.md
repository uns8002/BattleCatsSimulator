# 本能名称の仮マッピングシート

ユーザーの指示で推定した試験用の対応表です。マスタIDは保存せず、実行時にコードから解決します。正本の `mappings.json` を修正・追加してください。下表のIDは初回参照時の確認値です。

| サイト本能名 | DBマスタ名 | コード / 確認ID | parameter_schemaキー | 登録先 |
|---|---|---|---|---|
| 悪魔シールドブレイク | シールドブレイカー | shield_piercing / 9 | activation_rate_percent | form_ability_talents |
| 波動耐性 | 波動ダメージ耐性 | resist_wave / 44 | wave_damage_reduction_percent | form_ability_talents |
| 攻撃力低下耐性 | 攻撃力ダウン耐性 | resist_weaken / 40 | weaken_duration_reduction_percent | form_ability_talents |
| 動きを遅くする耐性 | 動きを遅くする耐性 | resist_slow / 42 | slow_duration_reduction_percent | form_ability_talents |
| 基本攻撃力上昇 | 基本攻撃力アップ | attack_buff / 52 | attack_buff_percent | form_ability_talents |
| 追加対象: 悪魔 | 悪魔 | aku / 9 | なし | form_effect_target_talents |
| 古代呪い無効 | 古代の呪い無効 | immune_to_curse / 37 | なし（action=addのみ） | form_ability_talents |
| 基本体力上昇 | 基本体力アップ | defense_buff / 51 | defense_buff_percent | form_ability_talents |

全件 `provisional: true`。能力は追加型 `action: add`、適用攻撃順は `NULL` と推定しています。名称だけでなくこの対応も目視確認の対象です。キャラクターの形態名には仮マッピングを使わず、無変換の全形態名完全一致を維持しています。

`game_version_id` / `revision_group_id` はユーザー指定によりNULLです。確認・変更後はツールを再実行して登録予定JSON・SQL・レポートを再生成してください。

## catid=272で追加した対応

| サイト本能名 | DBマスタ名 | コード / 確認ID | パラメータキー | 判定 |
|---|---|---|---|---|
| 攻撃力アップ | 攻撃力アップ | strengthen / 1 | strengthen_trigger_hp_percent / strengthen_attack_percent | 全項目を取得。catid=272のみ既知の相違で保留 |
| ふっとばし無効 | ふっとばし無効 | immune_to_knockback / 32 | なし | 仮対応・追加型 |
| 攻撃間隔短縮 | 攻撃間隔短縮 | attack_frequency_up / 57 | attack_frequency_reduction_frames | 暫定式でFへ変換、全Lv検証 |
| 波動ダメージ無効 | 波動ダメージ無効 | immune_to_waves / 33 | なし | 仮対応・追加型 |
| 動きを止める無効 | 動きを止める無効 | immune_to_freeze / 30 | なし | 仮対応・追加型 |

攻撃力アップは仮にenhanceとしていますが、登録対象外です。サイトは「体力が100%未満の時、攻撃力23〜50%上昇」、DBは発動体力80%、攻撃倍率150（第1・2形態）／200（第3形態）です。サイトの上昇率をそのまま既存倍率に置換しません。攻撃間隔短縮はユーザー指定の暫定式 `floor((攻撃頻度F - 攻撃発生F) × 短縮率 / 100 + 0.5)` で短縮Fに変換します。279F・80Fの場合、Lv1〜10は6〜60F短縮となり、base=0 / step=6。ゲーム内部の正確な計算式は未確認です。

攻撃力アップの `unresolved_reason` は確認が済むまでSQL生成を止めます。規則確定時にはこの理由欄だけでなく、定数・条件・単位換算の実装も合わせて更新してください。

## catid=194（アキラ）で追加した対応

| サイト本能名 | マスタコード | キー | 扱い |
|---|---|---|---|
| 動きを止める | effects.freeze | activation_rate_percent / freeze_duration_frames | 発動率と時間を独立抽出、1秒=30Fで変換 |
| 生き残る | abilities.survives | activation_rate_percent | 28〜100%、base=20 / step=8 |
| 烈波攻撃 | abilities.surge_attacks | activation_rate_percent / surge_level / surge_start_range / surge_end_range | 確率・Lv・開始位置・終了位置を格納 |

生き残るの「致死ダメージを1回だけ耐える」は能力の説明であり、レベルによって変化するパラメータではありません。この完全一致フレーズだけを数値残存チェックから除外し、原文には保持します。その他の説明内数値は従来どおり未解決として検出します。

攻撃力アップの共通警告からガネーシャ固有の100%・80%を取り除きました。アキラの原文は体力33%未満です。補正機能は保留のままで、サイト原文の補正は行っていません。

停止は「発動率%で動きを止める、持続 最小秒 -> 最大秒」の形式に対応。固定発動率40%はbase=40 / step=0、停止時間1.3〜4秒は39〜120F、base=30 / step=9で保存します。マスタのキー・単位・整数型を検証し、端数Fは推測で丸めません。

全項目検証への更新後、攻撃力アップ・烈波の固定値も抽出します。以前記載した共通のunresolved_reasonによる保留は廃止し、ガネーシャだけsource_issuesで保留しています。

## catid=46（ねこジュラ）で追加した対応

| サイト本能名 | マスタコード | 全パラメータキー | 初回確認結果 |
|---|---|---|---|
| クリティカル | critical | activation_rate_percent | 1〜5%、base=0 / step=1。ただし最大Lv5に対しNPが10レベル分あり未解決 |
| ふっとばし耐性 | resist_knockback | knockback_distance_reduction_percent | 5〜50%、base=0 / step=5 |
| コスト減少 | cost_down | cost_down | 掲載10〜100は単位なし。マスタの円への対応・基準・符号規則が未確認で未解決 |

クリティカルのNPは先頭5件を切り出したり、最大Lvを10に書き換えたりせず掲載の不整合をそのまま報告します。コスト減少の単位も取得原文に追加しません。補正機能は保留のままです。
