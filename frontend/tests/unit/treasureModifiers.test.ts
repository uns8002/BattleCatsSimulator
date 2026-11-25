import { describe, expect, it } from 'vitest';
import { normalizeTreasureSettings } from '../../src/features/settings/model/treasureSettings';
import {
  applyTreasureStatModifiers,
  applyProductionTreasure,
  calculateTreasureRespawn,
} from '../../src/features/characters/model/treasureModifiers';
import { calculateSimpleDps } from '../../src/features/characters/model/dps';

describe('補正前ステータスに対するお宝計算', () => {
  it.each([
    [0, 1000],
    [100, 1500],
    [200, 2000],
    [300, 2500],
  ])('%i%%の体力・攻撃力・DPS', (rate, expected) => {
    const settings = normalizeTreasureSettings({ treasures: { health: rate, attack: rate } });
    const stats = applyTreasureStatModifiers({ hp: 1000, attackPower: 1000 }, settings);
    expect(stats).toEqual({ hp: expected, attackPower: expected });
    expect(calculateSimpleDps(stats.attackPower, 60)).toBe(expected / 2);
  });
  it('本能・超本能の率を加算し、お宝・コンボと乗算して最後だけ切り捨てる', () => {
    const settings = normalizeTreasureSettings(null);
    expect(
      applyTreasureStatModifiers(
        { hp: 10000, attackPower: 10000 },
        settings,
        [
          { hp: 10, attackPower: 10 },
          { hp: 10, attackPower: 10 },
        ],
        { hp: 15, attackPower: 15 },
      ),
    ).toEqual({ hp: 34500, attackPower: 34500 });
    expect(
      applyTreasureStatModifiers(
        { hp: 1.2, attackPower: 1.2 },
        settings,
        [{ hp: 20, attackPower: 20 }],
        { hp: 15, attackPower: 15 },
      ),
    ).toEqual({ hp: 4, attackPower: 4 });
    expect(applyTreasureStatModifiers({ hp: null, attackPower: null }, settings)).toEqual({
      hp: null,
      attackPower: null,
    });
  });
  it('果実の設定は基本ステータスに影響しない', () => {
    const settings = normalizeTreasureSettings({
      treasures: { red: 0, floating: 0, black: 0, angel: 0, metal: 0, alien: 0, zombie: 0 },
    });
    expect(applyTreasureStatModifiers({ hp: 100, attackPower: 100 }, settings)).toEqual({
      hp: 250,
      attackPower: 250,
    });
  });
});

describe('中国の伝統のみの短縮', () => {
  it.each([
    [0, 396],
    [100, 366],
    [200, 336],
    [300, 306],
    [3, 396],
    [4, 395],
  ])('%i%%で%iFになる', (rate, expected) => {
    expect(applyProductionTreasure(396, rate)).toBe(expected);
  });
  it('下限60Fを守り、欠落値や不正値を補完しない', () => {
    expect(applyProductionTreasure(100, 300)).toBe(60);
    expect(applyProductionTreasure(null, 300)).toBeNull();
    expect(applyProductionTreasure(396, 301)).toBeNull();
  });
});

describe('補正前再生産Fに対する短縮計算', () => {
  it.each([
    [1, 0, 594],
    [10, 0, 540],
    [20, 0, 480],
    [20, 10, 420],
  ])('研究力%i＋%iを独立したレベル合計として適用する', (level, plusLevel, expected) => {
    const settings = normalizeTreasureSettings({
      treasures: { production: 0 },
      research: { level, plusLevel },
    });
    expect(calculateTreasureRespawn(600, settings)).toBe(expected);
  });
  it.each([
    [396, 126],
    [496, 226],
    [2416, 2146],
    [4516, 4246],
    [3716, 3446],
    [166, 60],
  ])('複数キャラのDB再生産%iFは最大設定で%iFになる', (base, expected) => {
    expect(calculateTreasureRespawn(base, normalizeTreasureSettings(null))).toBe(expected);
  });
  it('お宝0%・研究力1+0から6F短縮する', () => {
    const settings = normalizeTreasureSettings({
      treasures: { production: 0 },
      research: { level: 1, plusLevel: 0 },
    });
    expect(calculateTreasureRespawn(600, settings)).toBe(594);
  });
  it.each([
    [0, 270],
    [10, 296],
    [20, 322],
    [30, 349],
  ])('最大設定・コンボ%i%%で%iF短縮', (combo, reduction) => {
    expect(calculateTreasureRespawn(600, normalizeTreasureSettings(null), combo)).toBe(
      600 - reduction,
    );
  });
  it('直接短縮本能を差し引いた後で60Fの下限を適用する', () => {
    const settings = normalizeTreasureSettings(null);
    expect(calculateTreasureRespawn(600, settings, 10, 30)).toBe(274);
    expect(calculateTreasureRespawn(300, settings, 30, 30)).toBe(60);
    expect(calculateTreasureRespawn(50, settings)).toBe(60);
    expect(calculateTreasureRespawn(null, settings)).toBeNull();
  });
  it('小数の短縮量をコンボ適用後に切り捨てる', () => {
    const settings = normalizeTreasureSettings({
      treasures: { production: 3 },
      research: { level: 1, plusLevel: 0 },
    });
    expect(calculateTreasureRespawn(600, settings)).toBe(594);
    expect(calculateTreasureRespawn(600, settings, 30)).toBe(593);
  });
});
