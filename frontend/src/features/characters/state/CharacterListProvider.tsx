import { createContext, useContext, useState, type ReactNode } from 'react';
import type { CharacterListItemDto } from '../api/characterList';

function useListState() {
  const [query, setQuery] = useState('');
  const [rarity, setRarity] = useState('');
  const [cache, setCache] = useState<Record<string, CharacterListItemDto[]>>({});
  return { query, setQuery, rarity, setRarity, cache, setCache };
}

const Context = createContext<ReturnType<typeof useListState> | null>(null);

// ページ遷移では維持し、ブラウザ再読み込み時に破棄する。
export function CharacterListProvider({ children }: { children: ReactNode }) {
  const state = useListState();
  return <Context.Provider value={state}>{children}</Context.Provider>;
}

export function useCharacterListState() {
  const state = useContext(Context);
  if (!state) throw new Error('CharacterListProviderが必要です。');
  return state;
}
