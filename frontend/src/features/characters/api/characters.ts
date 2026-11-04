import type { CharacterDetailDto } from './characterDto';
import { isCharacterDto } from './validateCharacter';
export { isCharacterDto } from './validateCharacter';

// 詳細APIを取得し、既存の詳細DTOとして検証する。
export async function getCharacter(id: number, signal?: AbortSignal): Promise<CharacterDetailDto> {
  const response = await fetch(`/api/characters/${id}`, { signal });
  if (!response.ok) throw new Error('キャラクター情報を取得できませんでした。');
  const data: unknown = await response.json();
  if (!isCharacterDto(data) || data.character_id !== id) {
    throw new Error('キャラクター情報のレスポンス形式が不正です。');
  }
  return data;
}
