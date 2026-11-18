import type { CharacterDetailDto } from '../api/characterDto';
import type { CharacterSettings } from '../model/state';
import { talentEntries, talentProgress, type TalentDisplay } from '../model/characterDisplay';
import { parseTalentModifiers } from '../model/talentModifiers';
import { IconBadge } from '../../../shared/ui/IconBadge';
export function CharacterTalents({
  character,
  settings,
  onChange,
}: {
  character: CharacterDetailDto;
  settings: CharacterSettings;
  onChange: (s: CharacterSettings) => void;
}) {
  const entries = talentEntries(character);
  return (
    <>
      {(['本能', '超本能'] as const).map((kind) => (
        <TalentCard
          key={kind}
          kind={kind}
          entries={entries.filter((entry) => entry.dto.talent_type_name === kind)}
          settings={settings}
          onChange={onChange}
        />
      ))}
    </>
  );
}

function TalentCard({
  kind,
  entries,
  settings,
  onChange,
}: {
  kind: '本能' | '超本能';
  entries: TalentDisplay[];
  settings: CharacterSettings;
  onChange: (s: CharacterSettings) => void;
}) {
  if (entries.length === 0) return null;
  const progress = entries.map((t) => talentProgress(t.dto, settings.talents[t.key]));
  const total = progress.some((p) => p.used === null)
    ? null
    : progress.reduce((sum, p) => sum + (p.used ?? 0), 0);
  return (
    <section className="card">
      <div className="section-heading">
        <h2>{kind}</h2>
        <span data-testid={kind === '本能' ? 'total-np' : 'ultra-total-np'}>
          使用NP {total ?? '未提供'}
        </span>
      </div>
      {entries.map((entry, index) => {
        const t = entry.dto;
        const p = progress[index];
        const parsed = parseTalentModifiers(t, p.level);
        const corrections = [
          parsed.percentages.hp !== 0
            ? `体力 ${parsed.percentages.hp > 0 ? '+' : ''}${parsed.percentages.hp}%`
            : '',
          parsed.percentages.attackPower !== 0
            ? `攻撃力 ${parsed.percentages.attackPower > 0 ? '+' : ''}${parsed.percentages.attackPower}%`
            : '',
        ].filter(Boolean);
        const correctionLabel = corrections.length
          ? corrections.join(' / ')
          : parsed.unsupportedParameters.length || parsed.invalidParameters.length
            ? '補正計算は未対応'
            : Object.keys(t.parameter_values ?? {}).some((key) => key !== 'action')
              ? '補正なし'
              : '戦闘処理は未対応';
        const change = (value: number) =>
          onChange({ ...settings, talents: { ...settings.talents, [entry.key]: value } });
        return (
          <div className="talent-row" key={entry.key}>
            <div className="section-heading">
              <h3>
                <IconBadge imageKey={t.image_url} label={entry.name} />
              </h3>
              <span>
                Lv{p.level}/{t.max_level ?? '未提供'}
              </span>
            </div>
            <p className="muted">
              {t.talent_type_name ?? '区分未提供'} · {entry.category}
            </p>
            <div className="talent-controls">
              <div className="stepper">
                <button
                  aria-label={entry.name + 'を下げる'}
                  disabled={p.level === 0}
                  onClick={() => change(p.level - 1)}
                >
                  −
                </button>
                <output aria-label={entry.name + 'のレベル'}>{p.level}</output>
                <button
                  aria-label={entry.name + 'を上げる'}
                  disabled={t.max_level === null || p.atMax}
                  onClick={() => change(p.level + 1)}
                >
                  ＋
                </button>
              </div>
              <span>
                {p.atMax ? '最大レベル' : p.next === null ? '次のNP：未提供' : `次 ${p.next}NP`}
              </span>
            </div>
            <div className="section-heading">
              <span className="talent">{correctionLabel}</span>
              <span>使用 {p.used ?? '未提供'}NP</span>
            </div>
          </div>
        );
      })}
    </section>
  );
}
