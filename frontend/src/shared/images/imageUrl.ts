import paths from './imagePaths.json';
// 保存キーはDTO内に保持し、配信URLへの変換はここだけで行う。
// effects/ab_cl_*.png は既存の abilities/ab_cl_*.png への明示的な対応表を使用。
export function resolveImageUrl(key: string | null): string | null {
  if (!key || !Object.hasOwn(paths, key)) return null;
  return '/images/' + (paths as Record<string, string>)[key];
}
