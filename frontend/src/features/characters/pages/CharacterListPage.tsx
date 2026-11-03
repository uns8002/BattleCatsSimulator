import { useMemo, useState } from 'react';
import { CharacterListCard } from '../components/CharacterListCard';
import { useCharacterList } from '../state/useCharacterList';
import './CharacterListPage.css';

const rarityChoices = ['基本', 'EX', 'レア', '激レア', '超激レア', '伝説レア'];
const normalize = (value: string) => value.normalize('NFKC').toLocaleLowerCase('ja').trim();

export function CharacterListPage() {
  const [query, setQuery] = useState('');
  const [rarity, setRarity] = useState('');
  const { characters, loading, error } = useCharacterList(rarity);
  const rarities = [
    ...new Set([
      ...rarityChoices,
      ...characters.flatMap((c) => (c.rarity_name ? [c.rarity_name] : [])),
    ]),
  ];
  const filtered = useMemo(() => {
    const search = normalize(query);
    return characters
      .filter((character) => {
        const names = [
          character.character_name,
          character.character_short_name,
          ...character.forms.flatMap((form) => [form.form_name, form.form_short_name]),
        ];
        return names.some((name) => name != null && normalize(name).includes(search));
      })
      .sort((a, b) => a.character_id - b.character_id);
  }, [characters, query]);

  return (
    <section className="character-list-page" aria-labelledby="character-list-title">
      <h1 id="character-list-title">キャラクター一覧</h1>
      <div className="character-search">
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden="true"
        >
          <circle cx="10" cy="10" r="7" />
          <path d="m15 15 6 6" />
        </svg>
        <input
          type="search"
          aria-label="キャラクター名・形態名・形態略称で検索"
          placeholder="キャラクター名で検索…"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </div>
      <div className="character-rarity-filters" role="group" aria-label="レアリティ絞り込み">
        {['', ...rarities].map((value) => (
          <button
            key={value}
            type="button"
            aria-pressed={rarity === value}
            onClick={() => setRarity(value)}
          >
            {value === '基本' ? '基本キャラ' : value || 'すべて'}
          </button>
        ))}
      </div>
      {loading ? (
        <p role="status">読み込み中です。</p>
      ) : error ? (
        <p role="alert">{error}</p>
      ) : (
        <>
          <ul className="character-list">
            {filtered.map((character) => (
              <li key={character.character_id}>
                <CharacterListCard character={character} />
              </li>
            ))}
          </ul>
          {filtered.length === 0 && <p role="status">条件に一致するキャラクターはいません。</p>}
          <p className="data-note">
            現在取得できるデータのみ表示しています。未提供の画像・略称はその旨を表示します。
          </p>
        </>
      )}
    </section>
  );
}
