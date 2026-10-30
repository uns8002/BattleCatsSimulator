import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { validLevel } from '../model/state';
export function CharacterLevelControl({
  level,
  onChange,
}: {
  level: number;
  onChange: (n: number) => void;
}) {
  const [input, setInput] = useState(String(level));
  useEffect(() => setInput(String(level)), [level]);
  function commit() {
    const n = validLevel(input, level);
    setInput(String(n));
    onChange(n);
  }
  return (
    <div className="level-settings">
      <div className="stepper">
        <label htmlFor="character-level">Lv</label>
        <button
          aria-label="レベルを下げる"
          disabled={level <= 1}
          onClick={() => onChange(level - 1)}
        >
          −
        </button>
        <input
          id="character-level"
          aria-label="キャラクターレベル"
          inputMode="numeric"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              commit();
              e.currentTarget.blur();
            }
          }}
        />
        <button
          aria-label="レベルを上げる"
          disabled={level >= Number.MAX_SAFE_INTEGER}
          onClick={() => onChange(level + 1)}
        >
          ＋
        </button>
      </div>
      <div className="settings-links">
        <Link className="button" to="/settings/treasures">
          ⚙ お宝設定
        </Link>
        <Link className="button" to="/settings/combos">
          ⚙ にゃんコンボ設定
        </Link>
      </div>
    </div>
  );
}
