"""画像照合PoC。スコアは正解確率ではなく、グレースケールの相関係数。"""
import argparse
import base64
import csv
import html
import json
from datetime import datetime
from pathlib import Path

import cv2
import numpy as np


def read_image(path):
    data = np.frombuffer(Path(path).read_bytes(), np.uint8)
    image = cv2.imdecode(data, cv2.IMREAD_COLOR) if data.size else None
    if image is None:
        raise ValueError(f"画像を読み込めません: {path}")
    return image


def normalize(image):
    if image is None or min(image.shape[:2]) < 12:
        raise ValueError("照合画像は縦横12px以上必要です")
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    h, w = gray.shape
    # 外枠が一致するだけで高得点になるのを避ける。色差にも依存しない。
    dx, dy = max(1, round(w * .08)), max(1, round(h * .08))
    return cv2.GaussianBlur(cv2.resize(gray[dy:h-dy, dx:w-dx], (96, 72)), (3, 3), 0)


def similarity(a, b):
    if np.std(a) < 2 or np.std(b) < 2:
        return 0.0
    # 小さな切り出し位置の差を許容。余白で埋めず、重なる領域同士を比べる。
    best = -1.0
    for dy in range(-3, 4):
        for dx in range(-3, 4):
            h, w = a.shape
            aa = a[max(0, dy):min(h, h+dy), max(0, dx):min(w, w+dx)].astype(float)
            bb = b[max(0, -dy):min(h, h-dy), max(0, -dx):min(w, w-dx)].astype(float)
            aa -= aa.mean()
            bb -= bb.mean()
            denom = np.linalg.norm(aa) * np.linalg.norm(bb)
            score = float(np.sum(aa * bb) / denom) if denom else 0.0
            best = max(best, score)
    return best


def load_master(path):
    path = Path(path)
    with path.open(encoding='utf-8-sig', newline='') as f:
        reader = csv.DictReader(f)
        required = {'form_id', 'character_id', 'name', 'icon_path'}
        if not required.issubset(reader.fieldnames or []):
            raise ValueError('マスターCSVの必須列が不足しています')
        rows = list(reader)
    if not rows:
        raise ValueError('マスターが空です')
    seen = set()
    for row in rows:
        if any(not row.get(k) for k in required) or row['form_id'] in seen:
            raise ValueError('マスターに空欄または重複form_idがあります')
        seen.add(row['form_id'])
        row['path'] = path.parent / row['icon_path']
        row['normalized'] = normalize(read_image(row['path']))
    return rows


def rank(image, masters):
    query = normalize(image)
    results = [{'form_id': m['form_id'], 'character_id': m['character_id'],
                'name': m['name'], 'score': similarity(query, m['normalized'])}
               for m in masters]
    return sorted(results, key=lambda item: item['score'], reverse=True)


def thumbnail(path):
    success, encoded = cv2.imencode('.png', read_image(path))
    if not success:
        raise ValueError(f'プレビューを作成できません: {path}')
    return '<img width="110" src="data:image/png;base64,' + base64.b64encode(encoded).decode() + '">'


def classify(candidates, threshold=.8, margin=.1, review_threshold=.6):
    """低スコアを先に判定し、低得点同士の接戦を複数候補にしない。"""
    if not 0 <= review_threshold <= threshold <= 1 or not 0 <= margin <= 2:
        raise ValueError('0 <= review_threshold <= threshold <= 1、0 <= margin <= 2 が必要です')
    gap = candidates[0]['score'] - candidates[1]['score'] if len(candidates) > 1 else None
    if candidates[0]['score'] < review_threshold:
        return '不明', gap
    if candidates[0]['score'] < threshold:
        return '要確認', gap
    if gap is not None and gap < margin:
        return '複数候補', gap
    return '一致候補', gap


