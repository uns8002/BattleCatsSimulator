import type { CharacterDetailDto } from './characterDto';
const object = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === 'object' && !Array.isArray(v);
const text = (v: unknown) => typeof v === 'string';
const number = (v: unknown) => typeof v === 'number' && Number.isFinite(v);
const id = (v: unknown) => number(v) && Number.isSafeInteger(v) && (v as number) > 0;
const nullableText = (v: unknown) => v === null || text(v);
const nullableNumber = (v: unknown) => v === null || number(v);
const list = (v: unknown, check: (item: unknown) => boolean) =>
  v === null || (Array.isArray(v) && v.every(check));
const parameter = (v: unknown): boolean =>
  v === null ||
  text(v) ||
  number(v) ||
  typeof v === 'boolean' ||
  (Array.isArray(v) ? v.every(parameter) : object(v) && Object.values(v).every(parameter));

function entry(v: unknown, kind: 'effect_target' | 'effect' | 'ability', talent = false): boolean {
  if (
    !object(v) ||
    !id(v[`form_${kind}${talent ? '_talent' : ''}_id`]) ||
    !id(v[`${kind}_id`]) ||
    !text(v[`${kind}_name`]) ||
    !nullableText(v.image_url)
  )
    return false;
  if ((talent || kind !== 'effect_target') && !parameter(v.parameter_values)) return false;
  if (talent) {
    return (
      nullableText(v.talent_type_name) &&
      (v.max_level === null ||
        (number(v.max_level) &&
          Number.isSafeInteger(v.max_level) &&
          (v.max_level as number) >= 0)) &&
      list(v.np_costs, (n) => n === null || (number(n) && (n as number) >= 0)) &&
      (v.attack_order === undefined || nullableNumber(v.attack_order))
    );
  }
  return kind !== 'effect' || nullableNumber(v.attack_order);
}

export function isCharacterDto(v: unknown): v is CharacterDetailDto {
  if (
    !object(v) ||
    !id(v.character_id) ||
    !text(v.character_name) ||
    !['character_short_name', 'rarity_name', 'limited_name', 'collaboration_name'].every((k) =>
      nullableText(v[k]),
    ) ||
    !Array.isArray(v.forms)
  )
    return false;
  const formIds = new Set<number>();
  return v.forms.every((f) => {
    if (
      !object(f) ||
      !id(f.form_id) ||
      formIds.has(f.form_id as number) ||
      !id(f.form_number) ||
      !text(f.form_name)
    )
      return false;
    formIds.add(f.form_id as number);
    return (
      [
        'hp',
        'attack_power',
        'knockbacks',
        'movement_speed',
        'attack_range',
        'attack_frequency_frames',
        'attack_startup_frames',
        'respawn_frames',
        'production_cost',
      ].every((k) => nullableNumber(f[k])) &&
      ['image_url', 'description_body', 'game_version_name'].every((k) => nullableText(f[k])) &&
      nullableNumber(f.required_level) &&
      (f.required_stage_id === null || id(f.required_stage_id)) &&
      list(
        f.materials,
        (m) =>
          object(m) &&
          id(m.form_material_id) &&
          id(m.material_id) &&
          text(m.material_code) &&
          text(m.material_name) &&
          text(m.material_type) &&
          nullableText(m.image_url) &&
          number(m.required_quantity),
      ) &&
      list(f.effect_targets, (item) => entry(item, 'effect_target')) &&
      list(f.effects, (item) => entry(item, 'effect')) &&
      list(f.abilities, (item) => entry(item, 'ability')) &&
      (f.talents === null ||
        (object(f.talents) &&
          list(f.talents.effect_targets, (item) => entry(item, 'effect_target', true)) &&
          list(f.talents.effects, (item) => entry(item, 'effect', true)) &&
          list(f.talents.abilities, (item) => entry(item, 'ability', true))))
    );
  });
}
