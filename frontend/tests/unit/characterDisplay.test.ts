import { describe, expect, it } from 'vitest';
import { normalizeTreasureSettings } from '../../src/features/settings/model/treasureSettings';
import { isCharacterDto } from '../../src/features/characters/api/validateCharacter';
import rawFixture from '../../src/features/characters/fixtures/kasajizou_character_detail_display_v3.json';
import type { CharacterDetailDto } from '../../src/features/characters/api/characterDto';
import {
  type TalentDisplay,
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

describe('お宝設定とステータス表示の接続', () => {
  const form = fixture.forms[0];
  const display = (health: number, attack: number, level = 1) =>
    statValues(
      form,
      level,
      true,
      {},
      [],
      normalizeTreasureSettings({ treasures: { health, attack } }),
    );
  it.each([
    [0, '900', '400', '122'],
    [100, '1,350', '600', '183'],
    [200, '1,800', '800', '244'],
    [300, '2,250', '1,000', '306'],
  ])('お宝%s%%を体力・攻撃力・DPSに反映する', (rate, hp, attack, dps) => {
    expect(display(Number(rate), Number(rate)).slice(0, 3)).toEqual([hp, attack, dps]);
  });
  it('体力と攻撃力を独立して変更し、レベルを保持する', () => {
    expect(display(0, 300, 30).slice(0, 3)).toEqual(['6,120', '6,800', '2,081']);
    expect(display(300, 0, 30).slice(0, 3)).toEqual(['15,300', '2,720', '832']);
  });
  it('選択済み本能と組み合わせ、形態変更にも同じお宝を使う', () => {
    const entries = talentEntries(fixture);
    const hp = entries.find((entry) => {
      const parameters = entry.dto.parameter_values;
      return (
        parameters !== null &&
        typeof parameters === 'object' &&
        Object.hasOwn(parameters, 'defense_buff_percent')
      );
    })!;
    const settings = normalizeTreasureSettings(null);
    const levels = { [hp.key]: 10 };
    expect(statValues(form, 30, true, levels, entries, settings)[0]).toBe('15,300');
    expect(statValues(fixture.forms[1], 30, true, levels, entries, settings)[0]).toBe('98,600');
    expect(levels).toEqual({ [hp.key]: 10 });
    expect(form.hp).toBe(900);
  });
  it('中国の伝統・研究力を再生産に反映し、果実は表示を変更しない', () => {
    const max = normalizeTreasureSettings(null);
    const min = normalizeTreasureSettings({
      treasures: {
        production: 300,
        red: 0,
        floating: 0,
        black: 0,
        angel: 0,
        metal: 0,
        alien: 0,
        zombie: 0,
      },
      research: { level: 1, plusLevel: 0 },
    });
    const values = statValues(form, 1, true, {}, [], max);
    const minimumResearch = statValues(form, 1, true, {}, [], min);
    expect(minimumResearch[9]).toBe('300F (10.00秒)');
    expect(statValues(form, 1, true, {}, [], { ...min, research: max.research })).toEqual(values);
    expect(values[9]).toBe('126F (4.20秒)');
    const zero = statValues(form, 1, true, {}, [], {
      ...max,
      treasures: { ...max.treasures, production: 0 },
    });
    expect(zero[9]).toBe('216F (7.20秒)');
    expect(form.respawn_frames).toBe(396);
    expect(values.filter((_, i) => i !== 9)).toEqual(zero.filter((_, i) => i !== 9));
  });
  it('小数の攻撃力を切り捨ててからDPSを計算し、欠落値は維持する', () => {
    const settings = normalizeTreasureSettings({ treasures: { attack: 1 } });
    const values = statValues(
      { ...form, hp: null, attack_power: 1, attack_frequency_frames: 1 },
      2,
      true,
      {},
      [],
      settings,
    );
    expect(values.slice(0, 3)).toEqual(['未提供', '1', '30']);
  });
});

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
    const form = {
      ...fixture.forms[0],
      form_number: 3,
      attack_frequency_frames: 279,
      attack_startup_frames: 80,
    };
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

describe('基本体力・基本攻撃力の本能をステータスに反映', () => {
  const entries = talentEntries(fixture);
  const hp = entries.find((e) => {
    const p = e.dto.parameter_values;
    return p && typeof p === 'object' && !Array.isArray(p) && 'defense_buff_percent' in p;
  })!;
  const attack = entries.find((e) => {
    const p = e.dto.parameter_values;
    return p && typeof p === 'object' && !Array.isArray(p) && 'attack_buff_percent' in p;
  })!;
  const form = {
    ...fixture.forms[0],
    form_number: 3,
    hp: 1000,
    attack_power: 500,
    attack_frequency_frames: 60,
  };

  it('＋操作に対応するLv1・最大Lvを反映し、Lv0へ戻すと補正を解除する', () => {
    const display = (hpLevel: number, attackLevel: number) =>
      statValues(form, 1, true, { [hp.key]: hpLevel, [attack.key]: attackLevel }, entries);
    expect(display(0, 0).slice(0, 3)).toEqual(['1,000', '500', '250']);
    expect(display(1, 0).slice(0, 3)).toEqual(['1,020', '500', '250']);
    expect(display(0, 1).slice(0, 3)).toEqual(['1,000', '510', '255']);
    expect(display(10, 10).slice(0, 3)).toEqual(['1,200', '600', '300']);
    expect(display(0, 0).slice(0, 3)).toEqual(['1,000', '500', '250']);
    expect(form.hp).toBe(1000);
    expect(form.attack_power).toBe(500);
  });

  it('キャラレベルの成長後に本能を適用し、形態変更後も選択レベルを使う', () => {
    const levels = { [hp.key]: 10, [attack.key]: 10 };
    expect(statValues(form, 30, true, levels, entries).slice(0, 3)).toEqual([
      '8,160',
      '4,080',
      '2,040',
    ]);
    const evolved = { ...form, form_id: 999, hp: 2000, attack_power: 1000 };
    expect(statValues(evolved, 1, true, levels, entries).slice(0, 3)).toEqual([
      '2,400',
      '1,200',
      '600',
    ]);
  });
});

describe('生産コスト割引', () => {
  const form = { ...fixture.forms[0], form_number: 3, production_cost: 300 };
  const dto = {
    ...fixture.talents!.abilities![0],
    max_level: 10,
    parameter_values: { action: 'add', cost_down: { base: 0, step: 15 } },
  };
  const entries = [{ key: 'cost', name: '生産コスト割引', category: '能力', dto }];

  it('換算済みの円を引き、Lv0・Lv1・最大Lv・解除・形態変更に反映する', () => {
    const display = (level: number) => statValues(form, 1, true, { cost: level }, entries);
    expect(display(0)[10]).toBe('300円');
    expect(display(1)[10]).toBe('285円');
    expect(display(10)[10]).toBe('150円');
    expect(display(99)[10]).toBe('150円');
    expect(display(0)[10]).toBe('300円');
    expect(display(10).slice(0, 10)).toEqual(display(0).slice(0, 10));
    expect(statValues({ ...form, production_cost: 600 }, 30, true, { cost: 10 }, entries)[10]).toBe(
      '450円',
    );
    expect(form.production_cost).toBe(300);
  });

  it('Lv0ではbaseを適用せず、欠落・不正・過大な割引を金額として表示しない', () => {
    const changed = (base: number, step: number) => [
      {
        ...entries[0],
        dto: {
          ...dto,
          parameter_values: { cost_down: { base, step } },
        },
      },
    ];
    expect(statValues(form, 1, true, { cost: 0 }, changed(30, 15))[10]).toBe('300円');
    expect(statValues(form, 1, true, { cost: 1 }, changed(30, 15))[10]).toBe('255円');
    for (const step of [-1, 0.5, 301]) {
      expect(statValues(form, 1, true, { cost: 1 }, changed(0, step))[10]).toBe('未提供');
    }
    expect(statValues({ ...form, production_cost: null }, 1, true, { cost: 10 }, entries)[10]).toBe(
      '未提供',
    );
    expect(statValues({ ...form, production_cost: 150 }, 1, true, { cost: 10 }, entries)[10]).toBe(
      '0円',
    );
  });
});

describe('形態に応じた本能・超本能の適用と設定保持', () => {
  const entries: TalentDisplay[] = [
    {
      key: 'hp',
      name: '体力',
      category: '能力',
      dto: {
        ...fixture.talents!.abilities![0],
        max_level: 10,
        talent_type_name: '本能',
        parameter_values: { defense_buff_percent: { base: 0, step: 2 } },
      },
    },
    {
      key: 'atk',
      name: '攻撃',
      category: '能力',
      dto: {
        ...fixture.talents!.abilities![0],
        max_level: 10,
        talent_type_name: '超本能',
        parameter_values: { attack_buff_percent: { base: 0, step: 2 } },
      },
    },
    {
      key: 'cost',
      name: 'コスト',
      category: '能力',
      dto: {
        ...fixture.talents!.abilities![0],
        max_level: 10,
        parameter_values: { cost_down: { base: 0, step: 15 } },
      },
    },
    {
      key: 'freq',
      name: '頻度',
      category: '能力',
      dto: {
        ...fixture.talents!.abilities![0],
        max_level: 10,
        parameter_values: { attack_frequency_reduction_frames: { base: 0, step: 6 } },
      },
    },
  ];
  const levels = Object.freeze({ hp: 10, atk: 10, cost: 10, freq: 10 });
  const form = {
    ...fixture.forms[0],
    hp: 1000,
    attack_power: 500,
    production_cost: 300,
    attack_frequency_frames: 279,
    attack_startup_frames: 80,
  };
  it('3→1→2→3→4で設定を保持し、全ステータス本能をまとめて切り替える', () => {
    for (const form_number of [3, 1, 2, 3, 4]) {
      const values = statValues({ ...form, form_number }, 1, true, levels, entries);
      expect(values.slice(0, 3)).toEqual(
        form_number >= 3 ? ['1,200', '600', '82'] : ['1,000', '500', '53'],
      );
      expect(values[7]).toBe(form_number >= 3 ? '219F (7.30秒)' : '279F (9.30秒)');
      expect(values[8]).toBe('80F (2.67秒)');
      expect(values[10]).toBe(form_number >= 3 ? '150円' : '300円');
    }
    expect(levels).toEqual({ hp: 10, atk: 10, cost: 10, freq: 10 });
  });
  it.each([1, 2])('第%i形態のお宝・研究力・レベル補正を維持する', (form_number) => {
    const selected = { ...form, form_number };
    const treasure = normalizeTreasureSettings(null);
    const expected = statValues(selected, 30, true, {}, [], treasure);
    expect(statValues(selected, 30, true, levels, entries, treasure)).toEqual(expected);
    expect(expected[0]).toBe('17,000');
    expect(expected[9]).toBe('126F (4.20秒)');
  });
  it.each([1, 2, 3, 4])('第%i形態で本能未解放なら従来の基礎値を維持する', (form_number) => {
    const selected = { ...form, form_number };
    expect(statValues(selected, 30, true, {}, entries)).toEqual(statValues(selected, 30, true));
  });
});
