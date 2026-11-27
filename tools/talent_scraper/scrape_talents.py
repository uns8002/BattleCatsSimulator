"""Single-character, read-only talent review. Never executes generated SQL."""
from __future__ import annotations

import argparse
from collections import Counter, defaultdict
from datetime import datetime, timezone
from decimal import Decimal
from fractions import Fraction
import json
import os
from pathlib import Path
import re
import time
from urllib.robotparser import RobotFileParser

from bs4 import BeautifulSoup
from dotenv import load_dotenv
import pymysql
import requests

ROOT = Path(__file__).resolve().parents[2]
HERE = Path(__file__).resolve().parent
ORIGIN = 'https://battlecats.anypupil.com/'
AGENT = 'NyankoTalentReview/0.1'
TABLES = ('characters', 'forms', 'abilities', 'effects', 'effect_targets', 'np',
          'category_values', 'form_abilities', 'form_ability_talents',
          'form_effect_talents', 'form_effect_target_talents')
DESTINATIONS = {'abilities': ('form_ability_talents', 'ability'),
                'effects': ('form_effect_talents', 'effect'),
                'effect_targets': ('form_effect_target_talents', 'effect_target')}


class ReviewError(Exception):
    pass


def dumps(value):
    return json.dumps(value, ensure_ascii=False, indent=2, allow_nan=False)


def number(value):
    """Exact JSON number when finite decimal; recurring fractions stay review-only."""
    value = Fraction(value)
    if value.denominator == 1:
        return value.numerator
    denominator = value.denominator
    for prime in (2, 5):
        while denominator % prime == 0:
            denominator //= prime
    if denominator != 1:
        return str(value)
    return float(Decimal(value.numerator) / Decimal(value.denominator))


def calculate(low, high, min_level, max_level, unit, max_unit):
    if unit != max_unit:
        raise ReviewError('単位不一致')
    if not 1 <= min_level <= max_level:
        raise ReviewError('レベル範囲不正')
    low, high = Fraction(str(low)), Fraction(str(high))
    if max_level == 1:
        return {'unlock': True, 'minimum': number(low), 'maximum': number(high),
                'base': None, 'step': None, 'levels': None, 'warnings': []}
    if min_level == max_level:
        raise ReviewError('異なるレベルの端点が不足')
    step = (high - low) / (max_level - min_level)
    base = low - step * min_level
    if base + step * min_level != low or base + step * max_level != high:
        raise ReviewError('計算結果不一致')
    return {'base': number(base), 'step': number(step),
            'formula': f'({high} - {low}) / ({max_level} - {min_level}) = {step}; {low} - {step} × {min_level} = {base}',
            'levels': {str(lv): number(base + step * lv) for lv in range(1, max_level + 1)},
            'warnings': ['stepが小数（丸めなし）'] if step.denominator != 1 else []}


class Fetcher:
    def __init__(self, interval=2, retries=2):
        self.interval, self.retries, self.last = max(1, interval), retries, 0
        self.session = requests.Session()
        self.session.headers['User-Agent'] = AGENT

    def get(self, url):
        for attempt in range(self.retries + 1):
            time.sleep(max(0, self.last + self.interval - time.monotonic()))
            self.last = time.monotonic()
            try:
                r = self.session.get(url, timeout=(10, 30), allow_redirects=False)
                if r.status_code in (401, 403, 429):
                    raise ReviewError(f'アクセス制限 HTTP {r.status_code}（再試行しません）')
                if 300 <= r.status_code < 400:
                    raise ReviewError('リダイレクト先は自動巡回しません')
                if r.status_code >= 500 and attempt < self.retries:
                    continue
                r.raise_for_status()
                return r.content.decode('utf-8', errors='strict')
            except (requests.Timeout, requests.ConnectionError):
                if attempt == self.retries:
                    raise ReviewError('HTTP接続失敗・タイムアウト（再試行上限）') from None
        raise ReviewError('HTTP取得失敗')

    def fetch(self, catid, output):
        robots = self.get(ORIGIN + 'robots.txt')
        (output / 'robots.txt').write_text(robots, encoding='utf-8')
        policy = RobotFileParser()
        policy.parse(robots.splitlines())
        self.interval = max(self.interval, policy.crawl_delay(AGENT) or 0)
        rate = policy.request_rate(AGENT)
        if rate:
            self.interval = max(self.interval, rate.seconds / rate.requests)
        url = ORIGIN + f'cats1.php?catid={catid}&lang=ja'
        about = ORIGIN + 'about.php?lang=ja'
        for target in (about, url):
            if not policy.can_fetch(AGENT, target):
                raise ReviewError('robots.txtにより取得禁止: ' + target)
        terms = self.get(about)
        (output / 'about.html').write_text(terms, encoding='utf-8')
        # Preserve the current terms alongside each run for human review.
        return self.get(url)


def text(node, selector):
    found = node.select_one(selector)
    return found.get_text() if found else None


RANGE = re.compile(r'(?P<lo>-?\d+(?:\.\d+)?)\s*(?P<u1>%|秒|F|円|倍|回|Lv)?\s*(?:->|→|〜|～)\s*(?P<hi>-?\d+(?:\.\d+)?)\s*(?P<u2>%|秒|F|円|倍|回|Lv)?')


