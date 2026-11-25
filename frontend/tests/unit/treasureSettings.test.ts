import { describe, expect, it } from 'vitest';
import {
  boundedInteger,
  commitInteger,
  normalizeTreasureSettings,
  restoreTreasureSettings,
} from '../../src/features/settings/model/treasureSettings';

describe('共通のお宝設定の保存データ', () => {
  it('未保存・不正JSON・不正な構造には全項目の初期値を使う', () => {
    const defaults = normalizeTreasureSettings(null);
    expect(Object.values(defaults.treasures)).toEqual(Array(10).fill(300));
    expect(defaults.research).toEqual({ level: 20, plusLevel: 10 });
    for (const raw of [null, '', '{broken', 'null', '[]', '123']) {
      expect(restoreTreasureSettings(raw)).toEqual(defaults);
    }
  });
  it('果実・研究力を含め復元し、欠落項目は初期値で補う', () => {
    const settings = normalizeTreasureSettings({
      treasures: { health: 0, red: 12 },
      research: { level: 1 },
    });
    expect(settings.treasures.health).toBe(0);
    expect(settings.treasures.red).toBe(12);
    expect(settings.treasures.attack).toBe(300);
    expect(settings.research).toEqual({ level: 1, plusLevel: 10 });
    expect(restoreTreasureSettings(JSON.stringify(settings))).toEqual(settings);
  });
  it('保存データの範囲外整数は補正、不正値は初期値に戻す', () => {
    expect(
      normalizeTreasureSettings({
        treasures: { health: -1, attack: 301, red: 1.5, alien: '20' },
        research: { level: 0, plusLevel: 20 },
      }),
    ).toMatchObject({
      treasures: { health: 0, attack: 300, red: 300, alien: 300 },
      research: { level: 1, plusLevel: 10 },
    });
    for (const value of [NaN, Infinity, undefined, null, {}, [], true, '1', 1.2]) {
      expect(boundedInteger(value, 0, 300, 100)).toBe(100);
    }
  });
  it('直接入力の確定時に範囲を補正し、空欄・小数・不正文字列は現在値へ戻す', () => {
    expect(commitInteger('-1', 0, 300, 100)).toBe(0);
    expect(commitInteger('301', 0, 300, 100)).toBe(300);
    expect(commitInteger(' 123 ', 0, 300, 100)).toBe(123);
    expect(commitInteger('0', 1, 20, 10)).toBe(1);
    expect(commitInteger('11', 0, 10, 5)).toBe(10);
    for (const value of ['', ' ', 'abc', '1.5', '1e2', '0x10', 'Infinity']) {
      expect(commitInteger(value, 0, 300, 100)).toBe(100);
    }
  });
});
