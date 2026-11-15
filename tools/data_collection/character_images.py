"""公開一覧の形態名を実DBと照合し、PNGと画像参照を登録する。"""

import csv
import hashlib
import os
import time
import tempfile
import unicodedata
from collections import Counter, defaultdict
from datetime import datetime, timezone
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urljoin, urlsplit
from urllib.request import Request, urlopen
from urllib.robotparser import RobotFileParser

import click
import cv2
import numpy as np
from sqlalchemy import MetaData, Table, create_engine, inspect, select, text, update

from dotenv import load_dotenv

from app.config import database_url_from_env

SOURCE = 'https://battlecats.anypupil.com/catsuni.php?page=all&lang=ja'
AGENT = 'BattleCatsSimulatorImageBatch/1.0'
ROOT = Path(__file__).resolve().parents[2]


def normalize(value):
    return unicodedata.normalize('NFKC', value).strip()


class Node:
    def __init__(self, tag='', attrs=()):
        self.tag, self.attrs, self.children, self.parts = tag, dict(attrs), [], []

    def find(self, class_name):
        result = []
        for child in self.children:
            if class_name in child.attrs.get('class', '').split():
                result.append(child)
            result.extend(child.find(class_name))
        return result

    def content(self):
        return ''.join(self.parts).strip()


class CatalogParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.root = Node()
        self.stack = [self.root]

    def handle_starttag(self, tag, attrs):
        node = Node(tag, attrs)
        self.stack[-1].children.append(node)
        if tag not in {'img', 'br', 'hr', 'input', 'meta', 'link', 'source', 'wbr', 'area', 'base', 'embed', 'param', 'col', 'track'}:
            self.stack.append(node)

    def handle_endtag(self, tag):
        for index in range(len(self.stack) - 1, 0, -1):
            if self.stack[index].tag == tag:
                del self.stack[index:]
                break

    def handle_data(self, data):
        for node in self.stack:
            node.parts.append(data)


def parse_catalog(html):
    parser = CatalogParser()
    parser.feed(html)
    entries = []
    for card in parser.root.find('catalog-card'):
        images = card.find('catalog-form-tile__image')
        rows = card.find('catalog-card__form-name-row')
        if not images or len(images) != len(rows):
            raise ValueError('一覧HTMLの形態画像と名称の構造が一致しません')
        for image, row in zip(images, rows):
            indices = row.find('catalog-card__form-name-index')
            titles = row.find('catalog-card__form-name-title')
            if len(indices) != 1 or len(titles) != 1:
                raise ValueError('形態番号・名称を取得できません')
            number = int(indices[0].content().removeprefix('形態').strip())
            names = [child.content() for child in titles[0].children if child.tag == 'span' and child is not indices[0]]
            name = image.attrs.get('alt', '')
            if len(names) != 1 or not name or normalize(names[0]) != normalize(name) or number not in range(1, 5):
                raise ValueError('形態名・番号が不整合です')
            source = image.attrs.get('src')
            if not source:
                raise ValueError('画像URLがありません')
            entries.append({'source_character_name': '', 'source_form_name': name,
                            'source_image_url': urljoin(SOURCE, source), 'source_form_number': number})
    if not entries:
        raise ValueError('取得対象がありません。HTML構造を確認してください')
    return entries


class Downloader:
    def __init__(self, interval):
        self.interval, self.last, self.robots = interval, 0, None

    def read(self, url, limit):
        if urlsplit(url).scheme != 'https' or urlsplit(url).netloc != urlsplit(SOURCE).netloc:
            raise ValueError('取得元以外のURLは取得しません')
        if self.robots and not self.robots.can_fetch(AGENT, url):
            raise ValueError('robots.txtにより取得が禁止されています')
        time.sleep(max(0, self.last + self.interval - time.monotonic()))
        self.last = time.monotonic()
        with urlopen(Request(url, headers={'User-Agent': AGENT}), timeout=30) as response:
            if urlsplit(response.url).netloc != urlsplit(SOURCE).netloc:
                raise ValueError('別サイトへの転送は未対応です')
            data = response.read(limit + 1)
        if len(data) > limit:
            raise ValueError('取得サイズ上限を超えました')
        return data

    def load_rules(self):
        url = urljoin(SOURCE, '/robots.txt')
        rules = RobotFileParser()
        rules.parse(self.read(url, 1024 * 1024).decode('utf-8').splitlines())
        self.robots = rules
        self.interval = max(self.interval, rules.crawl_delay(AGENT) or 0)
        rate = rules.request_rate(AGENT)
        if rate:
            self.interval = max(self.interval, rate.seconds / rate.requests)


