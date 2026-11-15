import { Link } from 'react-router-dom';
export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="footer-inner">
        <strong>Battle Cats Simulator</strong>
        <p>
          にゃんこ大戦争
          <br className="mobile-break" /> キャラクター育成・編成シミュレーター
        </p>
        <nav aria-label="フッターメニュー">
          {[
            ['プライバシーポリシー', 'privacy'],
            ['お問い合わせ', 'contact'],
            ['使い方ガイド', 'guide'],
            ['利用規約', 'terms'],
          ].map(([label, path]) => (
            <Link key={path} to={'/' + path}>
              {label}
            </Link>
          ))}
        </nav>
        <div className="copyright">
          <p>© 2026 Battle Cats Simulator</p>
          <small>本サイトは非公式のファンサイトです。</small>
        </div>
      </div>
    </footer>
  );
}
