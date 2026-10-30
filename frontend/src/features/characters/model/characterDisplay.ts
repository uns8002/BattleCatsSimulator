import type { CharacterFormDto, TalentDto } from '../api/characterDto';
import { framesLabel } from './state';
import { calculateBaseStats } from './baseStats';
import { supportsSimpleDps } from './dps';

const numberLabel = (value: number | null) =>
  value === null ? '未提供' : value.toLocaleString('ja-JP');
const timeLabel = (value: number | null) => (value === null ? '未提供' : framesLabel(value));

// JSONの基準値は変更せず、計算結果だけを表示に使用する。
export function statValues(
  form: CharacterFormDto,
  level = 1,
  simpleDpsSupported = supportsSimpleDps(form.form_id),
): string[] {
  const stats = calculateBaseStats(form, level, simpleDpsSupported);
  return [
    stats.supported ? numberLabel(stats.hp) : '未対応',
    stats.supported ? numberLabel(stats.attackPower) : '未対応',
    stats.dps === null ? '未対応' : numberLabel(stats.dps),
    numberLabel(form.attack_range),
    '未提供',
    numberLabel(form.movement_speed),
    numberLabel(form.knockbacks),
    timeLabel(form.attack_frequency_frames),
    timeLabel(form.attack_startup_frames),
    timeLabel(form.respawn_frames),
    form.production_cost === null ? '未提供' : `${numberLabel(form.production_cost)}円`,
  ];
}

export interface TalentDisplay {
  key: string;
  name: string;
  category: string;
  dto: TalentDto;
}
// 表示用の投影。DTOそのものやparameter_valuesには手を加えない。
export function talentEntries(form: CharacterFormDto): TalentDisplay[] {
  return [
    ...(form.talents?.effect_targets ?? []).map((dto) => ({
      key: `${form.form_id}:target:${dto.form_effect_target_talent_id}`,
      name: dto.effect_target_name,
      category: '効果対象',
      dto,
    })),
    ...(form.talents?.effects ?? []).map((dto) => ({
      key: `${form.form_id}:effect:${dto.form_effect_talent_id}`,
      name: dto.effect_name,
      category: '効果',
      dto,
    })),
    ...(form.talents?.abilities ?? []).map((dto) => ({
      key: `${form.form_id}:ability:${dto.form_ability_talent_id}`,
      name: dto.ability_name,
      category: '能力',
      dto,
    })),
  ];
}
export function talentProgress(talent: TalentDto, selected: number = 0) {
  const level = Math.min(
    talent.max_level ?? 0,
    Math.max(0, Number.isFinite(selected) ? Math.trunc(selected) : 0),
  );
  const costs = talent.np_costs;
  const paid = costs?.slice(0, level);
  const used =
    level === 0
      ? 0
      : !paid || paid.length < level || paid.some((n) => n === null)
        ? null
        : paid.reduce<number>((sum, n) => sum + (n ?? 0), 0);
  return {
    level,
    used,
    next: costs?.[level] ?? null,
    atMax: talent.max_level !== null && level === talent.max_level,
  };
}
