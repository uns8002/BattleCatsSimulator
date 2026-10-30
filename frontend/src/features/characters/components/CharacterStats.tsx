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
    <section className="card character-stats">
      <h2>ステータス</h2>
      <div className="stats-grid">
        {statLabels.map((label, i) => (
          <div className="stat" key={label} data-testid={'stat-' + i}>
            <span>{label}</span>
            <strong className={values[i].startsWith('未') ? 'unconfirmed' : ''}>{values[i]}</strong>
            {i < 2 && <small>Lv{level}</small>}
            {i === 2 && values[i] === '未対応' && (
              <small>攻撃内訳未提供・単純計算対象外、または計算値不足</small>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
