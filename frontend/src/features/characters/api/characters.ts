import fixtureUrl from '../fixtures/kasajizou_character_detail_display_v2.json?url';
import type { CharacterDetailDto } from './characterDto';
import { isCharacterDto } from './validateCharacter';
export { isCharacterDto } from './validateCharacter';

// 今回はローカルJSONをレスポンスとして取得する。本番ビルドでも同じ提供データを表示する。
// 正式API導入時は、この取得先だけを `/api/characters/${id}` に変更する。
export async function getCharacter(id: number, signal?: AbortSignal): Promise<CharacterDetailDto> {
  const response = await fetch(fixtureUrl, { signal });
  if (!response.ok) throw new Error('キャラクター情報を取得できませんでした。');
  const data: unknown = await response.json();
  if (!isCharacterDto(data) || data.character_id !== id) {
    throw new Error('キャラクター情報のレスポンス形式が不正です。');
  }
  return data;
}
