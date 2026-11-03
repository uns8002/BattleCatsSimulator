import { Fragment } from 'react';
import { Link } from 'react-router-dom';
import { AssetImage } from '../../../shared/ui/AssetImage';
import type { CharacterListItemDto } from '../api/characterList';

export function CharacterListCard({ character }: { character: CharacterListItemDto }) {
  const forms = [...character.forms].sort((a, b) => a.form_number - b.form_number);
  return (
    <Link
      className="character-list-card"
      to={`/characters/${character.character_id}`}
      aria-label={`${character.character_name}の詳細`}
    >
      <div className="character-list-card-heading">
        <strong>No.{String(character.character_id).padStart(3, '0')}</strong>
        <span className="character-rarity">{character.rarity_name ?? 'レアリティ未提供'}</span>
      </div>
      <div className="character-list-forms">
        {forms.map((form, index) => (
          <Fragment key={form.form_id}>
            <span
              className="character-list-image"
              style={{ gridColumn: (index % 4) + 1, gridRow: Math.floor(index / 4) * 2 + 1 }}
            >
              <AssetImage
                imageKey={form.image_url}
                name={form.form_name}
                fallbackText="画像未提供"
                loading="lazy"
              />
            </span>
            <span
              className="character-list-short-name"
              style={{ gridColumn: (index % 4) + 1, gridRow: Math.floor(index / 4) * 2 + 2 }}
            >
              {form.form_short_name || '略称未提供'}
            </span>
          </Fragment>
        ))}
      </div>
      <span className="character-list-arrow" aria-hidden="true">
        ›
      </span>
    </Link>
  );
}
