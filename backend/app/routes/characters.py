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
