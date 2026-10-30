export function validLevel(value: string, fallback: number): number {
  const parsed = Number(value);
  return value.trim() && Number.isSafeInteger(parsed) && parsed >= 1 ? parsed : fallback;
}
export function framesLabel(frames: number): string {
  return `${frames}F (${(frames / 30).toFixed(2)}秒)`;
}
// データ供給後はこの入力を計算サービスへ渡す。現段階では成長率・補正仕様が未確定なので計算しない。
export interface CharacterSettings {
  level: number;
  talents: Record<string, number>;
}
