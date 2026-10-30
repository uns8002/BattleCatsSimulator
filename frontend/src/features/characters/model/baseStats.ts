import type { CharacterFormDto } from '../api/characterDto';
import { calculateSimpleDps } from './dps';

export const MAX_BASIC_LEVEL = 60;

// 暫定成長式。将来のキャラクター別成長テーブルはここを置き換える。
// 本能・お宝・コンボの補正はこの関数に含めない。
export function calculateBaseStats(
  form: CharacterFormDto,
  level: number,
  simpleDpsSupported: boolean,
) {
  const supported = Number.isInteger(level) && level >= 1 && level <= MAX_BASIC_LEVEL;
  const grow = (base: number | null) =>
    !supported || base === null ? null : (base * (level + 4)) / 5;
  const hp = grow(form.hp);
  const attackPower = grow(form.attack_power);
  const dps = simpleDpsSupported
    ? calculateSimpleDps(attackPower, form.attack_frequency_frames)
    : null;
  return { hp, attackPower, dps, supported };
}
