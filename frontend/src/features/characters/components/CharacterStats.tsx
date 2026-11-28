import type { CharacterDetailDto, CharacterFormDto as Form } from '../api/characterDto';
import { statValues, talentEntries } from '../model/characterDisplay';
import { statLabels } from './statLabels';
import { useTreasureSettings } from '../../settings/state/TreasureSettingsProvider';
export function CharacterStats({
  form,
  character,
  level,
  talentLevels,
}: {
  form: Form;
  character: CharacterDetailDto;
  level: number;
  talentLevels: Record<string, number>;
}) {
  const { settings: treasures } = useTreasureSettings();
  const values = statValues(
    form,
    level,
    undefined,
    talentLevels,
    talentEntries(character),
    treasures,
  );
  return (
    <section className="card character-stats">
      <h2>ステータス</h2>
      <div className="stats-grid">
        {statLabels.map((label, i) =>
          label === '攻撃範囲' ? null : (
            <div className="stat" key={label} data-testid={'stat-' + i}>
              <span>{label}</span>
              <strong className={values[i].startsWith('未') ? 'unconfirmed' : ''}>
                {values[i]}
              </strong>
              {i === 2 && values[i] === '未対応' && (
                <small>攻撃内訳未提供・単純計算対象外、または計算値不足</small>
              )}
            </div>
          ),
        )}
      </div>
    </section>
  );
}