def parse_page(html, catid):
    soup = BeautifulSoup(html, 'html.parser')
    forms = [text(n, '.cat-form-card__header .cat-form-card__title')
             for n in soup.select('section.cat-form-card[id^="form-"]')]
    if not forms or any(not n for n in forms) or len(set(forms)) != len(forms):
        raise ReviewError('HTML構造変更: 全形態名を一意に取得できません')
    chips = [n.get_text() for n in soup.select('.cat-form-card__tags .cat-chip')]
    if f'CAT {catid}' not in chips:
        raise ReviewError('要求catidとページのCAT番号が不一致')
    talents, errors = [], []
    panel = soup.select_one('#cat-talents')
    if panel is None:
        # Absence alone cannot distinguish structural drift from no talents.
        explicit = soup.select_one('.cat-talent-empty')
        if explicit and explicit.get_text(strip=True) not in ('本能なし', '本能はありません'):
            explicit = None
        if not explicit:
            raise ReviewError('本能パネル欠落: 本能なしとは断定できません')
        return forms, [], []
    groups = panel.select('section.cat-talent-group')
    for group in groups:
        title = text(group, '.cat-talent-group__title')
        if title not in ('通常本能', '超本能'):
            errors.append('HTML構造変更: 未知の本能区分 ' + str(title))
            continue
        items = group.select('.cat-talent-list__item')
        for item in items:
            original = item.get_text(' ', strip=True)
            desc = text(item, '.cat-talent-list__summary')
            meta = text(item, '.cat-talent-list__meta') or ''
            level = re.search(r'Lv\s*(\d+)\s*-\s*(\d+)', meta)
            total = re.search(r'NP\s*合計\s*(\d+)', meta)
            np_text = text(item, '.cat-talent-list__np')
            costs = None
            if np_text and re.fullmatch(r'NP[：:]\s*\d+(?:\s*/\s*\d+)*', np_text):
                costs = [int(n) for n in re.findall(r'\d+', np_text)]
            parameters = []
            for match in RANGE.finditer(desc or ''):
                # A unit after a whole range applies to both endpoints.
                u1, u2 = match['u1'] or match['u2'], match['u2'] or match['u1']
                parameters.append({'source_text': match[0], 'context': (desc or '')[:match.start()],
                                   'minimum': match['lo'], 'maximum': match['hi'],
                                   'unit': u1, 'max_unit': u2})
            talents.append({'kind': title, 'name': text(item, '.cat-talent-list__title'),
                            'description': desc, 'min_level': int(level[1]) if level else None,
                            'max_level': int(level[2]) if level else None,
                            'np_costs': costs, 'np_total': int(total[1]) if total else None,
                            'parameters': parameters,
                            'numeric_tokens': re.findall(r'-?\d+(?:\.\d+)?\s*(?:%|秒|F|円|倍|回|Lv)?', desc or ''),
                            'original_text': original, 'original_html': str(item)})
        declared = text(group, '.cat-chip--strong')
        if not declared or not re.fullmatch(r'\d+ 項目', declared) or int(declared.split()[0]) != len(items):
            errors.append('HTML構造変更: 本能項目数不一致 ' + title)
    if not groups:
        label = panel.get_text(' ', strip=True)
        if not ('通常本能 0' in label and '超本能 0' in label) and label not in ('本能なし', '本能はありません'):
            errors.append('HTML構造変更: 本能グループ欠落')
    return forms, talents, errors


def read_db():
    load_dotenv(ROOT / 'backend/.env', override=False)
    if any(not os.getenv(k) for k in ('DB_HOST', 'DB_PORT', 'DB_USER', 'DB_PASSWORD', 'DB_NAME')):
        raise ReviewError('DB接続設定不足（backend/.env または環境変数）')
    connection = pymysql.connect(host=os.environ['DB_HOST'], port=int(os.environ['DB_PORT']),
                                user=os.environ['DB_USER'], password=os.environ['DB_PASSWORD'],
                                database=os.environ['DB_NAME'], charset='utf8mb4',
                                connect_timeout=5, read_timeout=15, write_timeout=15,
                                cursorclass=pymysql.cursors.DictCursor, autocommit=False)
    result = {}
    try:
        with connection.cursor() as cursor:
            cursor.execute('START TRANSACTION READ ONLY')
            cursor.execute('SHOW TABLES')
            available = {next(iter(r.values())) for r in cursor.fetchall()}
            for table in TABLES:
                if table not in available:
                    continue
                cursor.execute(f'SHOW CREATE TABLE `{table}`')
                ddl = cursor.fetchone()['Create Table']
                cursor.execute(f'SHOW FULL COLUMNS FROM `{table}`')
                columns = cursor.fetchall()
                cursor.execute(f'SELECT * FROM `{table}`')
                result[table] = {'ddl': ddl, 'columns': columns, 'rows': cursor.fetchall()}
    finally:
        connection.rollback()
        connection.close()
    return result


def active(row):
    return str(row.get('is_deleted', '0')) == '0' and str(row.get('is_active', '1')) == '1'


def rows(db, table):
    return [r for r in db.get(table, {}).get('rows', []) if active(r)]


