import { Link } from 'react-router-dom';
export function CharacterBreadcrumbs({ name }: { name: string }) {
  return (
    <nav className="breadcrumbs" aria-label="パンくずリスト">
      <Link to="/characters">キャラクター一覧</Link>
      <span aria-hidden="true">›</span>
      <span aria-current="page">{name}</span>
    </nav>
  );
}
