"""詳細SQLを一括実行し、形態単位のレスポンスを組み立てる。"""

import json
from decimal import Decimal

from flask import current_app
from sqlalchemy.exc import SQLAlchemyError

from ..extensions import db
from .character_detail_queries import QUERIES


def json_value(value):
    if isinstance(value, Decimal):
        return int(value) if value == value.to_integral_value() else float(value)
    if isinstance(value, dict):
        return {key: json_value(item) for key, item in value.items()}
    if isinstance(value, list):
        return [json_value(item) for item in value]
    return value


def reject_constant(value):
    raise ValueError('JSONに非有限数が含まれています')


def fetch_rows(connection, number, character_id):
    try:
        rows = connection.execute(QUERIES[number], {'character_id': character_id}).mappings()
        result = []
        for row in rows:
            item = dict(row)
            for key in ('parameter_values', 'parameter_schema'):
                if isinstance(item.get(key), str):
                    try:
                        item[key] = json.loads(item[key], parse_constant=reject_constant)
                    except ValueError:
                        raise ValueError(f'SQL{number:02}: {key}が不正なJSONです') from None
            result.append(json_value(item))
        return result
    except SQLAlchemyError as exc:
        original = getattr(exc, 'orig', None)
        code = original.args[0] if original and original.args else None
        current_app.logger.error('Character detail SQL%02d failed: %s (code=%s)', number, type(exc).__name__, code)
        raise


def get_character_detail(character_id):
    with db.engine.connect() as connection:
        basics = fetch_rows(connection, 1, character_id)
        if not basics:
            return None
        character = basics[0]
        character['forms'] = fetch_rows(connection, 2, character_id)
        forms = {form['form_id']: form for form in character['forms']}
        for form in forms.values():
            for key in ('effect_targets', 'effects', 'abilities', 'materials'):
                form[key] = []
        character['talents'] = {'effect_targets': [], 'effects': [], 'abilities': []}
        for number, key in ((3, 'effect_targets'), (4, 'effects'), (5, 'abilities'),
                            (6, 'materials'), (7, 'effect_targets'), (8, 'effects'), (9, 'abilities')):
            for item in fetch_rows(connection, number, character_id):
                if number >= 7:
                    # SQLのtalent_idを既存詳細DTOの関連ID名にも対応させる。
                    kind = {7: 'effect_target', 8: 'effect', 9: 'ability'}[number]
                    item[f'form_{kind}_talent_id'] = item['talent_id']
                    level = item['max_level']
                    if item['np_id'] is None:
                        item['np_costs'] = []
                    elif not isinstance(level, int) or not 1 <= level <= 10:
                        raise ValueError(f'SQL{number:02}: NP最大レベルが1〜10の整数ではありません')
                    else:
                        item['np_costs'] = [item[f'lv{i}'] for i in range(1, level + 1)]
                    for i in range(1, 11):
                        item.pop(f'lv{i}')
                    item.setdefault('parameter_values', None)
                    character['talents'][key].append(item)
                else:
                    form_id = item.pop('form_id')
                    if form_id not in forms:
                        raise ValueError(f'SQL{number:02}: 取得形態にない関連データがあります')
                    forms[form_id][key].append(item)
        return character
