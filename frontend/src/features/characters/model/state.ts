import { MAX_BASIC_LEVEL } from './baseStats';
export function validLevel(value: string, fallback: number): number {
  const parsed = Number(value);
  return value.trim() && Number.isSafeInteger(parsed) && parsed >= 1
    ? Math.min(parsed, MAX_BASIC_LEVEL)
    : fallback;
}
export function framesLabel(frames: number): string {
  return `${frames}F (${(frames / 30).toFixed(2)}秒)`;
}
// データ供給後はこの入力を計算サービスへ渡す。基本レベル計算と本能等の補正を分離して扱う。
export interface CharacterSettings {
  level: number;
  talents: Record<string, number>;
}
