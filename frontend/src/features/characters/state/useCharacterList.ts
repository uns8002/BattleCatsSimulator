import { useEffect, useState } from 'react';
import { useCharacterListState } from './CharacterListProvider';
import { getCharacters, type CharacterListItemDto } from '../api/characterList';

export function useCharacterList(rarityName = '') {
  const { cache, setCache } = useCharacterListState();
  const cached = cache[rarityName];
  const [state, setState] = useState<{
    characters: CharacterListItemDto[];
    loading: boolean;
    error: string | null;
  }>({ characters: [], loading: true, error: null });

  useEffect(() => {
    if (cached) return;
    const controller = new AbortController();
    setState({ characters: [], loading: true, error: null });
    getCharacters(controller.signal, rarityName).then(
      (characters) => {
        if (!controller.signal.aborted) {
          setCache((previous) => ({ ...previous, [rarityName]: characters }));
          setState({ characters, loading: false, error: null });
        }
      },
      (error: unknown) => {
        if (!controller.signal.aborted)
          setState({
            characters: [],
            loading: false,
            error:
              error instanceof Error ? error.message : 'キャラクター一覧を取得できませんでした。',
          });
      },
    );
    return () => controller.abort();
  }, [rarityName, cached, setCache]);
  return cached ? { characters: cached, loading: false, error: null } : state;
}
