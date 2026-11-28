import { applicableTalents } from './talentApplication';
import type { CharacterDetailDto, CharacterFormDto, TalentDto } from '../api/characterDto';
import { framesLabel } from './state';
import { calculateBaseStats } from './baseStats';
import type { TreasureSettings } from '../../settings/model/treasureSettings';
import { applyTreasureStatModifiers, calculateTreasureRespawn } from './treasureModifiers';
import { supportsSimpleDps, calculateSimpleDps } from './dps';
import {
  parseTalentModifiers,
  applyTalentModifiers,
  applyAttackFrequencyReduction,
  applyProductionCostReduction,
  applyMovementSpeedIncrease,
} from './talentModifiers';

const numberLabel = (value: number | null) =>
  value === null ? '未提供' : value.toLocaleString('ja-JP');
const timeLabel = (value: number | null) => (value === null ? '未提供' : framesLabel(value));

// JSONの基準値は変更せず、計算結果だけを表示に使用する。
export function statValues(
  form: CharacterFormDto,
  level = 1,
  simpleDpsSupported = supportsSimpleDps(form.form_id),
  talentLevels: Record<string, number> = {},
  entries: TalentDisplay[] = [],
  treasures?: TreasureSettings,
): string[] {
  const base = calculateBaseStats(form, level);
  const modifiers = applicableTalents(form, entries).map((entry) =>
    parseTalentModifiers(entry.dto, talentLevels[entry.key] ?? 0),
  );
  const stats = treasures
    ? applyTreasureStatModifiers(
        base,
        treasures,
        modifiers.map((m) => m.percentages),
      )
    : applyTalentModifiers(
        base,
        modifiers.map((m) => m.percentages),
      );
  const frequency = modifiers.some((m) =>
    m.invalidParameters.includes('attack_frequency_reduction_frames'),
  )
    ? null
    : applyAttackFrequencyReduction(
        form.attack_frequency_frames,
        form.attack_startup_frames,
        modifiers.reduce((sum, m) => sum + m.attackFrequencyReductionFrames, 0),
      );
  const productionCost = modifiers.some((m) => m.invalidParameters.includes('cost_down'))
    ? null
    : applyProductionCostReduction(
        form.production_cost,
        modifiers.reduce((sum, m) => sum + m.productionCostReduction, 0),
      );
  const movementSpeed = modifiers.some((m) => m.invalidParameters.includes('move_speed_increase'))
    ? null
    : applyMovementSpeedIncrease(
        form.movement_speed,
        modifiers.reduce((sum, m) => sum + m.movementSpeedIncrease, 0),
      );
  const dps = simpleDpsSupported ? calculateSimpleDps(stats.attackPower, frequency) : null;
  return [
    base.supported ? numberLabel(stats.hp) : '未対応',
    base.supported ? numberLabel(stats.attackPower) : '未対応',
    dps === null ? '未対応' : numberLabel(dps),
    numberLabel(form.attack_range),
    '未提供',
    numberLabel(movementSpeed),
    numberLabel(form.knockbacks),
    timeLabel(frequency),
    timeLabel(form.attack_startup_frames),
    timeLabel(
      treasures ? calculateTreasureRespawn(form.respawn_frames, treasures) : form.respawn_frames,
    ),
    productionCost === null ? '未提供' : `${numberLabel(productionCost)}円`,
  ];
}

export interface TalentDisplay {
  key: string;
  name: string;
  category: string;
  dto: TalentDto;
}
// 表示用の投影。DTOそのものやparameter_valuesには手を加えない。
export function talentEntries(character: CharacterDetailDto): TalentDisplay[] {
  return [
    ...(character.talents?.effect_targets ?? []).map((dto) => ({
      key: `${character.character_id}:target:${dto.form_effect_target_talent_id}`,
      name: dto.effect_target_name,
      category: '効果対象',
      dto,
    })),
    ...(character.talents?.effects ?? []).map((dto) => ({
      key: `${character.character_id}:effect:${dto.form_effect_talent_id}`,
      name: dto.effect_name,
      category: '効果',
      dto,
    })),
    ...(character.talents?.abilities ?? []).map((dto) => ({
      key: `${character.character_id}:ability:${dto.form_ability_talent_id}`,
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