def match_character(names, db):
    grouped = defaultdict(list)
    characters = {r['character_id']: r for r in rows(db, 'characters')}
    for row in rows(db, 'forms'):
        if row['character_id'] in characters:
            grouped[row['character_id']].append(row['form_name'])
    candidates = [cid for cid, db_names in grouped.items()
                  if len(db_names) == len(names) and set(db_names) == set(names)]
    return {'character_id': candidates[0] if len(candidates) == 1 else None,
            'character_name': characters[candidates[0]]['character_name'] if len(candidates) == 1 else None,
            'status': '完全一致・一意' if len(candidates) == 1 else '形態名不一致または複数候補',
            'candidates': candidates, 'form_names': names}


def match_np(item, db):
    level, costs = item['max_level'], item['np_costs']
    if not level or not 1 <= level <= 10 or costs is None or len(costs) != level:
        return {'np_id': None, 'status': 'NPまたは最大Lv欠落・件数不一致', 'candidates': []}
    if item['np_total'] is not None and sum(costs) != item['np_total']:
        return {'np_id': None, 'status': 'NP合計と各Lv費用が不一致', 'candidates': []}
    matches = [r['np_id'] for r in rows(db, 'np') if r['max_level'] == level
               and [r.get(f'lv{i}') for i in range(1, level + 1)] == costs
               and all(r.get(f'lv{i}') is None for i in range(level + 1, 11))]
    return {'np_id': matches[0] if len(matches) == 1 else None, 'candidates': matches,
            'status': '完全一致・一意' if len(matches) == 1 else 'NPパターン不一致または複数候補'}


def frequency_reduction(frequency, startup, percent):
    """暫定仕様: floor((frequency-startup)*percent/100 + 0.5)."""
    if not isinstance(frequency, int) or not isinstance(startup, int) or not 0 <= startup <= frequency or frequency <= 0:
        raise ReviewError('攻撃頻度・攻撃発生Fが欠落または不正')
    rate = Fraction(str(percent))
    if not 0 <= rate <= 100:
        raise ReviewError('短縮率が0〜100%の範囲外')
    rounded = (frequency - startup) * rate / 100 + Fraction(1, 2)
    reduction = rounded.numerator // rounded.denominator
    return reduction, frequency - reduction


def convert_frequency(calc, db, identity):
    if calc['unit'] != '%' or calc['max_unit'] != '%':
        raise ReviewError('攻撃間隔短縮の取得単位が%でない')
    forms = [f for f in rows(db, 'forms') if f['character_id'] == identity['character_id']]
    if not forms:
        raise ReviewError('攻撃間隔短縮の基準形態がない')
    previews = []
    for form in forms:
        levels = {}
        for lv, percent in calc['levels'].items():
            reduction, frequency = frequency_reduction(form.get('attack_frequency_frames'), form.get('attack_startup_frames'), percent)
            levels[lv] = {'reduction_percent': percent, 'reduction_frames': reduction, 'result_frames': frequency}
        previews.append({'form_id': form['form_id'], 'form_name': form['form_name'],
                         'attack_frequency_frames': form['attack_frequency_frames'],
                         'attack_startup_frames': form['attack_startup_frames'], 'levels': levels})
    reductions = {lv: v['reduction_frames'] for lv, v in previews[0]['levels'].items()}
    if any({lv: v['reduction_frames'] for lv, v in p['levels'].items()} != reductions for p in previews):
        raise ReviewError('形態ごとの短縮Fが異なるためキャラクター共通の本能値に保存不可')
    levels = sorted(map(int, reductions))
    converted = calculate(reductions[str(levels[0])], reductions[str(levels[-1])], levels[0], levels[-1], 'F', 'F')
    if converted['levels'] != reductions:
        raise ReviewError('四捨五入後の各Lv短縮Fを既存base/step構造で正確に表現できない')
    return {**calc, **converted, 'minimum': reductions[str(levels[0])],
            'maximum': reductions[str(levels[-1])], 'unit': 'F', 'max_unit': 'F',
            'source_percent_calculation': calc, 'frequency_preview': previews}


def convert_freeze(item):
    # Only the observed explicit grammar is supported; additional numbers fail closed.
    match = re.fullmatch(r'(\d+(?:\.\d+)?)%で動きを止める、持続 (\d+(?:\.\d+)?)秒\s*->\s*(\d+(?:\.\d+)?)秒', item.get('description') or '')
    if not match:
        if re.fullmatch(r'\d+(?:\.\d+)?\s*->\s*\d+(?:\.\d+)?%で動きを止める', item.get('description') or ''):
            raise ReviewError('発動率のみ掲載。必須の停止時間freeze_duration_framesを取得できないため補完しない')
        raise ReviewError('停止の発動率・時間を一意に抽出できない')
    rate, low, high = map(Fraction, match.groups())
    if not 0 <= rate <= 100:
        raise ReviewError('停止発動率が0〜100%の範囲外')
    output = []
    for minimum, maximum, unit in [(rate, rate, '%'), (low * 30, high * 30, 'F')]:
        calc = calculate(number(minimum), number(maximum), item['min_level'], item['max_level'], unit, unit)
        if calc.get('levels') is None or any(not isinstance(v, int) for v in calc['levels'].values()):
            raise ReviewError('停止パラメータを整数で表現できない（丸めは行わない）')
        output.append({**calc, 'minimum': number(minimum), 'maximum': number(maximum),
                       'unit': unit, 'max_unit': unit, 'source_text': match[0],
                       'conversion': '固定発動率' if unit == '%' else '1秒=30Fで換算'})
    return output