def register_image(connection, forms, assets, target, png, source, directory):
    # 行ロック後に再確認するため、取得中に画像が設定されても上書きしない。
    form = connection.execute(select(forms).where(forms.c.form_id == target['form_id']).with_for_update()).mappings().one()
    if form['is_deleted'] != '0' or any(form[key] != target[key] for key in ('character_id', 'form_number', 'form_name')):
        raise ValueError('処理中に形態情報が変更されました')
    if form['image_id'] is not None:
        return 'registered_skip', form['image_id']
    key = f"allies/af_md_{form['character_id']}_{form['form_number']}.png"
    path = directory / Path(key).name
    digest = hashlib.sha256(png).hexdigest()
    existing = connection.execute(select(assets).where(assets.c.storage_key == key).with_for_update()).mappings().first()
    if existing and (existing['is_deleted'] != '0' or existing['sha256'] != digest):
        raise ValueError('保存キーの既存登録と取得画像が競合しています')
    # exclusive作成。DB失敗時のファイルは残し、再実行時に一致を検証して回復する。
    with tempfile.NamedTemporaryFile(dir=directory, prefix='.image-', delete=False) as stream:
        temporary = Path(stream.name)
        try:
            stream.write(png)
            stream.flush()
            os.fsync(stream.fileno())
        except BaseException:
            temporary.unlink(missing_ok=True)
            raise
    try:
        # 完成したファイルだけを公開。同名ファイルは置換しない。
        try:
            os.link(temporary, path)
        except FileExistsError:
            if path.read_bytes() != png:
                raise ValueError('同名ファイルの内容が異なります。上書きしません') from None
    finally:
        temporary.unlink(missing_ok=True)
    saved = path.read_bytes()
    decoded = cv2.imdecode(np.frombuffer(saved, dtype=np.uint8), cv2.IMREAD_UNCHANGED)
    if decoded is None:
        raise ValueError('保存済みPNGを読み込めません')
    height, width = decoded.shape[:2]
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    if existing:
        image_id = existing['image_id']
    else:
        result = connection.execute(assets.insert().values(
            storage_key=key, sha256=hashlib.sha256(saved).hexdigest(), mime_type='image/png',
            image_width=width, image_height=height, byte_size=len(saved), source_image_url=source,
            is_deleted='0', created_at=now, created_by='batch', updated_at=now, updated_by='batch'))
        image_id = result.inserted_primary_key[0]
    connection.execute(update(forms).where(forms.c.form_id == form['form_id']).values(
        image_id=image_id, updated_at=now, updated_by='batch'))
    return 'success', image_id


@click.command('import-character-images')
@click.option('--interval', default=1.0, type=click.FloatRange(min=1), show_default=True,
              help='HTTPアクセス間隔（秒）。並列取得しません。')
@click.option('--image-dir', type=click.Path(path_type=Path), default=ROOT / 'images' / 'allies',
              help='allies画像の保存先。')
@click.option('--character-id', type=click.IntRange(min=1), default=None,
              help='指定したDBのcharacter_idの全形態を処理する。')
@click.option('--form-id', type=click.IntRange(min=1), default=None,
              help='指定したDBのform_idの1形態だけを処理する。')
@click.option('--log-file', type=click.Path(path_type=Path), default=None)
def import_character_images(interval, image_dir, log_file, form_id, character_id):
    """形態名の一意一致で画像を取得し、PNG保存・DB登録を行う。"""
    if form_id is not None and character_id is not None:
        raise click.UsageError('--form-idと--character-idは同時に指定できません')
    counts = Counter()
    log_file = log_file or ROOT / 'output' / f"character-images-{datetime.now(timezone.utc):%Y%m%dT%H%M%S%fZ}.csv"
    load_dotenv(ROOT / 'backend' / '.env', override=False)
    engine = create_engine(database_url_from_env(), pool_pre_ping=True)
    # 実テーブルを反映し、業務モデルやmigrationは新設しない。
    metadata = MetaData()
    try:
        tables = {name: Table(name, metadata, autoload_with=engine) for name in ('characters', 'forms', 'image_assets')}
        characters, forms, assets = (tables[name] for name in ('characters', 'forms', 'image_assets'))
        inspector = inspect(engine)
        if not any(index['unique'] and index['column_names'] == ['storage_key'] for index in inspector.get_indexes('image_assets')):
            raise ValueError('storage_keyの一意制約が必要です')
        with engine.connect() as check:
            storage_engines = check.execute(text("SELECT ENGINE FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME IN ('forms', 'image_assets')")).scalars().all()
            if len(storage_engines) != 2 or any(value.upper() != 'INNODB' for value in storage_engines):
                raise ValueError('トランザクション対応のInnoDBテーブルが必要です')
        # 同一DBに対する本バッチの同時実行を防止。接続を処理終了まで保持する。
        with engine.connect() as lock:
            if lock.execute(text("SELECT GET_LOCK('nyanko_character_images', 0)")).scalar() != 1:
                raise ValueError('別の画像取得バッチが実行中です')
            try:
                run_batch(engine, characters, forms, assets, interval, image_dir, log_file, counts, form_id, character_id)
            finally:
                lock.execute(text("SELECT RELEASE_LOCK('nyanko_character_images')"))
    except Exception as exc:
        # SQLAlchemy例外は接続情報やSQLパラメータを含みうるため表示しない。
        message = str(exc) if isinstance(exc, ValueError) else type(exc).__name__
        raise click.ClickException(f'バッチを停止しました: {message}') from None
    finally:
        engine.dispose()
        click.echo(f"対象 {counts['total']} / 登録成功 {counts['success']} / 登録済みスキップ {counts['registered_skip']} / 照合失敗 {counts['unmatched']} / エラー {counts['error']}")
        click.echo(f'ログ: {log_file}')


