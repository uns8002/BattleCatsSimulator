import { createRoot } from 'react-dom/client';
import { App } from './app/App';
import { CharacterProvider } from './features/characters/state/CharacterProvider';
import './styles.css';
createRoot(document.getElementById('root')!).render(
  <CharacterProvider characterId={138}>
    <App />
  </CharacterProvider>,
);
