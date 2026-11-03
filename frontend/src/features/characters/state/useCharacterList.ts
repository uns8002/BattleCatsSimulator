import { useEffect, useState } from 'react';
import { getCharacters, type CharacterListItemDto } from '../api/characterList';

export function useCharacterList() {
  const [state, setState] = useState<{
    characters: CharacterListItemDto[];
    loading: boolean;
    error: string | null;
  }>({ characters: [], loading: true, error: null });

  useEffect(() => {
    const controller = new AbortController();
    getCharacters(controller.signal).then(
      (characters) => {
        if (!controller.signal.aborted) setState({ characters, loading: false, error: null });
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
  }, []);
  return state;
}
