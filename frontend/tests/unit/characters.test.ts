import { afterEach, describe, expect, it, vi } from 'vitest';
import { getCharacter, isCharacterDto } from '../../src/features/characters/api/characters';
import fixture from '../../src/features/characters/fixtures/kasajizou_character_detail_display_v3.json';

afterEach(() => vi.unstubAllGlobals());
describe('provided response contract', () => {
  it('提供JSONをプロパティ・ID・parameter_valuesを失わず受け取る', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify(fixture))));
    const result = await getCharacter(138);
    expect(result).toEqual(fixture);
    expect(result.forms[3].abilities?.[0].parameter_values).toEqual({
      activation_rate_percent: 100,
    });
  });
  it('JSONの検証・null・空配列を扱う', () => {
    expect(isCharacterDto(fixture)).toBe(true);
    const empty = structuredClone(fixture);
    empty.forms = [];
    expect(isCharacterDto(empty)).toBe(true);
    expect(
      isCharacterDto({
        ...fixture,
        talents: null,
        forms: [{ ...fixture.forms[0], hp: null, abilities: null }],
      }),
    ).toBe(true);
    expect(isCharacterDto({ ...fixture, forms: [{ ...fixture.forms[0], hp: '900' }] })).toBe(false);
    expect(isCharacterDto({ ...fixture, forms: [fixture.forms[0], fixture.forms[0]] })).toBe(false);
  });
  it('HTTP失敗・不正な応答・ID不一致はエラー', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('', { status: 503 })));
    await expect(getCharacter(138)).rejects.toThrow('取得できません');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}')));
    await expect(getCharacter(138)).rejects.toThrow('形式が不正');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify(fixture))));
    await expect(getCharacter(999)).rejects.toThrow('形式が不正');
  });
});
