import type { CharacterFormDto as Form } from '../api/characterDto';
import { statValues } from '../model/characterDisplay';
import { statLabels } from './statLabels';
export function CharacterStats({ form, level }: { form: Form; level: number }) {
  const values = statValues(form);
  return (
    <section className="card">
      <h2>ステータス</h2>
      <p className="muted">
        体力・攻撃力はLv1基準値です。選択中のLv{level}への成長計算・本能等の補正は未対応です。
      </p>
      <div className="stats-grid">
        {statLabels.map((label, i) => (
          <div className="stat" key={label} data-testid={'stat-' + i}>
            <span>{label}</span>
            <strong className={values[i].startsWith('未') ? 'unconfirmed' : ''}>{values[i]}</strong>
            {i < 2 && <small>Lv1基準</small>}
          </div>
        ))}
      </div>
    </section>
  );
}
