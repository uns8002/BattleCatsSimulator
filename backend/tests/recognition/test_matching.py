import json
import tempfile
import unittest
from unittest.mock import patch
from contextlib import redirect_stdout
import io
from pathlib import Path

import cv2
import numpy as np

from app.recognition.matching import classify, compare, load_master, normalize, rank, similarity


class MatchingTests(unittest.TestCase):
    def setUp(self):
        rng = np.random.default_rng(10)
        self.images = [cv2.resize(rng.integers(0, 256, (12, 16, 3), dtype=np.uint8), (160, 120)) for _ in range(3)]
        self.masters = [{'form_id': str(i), 'character_id': str(i), 'name': f'候補{i}', 'normalized': normalize(im)} for i, im in enumerate(self.images)]

    def test_resized_jpeg_known_image(self):
        image = cv2.resize(self.images[1], (100, 75))
        _, encoded = cv2.imencode('.jpg', image, [cv2.IMWRITE_JPEG_QUALITY, 70])
        candidates = rank(cv2.imdecode(encoded, cv2.IMREAD_COLOR), self.masters)
        self.assertEqual(candidates[0]['form_id'], '1')
        self.assertGreater(candidates[0]['score'], .9)

    def test_blank_image_has_no_similarity(self):
        self.assertEqual(similarity(np.zeros((72, 96), np.uint8), self.masters[0]['normalized']), 0)

    def test_status_boundaries(self):
        for scores, expected in [([.992, .899], '複数候補'),
                                 ([.2, .19], '不明'),
                                 ([.5999, .1], '不明'),
                                 ([.6, .59], '要確認'),
                                 ([-.1, -.2], '不明'),
                                 ([.9, .5], '一致候補'),
                                 ([.8, .2], '一致候補'),
                                 ([.79, .1], '要確認'),
                                 ([.95], '一致候補')]:
            with self.subTest(scores=scores):
                self.assertEqual(classify([{'score': x} for x in scores])[0], expected)

    def test_custom_review_threshold(self):
        self.assertEqual(classify([{'score': .55}], review_threshold=.5)[0], '要確認')
        with self.assertRaises(ValueError):
            classify([{'score': .9}], review_threshold=.9)

    def test_master_validation_and_report(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            (root/'forms.csv').write_text('form_id,character_id,name,icon_path\n0,0,候補,icon.png\n', encoding='utf-8')
            cv2.imwrite(str(root/'icon.png'), self.images[0])
            masters = load_master(root/'forms.csv')
            results = compare([root/'icon.png'], masters, root/'result')
            # 単独候補もスコアが基準以上なら一致候補とする。
            self.assertEqual(results[0]['status'], '一致候補')
            self.assertEqual(len(json.loads((root/'result/matches.json').read_text())['results']), 1)
            self.assertIn('data:image/png;base64', (root/'result/comparison.html').read_text())
            candidates = [dict(form_id='0', character_id='0', name=name, score=score)
                          for name, score in [('りゅういち', .992), ('くにおくん', .899)]]
            console = io.StringIO()
            with patch('app.recognition.matching.rank', return_value=candidates), redirect_stdout(console):
                result = compare([root/'icon.png'], masters, root/'multiple')
            self.assertEqual(result[0]['status'], '複数候補')
            self.assertIn('第2候補: くにおくん (0.899)', console.getvalue())
            self.assertIn('複数候補', (root/'multiple/comparison.html').read_text())
            self.assertIn('複数候補', (root/'multiple/matches.csv').read_text(encoding='utf-8-sig'))
            (root/'forms.csv').write_text('name\ninvalid\n')
            with self.assertRaises(ValueError):
                load_master(root/'forms.csv')


if __name__ == '__main__':
    unittest.main()