def run_batch(engine, characters, forms, assets, interval, image_dir, log_file, counts, form_id, character_id):
    downloader = Downloader(interval)
    downloader.load_rules()
    entries = parse_catalog(downloader.read(SOURCE, 20 * 1024 * 1024).decode('utf-8'))
    with engine.connect() as connection:
        rows = connection.execute(select(forms).join(characters, characters.c.character_id == forms.c.character_id).where(
            characters.c.is_deleted == '0', forms.c.is_deleted == '0')).mappings().all()
    names = defaultdict(list)
    for row in rows:
        names[normalize(row['form_name'])].append(dict(row))
    if form_id is not None or character_id is not None:
        targets = [row for row in rows if
                   (row['form_id'] == form_id if form_id is not None
                    else row['character_id'] == character_id)]
        if not targets:
            raise ValueError('指定IDの有効な形態が存在しません')
        selected = []
        for target in sorted(targets, key=lambda row: row['form_number']):
            matching_entries = [entry for entry in entries
                                if normalize(entry['source_form_name']) == normalize(target['form_name'])
                                and entry['source_form_number'] == target['form_number']]
            if len(matching_entries) != 1 or len(names[normalize(target['form_name'])]) != 1:
                raise ValueError(f"form_id={target['form_id']}を取得元とDBの間で一意に照合できません")
            selected.extend(matching_entries)
        entries = selected
    counts['total'] = len(entries)
    image_dir.mkdir(parents=True, exist_ok=True)
    log_file.parent.mkdir(parents=True, exist_ok=True)
    fields = ['source_character_name', 'source_form_name', 'source_image_url', 'source_form_number',
              'character_id', 'form_id', 'form_number', 'storage_key', 'image_id', 'result', 'error']
    with log_file.open('x', encoding='utf-8-sig', newline='') as stream:
        writer = csv.DictWriter(stream, fieldnames=fields)
        writer.writeheader()
        for entry in entries:
            record = dict(entry)
            try:
                matches = names[normalize(entry['source_form_name'])]
                if len(matches) != 1:
                    record.update(result='unmatched', error='形態名の一致なし' if not matches else '形態名の候補が複数あります')
                elif matches[0]['form_number'] != entry['source_form_number']:
                    record.update(result='unmatched', error='形態名は一致しましたが形態番号が異なります')
                else:
                    target = matches[0]
                    record.update({key: target[key] for key in ('character_id', 'form_id', 'form_number')})
                    record['storage_key'] = f"allies/af_md_{target['character_id']}_{target['form_number']}.png"
                    with engine.connect() as connection:
                        linked = connection.execute(select(forms.c.image_id).where(forms.c.form_id == target['form_id'])).scalar_one()
                    if linked is not None:
                        record.update(result='registered_skip', image_id=linked)
                    else:
                        raw = downloader.read(entry['source_image_url'], 10 * 1024 * 1024)
                        image = cv2.imdecode(np.frombuffer(raw, dtype=np.uint8), cv2.IMREAD_UNCHANGED)
                        if image is None:
                            raise ValueError('画像をデコードできません')
                        ok, encoded = cv2.imencode('.png', image)
                        if not ok:
                            raise ValueError('PNGへ変換できません')
                        with engine.begin() as connection:
                            result, image_id = register_image(connection, forms, assets, target, encoded.tobytes(), entry['source_image_url'], image_dir)
                        record.update(result=result, image_id=image_id)
            except Exception as exc:
                record.update(result='error', error=str(exc) if isinstance(exc, ValueError) else type(exc).__name__)
            counts[record['result']] += 1
            writer.writerow(record)
            stream.flush()


if __name__ == '__main__':
    import_character_images()
