import { Link } from 'react-router-dom';
import { useCharacterData } from '../state/CharacterProvider';
export function CharacterListPage() {
  const { data, loading, error } = useCharacterData();
  return (
    <section className="card standalone">
      <h1>キャラクター一覧</h1>
      {loading ? (
        <p role="status">読み込み中です。</p>
      ) : error ? (
        <p role="alert">{error}</p>
      ) : (
        data && (
          <Link className="character-link" to={`/characters/${data.character_id}`}>
            <span>
              <small>
                No.{data.character_id} · {data.rarity_name}
              </small>
              <strong>{data.character_name}</strong>
            </span>
            <span>›</span>
          </Link>
        )
      )}
      <p className="muted">現在は詳細表示対象の1件のみです。一覧APIは未実装です。</p>
    </section>
  );
}
