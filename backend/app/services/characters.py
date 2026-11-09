"""キャラクター一覧の読み取り。"""

from sqlalchemy import text

from ..extensions import db

CHARACTERS_SQL = text("""
SELECT
    c.character_id,
    c.character_name,
    c.character_short_name,
    rarity.value_name AS rarity_name,
    f.form_id,
    f.form_number,
    f.form_name,
    f.form_short_name,
    ia.storage_key AS image_url
FROM characters c
LEFT JOIN category_values rarity
    ON rarity.group_id = '001'
   AND rarity.value_id = c.rarity_id
   AND rarity.is_deleted = 0
LEFT JOIN forms f
    ON f.character_id = c.character_id
   AND f.is_deleted = 0
   AND f.is_active = 1
LEFT JOIN image_assets ia
    ON ia.image_id = f.image_id
   AND ia.is_deleted = 0
WHERE c.is_deleted = 0
  AND (:rarity_name IS NULL OR rarity.value_name = :rarity_name)
ORDER BY
    c.character_id,
    f.form_number
""")


def get_characters(rarity_name=None):
    characters = {}
    with db.engine.connect() as connection:
        for row in connection.execute(CHARACTERS_SQL, {'rarity_name': rarity_name}).mappings():
            character = characters.setdefault(row['character_id'], {
                'character_id': row['character_id'],
                'character_name': row['character_name'],
                'character_short_name': row['character_short_name'],
                'rarity_name': row['rarity_name'],
                'forms': [],
            })
            if row['form_id'] is not None:
                character['forms'].append({
                    'form_id': row['form_id'],
                    'form_number': row['form_number'],
                    'form_name': row['form_name'],
                    'form_short_name': row['form_short_name'],
                    'image_url': row['image_url'],
                })
    return list(characters.values())
