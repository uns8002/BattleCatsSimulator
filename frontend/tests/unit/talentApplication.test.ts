import { describe, expect, it } from 'vitest';
import {
  applicableTalents,
  canApplyTalents,
} from '../../src/features/characters/model/talentApplication';

// 能力の計算式とは独立して、全種類を同じ境界で制御する。
describe('本能適用の共通境界', () => {
  const talents = Object.freeze([
    { kind: '本能', category: '能力追加', parameter: 'wave_level' },
    { kind: '本能', category: '効果対象追加', parameter: 'effect_target_id' },
    { kind: '超本能', category: '発動率強化', parameter: 'activation_rate_percent' },
    { kind: '本能', category: '効果時間強化', parameter: 'freeze_duration_frames' },
    { kind: '本能', category: '耐性', parameter: 'wave_damage_reduction_percent' },
    { kind: '超本能', category: '無効', parameter: 'action' },
    { kind: '超本能', category: '将来の本能', parameter: 'unknown' },
  ]);
  it.each([1, 2, 3, 4])('第%i形態で種類によらず共通制御する', (form_number) => {
    expect(canApplyTalents({ form_number })).toBe(form_number >= 3);
    expect(applicableTalents({ form_number }, talents)).toEqual(form_number >= 3 ? talents : []);
    expect(talents).toHaveLength(7);
  });
  it('元の能力や属性を変更せず、本能リストだけを制御する', () => {
    const form = Object.freeze({
      form_number: 1,
      abilities: Object.freeze([{ id: 1 }]),
      targets: Object.freeze([{ id: 2 }]),
    });
    expect(applicableTalents(form, talents)).toEqual([]);
    expect(form.abilities).toEqual([{ id: 1 }]);
    expect(form.targets).toEqual([{ id: 2 }]);
    expect(applicableTalents({ form_number: 3 }, talents)).toBe(talents);
  });
});
