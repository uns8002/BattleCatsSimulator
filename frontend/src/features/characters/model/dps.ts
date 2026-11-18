// 将来、攻撃構成がJSONに追加されたら、この判定をレスポンス参照に置き換える。
//
export function supportsSimpleDps(formId: number): boolean {
  return true;
  // return [393, 394, 396].includes(formId);
}

export function calculateSimpleDps(
  attackPower: number | null,
  frequencyFrames: number | null,
): number | null {
  if (
    attackPower === null ||
    frequencyFrames === null ||
    !Number.isFinite(attackPower) ||
    !Number.isFinite(frequencyFrames) ||
    frequencyFrames <= 0
  ) {
    return null;
  }
  // 整数表示は暫定的に切り捨て。実ゲームの端数処理との一致は未検証。
  return Math.floor((attackPower * 30) / frequencyFrames);
}
