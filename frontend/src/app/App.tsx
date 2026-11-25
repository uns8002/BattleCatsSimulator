import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation, useParams } from 'react-router-dom';
import { CharacterListProvider } from '../features/characters/state/CharacterListProvider';
import { CharacterProvider } from '../features/characters/state/CharacterProvider';
import { SiteLayout } from '../shared/layout/SiteLayout';
import { CharacterDetailPage } from '../features/characters/pages/CharacterDetailPage';
import { CharacterListPage } from '../features/characters/pages/CharacterListPage';
import { SettingsPage } from '../features/settings/pages/SettingsPage';
import type { CharacterSettings } from '../features/characters/model/state';
import { TreasureSettingsProvider } from '../features/settings/state/TreasureSettingsProvider';
function Pending({ title }: { title: string }) {
  return (
    <section className="card standalone">
      <h1>{title}</h1>
      <p className="muted">このページは準備中です。</p>
      <Link to="/characters/138">キャラクター詳細へ</Link>
    </section>
  );
}
function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}
function CharacterDetailRoute({
  settings,
  onChange,
}: {
  settings: CharacterSettings;
  onChange: (settings: CharacterSettings) => void;
}) {
  const { characterId = '' } = useParams();
  const id = Number(characterId);
  if (!/^[0-9]+$/.test(characterId) || !Number.isSafeInteger(id) || id < 1 || id > 2147483647) {
    return <p role="alert">キャラクターIDが不正です。</p>;
  }
  return (
    <CharacterProvider key={id} characterId={id}>
      <CharacterDetailPage settings={settings} onChange={onChange} />
    </CharacterProvider>
  );
}

export function App() {
  const [settings, setSettings] = useState<CharacterSettings>({
    level: 1,
    talents: {},
  });
  return (
    <TreasureSettingsProvider>
      <BrowserRouter>
        <ScrollToTop />
        <CharacterListProvider>
          <Routes>
            <Route element={<SiteLayout />}>
              <Route
                path="/characters/:characterId"
                element={<CharacterDetailRoute settings={settings} onChange={setSettings} />}
              />
              <Route path="/characters" element={<CharacterListPage />} />
              <Route
                path="/"
                element={
                  <section className="card standalone">
                    <h1>Battle Cats Simulator</h1>
                    <p>にゃんこ大戦争 キャラクター育成・編成シミュレーター</p>
                    <Link className="button" to="/characters">
                      キャラクター一覧を見る
                    </Link>
                  </section>
                }
              />
              <Route path="/settings/treasures" element={<SettingsPage kind="treasures" />} />
              <Route path="/settings/combos" element={<SettingsPage kind="combos" />} />
              <Route
                path="/settings"
                element={
                  <section className="card standalone">
                    <h1>設定</h1>
                    <div className="settings-links">
                      <Link className="button" to="/settings/treasures">
                        お宝設定
                      </Link>
                      <Link className="button" to="/settings/combos">
                        にゃんコンボ設定
                      </Link>
                    </div>
                  </section>
                }
              />
              {[
                ['owned', '所持キャラ管理'],
                ['formations', '編成シミュレーター'],
                ['login', 'ログイン'],
                ['privacy', 'プライバシーポリシー'],
                ['contact', 'お問い合わせ'],
                ['guide', '使い方ガイド'],
                ['terms', '利用規約'],
              ].map(([path, title]) => (
                <Route key={path} path={'/' + path} element={<Pending title={title} />} />
              ))}
              <Route path="*" element={<Pending title="ページが見つかりません" />} />
            </Route>
          </Routes>
        </CharacterListProvider>
      </BrowserRouter>
    </TreasureSettingsProvider>
  );
}
