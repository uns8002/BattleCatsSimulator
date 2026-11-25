export const TREASURE_STORAGE_KEY = 'battle-cats-simulator:treasure-settings';

export const treasureFields = [
  { key: 'health', name: '甲信越の雪景色', description: '体力' },
  { key: 'attack', name: '関東のカリスマ', description: '攻撃力・DPS' },
  { key: 'production', name: '中国の伝統', description: '再生産時間' },
  { key: 'red', name: '紅血の果実', description: '赤い敵' },
  { key: 'floating', name: '飛翔の果実', description: '浮いてる敵' },
  { key: 'black', name: '暗黒の果実', description: '黒い敵' },
  { key: 'angel', name: '天界の果実', description: '天使' },
  { key: 'metal', name: '鋼鉄の果実', description: 'メタルな敵' },
  { key: 'alien', name: '異星の果実', description: 'エイリアン' },
  { key: 'zombie', name: '冥界の果実', description: 'ゾンビ' },
] as const;

export type TreasureKey = (typeof treasureFields)[number]['key'];
export interface TreasureSettings {
  treasures: Record<TreasureKey, number>;
  research: { level: number; plusLevel: number };
}

function record(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

export function boundedInteger(value: unknown, min: number, max: number, fallback: number) {
  return typeof value === 'number' && Number.isSafeInteger(value)
    ? Math.min(max, Math.max(min, value))
    : fallback;
}

export function commitInteger(input: string, min: number, max: number, fallback: number) {
  return /^[+-]?\d+$/.test(input.trim())
    ? boundedInteger(Number(input), min, max, fallback)
    : fallback;
}

export function normalizeTreasureSettings(value: unknown): TreasureSettings {
  const source = record(value);
  const treasures = record(source.treasures);
  const research = record(source.research);
  return {
    treasures: Object.fromEntries(
      treasureFields.map(({ key }) => [key, boundedInteger(treasures[key], 0, 300, 300)]),
    ) as Record<TreasureKey, number>,
    research: {
      level: boundedInteger(research.level, 1, 20, 20),
      plusLevel: boundedInteger(research.plusLevel, 0, 10, 10),
    },
  };
}

export function restoreTreasureSettings(serialized: string | null): TreasureSettings {
  try {
    return normalizeTreasureSettings(serialized === null ? null : JSON.parse(serialized));
  } catch {
    return normalizeTreasureSettings(null);
  }
}
