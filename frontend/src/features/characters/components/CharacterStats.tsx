import type { CharacterFormDto as Form } from '../api/characterDto';
import { statValues } from '../model/characterDisplay';
import { statLabels } from './statLabels';
export function CharacterStats({
  form,
  level,
  talentLevels,
}: {
  form: Form;
  level: number;
  talentLevels: Record<string, number>;
}) {
  const values = statValues(form, level, undefined, talentLevels);
  return (
    <section className="card">
      <h2>ステータス</h2>
      <p className="muted">
        Lv{level}
        の基本値（Lv1〜60の暫定成長式）。成長倍率・端数処理は実ゲームとの一致未検証です。対応済みの体力・攻撃力本能を反映しています。お宝・にゃんコンボ補正は含みません。
      </p>
      <div className="stats-grid">
        {statLabels.map((label, i) => (
          <div className="stat" key={label} data-testid={'stat-' + i}>
            <span>{label}</span>
            <strong className={values[i].startsWith('未') ? 'unconfirmed' : ''}>{values[i]}</strong>
            {i < 2 && <small>Lv{level}</small>}
            {i === 2 && (
              <small>
                {values[i] === '未対応'
                  ? '攻撃内訳未提供・単純計算対象外、または計算値不足'
                  : '単発攻撃のDPS（小数点以下切り捨て・暫定）'}
              </small>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
