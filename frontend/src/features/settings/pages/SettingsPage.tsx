import { Link } from 'react-router-dom';
export function SettingsPage({ kind }: { kind: 'treasures' | 'combos' }) {
  return (
    <section className="card standalone">
      <h1>{kind === 'treasures' ? 'お宝設定' : 'にゃんコンボ設定'}</h1>
      <p className="muted">設定データ・補正計算は未対応です。ステータスには反映しません。</p>
      <Link className="button" to="/characters/138">
        キャラクター詳細に戻る
      </Link>
    </section>
  );
}