def convert_all_parameters(item, conversion):
    """Parse only explicit supported descriptions, including fixed parameters."""
    if conversion == 'strengthen_all_parameters':
        match = re.fullmatch(r'体力が(\d+(?:\.\d+)?)%(未満|以下)の時、攻撃力(\d+(?:\.\d+)?)\s*->\s*(\d+(?:\.\d+)?)%上昇', item.get('description') or '')
        if not match:
            raise ReviewError('攻撃力アップの発動割合・上昇率を抽出できない')
        trigger, _, low, high = match.groups()
        if not 0 <= Fraction(trigger) <= 100:
            raise ReviewError('発動体力割合が範囲外')
        triples = [(trigger, trigger, '%'), (low, high, '%')]
    elif conversion == 'move_speed_increase':
        match = re.fullmatch(r'移動速度\s*(\d+)\s*(?:->|→|〜|～)\s*(\d+)\s*上昇', item.get('description') or '')
        if not match or int(match[1]) > int(match[2]):
            raise ReviewError('移動速度増加量を一意に抽出できない')
        triples = [(match[1], match[2], '速度')]
    elif conversion == 'cost_down_standard_yen':
        match = re.fullmatch(r'生産コスト\s*(\d+(?:\.\d+)?)\s*(?:円)?\s*(?:->|→|〜|～)\s*(\d+(?:\.\d+)?)\s*(?:円)?\s*減少', item.get('description') or '')
        if not match:
            raise ReviewError('生産コスト減少量を抽出できない')
        low, high = map(Fraction, match.groups())
        if low > high:
            raise ReviewError('生産コスト減少量の最小・最大が逆転')
        triples = [(low * Fraction(3, 2), high * Fraction(3, 2), '円')]
    elif conversion == 'surge_all_parameters':
        match = re.fullmatch(r'(\d+(?:\.\d+)?)\s*->\s*(\d+(?:\.\d+)?)%でLv\s*(\d+)\s*烈波攻撃\s*を放つ、範囲\s*(\d+)\s*[~〜～]\s*(\d+)', item.get('description') or '')
        if not match:
            raise ReviewError('烈波の発動率・Lv・範囲を抽出できない')
        low, high, level, start, end = match.groups()
        if not 0 <= Fraction(low) <= Fraction(high) <= 100 or int(level) < 1 or int(start) > int(end):
            raise ReviewError('烈波パラメータの範囲不正')
        triples = [(low, high, '%'), (level, level, 'Lv'), (start, start, '距離'), (end, end, '距離')]
    else:
        raise ReviewError('未対応の全パラメータ抽出')
    result = []
    for low, high, unit in triples:
        calc = calculate(low, high, item['min_level'], item['max_level'], unit, unit)
        result.append({**calc, 'minimum': number(Fraction(low)), 'maximum': number(Fraction(high)),
                       'unit': unit, 'max_unit': unit, 'source_text': match[0]})
    if conversion == 'cost_down_standard_yen':
        result[0]['conversion'] = '日本編1章の掲載減少額 × 1.5 = 標準の減少額（円）'
        result[0]['source_minimum'] = match[1]
        result[0]['source_maximum'] = match[2]
        result[0]['conversion_factor'] = 1.5
    return result


