import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
const navigation = [
  ['ホーム', '/'],
  ['キャラクター一覧', '/characters'],
  ['所持キャラ管理', '/owned'],
  ['編成シミュレーター', '/formations'],
  ['設定', '/settings'],
  ['ログイン', '/login'],
];
export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  useEffect(() => setOpen(false), [location.pathname]);
  useEffect(() => {
    const close = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, []);
  return (
    <header className="site-header">
      <div className="header-inner">
        <Link to="/" className="brand">
          <span className="logo" aria-hidden="true">
            🐱
          </span>
          <span>
            <strong>Battle Cats Simulator</strong>
            <small>にゃんこ大戦争 シミュレーター</small>
          </span>
        </Link>
        <button
          className="menu-button"
          aria-label="メニュー"
          aria-expanded={open}
          aria-controls="site-menu"
          onClick={() => setOpen(!open)}
        >
          ☰
        </button>
      </div>
      {open && (
        <nav id="site-menu" aria-label="メインメニュー">
          {navigation.map(([label, path]) => (
            <Link key={path} to={path}>
              {label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}
