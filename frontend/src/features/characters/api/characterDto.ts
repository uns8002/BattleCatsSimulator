// 提供JSONのプロパティ名をそのまま保持するレスポンス型。
export type JsonValue =
  null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };

export interface EffectTargetDto {
  form_effect_target_id: number;
  effect_target_id: number;
  effect_target_name: string;
  image_url: string | null;
}
export interface EffectDto {
  form_effect_id: number;
  effect_id: number;
  effect_name: string;
  image_url: string | null;
  attack_order: number | null;
  parameter_values: JsonValue;
}
export interface AbilityDto {
  form_ability_id: number;
  ability_id: number;
  ability_name: string;
  image_url: string | null;
  parameter_values: JsonValue;
}
export interface TalentDto {
  image_url: string | null;
  talent_type_name: string | null;
  max_level: number | null;
  np_costs: (number | null)[] | null;
  attack_order?: number | null;
  parameter_values: JsonValue;
}
// effect_targets/effectsは提供JSONでは空。非空レスポンス導入時にID等の契約を照合する。
export interface EffectTargetTalentDto extends TalentDto {
  form_effect_target_talent_id: number;
  effect_target_id: number;
  effect_target_name: string;
}
export interface EffectTalentDto extends TalentDto {
  form_effect_talent_id: number;
  effect_id: number;
  effect_name: string;
}
export interface AbilityTalentDto extends TalentDto {
  form_ability_talent_id: number;
  ability_id: number;
  ability_name: string;
}
export interface CharacterFormDto {
  form_id: number;
  form_number: number;
  form_name: string;
  hp: number | null;
  attack_power: number | null;
  knockbacks: number | null;
  movement_speed: number | null;
  attack_range: number | null;
  attack_frequency_frames: number | null;
  attack_startup_frames: number | null;
  respawn_frames: number | null;
  production_cost: number | null;
  image_url: string | null;
  description_body: string | null;
  game_version_name: string | null;
  effect_targets: EffectTargetDto[] | null;
  effects: EffectDto[] | null;
  abilities: AbilityDto[] | null;
  talents: {
    effect_targets: EffectTargetTalentDto[] | null;
    effects: EffectTalentDto[] | null;
    abilities: AbilityTalentDto[] | null;
  } | null;
}
export interface CharacterDetailDto {
  character_id: number;
  character_name: string;
  character_short_name: string | null;
  rarity_name: string | null;
  limited_name: string | null;
  collaboration_name: string | null;
  forms: CharacterFormDto[];
}
