"""キャラクター一覧API。"""

from flask import Blueprint, current_app, jsonify, request
from sqlalchemy.exc import SQLAlchemyError

from ..services.characters import get_characters

characters_bp = Blueprint('characters', __name__)


@characters_bp.get('/characters')
def characters():
    try:
        return jsonify(get_characters(request.args.get('rarity_name', '').strip() or None))
    except SQLAlchemyError as exc:
        # SQL・接続情報を含む生の例外はログにもレスポンスにも出さない。
        current_app.logger.error('Character list query failed: %s', type(exc).__name__)
        return jsonify({'error': 'キャラクター一覧を取得できませんでした。'}), 500


@characters_bp.get('/characters/<character_id>')
def character_detail(character_id):
    from ..services.character_detail import get_character_detail

    if (not character_id.isascii() or not character_id.isdecimal()
            or len(character_id) > 10 or not 1 <= int(character_id) <= 2147483647):
        return jsonify({'error': 'character_idには有効な正の整数を指定してください。'}), 400
    try:
        character = get_character_detail(int(character_id))
        if character is None:
            return jsonify({'error': 'キャラクターが見つかりません。'}), 404
        return jsonify(character)
    except SQLAlchemyError:
        return jsonify({'error': 'キャラクター詳細を取得できませんでした。'}), 500
    except ValueError as exc:
        current_app.logger.error('Character detail conversion failed: %s', exc)
        return jsonify({'error': 'キャラクター詳細データの形式が不正です。'}), 500