def normalize(item, db, identity, duplicate=False, mappings=()):
    result = {'source': item, 'character_id': identity['character_id'], 'form_id': None,
              'master': None, 'table': None, 'parameter_values': None, 'calculations': [],
              'np_match': match_np(item, db), 'reasons': [], 'warnings': [],
              'comparison': '未解決', 'diff': None, 'registration': None, 'sql': None}
    reasons = result['reasons']
    if identity['character_id'] is None:
        reasons.append(identity['status'])
    if duplicate:
        reasons.append('同一区分・同一本能の重複')
    if result['np_match']['np_id'] is None:
        reasons.append(result['np_match']['status'])
    if item['min_level'] is None or item['max_level'] is None:
        reasons.append('最小Lv・最大Lv取得不可')
    else:
        for param in item['parameters']:
            try:
                calc = calculate(param['minimum'], param['maximum'], item['min_level'],
                                 item['max_level'], param['unit'], param['max_unit'])
                result['calculations'].append({**param, **calc})
                result['warnings'].extend(calc['warnings'])
            except ReviewError as exc:
                reasons.append(str(exc))
        if item['max_level'] > 1 and not item['parameters']:
            reasons.append('最小値・最大値取得不可（元文字列を参照）')
    matches = [m for m in mappings if m['source_name'] == item['name']]
    if len(matches) != 1:
        reasons.append('本能名のマッピングなし、または複数候補')
    else:
        mapping = matches[0]
        result['mapping'] = mapping
        for issue in mapping.get('source_issues', []):
            if issue['catid'] == identity.get('catid'):
                reasons.append(issue['reason'])
        if mapping.get('unresolved_reason'):
            reasons.append(mapping['unresolved_reason'])
        if mapping.get('provisional', True):
            result['warnings'].append('ユーザー指示で作成した仮マッピング（名称・パラメータ・追加/強化・適用攻撃順の目視確認が必要）')
        source = mapping['master_table']
        table, prefix = DESTINATIONS[source]
        result['table'] = table
        masters = [m for m in rows(db, source) if m[prefix + '_code'] == mapping['master_code']]
        if len(masters) != 1:
            reasons.append('対応マスタコード不一致または複数候補')
        else:
            master = masters[0]
            result['master'] = {'id': master[prefix + '_id'], 'name': master[prefix + '_name']}
            try:
                schema = master.get('parameter_schema') or '{}'
                schema = json.loads(schema) if isinstance(schema, str) else schema
                if not isinstance(schema, dict):
                    raise ValueError
            except (ValueError, TypeError):
                schema = {}
                reasons.append('parameter_schema JSON不正')
            values = {}
            if mapping.get('conversion') == 'attack_frequency_percent_to_frames':
                try:
                    if len(result['calculations']) != 1:
                        raise ReviewError('攻撃間隔短縮の数値範囲が一意でない')
                    result['calculations'] = [convert_frequency(result['calculations'][0], db, identity)]
                    result['warnings'].append('攻撃間隔短縮はユーザー指定の暫定式。ゲーム内部の正確な式は未確認')
                except (ReviewError, ValueError, TypeError, KeyError) as exc:
                    reasons.append(str(exc) if isinstance(exc, ReviewError) else '攻撃間隔短縮の変換データ不正')
            fully_parsed = False
            if mapping.get('conversion') == 'freeze_seconds_to_frames':
                try:
                    result['calculations'] = convert_freeze(item)
                    fully_parsed = True
                    result['warnings'] = [w for w in result['warnings'] if w != 'stepが小数（丸めなし）']
                except (ReviewError, ValueError, TypeError) as exc:
                    reasons.append(str(exc) if isinstance(exc, ReviewError) else '停止パラメータ変換不可')
            if mapping.get('conversion') in ('strengthen_all_parameters', 'surge_all_parameters', 'cost_down_standard_yen', 'move_speed_increase'):
                try:
                    result['calculations'] = convert_all_parameters(item, mapping['conversion'])
                    fully_parsed = True
                except (ReviewError, ValueError, TypeError) as exc:
                    reasons.append(str(exc) if isinstance(exc, ReviewError) else '複数パラメータ変換不可')
            keys = mapping['parameter_keys']
            if len(keys) != len(result['calculations']) or len(set(keys)) != len(keys):
                reasons.append('パラメータ特定不可（マッピングと抽出範囲数不一致）')
            else:
                for key, calc in zip(keys, result['calculations']):
                    definition = schema.get(key)
                    if not isinstance(definition, dict):
                        reasons.append('parameter_schemaにキーなし: ' + key)
                    elif definition.get('unit') != calc['unit']:
                        reasons.append('parameter_schemaと単位不一致: ' + key)
                    elif calc['base'] is None:
                        reasons.append('Lv1解放型の数値格納仕様未確認')
                    elif not isinstance(calc['base'], (int, float)) or not isinstance(calc['step'], (int, float)):
                        reasons.append('循環小数は丸めずSQL生成対象外')
                    elif definition.get('type') not in ('integer', 'number'):
                        reasons.append('未対応parameter_schema型: ' + key)
                    elif definition['type'] == 'integer' and any(not isinstance(v, int) for v in calc['levels'].values()):
                        reasons.append('parameter_schema integerと効果値が不整合: ' + key)
                    else:
                        values[key] = {'base': calc['base'], 'step': calc['step']}
            # Every master-defined parameter is mandatory, including constants.
            missing = sorted(set(schema) - set(values))
            result['schema_check'] = {'required_keys': sorted(schema),
                                      'present_keys': sorted(values), 'missing_keys': missing}
            if missing:
                reasons.append('parameter_schema必須キー不足: ' + ', '.join(missing))
            # Do not silently omit independent constants/probabilities/durations.
            remainder = '' if fully_parsed else RANGE.sub('', item['description'] or '')
            # Explicit reviewed phrases contain descriptive counts, not scaling parameters.
            for phrase in mapping.get('non_parameter_phrases', []):
                remainder = remainder.replace(phrase, '')
            if re.search(r'\d', remainder):
                reasons.append('範囲以外の数値パラメータあり（対応定義が必要）')
            if not keys and item['max_level'] != 1:
                reasons.append('解放型以外でパラメータなし')
            if source != 'effect_targets':
                if mapping.get('action') not in ('add', 'enhance'):
                    reasons.append('追加・強化action未定義')
                else:
                    values = {'action': mapping['action'], **values}
                result['parameter_values'] = values
            types = [r['value_id'] for r in rows(db, 'category_values') if r['group_id'] == '004'
                     and r['value_name'] == ('本能' if item['kind'] == '通常本能' else '超本能')]
            if len(types) != 1:
                reasons.append('本能区分マスタが一意でない')
            else:
                now = datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S')
                record = {'character_id': identity['character_id'], prefix + '_id': master[prefix + '_id'],
                          'talent_type': types[0], 'np_id': result['np_match']['np_id'],
                          'game_version_id': None, 'revision_group_id': None,
                          'is_active': '1', 'is_deleted': '0', 'created_at': now, 'updated_at': now,
                          'created_by': 'batch', 'updated_by': 'batch'}
                if source != 'effect_targets':
                    record.update(parameter_values=values, attack_order=mapping.get('attack_order'))
                # Live DDL contains only a surrogate PK, no natural UQ. Use a
                # conservative anti-duplicate identity across revisions: do not
                # propose a second row for an existing character/master/type.
                identity_keys = ['character_id', prefix + '_id', 'talent_type']
                existing = [r for r in rows(db, table) if all(r.get(k) == record[k] for k in identity_keys)]
                result['existing_rows'] = existing
                compare_keys = [k for k in record if k not in ('created_at', 'updated_at', 'created_by', 'updated_by')]
                differences = []
                for row in existing:
                    difference = {}
                    for key in compare_keys:
                        old = row.get(key)
                        if key == 'parameter_values' and isinstance(old, str):
                            try:
                                old = json.loads(old)
                            except ValueError:
                                pass
                        if old != record[key]:
                            difference[key] = {'existing': old, 'proposed': record[key]}
                    differences.append(difference)
                result['comparison'] = ('新規' if not existing else
                                        '既存データと一致' if all(not d for d in differences) else '既存データと不一致')
                result['diff'] = differences or None
                if len(existing) > 1:
                    result['warnings'].append('同一キャラクター・本能・区分の既存行が複数（全行を比較）')
                if result['comparison'] == '既存データと不一致':
                    result['warnings'].append('既存データと不一致。上書き・INSERTは生成しません')
                if 'form_id' in db.get(table, {}).get('ddl', ''):
                    reasons.append('適用形態不明')
                if not reasons:
                    try:
                        sql = build_insert(table, record, db.get(table, {}).get('columns') or [], identity_keys)
                        result['registration'] = record
                        if not existing:
                            result['sql'] = sql
                    except ReviewError as exc:
                        reasons.append(str(exc))
    result['status'] = '未解決' if reasons else ('警告' if result['warnings'] else '正常')
    if reasons:
        result['comparison'] = '未解決'
    return result


