import copy
import json
import unittest
from unittest.mock import patch
import scrape_talents as s


class CoreTests(unittest.TestCase):
    def test_frequency_provisional_formula(self):
        self.assertEqual(s.frequency_reduction(279, 80, 30), (60, 219))
        self.assertEqual(s.frequency_reduction(279, 80, 0), (0, 279))
        self.assertEqual(s.frequency_reduction(180, 80, 2.5), (3, 177))
        calc = {**s.calculate(3, 30, 1, 10, '%', '%'), 'unit': '%', 'max_unit': '%'}
        db = {'forms': {'rows': [{'character_id': 273, 'form_id': 748, 'form_name': 'test',
              'attack_frequency_frames': 279, 'attack_startup_frames': 80}]}}
        converted = s.convert_frequency(calc, db, {'character_id': 273})
        self.assertEqual((converted['base'], converted['step']), (0, 6))
        self.assertEqual(converted['levels'], {str(i): 6*i for i in range(1, 11)})
        db['forms']['rows'][0]['attack_frequency_frames'] = 191
        with self.assertRaises(s.ReviewError):
            s.convert_frequency(calc, db, {'character_id': 273})
        for frequency, startup, rate in [(None, 80, 30), (79, 80, 30), (279, 80, 101)]:
            with self.assertRaises(s.ReviewError):
                s.frequency_reduction(frequency, startup, rate)

    def test_freeze_seconds_to_master_frames(self):
        item = {'description': '40%で動きを止める、持続 1.3秒 -> 4秒', 'min_level': 1, 'max_level': 10}
        rate, duration = s.convert_freeze(item)
        self.assertEqual((rate['base'], rate['step'], rate['unit']), (40, 0, '%'))
        self.assertEqual((duration['base'], duration['step'], duration['unit']), (30, 9, 'F'))
        self.assertEqual(duration['levels'], {str(i): 30 + 9*i for i in range(1, 11)})
        for description in ['101%で動きを止める、持続 1.3秒 -> 4秒',
                            '40%で動きを止める、持続 1.31秒 -> 4秒',
                            item['description'] + ' 追加10%']:
            with self.assertRaises(s.ReviewError):
                s.convert_freeze(dict(item, description=description))

    def test_all_master_keys_required(self):
        item, db, identity, mapping = self.fixture()
        db['abilities']['rows'][0]['parameter_schema'] = '{"pct":{"type":"integer","unit":"%"},"required_fixed":{"type":"integer","unit":"%"}}'
        r = s.normalize(item, db, identity, mappings=mapping)
        self.assertEqual(r['schema_check']['missing_keys'], ['required_fixed'])
        self.assertEqual(r['status'], '未解決')
        self.assertIsNone(r['sql'])
        self.assertIsNone(r['registration'])

    def test_strengthen_and_surge_all_parameters(self):
        item = {'description': '体力が33%未満の時、攻撃力23 -> 50%上昇', 'min_level': 1, 'max_level': 10}
        values = s.convert_all_parameters(item, 'strengthen_all_parameters')
        self.assertEqual([(v['base'], v['step']) for v in values], [(33, 0), (20, 3)])
        item['description'] = '10 -> 100%でLv 1 烈波攻撃 を放つ、範囲 430~780'
        values = s.convert_all_parameters(item, 'surge_all_parameters')
        self.assertEqual([(v['base'], v['step']) for v in values], [(0, 10), (1, 0), (430, 0), (780, 0)])
        item['description'] = '10 -> 100%でLv 1 烈波攻撃 を放つ'
        with self.assertRaises(s.ReviewError):
            s.convert_all_parameters(item, 'surge_all_parameters')

    def test_wave_all_parameters_and_nonintegral_rate(self):
        item, db, identity, mapping = self.fixture()
        item['description'] = '5 -> 15%でLv 6 波動 を放つ'
        mapping[0].update(conversion='wave_all_parameters', parameter_keys=['activation_rate_percent', 'wave_level'])
        db['abilities']['rows'][0]['parameter_schema'] = json.dumps({
            'activation_rate_percent': {'type': 'integer', 'unit': '%'},
            'wave_level': {'type': 'integer', 'unit': 'Lv'}})
        rate, level = s.convert_all_parameters(item, 'wave_all_parameters')
        self.assertEqual(rate['step'], '10/9')
        self.assertEqual((level['base'], level['step']), (6, 0))
        result = s.normalize(item, db, identity, mappings=mapping)
        self.assertEqual(result['status'], '未解決')
        self.assertIsNone(result['sql'])
        self.assertEqual(result['parameter_values']['wave_level'], {'base': 6, 'step': 0})
        item['description'] = '5 -> 50%でLv 6 波動 を放つ'
        result = s.normalize(item, db, identity, mappings=mapping)
        self.assertIsNotNone(result['sql'])
        for description in ['5 -> 101%でLv 6 波動 を放つ', '5 -> 15%でLv 0 波動 を放つ',
                            '5 -> 15%でLv 6 波動 を放つ 10%']:
            with self.assertRaises(s.ReviewError):
                s.convert_all_parameters(dict(item, description=description), 'wave_all_parameters')

    def test_cost_down_standard_yen(self):
        for low, high, step in [(10, 100, 15), (20, 200, 30)]:
            item = {'description': f'生産コスト {low} -> {high} 減少', 'min_level': 1, 'max_level': 10}
            calc = s.convert_all_parameters(item, 'cost_down_standard_yen')[0]
            self.assertEqual((calc['base'], calc['step'], calc['unit']), (0, step, '円'))
            self.assertEqual(calc['levels'], {str(i): step*i for i in range(1, 11)})
            self.assertEqual(calc['source_minimum'], str(low))
            self.assertEqual(s.convert_all_parameters(item, 'cost_down_standard_yen')[0], calc)
        with self.assertRaises(s.ReviewError):
            s.convert_all_parameters(dict(item, description='生産コスト 10 -> 100% 減少'), 'cost_down_standard_yen')

    def test_movement_speed_units(self):
        item = {'description': '移動速度 1 -> 10 上昇', 'min_level': 1, 'max_level': 10}
        calc = s.convert_all_parameters(item, 'move_speed_increase')[0]
        self.assertEqual((calc['base'], calc['step'], calc['unit']), (0, 1, '速度'))
        for description in ['移動速度 1 -> 10% 上昇', '移動速度 10 -> 1 上昇', '移動速度 1 -> 10 上昇 20%']:
            with self.assertRaises(s.ReviewError):
                s.convert_all_parameters(dict(item, description=description), 'move_speed_increase')

    def test_calculations(self):
        for low, high, base, step in [(2, 20, 0, 2), (16, 70, 10, 6), (5, 50, 0, 5)]:
            result = s.calculate(low, high, 1, 10, '%', '%')
            self.assertEqual((result['base'], result['step']), (base, step))
            self.assertEqual((result['levels']['1'], result['levels']['10']), (low, high))
        self.assertEqual(s.calculate(7, 7, 1, 10, '%', '%')['step'], 0)
        self.assertIsNone(s.calculate(1, 1, 1, 1, '%', '%')['step'])
        self.assertEqual(s.calculate(0, 1, 1, 4, '%', '%')['step'], '1/3')
        self.assertTrue(s.calculate(1, 2, 1, 3, '%', '%')['warnings'])
        with self.assertRaises(s.ReviewError):
            s.calculate(1, 10, 1, 10, '秒', 'F')

    def test_exact_identity(self):
        db = {'characters': {'rows': [{'character_id': 7, 'character_name': 'C'}]},
              'forms': {'rows': [{'character_id': 7, 'form_name': n} for n in ['a', 'Ａ']]}}
        self.assertEqual(s.match_character(['Ａ', 'a'], db)['character_id'], 7)
        for names in [['a', 'A'], ['a'], ['a', 'Ａ ']]:
            self.assertIsNone(s.match_character(names, db)['character_id'])
        db['characters']['rows'].append({'character_id': 8, 'character_name': 'D'})
        db['forms']['rows'] += [{'character_id': 8, 'form_name': n} for n in ['a', 'Ａ']]
        self.assertIsNone(s.match_character(['a', 'Ａ'], db)['character_id'])

    def test_np_complete_vector_and_ambiguity(self):
        item = {'max_level': 1, 'np_costs': [150], 'np_total': 150}
        row = {'np_id': 13, 'max_level': 1, **{f'lv{i}': None for i in range(1, 11)}, 'lv1': 150}
        db = {'np': {'rows': [row]}}
        self.assertEqual(s.match_np(item, db)['np_id'], 13)
        row['lv2'] = 0
        self.assertIsNone(s.match_np(item, db)['np_id'])
        row['lv2'] = None
        db['np']['rows'].append(dict(row, np_id=14))
        self.assertIsNone(s.match_np(item, db)['np_id'])
        item['np_costs'] = [149]
        self.assertIsNone(s.match_np(item, db)['np_id'])

    def test_parser_variants(self):
        form = '<section id="form-1" class="cat-form-card"><div class="cat-form-card__header"><h3 class="cat-form-card__title">Ａ</h3></div><div class="cat-form-card__tags"><span class="cat-chip">CAT 106</span></div></section>'
        empty = '<section id="cat-talents">通常本能 0 超本能 0</section>'
        self.assertEqual(s.parse_page(form + empty, 106)[1], [])
        with self.assertRaises(s.ReviewError):
            s.parse_page(form + '<p>本能なし</p>', 106)
        group = '<section class="cat-talent-group"><h4 class="cat-talent-group__title">通常本能</h4><span class="cat-chip--strong">1 項目</span><li class="cat-talent-list__item"><h5 class="cat-talent-list__title">X</h5><div class="cat-talent-list__meta">Lv 1-10 NP 合計 10</div><p class="cat-talent-list__summary">確率 1 -&gt; 10%、時間 2秒 -&gt; 20秒</p><p class="cat-talent-list__np">NP：1 / 1 / 1 / 1 / 1 / 1 / 1 / 1 / 1 / 1</p></li></section>'
        html = form + '<section id="cat-talents">' + group + '</section>'
        _, items, errors = s.parse_page(html, 106)
        self.assertFalse(errors)
        self.assertEqual(len(items[0]['parameters']), 2)
        self.assertEqual(items[0]['parameters'][1]['unit'], '秒')
        _, items, _ = s.parse_page(html.replace('NP：1 / 1 / 1 / 1 / 1 / 1 / 1 / 1 / 1 / 1', 'NP：?'), 106)
        self.assertIsNone(items[0]['np_costs'])
        _, items, _ = s.parse_page(html.replace(group, group + group.replace('通常本能', '超本能')), 106)
        self.assertEqual([x['kind'] for x in items], ['通常本能', '超本能'])

    def fixture(self):
        item = {'name': 'Test', 'kind': '通常本能', 'min_level': 1, 'max_level': 10,
                'np_costs': [1] * 10, 'np_total': 10, 'description': '2 -> 20%',
                'parameters': [{'minimum': '2', 'maximum': '20', 'unit': '%', 'max_unit': '%'}]}
        mapping = [{'source_name': 'Test', 'master_table': 'abilities', 'master_code': 'test',
                    'parameter_keys': ['pct'], 'action': 'add', 'attack_order': None, 'provisional': True}]
        names = ['character_id', 'ability_id', 'talent_type', 'np_id', 'game_version_id',
                 'revision_group_id', 'is_active', 'is_deleted', 'created_at', 'updated_at',
                 'created_by', 'updated_by', 'parameter_values', 'attack_order']
        columns = [{'Field': n, 'Null': 'YES', 'Default': None, 'Extra': ''} for n in names]
        db = {'abilities': {'rows': [{'ability_id': 3, 'ability_name': 'Test', 'ability_code': 'test',
              'parameter_schema': '{"pct":{"type":"integer","unit":"%"}}'}]},
              'np': {'rows': [{'np_id': 4, 'max_level': 10, **{f'lv{i}': 1 for i in range(1, 11)}}]},
              'category_values': {'rows': [{'group_id': '004', 'value_id': '001', 'value_name': '本能'}]},
              'form_ability_talents': {'ddl': '', 'columns': columns, 'rows': []}}
        return item, db, {'character_id': 99}, mapping

    def test_normalization_sql_and_existing_comparison(self):
        item, db, identity, mapping = self.fixture()
        r = s.normalize(item, db, identity, mappings=mapping)
        self.assertEqual(r['status'], '警告')
        self.assertEqual(r['registration']['parameter_values']['pct'], {'base': 0, 'step': 2})
        self.assertIsNone(r['registration']['revision_group_id'])
        self.assertIn('WHERE NOT EXISTS', r['sql'])
        self.assertNotIn('max_level', r['registration'])
        old = copy.deepcopy(r['registration'])
        old['parameter_values'] = json.dumps(old['parameter_values'])
        db['form_ability_talents']['rows'] = [old]
        r = s.normalize(item, db, identity, mappings=mapping)
        self.assertEqual(r['comparison'], '既存データと一致')
        self.assertIsNone(r['sql'])
        old['np_id'] = 88
        r = s.normalize(item, db, identity, mappings=mapping)
        self.assertEqual(r['comparison'], '既存データと不一致')
        self.assertIsNone(r['sql'])
        self.assertIn('np_id', r['diff'][0])

    def test_descriptive_count_is_explicitly_scoped(self):
        item, db, identity, mapping = self.fixture()
        item['description'] += 'で致死ダメージを1回だけ耐える'
        self.assertEqual(s.normalize(item, db, identity, mappings=mapping)['status'], '未解決')
        mapping[0]['non_parameter_phrases'] = ['致死ダメージを1回だけ耐える']
        self.assertEqual(s.normalize(item, db, identity, mappings=mapping)['status'], '警告')
        item['description'] += ' 確率40%'
        self.assertEqual(s.normalize(item, db, identity, mappings=mapping)['status'], '未解決')

    def test_fail_closed(self):
        item, db, identity, mapping = self.fixture()
        for change in ('unknown', 'duplicate', 'unit', 'schema', 'column', 'constant'):
            with self.subTest(change=change):
                i, d, m = copy.deepcopy((item, db, mapping))
                if change == 'unknown':
                    m = []
                if change == 'unit':
                    i['parameters'][0]['unit'] = '秒'
                if change == 'schema':
                    m[0]['parameter_keys'] = ['other']
                if change == 'column':
                    d['form_ability_talents']['columns'] = []
                if change == 'constant':
                    i['description'] += ' 確率30%'
                r = s.normalize(i, d, identity, duplicate=change == 'duplicate', mappings=m)
                self.assertEqual(r['status'], '未解決')
                self.assertIsNone(r['sql'])

    def test_access_restriction_not_retried(self):
        fetcher = s.Fetcher(interval=1, retries=3)
        with patch.object(fetcher.session, 'get') as get:
            get.return_value.status_code = 403
            with self.assertRaises(s.ReviewError):
                fetcher.get('https://example.test/')
            self.assertEqual(get.call_count, 1)


if __name__ == '__main__':
    unittest.main()
