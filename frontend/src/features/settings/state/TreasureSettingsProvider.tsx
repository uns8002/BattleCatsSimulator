import { createContext, useContext, useState, type ReactNode } from 'react';
import {
  TREASURE_STORAGE_KEY,
  normalizeTreasureSettings,
  restoreTreasureSettings,
  type TreasureSettings,
} from '../model/treasureSettings';

const Context = createContext<{
  settings: TreasureSettings;
  update: (change: (current: TreasureSettings) => TreasureSettings) => void;
  storageError: boolean;
} | null>(null);

export function TreasureSettingsProvider({ children }: { children: ReactNode }) {
  const [initial] = useState(() => {
    try {
      return {
        settings: restoreTreasureSettings(localStorage.getItem(TREASURE_STORAGE_KEY)),
        error: false,
      };
    } catch {
      return { settings: normalizeTreasureSettings(null), error: true };
    }
  });
  const [settings, setSettings] = useState(initial.settings);
  const [storageError, setStorageError] = useState(initial.error);
  function update(change: (current: TreasureSettings) => TreasureSettings) {
    const next = normalizeTreasureSettings(change(settings));
    setSettings(next);
    try {
      localStorage.setItem(TREASURE_STORAGE_KEY, JSON.stringify(next));
      setStorageError(false);
    } catch {
      setStorageError(true);
    }
  }
  return <Context.Provider value={{ settings, update, storageError }}>{children}</Context.Provider>;
}

export function useTreasureSettings() {
  const context = useContext(Context);
  if (!context) throw new Error('TreasureSettingsProvider is required');
  return context;
}