def build_insert(table, record, columns, identity_keys):
    """Pure SQL renderer for fully resolved records; never connects or executes.

    Caller supplies explicit identity keys and DDL metadata. Revision IDs
    are NULL under the user-approved trial policy.
    """
    if table not in {t for t, _ in DESTINATIONS.values()}:
        raise ReviewError('登録先テーブル未対応')
    metadata = {c['Field']: c for c in columns}
    if not identity_keys or not set(identity_keys) <= record.keys() or not record.keys() <= metadata.keys():
        raise ReviewError('SQLカラムまたは重複識別キー不正')
    for name, col in metadata.items():
        if col['Null'] == 'NO' and col['Default'] is None and 'auto_increment' not in col['Extra']:
            if record.get(name) is None:
                raise ReviewError('必須カラム不足: ' + name)
    def literal(value):
        if value is None:
            return 'NULL'
        if isinstance(value, (dict, list)):
            value = json.dumps(value, ensure_ascii=False, separators=(',', ':'), allow_nan=False)
        if isinstance(value, (int, float)):
            return json.dumps(value, allow_nan=False)
        if not re.search(r'[\\\x00-\x1f]', str(value)):
            return "'" + str(value).replace("'", "''") + "'"
        # Hex UTF-8 avoids SQL-mode-dependent backslash escaping.
        return "CONVERT(X'" + str(value).encode('utf-8').hex() + "' USING utf8mb4)"
    fields = ', '.join('`' + k + '`' for k in record)
    values = ', '.join(literal(v) for v in record.values())
    where = ' AND '.join(f'`{k}` <=> {literal(record[k])}' for k in identity_keys)
    return f'INSERT INTO `{table}` ({fields}) SELECT {values} WHERE NOT EXISTS (SELECT 1 FROM `{table}` WHERE {where});'


