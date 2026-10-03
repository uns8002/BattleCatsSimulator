"""合成画像による処理の回帰検証。実際の図鑑の精度を保証するものではない。"""

import unittest

import cv2
import numpy as np

from app.recognition.detection import detect_frames


def grid_image(scale=1.0):
    image = np.full((720, 1280, 3), 210, np.uint8)
    for y in (190, 340, 490):
        for x in (220, 390, 560, 730, 900):
            cv2.rectangle(image, (x, y), (x + 110, y + 110), (25, 25, 25), 3)
            cv2.circle(image, (x + 55, y + 55), 25, (100, 100, 100), -1)
    # 孤立した別サイズのUI要素は対象にしない。
    cv2.rectangle(image, (30, 30), (200, 85), (0, 0, 0), 3)
    return cv2.resize(image, None, fx=scale, fy=scale)


class DetectionTests(unittest.TestCase):
    def test_grid_across_resolutions(self):
        for scale in (0.6, 1.0, 2.0):
            with self.subTest(scale=scale):
                boxes = detect_frames(grid_image(scale))
                self.assertEqual(len(boxes), 15)
                for index, box in enumerate(boxes):
                    self.assertAlmostEqual((box.x + box.width / 2) / scale,
                                           275 + (index % 5) * 170, delta=4)
                    self.assertAlmostEqual((box.y + box.height / 2) / scale,
                                           245 + (index // 5) * 150, delta=4)

    def test_empty_background(self):
        self.assertEqual(detect_frames(np.full((720, 1280, 3), 200, np.uint8)), [])

    def test_invalid_group(self):
        with self.assertRaises(ValueError):
            detect_frames(grid_image(), min_group=1)


if __name__ == "__main__":
    unittest.main()
