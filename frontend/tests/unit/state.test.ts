import { describe, it, expect } from 'vitest';
import { validLevel, framesLabel } from '../../src/features/characters/model/state';
describe('入力・時間表示', () => {
  it('無効なレベルを採用しない', () => {
    for (const input of ['', '0', '-1', 'abc', '2.5']) expect(validLevel(input, 30)).toBe(30);
    expect(validLevel('50', 30)).toBe(50);
  });
  it('30フレームを1秒として扱う', () => {
    expect(framesLabel(65)).toBe('65F (2.17秒)');
  });
});
