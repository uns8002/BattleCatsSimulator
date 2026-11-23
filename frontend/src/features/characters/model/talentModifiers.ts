import type { TalentDto } from '../api/characterDto';

type Stat = 'hp' | 'attackPower';
export type TalentModifiers = Record<Stat, number>;

// 分岐はパラメータ種類のみ。ID・名称・NP費用には依存しない。
const parameterStats: Record<string, Stat> = {
  attack_buff_percent: 'attackPower',
  defense_buff_percent: 'hp',
};

export function parseTalentModifiers(talent: TalentDto, selectedLevel: number) {
  const percentages: TalentModifiers = { hp: 0, attackPower: 0 };
  let attackFrequencyReductionFrames = 0;
  const unsupportedParameters: string[] = [];
  const invalidParameters: string[] = [];
  const level = Math.min(
    talent.max_level ?? 0,
    Math.max(0, Number.isFinite(selectedLevel) ? Math.trunc(selectedLevel) : 0),
  );
  const parameters = talent.parameter_values;
  if (!parameters || typeof parameters !== 'object' || Array.isArray(parameters)) {
    return {
      percentages,
      attackFrequencyReductionFrames,
      unsupportedParameters,
      invalidParameters,
    };
  }
  for (const [key, value] of Object.entries(parameters)) {
    if (key === 'action') continue; // 解放情報のみでは補正しない。
    if (key !== 'attack_frequency_reduction_frames' && !Object.hasOwn(parameterStats, key)) {
      unsupportedParameters.push(key);
      continue;
    }
    if (
      !value ||
      typeof value !== 'object' ||
      Array.isArray(value) ||
      typeof value.base !== 'number' ||
      !Number.isFinite(value.base) ||
      typeof value.step !== 'number' ||
      !Number.isFinite(value.step)
    ) {
      invalidParameters.push(key);
      continue;
    }
    const rate = value.base + value.step * level;
    if (!Number.isFinite(rate)) {
      invalidParameters.push(key);
      continue;
    }
    // Lv0は未解放。baseが0以外でも補正を適用しない。
    if (key === 'attack_frequency_reduction_frames') {
      if (!Number.isInteger(rate) || rate < 0) invalidParameters.push(key);
      else if (level > 0) attackFrequencyReductionFrames += rate;
    } else if (level > 0) percentages[parameterStats[key]] += rate;
  }
  return { percentages, attackFrequencyReductionFrames, unsupportedParameters, invalidParameters };
}

export function applyTalentModifiers(
  base: { hp: number | null; attackPower: number | null },
  modifiers: TalentModifiers[],
) {
  // 同じステータスへの補正率は加算してから一度だけ乗算する暫定仕様。
  // 中間値は丸めない。DPSの整数化はDPS計算関数の責務とする。
  const totals = modifiers.reduce<TalentModifiers>(
    (sum, item) => ({ hp: sum.hp + item.hp, attackPower: sum.attackPower + item.attackPower }),
    { hp: 0, attackPower: 0 },
  );
  return {
    hp: base.hp === null ? null : base.hp * (1 + totals.hp / 100),
    attackPower:
      base.attackPower === null ? null : base.attackPower * (1 + totals.attackPower / 100),
  };
}

// 保存された短縮量Fを使用。%→Fは収集ツールの暫定式で各Lv検証済み。
export function applyAttackFrequencyReduction(
  frequency: number | null,
  startup: number | null,
  reduction: number,
): number | null {
  if (reduction === 0) return frequency;
  if (
    frequency === null ||
    startup === null ||
    !Number.isInteger(frequency) ||
    !Number.isInteger(startup) ||
    !Number.isInteger(reduction) ||
    startup < 0 ||
    reduction < 0 ||
    frequency <= 0 ||
    frequency - reduction < startup
  )
    return null;
  return frequency - reduction;
}
