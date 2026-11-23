import { describe, expect, it } from 'vitest';
import { isCharacterDto } from '../../src/features/characters/api/validateCharacter';
import rawFixture from '../../src/features/characters/fixtures/kasajizou_character_detail_display_v3.json';
import type { CharacterDetailDto } from '../../src/features/characters/api/characterDto';
import {
  statValues,
  talentEntries,
  talentProgress,
} from '../../src/features/characters/model/characterDisplay';
import { resolveImageUrl } from '../../src/shared/images/imageUrl';

const fixture = (() => {
  const data: unknown = rawFixture;
  if (!isCharacterDto(data)) throw new Error('Invalid fixture');
  return data;
})();

describe('JSON表示・NP集計', () => {
  it('Lv1の単発DPSを表示し攻撃範囲は補完しない', () => {
    expect(fixture.forms.map((form) => statValues(form)[0])).toEqual([
      '900',
      '5,800',
      '6,800',
      '1,100',
    ]);
    expect(statValues(fixture.forms[3])).toEqual([
      '1,100',
      '400',
      '122',
      '320',
      '未提供',
      '19',
      '3',
      '98F (3.27秒)',
      '19F (0.63秒)',
      '396F (13.20秒)',
      '750円',
    ]);
    expect(statValues({ ...fixture.forms[0], hp: null })[0]).toBe('未提供');
  });
  it('JSONの費用表から累計・次NPを求める', () => {
    const single = fixture.talents!.abilities![0];
    expect(talentProgress(single, 1)).toEqual({ level: 1, used: 100, next: null, atMax: true });
    const multi = fixture.talents!.abilities![2];
    expect(talentProgress(multi, 5)).toEqual({ level: 5, used: 75, next: 20, atMax: false });
    expect(talentProgress(multi, 100).used).toBe(175);
    expect(talentProgress({ ...multi, np_costs: null }, 1).used).toBeNull();
    expect(talentProgress({ ...multi, np_costs: [15, null] }, 2).used).toBeNull();
  });
  it('本能の状態キーはキャラクター単位で形態に依存しない', () => {
    const entries = talentEntries(fixture);
    expect(entries[0].key).toBe(
      `${fixture.character_id}:ability:${fixture.talents!.abilities![0].form_ability_talent_id}`,
    );
    expect(talentEntries({ ...fixture, forms: [fixture.forms[0]] })).toEqual(entries);
    expect(talentEntries({ ...fixture, character_id: 999 })[0].key).not.toBe(entries[0].key);
    expect(talentEntries({ ...fixture, talents: null })).toEqual([]);
  });
  it('3分類と超本能を同じ表示処理で扱う（テスト専用データ）', () => {
    const base = fixture.talents!.abilities![0];
    const form: CharacterDetailDto = {
      ...fixture,
      talents: {
        effect_targets: [
          {
            ...base,
            form_effect_target_talent_id: 71,
            effect_target_id: 3,
            effect_target_name: '対象テスト',
            talent_type_name: '超本能',
          },
        ],
        effects: [{ ...base, form_effect_talent_id: 72, effect_id: 8, effect_name: '効果テスト' }],
        abilities: [base],
      },
    };
    expect(talentEntries(form).map((t) => t.category)).toEqual(['効果対象', '効果', '能力']);
    expect(talentEntries(form)[0].dto.talent_type_name).toBe('超本能');
  });
  it('保存キーを明示的に解決し、未知画像は代替表示する', () => {
    expect(resolveImageUrl('abilities/ab_cl_23.png')).toBe('/images/abilities/ab_cl_23.png');
    expect(resolveImageUrl('effect_targets/et_sc_3.png')).toBe(
      '/images/effect_targets/et_sc_3.png',
    );
    expect(resolveImageUrl(null)).toBeNull();
    expect(resolveImageUrl('missing.png')).toBeNull();
  });
});

describe('攻撃間隔短縮（暫定）', () => {
  it('Lv0は未適用、Lv10は279F→219F、攻撃発生は80Fを維持してDPSに反映', () => {
    const form = { ...fixture.forms[0], attack_frequency_frames: 279, attack_startup_frames: 80 };
    const dto = {
      ...fixture.talents!.abilities![0],
      max_level: 10,
      parameter_values: { action: 'add', attack_frequency_reduction_frames: { base: 0, step: 6 } },
    };
    const entries = [{ key: 'frequency', name: '攻撃間隔短縮', category: '能力', dto }];
    const zero = statValues(form, 1, true, { frequency: 0 }, entries);
    const max = statValues(form, 1, true, { frequency: 10 }, entries);
    expect(zero[7]).toBe('279F (9.30秒)');
    expect(max[7]).toBe('219F (7.30秒)');
    expect(max[8]).toBe('80F (2.67秒)');
    expect(max[2]).toBe(
      Math.floor((Number(max[1].replaceAll(',', '')) * 30) / 219).toLocaleString('ja-JP'),
    );
    expect(form.attack_frequency_frames).toBe(279);
    expect(statValues(form, 1, true, { frequency: 1 }, entries)[7]).toBe('273F (9.10秒)');
    expect(statValues(form, 1, true, { frequency: 99 }, entries)[7]).toBe(max[7]);
    expect(
      statValues({ ...form, attack_startup_frames: null }, 1, true, { frequency: 10 }, entries)[2],
    ).toBe('未対応');
  });
});
