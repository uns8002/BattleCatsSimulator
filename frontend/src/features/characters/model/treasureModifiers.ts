import type { TreasureSettings } from '../../settings/model/treasureSettings';
import type { TalentModifiers } from './talentModifiers';

// 十進数を有理数として扱い、倍率の途中で丸めない。
// 例: 10000 × 2.5 × 1.2 × 1.15 を浮動小数の誤差で34499にしない。
function fraction(value: number): [bigint, bigint] {
  const [mantissa, exponent = '0'] = String(value).split('e');
  const decimals = mantissa.split('.')[1]?.length ?? 0;
  const scale = decimals - Number(exponent);
  const numerator = BigInt(mantissa.replace('.', ''));
  return scale >= 0 ? [numerator, 10n ** BigInt(scale)] : [numerator * 10n ** BigInt(-scale), 1n];
}

function floorProduct(numerators: number[], denominators: number[]): number {
  let top = 1n;
  let bottom = 1n;
  for (const value of numerators) {
    const [n, d] = fraction(value);
    top *= n;
    bottom *= d;
  }
  for (const value of denominators) {
    const [n, d] = fraction(value);
    top *= d;
    bottom *= n;
  }
  const result = top / bottom;
  return Number(top < 0n && top % bottom !== 0n ? result - 1n : result);
}

/** お宝補正前のレベル補正済みステータス専用。 */
export function applyTreasureStatModifiers(
  base: { hp: number | null; attackPower: number | null },
  settings: TreasureSettings,
  talents: TalentModifiers[] = [],
  combo: TalentModifiers = { hp: 0, attackPower: 0 },
) {
  const totals = talents.reduce(
    (sum, value) => ({ hp: sum.hp + value.hp, attackPower: sum.attackPower + value.attackPower }),
    { hp: 0, attackPower: 0 },
  );
  const apply = (value: number | null, treasure: number, talent: number, comboRate: number) =>
    value === null
      ? null
      : floorProduct([value, 200 + treasure, 100 + talent, 100 + comboRate], [200, 100, 100]);
  return {
    hp: apply(base.hp, settings.treasures.health, totals.hp, combo.hp),
    attackPower: apply(
      base.attackPower,
      settings.treasures.attack,
      totals.attackPower,
      combo.attackPower,
    ),
  };
}

/** 中国の伝統のみ適用。研究力・コンボ・固定の基準差補正は含めない。 */
export function applyProductionTreasure(baseFrames: number | null, rate: number): number | null {
  if (
    baseFrames === null ||
    !Number.isSafeInteger(baseFrames) ||
    baseFrames < 0 ||
    !Number.isSafeInteger(rate) ||
    rate < 0 ||
    rate > 300
  )
    return null;
  return Math.max(60, baseFrames - floorProduct([rate, 3], [10]));
}

/** DB値は変更せず、研究力Lv1から6F短縮。コンボは従来の基準・丸めを維持。 */
export function calculateTreasureRespawn(
  baseFrames: number | null,
  settings: TreasureSettings,
  researchComboPercent = 0,
  talentReductionFrames = 0,
): number | null {
  if (
    baseFrames === null ||
    !Number.isSafeInteger(baseFrames) ||
    baseFrames < 0 ||
    !Number.isFinite(researchComboPercent) ||
    researchComboPercent < 0 ||
    !Number.isSafeInteger(talentReductionFrames) ||
    talentReductionFrames < 0
  )
    return null;
  const researchLevel = settings.research.level + settings.research.plusLevel;
  const treasureReduction = floorProduct([settings.treasures.production, 3], [10]);
  const researchReduction = researchLevel * 6;
  // 今回追加したLv1相当の6Fはコンボの倍率対象に含めない。
  // 従来の「コンボあり短縮量−コンボなし短縮量」を使い、端数時の挙動も維持する。
  const legacyReductionTenths = settings.treasures.production * 3 + (researchLevel - 1) * 60;
  const comboReduction =
    floorProduct([legacyReductionTenths, 100 + researchComboPercent], [10, 100]) -
    floorProduct([legacyReductionTenths], [10]);
  return Math.max(
    60,
    baseFrames - talentReductionFrames - treasureReduction - researchReduction - comboReduction,
  );
}
