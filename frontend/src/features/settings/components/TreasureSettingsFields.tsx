import { useEffect, useId, useState } from 'react';
import { commitInteger, treasureFields } from '../model/treasureSettings';
import { useTreasureSettings } from '../state/TreasureSettingsProvider';

function NumberSetting({
  name,
  description,
  value,
  min = 0,
  max = 300,
  unit = '%',
  onChange,
}: {
  name: string;
  description: string;
  value: number;
  min?: number;
  max?: number;
  unit?: string;
  onChange: (value: number) => void;
}) {
  const id = useId();
  const [draft, setDraft] = useState(String(value));
  useEffect(() => setDraft(String(value)), [value]);
  function commit() {
    const next = commitInteger(draft, min, max, value);
    setDraft(String(next));
    if (next !== value) onChange(next);
  }
  return (
    <div className="treasure-setting">
      <div>
        <label htmlFor={id}>{name}</label>
        <small id={`${id}-description`} className="muted">
          {description}
        </small>
      </div>
      <div className="stepper">
        <button
          type="button"
          aria-label={`${name}を下げる`}
          disabled={value <= min}
          onClick={() => onChange(value - 1)}
        >
          −
        </button>
        <input
          id={id}
          aria-describedby={`${id}-description`}
          inputMode="numeric"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={commit}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              event.currentTarget.blur();
            }
          }}
        />
        <button
          type="button"
          aria-label={`${name}を上げる`}
          disabled={value >= max}
          onClick={() => onChange(value + 1)}
        >
          ＋
        </button>
        {unit && <span>{unit}</span>}
      </div>
    </div>
  );
}

export function TreasureSettingsFields() {
  const { settings, update, storageError } = useTreasureSettings();
  const treasure = (field: (typeof treasureFields)[number]) => (
    <NumberSetting
      key={field.key}
      name={field.name}
      description={field.description}
      value={settings.treasures[field.key]}
      onChange={(value) =>
        update((current) => ({
          ...current,
          treasures: { ...current.treasures, [field.key]: value },
        }))
      }
    />
  );
  return (
    <div className="treasure-settings">
      <p className="muted">
        体力・攻撃力・DPSと、中国の伝統・研究力による再生産時間の短縮は設定の確定時に反映されます。
      </p>
      {storageError && (
        <p role="alert">ブラウザに保存できません。設定はこの画面の利用中のみ保持されます。</p>
      )}
      <section aria-labelledby="basic-treasures-title">
        <h3 id="basic-treasures-title">基本ステータス</h3>
        <p className="muted">お宝は日本編第1章〜第3章の合計値（0〜300%）です。</p>
        {treasureFields.slice(0, 3).map(treasure)}
        <NumberSetting
          name="研究力Lv"
          description="再生産時間"
          value={settings.research.level}
          min={1}
          max={20}
          unit=""
          onChange={(level) =>
            update((current) => ({ ...current, research: { ...current.research, level } }))
          }
        />
        <NumberSetting
          name="研究力＋Lv"
          description="再生産時間"
          value={settings.research.plusLevel}
          max={10}
          unit=""
          onChange={(plusLevel) =>
            update((current) => ({ ...current, research: { ...current.research, plusLevel } }))
          }
        />
      </section>
      <section aria-labelledby="fruit-treasures-title">
        <h3 id="fruit-treasures-title">特殊能力のお宝</h3>
        <p className="muted">果実の設定値は保存されます。特殊能力への補正は未対応です。</p>
        {treasureFields.slice(3).map(treasure)}
      </section>
    </div>
  );
}
