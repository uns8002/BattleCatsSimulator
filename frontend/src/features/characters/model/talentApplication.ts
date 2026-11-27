import type { CharacterFormDto } from '../api/characterDto';

// APIのform_numberが仕様上のform_noに相当する。種類・コードには依存しない。
export function canApplyTalents(form: Pick<CharacterFormDto, 'form_number'>): boolean {
  return Number.isInteger(form.form_number) && form.form_number >= 3;
}

// 保存用の設定・一覧は変更せず、計算や能力合成に渡す情報だけを制御する。
// レベル上限や解放状態の既存判定は、各適用処理で引き続き行う。
export function applicableTalents<T>(
  form: Pick<CharacterFormDto, 'form_number'>,
  talents: readonly T[],
): readonly T[] {
  return canApplyTalents(form) ? talents : [];
}