def report(raw, identity, results, summary, errors):
    lines = ['# 本能・超本能 目視確認レポート', '', f"取得元: {raw['source_url']}",
             f"取得日時: {raw['fetched_at']}", '',
             f"キャラクター名: {identity.get('character_name')}",
             f"全形態名: {' / '.join(identity['form_names'])}",
             f"catid: {raw['catid']} / character_id: {identity['character_id']}",
             f"形態名照合: {identity['status']}", '',
             'DBは参照のみ。登録予定JSONがnullの項目はINSERT対象外。計算値と登録可能な値を区別しています。', '',
             '## 集計', '', '```json', dumps(summary), '```', '',
             '## 取得・照合結果', '',
             '| 区分 | 本能 | マスタID・名称 | キー | Lv | 効果範囲（変換後） | base / step | NP ID / 各Lv | テーブル | parameter_values（候補） | 判定 / 既存比較 |',
             '|---|---|---|---|---|---|---|---|---|---|---|']
    def cell(v):
        return str(v).replace('|', '\\|').replace('\n', '<br>')
    for r in results:
        s = r['source']
        values = [s['kind'], s['name'], r['master'], ', '.join((r['parameter_values'] or {}).keys()),
                  f"{s['min_level']}〜{s['max_level']}",
                  '; '.join(f"{p['minimum']}〜{p['maximum']}{p['unit'] or ''}" for p in r['calculations']),
                  '; '.join(f"{p['base']} / {p['step']}" for p in r['calculations']),
                  f"{r['np_match']['np_id']} / {s['np_costs']}", r['table'], r['parameter_values'],
                  r['status'] + ' / ' + r['comparison']]
        lines.append('| ' + ' | '.join(cell(v) for v in values) + ' |')
    for r in results:
        s = r['source']
        lines += ['', f"## {s['kind']}: {s['name']}", '', '元文字列:', '', '```text', s['original_text'], '```',
                  '', '抽出端点・単位・計算過程・Lv1〜最大Lv（Lv0は未解放）:', '',
                  '```json', dumps(r['calculations']), '```', '',
                  'NP照合:', '```json', dumps(r['np_match']), '```', '',
                  'DB登録予定JSON:', '```json', dumps(r['registration']), '```', '',
                  '既存比較・差分:', '```json', dumps({'comparison': r['comparison'], 'diff': r['diff'],
                  'existing_rows': r.get('existing_rows', [])}), '```', '',
                  '未解決・警告理由:', *['- ' + e for e in r['reasons'] + r['warnings']]]
    if errors:
        lines += ['', '## 実行エラー', '', *['- ' + e for e in errors]]
    return '\n'.join(lines) + '\n'


def excel_review(raw, identity, results, errors):
    """Tab-separated plain text: one physical line per talent for Excel paste."""
    headers = ['確認結果（記入用）', '修正メモ（記入用）', '区分', 'サイト本能名',
               'DBマスタ名', 'マスタID', 'サイト説明', '最小Lv', '最大Lv',
               '最小効果値（変換後）', '最大効果値（変換後）', '単位（変換後）', 'base', 'step', 'パラメータキー',
               'NP ID', 'NP合計（サイト）', 'NP照合',
               *[f'NP Lv{i}' for i in range(1, 11)],
               '判定', '警告・未解決理由', '既存比較', 'INSERT生成', '登録先テーブル',
               'parameter_values', '既存差分', 'キャラクター名', 'catid', 'character_id',
               '全形態名', '形態名照合', '取得日時', '取得元URL', '攻撃頻度計算（形態別・各Lv）']
    def cell(value):
        if value is None:
            return ''
        if isinstance(value, (dict, list)):
            value = json.dumps(value, ensure_ascii=False, separators=(',', ':'), allow_nan=False)
        value = str(value).replace('\t', ' ').replace('\r', ' ').replace('\n', ' ')
        # Prevent source text from being interpreted as an Excel formula.
        if value.lstrip().startswith(('=', '+', '-', '@')):
            value = "'" + value
        return value
    lines = ['\t'.join(headers)]
    for r in results:
        source = r['source']
        calculations = r['calculations']
        def joined(key):
            return ' / '.join(str(c[key]) for c in calculations if c.get(key) is not None)
        costs = source.get('np_costs') or []
        params = r.get('parameter_values') or {}
        master = r.get('master') or {}
        values = ['', '', source['kind'], source['name'], master.get('name'), master.get('id'),
                  source.get('description'), source.get('min_level'), source.get('max_level'),
                  joined('minimum'), joined('maximum'), joined('unit'), joined('base'), joined('step'),
                  ' / '.join(k for k in params if k != 'action'), r['np_match']['np_id'],
                  source.get('np_total'), r['np_match']['status'],
                  *[costs[i] if i < len(costs) else None for i in range(10)],
                  r['status'], ' / '.join(r['warnings'] + r['reasons']), r['comparison'],
                  'あり' if r.get('sql') else 'なし', r['table'], r.get('parameter_values'), r.get('diff'),
                  identity.get('character_name'), raw['catid'], identity.get('character_id'),
                  ' / '.join(identity['form_names']), identity['status'], raw['fetched_at'], raw['source_url'],
                  [c['frequency_preview'] for c in calculations if 'frequency_preview' in c] or None]
        lines.append('\t'.join(cell(v) for v in values))
    for error in errors:
        values = [''] * len(headers)
        values[headers.index('判定')] = '実行エラー'
        values[headers.index('警告・未解決理由')] = error
        lines.append('\t'.join(cell(v) for v in values))
    return '\n'.join(lines) + '\n'


