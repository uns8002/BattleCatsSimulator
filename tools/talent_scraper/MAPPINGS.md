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
| コスト減少 | cost_down | cost_down | ユーザー指定の共通規則で掲載額×1.5。15〜150円減少、base=0 / step=15 |

クリティカルのNPは先頭5件を切り出したり、最大Lvを10に書き換えたりせず掲載の不整合をそのまま報告します。コスト減少は取得原文を保持し、登録用の減少量を1.5倍して円へ変換します。補正機能は保留のままです。

## catid=376（ネコ探査機）で追加した対応

| サイト本能名 | マスタコード | 全パラメータキー | 変換値 |
|---|---|---|---|
| バリアブレイク | barrier_breaker | activation_rate_percent | 1〜10%、base=0 / step=1 |

既存の古代呪い無効・ふっとばし耐性・基本体力上昇・基本攻撃力上昇は共通マッピングを使用します。新規対応は仮マッピングとして警告を付けます。

## catid=199（ネコサーファー）で追加した対応

| サイト本能名 | マスタコード | 全パラメータキー | 変換値 |
|---|---|---|---|
| ワープ無効 | immune_to_warp | なし | action=add |
| 呪い耐性 | resist_curse | curse_duration_reduction_percent | 16〜70%、base=10 / step=6 |

「動きを止める」は発動率2〜20%のみ掲載され、必須のfreeze_duration_framesがありません。停止時間を推測せず未解決とします。既存形態の停止時間を流用する仕様は未導入です。

## catid=417（温泉天国テルマエ）で追加した対応

| サイト本能名 | マスタコード | 全パラメータキー | 変換値 |
|---|---|---|---|
| 動きを止める耐性 | resist_freeze | freeze_duration_reduction_percent | 16〜70%、base=10 / step=6 |
| 魂攻撃 | soulstrike | なし（空schema） | action=add |

攻撃力アップは既存の全項目抽出を使用し、発動体力50%をbase=50 / step=0、上昇率5〜50%をbase=0 / step=5として保持します。サイト原文の補正は行いません。

## catid=439（時空神クロノス）で追加した対応

| サイト本能名 | マスタコード | 全パラメータキー | 変換値 |
|---|---|---|---|
| 移動速度上昇 | move_speed_up | move_speed_increase | 1〜10、単位「速度」、base=0 / step=1 |
| 烈波ダメージ無効 | immune_to_surge | なし | action=add |
| 超生命体特効 | colossus_slayer | なし | action=add |

超生命体特効のschemaは空です。説明の固定倍率「（攻撃ダメージ x1.6、受けるダメージ x0.7）」だけを数値残存チェックから除外し、マスタにないパラメータは作りません。倍率は原文に保持します。別の倍率や数値が掲載された場合は未解決として検出します。烈波は既存処理で発動率5〜50%、Lv1、範囲400〜700の全4項目を抽出します。

## catid=32（ネコザイル）で追加した対応

| サイト本能名 | マスタ | 全パラメータキー | 変換値 |
|---|---|---|---|
| 撃破時お金アップ | abilities.extra_money | なし（空schema） | action=add |
| 追加対象: エイリアン | effect_targets.alien | なし | 属性追加行 |

「お金2倍（撃破時の獲得金額 x2）」は能力の固定説明として完全一致で数値残存チェックから除外します。原文は保持し、空schemaに倍率キーを新設しません。異なる倍率や追加数値は未解決になります。

## catid=13（女王猫・暗黒嬢）で追加した対応

| サイト本能名 | マスタ | 全パラメータキー | 変換値 |
|---|---|---|---|
| 攻撃力低下無効 | abilities.immune_to_weaken | なし（空schema） | action=add |
| 波動 | abilities.wave_attack | activation_rate_percent, wave_level | 発動率5〜15%、波動Lv6固定 |

波動Lvはbase=6 / step=0として抽出します。掲載発動率5〜15%をLv1〜10で線形計算するとstep=10/9となり、マスタのinteger定義と整合しません。丸めや掲載値の訂正は行わず、波動は未解決としてSQL対象外にします。コスト減少20〜200は既存ルールで1.5倍し30〜300円に換算します。
