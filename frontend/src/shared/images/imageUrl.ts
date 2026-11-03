// 保存キーと実ファイルの相対パスを一致させ、対応表を介さず参照する。
export function resolveImageUrl(key: string | null): string | null {
  if (
    !key ||
    !/^(allies|abilities|effect_targets|effects|materials)\/[A-Za-z0-9_-]+\.png$/.test(key)
  )
    return null;
  return '/images/' + key;
}
