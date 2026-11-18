import { useRef, useState } from 'react';
import type { CharacterSettings } from '../model/state';
import { useCharacterData } from '../state/CharacterProvider';
import { AssetImage } from '../../../shared/ui/AssetImage';
import { CharacterBreadcrumbs } from '../components/CharacterBreadcrumbs';
import { CharacterFormSelector } from '../components/CharacterFormSelector';
import { EvolutionRequirements } from '../components/EvolutionRequirements';
import { CharacterLevelControl } from '../components/CharacterLevelControl';
import { CharacterStats } from '../components/CharacterStats';
import { CharacterTargetsAndEffects } from '../components/CharacterTargetsAndEffects';
import { CharacterAbilities } from '../components/CharacterAbilities';
import { CharacterTalents } from '../components/CharacterTalents';
import { CharacterCombos } from '../components/CharacterCombos';
import { CharacterGachas } from '../components/CharacterGachas';
export function CharacterDetailPage({
  settings,
  onChange,
}: {
  settings: CharacterSettings;
  onChange: (s: CharacterSettings) => void;
}) {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const { data: character, loading, error } = useCharacterData();
  const dialog = useRef<HTMLDialogElement>(null);
  if (loading) return <p role="status">キャラクター情報を読み込み中です。</p>;
  if (error || !character) return <p role="alert">{error ?? 'キャラクター情報がありません。'}</p>;
  // 初期表示は配列末尾。並び順・形態数・IDを決め打ちしない。
  const form = character.forms.find((f) => f.form_id === selectedId) ?? character.forms.at(-1);
  if (!form) return <p role="status">形態情報は登録されていません。</p>;
  return (
    <>
      <CharacterBreadcrumbs name={character.character_name} />
      <section className="card character-basic">
        <div className="identity">
          <div className="portrait">
            <AssetImage imageKey={form.image_url} name={form.form_name} />
            {form.image_url === null && <small>画像未提供</small>}
          </div>
          <div className="identity-text">
            <p>
              No.{character.character_id} {character.rarity_name ?? 'レアリティ未提供'}{' '}
              {form.game_version_name ? 'Ver' + form.game_version_name : '未提供'}
            </p>
            <h1>{form.form_name}</h1>
            {character.character_short_name && <p>略称：{character.character_short_name}</p>}
            {character.limited_name && <p>限定：{character.limited_name}</p>}
            {character.collaboration_name && <p>コラボ：{character.collaboration_name}</p>}
          </div>
          <button className="description-button" onClick={() => dialog.current?.showModal()}>
            📖 解説
          </button>
        </div>
        <CharacterFormSelector
          forms={character.forms}
          selected={form.form_id}
          onChange={setSelectedId}
        />
        <EvolutionRequirements form={form} />
        <CharacterLevelControl
          level={settings.level}
          onChange={(level) => onChange({ ...settings, level })}
        />
      </section>
      <CharacterStats
        character={character}
        form={form}
        level={settings.level}
        talentLevels={settings.talents}
      />
      <CharacterTargetsAndEffects form={form} />
      <CharacterAbilities form={form} />
      <CharacterTalents character={character} settings={settings} onChange={onChange} />
      <CharacterCombos />
      <CharacterGachas />
      <dialog
        ref={dialog}
        aria-labelledby="description-title"
        onClick={(e) => {
          if (e.target === e.currentTarget) dialog.current?.close();
        }}
      >
        <h2 id="description-title">{form.form_name}</h2>
        <p className="description-text">{form.description_body ?? '解説は未提供です。'}</p>
        <button autoFocus onClick={() => dialog.current?.close()}>
          閉じる
        </button>
      </dialog>
    </>
  );
}
