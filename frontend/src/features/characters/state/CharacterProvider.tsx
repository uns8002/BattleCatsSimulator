import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { CharacterDetailDto } from '../api/characterDto';
import { getCharacter } from '../api/characters';

interface CharacterState {
  data: CharacterDetailDto | null;
  loading: boolean;
  error: string | null;
}
const initialState: CharacterState = { data: null, loading: true, error: null };
const Context = createContext<CharacterState | null>(null);

export function CharacterProvider({
  characterId,
  children,
}: {
  characterId: number;
  children: ReactNode;
}) {
  const [state, setState] = useState<CharacterState>(initialState);
  useEffect(() => {
    const controller = new AbortController();
    setState(initialState);
    getCharacter(characterId, controller.signal).then(
      (result) => {
        if (!controller.signal.aborted)
          setState({
            data: result,
            loading: false,
            error: null,
          });
      },
      () => {
        if (!controller.signal.aborted)
          setState({
            data: null,
            loading: false,
            error: 'キャラクター情報を取得できませんでした。',
          });
      },
    );
    return () => controller.abort();
  }, [characterId]);
  return <Context.Provider value={state}>{children}</Context.Provider>;
}

export function useCharacterData() {
  const state = useContext(Context);
  if (!state) throw new Error('CharacterProviderが必要です。');
  return state;
}
