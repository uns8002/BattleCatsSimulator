# キャラクター詳細画面

## 現在のデータソース（2026-10-27）

`frontend/src/features/characters/fixtures/kasajizou_character_detail_display_v3.json` は提供されたJSONの原本コピーです。プロパティ名・値・ID・`parameter_values` を変更していません。過去の画面用ダミーデータと仮の成長・補正計算は削除しました。

`npm run dev` で `/characters/138` を開くと、バックエンドなしで表示できます。ビルド・プレビューも同じJSONを読み込みます。今回の提供レスポンスは以前の開発用ダミーとは別物で、ビルドにも含めます。

## 構成

| 場所（frontend/src/配下） | 役割 |
| --- | --- |
| `features/characters/fixtures/*.json` | 将来のAPIレスポンスに相当する提供データ |
| `features/characters/api/characterDto.ts` | JSONと同じプロパティ名のDTO型 |
| `features/characters/api/validateCharacter.ts` | 取得JSONの型・null・配列・IDの検証。データは加工しない |
| `features/characters/api/characters.ts` | JSONの取得と検証。将来は取得先URLだけをAPIへ変更 |
| `features/characters/state/CharacterProvider.tsx` | 非同期取得、読み込み中・失敗・取得結果の管理 |
| `features/characters/pages/CharacterDetailPage.tsx` と `features/characters/components/` | 既存カード・形態切替・ステータス・本能の表示 |
| `features/characters/model/state.ts` | 入力レベルと本能レベルの画面状態 |
| `features/characters/model/characterDisplay.ts` | 表示値・本能の表示用投影・NP集計。ステータス補正を行わない |
| `shared/images/imagePaths.json` | JSON保存キーと既存画像の物理パスの対応表 |
| `shared/images/imageUrl.ts` / `shared/ui/AssetImage.tsx` | URL解決と画像欠損時のプレースホルダー |

DTOに画面の状態を混ぜません。`form_id` と各関連IDはそのまま保持し、本能選択は「形態ID・分類・本能ID」をキーとして画面側に保存します。同名の本能でも異なる形態間で同一設定だとは推測しません。形態・設定画面の往復では保持し、再読み込みで初期化します。

## 表示ルール

- 形態ボタンは `forms` の順序・件数どおりです。初期表示は末尾の形態で、番号やIDを決め打ちしません。
- キャラクター名・レアリティ・略称・限定区分・コラボはJSONから取得します。任意項目がnullなら表示を省略します。
- 形態名・説明・初登場バージョン・ステータス・対象・効果・能力・本能を選択形態に連動させます。第3形態のバージョンは過去の依頼文ではなく今回のJSONの `13.4.0` を表示します。
- 体力・攻撃力はLv1基準。初期選択レベルは1です。レベルを変更しても基準値は変えず、その旨を表示します。
- 時間は30F=1秒で換算します。DPSは未対応、独立した攻撃範囲フィールドはないため「未提供」とします。「範囲攻撃」「全方位攻撃」はJSONどおり能力に表示します。
- 本能の3分類と本能区分（本能/超本能等）を表示できます。提供JSONには能力本能だけが存在し、超本能の実データはありません。
- `effect_targets` / `effects` の本能配列は原本で空のため、非空データのID・名称プロパティは能力本能と対称の暫定型です。正式な非空レスポンスが届いた際に契約を照合してください。テスト内だけで3分類を検証し、原本へ架空データは追加していません。
- 使用NPは `np_costs` の選択レベルまでの和、次NPは次の要素です。最大レベル・費用がnull/欠損なら「未提供」とし、架空の費用を補いません。
- `parameter_values` のaction/base/step等は保持するだけで、ステータス補正や能力追加を計算しません。
- 配列が空なら「登録なし」、nullなら「未提供」と表示します。本能がない形態にも空状態のカードを表示します。

## 画像

原本の形態画像は4件とも `image_url: null` なので画像未提供のプレースホルダーです。別キャラクターの画像は流用しません。

対象・効果・本能・能力アイコン11種類と、進化素材9種類の保存キーを既存画像へ対応付けています。

- `effect_targets/et_sc_3.png`, `effect_targets/et_sc_5.png` → 同じ相対パス
- `effects/ef_cl_8.png` → 同じ相対パス
- `effects/ab_cl_{2,23,25,37,38,45,51,52}.png` → `abilities/ab_cl_{同じ番号}.png`

能力画像は保存キーのディレクトリとローカル配置が異なります。JSONや画像を改名せず、対応表だけで解決しています。`vite.config.js` は対応表のファイルのみを配信し、PoC用スクリーンショットは公開しません。未知のキー・null・読込失敗はプレースホルダーです。画像追加時は対応表も更新してください。

画像はGit管理外かつ `dist/` に含まれません。別PCでは元画像を用意し、本番では `/images/` の配信設定を行う必要があります。画像が不足する環境ではプレースホルダーになります。

## 今回の対象外

お宝設定・にゃんコンボ設定・参加コンボ・排出ガチャのダミー値は撤去しました。カードと設定画面への導線は残し、未提供・未対応を明記しています。DB・API・認識コード・DB設計は変更していません。

## 確認方法

```bash
cd frontend
npm test
npm run build
npm run test:e2e -- --workers=1
npm run format:check
```

E2EはChromeと専用ポート5183/5184を使用し、サーバーを自動起動・終了します。390px/1280pxの画面操作・NP集計・画像読込・コンソールエラー・横幅と、本番ビルドでのJSON表示を確認します。スクリーンショットは `output/ui-verification/json-390.png` と `json-1280.png` に保存されます。

### 2026-10-27 検証結果

- 提供JSONと配置ファイルはバイト単位で一致。
- 型チェック・本番ビルド成功（React Routerの既存 `use client` ビルド警告あり）。
- 単体テスト10件成功、E2E4件成功。
- 390px/1280pxで4形態・NP操作・画像読込・設定画面往復・横はみ出しなし・コンソールエラーなしを確認。
- JSONの配列順変更・null・未知画像キーと、本番ビルドでAPI不要の表示を確認。
- favicon未配置による404は、空のdata URLを明示して解消。
- Prettierチェック・`git diff --check` 成功。バックエンド・DB・既存画像の変更なし。

### 実装とテストの配置

`frontend/src/` はアプリ本体です。テストコードはすべて `frontend/tests/` にまとめています。

```text
frontend/
├── src/            # アプリ本体
└── tests/
    ├── unit/       # 関数・データ取得のテスト（npm test）
    └── e2e/        # ブラウザ操作テスト（npm run test:e2e）
```

単体テストの型チェックも従来どおりビルド時に実行します。

## 進化情報の追加（2026-10-30）

v3原本に切り替え、選択形態の `required_level`・`required_stage_id`・`materials` を既存エリアに表示します。Lv0は表示しません。ステージ条件はIDだけが提供されるため「ステージID … のクリア」と表示し、nullなら非表示です。素材はJSONの順序で画像と個数を表示し、名前はホバーのtitle、画像欠損時は代替テキストとして表示します。画像は既存 `images/materials/` の9種類を直接配信します。

今回の確認は `tsc --noEmit` のみ成功。新規テストは作成せず、既存テストは参照ファイル名をv3に更新しただけです。画面・操作確認はユーザーによる手動確認とし、ビルド・テスト・ブラウザ確認は今回実行していません。
