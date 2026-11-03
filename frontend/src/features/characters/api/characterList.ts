import listUrl from '../fixtures/character_list.json?url';

export interface CharacterListFormDto {
  form_id: number;
  form_number: number;
  form_name: string;
  form_short_name: string | null;
  image_url: string | null;
}

export interface CharacterListItemDto {
  character_id: number;
  character_name: string;
  character_short_name: string | null;
  rarity_name: string | null;
  forms: CharacterListFormDto[];
}

const object = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);
const id = (value: unknown) =>
  typeof value === 'number' && Number.isSafeInteger(value) && value > 0;
const nullableText = (value: unknown) => value === null || typeof value === 'string';

function isCharacterList(value: unknown): value is CharacterListItemDto[] {
  if (!Array.isArray(value)) return false;
  const characterIds = new Set<number>();
  return value.every((character) => {
    if (
      !object(character) ||
      !id(character.character_id) ||
      characterIds.has(character.character_id as number) ||
      typeof character.character_name !== 'string' ||
      !nullableText(character.character_short_name) ||
      !nullableText(character.rarity_name) ||
      !Array.isArray(character.forms)
    )
      return false;
    characterIds.add(character.character_id as number);
    const formIds = new Set<number>();
    return character.forms.every((form) => {
      if (
        !object(form) ||
        !id(form.form_id) ||
        formIds.has(form.form_id as number) ||
        !id(form.form_number) ||
        typeof form.form_name !== 'string' ||
        !nullableText(form.form_short_name) ||
        !nullableText(form.image_url)
      )
        return false;
      formIds.add(form.form_id as number);
      return true;
    });
  });
}

// API導入時は取得先を変更する。画面は一覧用DTOをそのまま受け取る。
export async function getCharacters(signal?: AbortSignal): Promise<CharacterListItemDto[]> {
  const response = await fetch(listUrl, { signal });
  if (!response.ok) throw new Error('キャラクター一覧を取得できませんでした。');
  const data: unknown = await response.json();
  if (!isCharacterList(data)) throw new Error('キャラクター一覧JSONの形式が不正です。');
  return data;
}