def compare(paths, masters, destination, threshold=.8, margin=.1, review_threshold=.6):
    destination.mkdir(parents=True, exist_ok=False)
    records, table = [], []
    by_id = {m['form_id']: m for m in masters}
    for path in paths:
        candidates = rank(read_image(path), masters)
        status, gap = classify(candidates, threshold, margin, review_threshold)
        top = candidates[:3]
        records.append({'file': str(path.resolve()), 'status': status, 'gap': gap, 'candidates': top})
        cells = ''.join('<td>' + thumbnail(by_id[c['form_id']]['path']) + '<br>' + html.escape(c['name']) + f"<br>{c['score']:.3f}</td>" for c in top)
        table.append('<tr><td>' + thumbnail(path) + '<br>' + html.escape(path.name) + '</td><td>' + status + '</td>' + cells + '</tr>')
        shown = top[:2] if status == '複数候補' else top[:1]
        summary = ' / '.join(f"第{i}候補: {c['name']} ({c['score']:.3f})" for i, c in enumerate(shown, 1))
        if status == '不明':
            summary = f"最高スコア: {top[0]['score']:.3f}（該当候補なし）"
        difference = f" / スコア差: {gap:.3f}" if status == '複数候補' else ''
        print(f"{path.name}: {status} / {summary}{difference}")
    payload = {'method': 'grayscale_shifted_ncc_v1', 'threshold': threshold, 'review_threshold': review_threshold, 'margin': margin,
               'master_count': len(masters), 'note': 'スコアは確率ではありません。一致候補は自動判定の候補です。', 'results': records}
    (destination/'matches.json').write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding='utf-8')
    with (destination/'matches.csv').open('w', encoding='utf-8-sig', newline='') as f:
        writer = csv.writer(f)
        writer.writerow(['file', 'status', 'rank', 'character_id', 'form_id', 'name', 'score'])
        for r in records:
            for i, c in enumerate(r['candidates'], 1):
                writer.writerow([r['file'], r['status'], i, c['character_id'], c['form_id'], c['name'], c['score']])
    (destination/'comparison.html').write_text('<!doctype html><html lang="ja"><meta charset="utf-8"><title>キャラ照合</title><style>body{font-family:sans-serif;padding:24px}td,th{border:1px solid #ccc;padding:12px}table{border-collapse:collapse}img{height:85px;object-fit:contain}</style><h1>キャラ照合結果</h1><p>スコアは確率ではありません。未登録・別形態の場合も候補が出ます。複数候補は候補を選択し、要確認は画像とマスターを確認してください。不明の行は該当候補なしです。候補欄は比較用の参考順位です。</p><table><tr><th>入力</th><th>判定</th>' + ''.join(f'<th>候補{i}</th>' for i in range(1,min(3,len(masters))+1)) + '</tr>' + ''.join(table) + '</table></html>', encoding='utf-8')
    return records


def main():
    parser = argparse.ArgumentParser(description='切り出し画像とマスターを比較して上位3候補を保存')
    parser.add_argument('input', type=Path, help='画像1枚、またはcharacter_*.pngを含む切り出しフォルダ')
    parser.add_argument('--master', type=Path, default=Path('data/forms.csv'))
    parser.add_argument('--output', type=Path, default=Path('output'))
    parser.add_argument('--threshold', type=float, default=.8)
    parser.add_argument('--review-threshold', type=float, default=.6, help='要確認と不明の境界（既定: 0.6）')
    parser.add_argument('--margin', type=float, default=.1)
    args = parser.parse_args()
    if not 0 <= args.review_threshold <= args.threshold <= 1 or not 0 <= args.margin <= 2:
        parser.error('0 <= review-threshold <= threshold <= 1、marginは0〜2で指定してください')
    try:
        paths = sorted(args.input.glob('character_*.png')) if args.input.is_dir() else [args.input]
        if not paths:
            raise ValueError('character_*.pngが見つかりません')
        masters = load_master(args.master)
        destination = args.output / f'matching_{datetime.now():%Y%m%d_%H%M%S_%f}'
        compare(paths, masters, destination, args.threshold, args.margin, args.review_threshold)
        print(f'比較数: {len(paths)} / マスター: {len(masters)}\n保存先: {destination.resolve()}')
        return 0
    except (OSError, ValueError, cv2.error) as error:
        print(f'エラー: {error}')
        return 1


if __name__ == '__main__':
    raise SystemExit(main())