def run(args):
    output = args.output_dir / f'catid_{args.catid}'
    output.mkdir(parents=True, exist_ok=True)
    raw = {'source_url': ORIGIN + f'cats1.php?catid={args.catid}&lang=ja',
           'fetched_at': datetime.now(timezone.utc).isoformat(), 'catid': args.catid,
           'source_mode': 'saved_html' if args.html else 'live', 'form_names': [], 'talents': []}
    errors, db, results = [], {}, []
    identity = {'character_id': None, 'character_name': None, 'status': '未照合', 'form_names': []}
    try:
        html = args.html.read_text(encoding='utf-8') if args.html else Fetcher(args.interval, args.retries).fetch(args.catid, output)
        (output / 'source.html').write_text(html, encoding='utf-8')
        forms, talents, parse_errors = parse_page(html, args.catid)
        raw.update(form_names=forms, talents=talents)
        errors.extend(parse_errors)
    except (ReviewError, requests.RequestException, UnicodeError, OSError) as exc:
        errors.append(str(exc) if isinstance(exc, ReviewError) else '取得失敗: ' + type(exc).__name__)
    try:
        db = json.loads(args.db_snapshot.read_text(encoding='utf-8')) if args.db_snapshot else read_db()
        # Dates/decimals in driver results are evidence, not numerical effect inputs.
        db = json.loads(json.dumps(db, ensure_ascii=False, default=str))
        identity = match_character(raw['form_names'], db)
        (output / 'schema_snapshot.json').write_text(dumps({k: {'ddl': v['ddl'], 'columns': v.get('columns')} for k, v in db.items()}), encoding='utf-8')
    except (ReviewError, pymysql.MySQLError, ValueError, OSError, KeyError) as exc:
        errors.append(str(exc) if isinstance(exc, ReviewError) else 'DB参照失敗: ' + type(exc).__name__)
        identity['form_names'] = raw['form_names']
    try:
        mappings = json.loads(args.mappings.read_text(encoding='utf-8'))
        if not isinstance(mappings, list) or any(not isinstance(m, dict) or
                not isinstance(m.get('source_name'), str) or m.get('master_table') not in DESTINATIONS or
                not isinstance(m.get('master_code'), str) or not isinstance(m.get('parameter_keys'), list) or
                any(not isinstance(k, str) for k in m['parameter_keys']) for m in mappings):
            raise ValueError
    except (ValueError, OSError):
        mappings = []
        errors.append('マッピングファイル読込・JSON構造エラー')
    identity['catid'] = args.catid
    counts = Counter((t['kind'], t['name']) for t in raw['talents'])
    for item in raw['talents']:
        r = normalize(item, db, identity, counts[(item['kind'], item['name'])] > 1, mappings)
        if errors:
            r['reasons'].extend(errors)
            r['status'] = '未解決'
            r['registration'] = None
            r['sql'] = None
        results.append(r)
    raw['identity'] = identity
    normalized = [r for r in results if r['status'] != '未解決']
    unresolved = [r for r in results if r['status'] == '未解決']
    summary = {'fetched_at': raw['fetched_at'], 'catid': args.catid, 'character_id': identity['character_id'],
               'normal_count': sum(r['source']['kind'] == '通常本能' for r in results),
               'super_count': sum(r['source']['kind'] == '超本能' for r in results),
               'converted_count': len(normalized), 'warning_count': sum(bool(r['warnings']) for r in results),
               'unresolved_count': len(unresolved), 'sql_count': sum(bool(r['sql']) for r in normalized),
               'normal_converted_count': sum(r['status'] == '正常' for r in results),
               'np_matched_count': sum(r['np_match']['np_id'] is not None for r in results),
               'errors': errors, 'fetch_succeeded': bool(raw['form_names']),
               'db_source': str(args.db_snapshot) if args.db_snapshot else 'live_read_only'}
    outputs = {'talents_raw.json': raw, 'talents_normalized.json': normalized,
               'talents_unresolved.json': {'items': unresolved, 'errors': errors}, 'talents_summary.json': summary}
    for filename, data in outputs.items():
        (output / filename).write_text(dumps(data) + '\n', encoding='utf-8')
    (output / 'talents_insert.sql').write_text('-- REVIEW ONLY: DBへの実行は禁止。\n-- 版・改訂IDはユーザー指定によりNULL。仮マッピングは要目視確認。\n-- DDLに自然キーUQなし。同時実行の重複防止を保証するものではありません。\n' + '\n'.join(r['sql'] for r in normalized if r['sql']) + '\n', encoding='utf-8')
    (output / 'talents_review.md').write_text(report(raw, identity, results, summary, errors), encoding='utf-8')
    (output / 'talents_review_excel.txt').write_text(excel_review(raw, identity, results, errors), encoding='utf-8-sig')
    print(dumps(summary))
    print('出力: ' + str(output))
    return 2 if errors else (1 if unresolved else 0)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--catid', required=True, type=int)
    parser.add_argument('--output-dir', type=Path, default=HERE / 'output')
    parser.add_argument('--html', type=Path, help='保存HTMLを再検証（ネットワーク取得なし）')
    parser.add_argument('--db-snapshot', type=Path, help='参照済みDDL・マスタJSONを再検証')
    parser.add_argument('--mappings', type=Path, default=HERE / 'mappings.json')
    parser.add_argument('--interval', type=float, default=2)
    parser.add_argument('--retries', type=int, default=2)
    args = parser.parse_args()
    if args.catid < 0 or not 0 <= args.retries <= 3 or not 1 <= args.interval <= 60:
        parser.error('catid>=0, retries=0..3, interval=1..60 を指定してください')
    return run(args)


if __name__ == '__main__':
    raise SystemExit(main())
