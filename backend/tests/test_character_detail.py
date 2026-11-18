from contextlib import nullcontext

from app.services import character_detail
from app.services.character_detail_queries import QUERIES


def test_character_talents_are_returned_once_without_form_id(app, monkeypatch):
    rows = {
        1: [{'character_id': 138}],
        2: [{'form_id': 393}, {'form_id': 394}],
        7: [{'character_id': 138, 'talent_id': 1, 'np_id': None, 'max_level': None,
             **{f'lv{i}': None for i in range(1, 11)}}],
        8: [],
        9: [{'character_id': 138, 'talent_id': 2, 'np_id': 1, 'max_level': 2,
             **{f'lv{i}': 15 for i in range(1, 11)}}],
    }
    monkeypatch.setattr(character_detail, 'fetch_rows',
                        lambda connection, number, character_id: [dict(row) for row in rows.get(number, [])])
    with app.app_context():
        monkeypatch.setattr(character_detail.db.engine, 'connect', lambda: nullcontext(None))
        result = character_detail.get_character_detail(138)
        assert all('talents' not in form for form in result['forms'])
        assert len(result['talents']['effect_targets']) == 1
        assert result['talents']['abilities'][0]['np_costs'] == [15, 15]
        assert 'form_id' not in result['talents']['abilities'][0]
        rows[2] = []
        assert character_detail.get_character_detail(138)['talents'] == result['talents']
    for number in (7, 8, 9):
        sql = str(QUERIES[number])
        assert 't.character_id = :character_id' in sql
        assert 'form_id' not in sql
        assert 'JOIN forms' not in sql
