"""輪郭と繰り返し配置を利用した検出。ゲーム固有の座標は使用しない。"""

from dataclasses import dataclass

import cv2
import numpy as np


@dataclass(frozen=True)
class Box:
    x: int
    y: int
    width: int
    height: int


def _overlap(a: Box, b: Box) -> float:
    intersection = max(0, min(a.x + a.width, b.x + b.width) - max(a.x, b.x)) * max(
        0, min(a.y + a.height, b.y + b.height) - max(a.y, b.y)
    )
    return intersection / min(a.width * a.height, b.width * b.height)


def detect_frames(image: np.ndarray, min_group: int = 3) -> list[Box]:
    """同程度の大きさ・行/列配置を持つ矩形を返す（未検証の候補）。

    幅高さ比0.6〜1.65、短辺の4〜42%の枠が対象。部分的に隠れた枠は
    推測で補わない。実画像による調整前の汎用的な初期条件として扱う。
    """
    if image is None or image.size == 0:
        raise ValueError("画像が空です")
    if min_group < 2:
        raise ValueError("min_groupは2以上にしてください")
    original_h, original_w = image.shape[:2]
    # 解像度によって輪郭近似やモルフォロジー処理の強さが変わらないようにする。
    scale = min(1.0, 1600 / max(original_h, original_w))
    resized = cv2.resize(image, (round(original_w * scale), round(original_h * scale)))
    h, w = resized.shape[:2]
    gray = cv2.cvtColor(resized, cv2.COLOR_BGR2GRAY)
    gray = cv2.GaussianBlur(gray, (3, 3), 0)
    # 弱い枠線と強い枠線を両方拾い、後段で重複と孤立した矩形を除去する。
    candidates: list[Box] = []
    for low, high in ((35, 100), (75, 180)):
        edges = cv2.Canny(gray, low, high)
        edges = cv2.morphologyEx(edges, cv2.MORPH_CLOSE, np.ones((3, 3), np.uint8))
        contours, _ = cv2.findContours(edges, cv2.RETR_LIST, cv2.CHAIN_APPROX_SIMPLE)
        for contour in contours:
            perimeter = cv2.arcLength(contour, True)
            polygon = cv2.approxPolyDP(contour, 0.025 * perimeter, True)
            if not 4 <= len(polygon) <= 8 or not cv2.isContourConvex(polygon):
                continue
            x, y, bw, bh = cv2.boundingRect(contour)
            if not (0.6 <= bw / bh <= 1.65):
                continue
            if not (min(h, w) * 0.04 <= min(bw, bh) and max(bw, bh) <= min(h, w) * 0.42):
                continue
            if cv2.contourArea(contour) / (bw * bh) < 0.78:
                continue
            # 画面端で途切れたカードは完全なアイコンとして保存しない。
            if x <= 1 or y <= 1 or x + bw >= w - 1 or y + bh >= h - 1:
                continue
            candidates.append(Box(x, y, bw, bh))

    unique: list[Box] = []
    for candidate in sorted(candidates, key=lambda b: b.width * b.height, reverse=True):
        if not any(_overlap(candidate, kept) > 0.8 for kept in unique):
            unique.append(candidate)

    groups = []
    for seed in unique:
        similar = [b for b in unique if abs(b.width / seed.width - 1) < 0.18
                   and abs(b.height / seed.height - 1) < 0.18]
        # サイズだけ一致した背景装飾を除くため、同じ行または列の仲間を求める。
        aligned = [a for a in similar if any(a != b and (
            abs((a.y + a.height / 2) - (b.y + b.height / 2)) < seed.height * 0.15
            or abs((a.x + a.width / 2) - (b.x + b.width / 2)) < seed.width * 0.15
        ) for b in similar)]
        if len(aligned) >= min_group:
            groups.append(aligned)
    if not groups:
        return []
    # 支配的な繰り返しサイズを採用する。別サイズのUIボタン混入を抑える。
    selected = max(groups, key=lambda group: (len(group), np.median([b.width * b.height for b in group])))
    rows: list[list[Box]] = []
    for box in sorted(selected, key=lambda b: (b.y + b.height / 2, b.x)):
        if rows and abs(box.y - np.median([b.y for b in rows[-1]])) < box.height * 0.25:
            rows[-1].append(box)
        else:
            rows.append([box])
    result = []
    for row in rows:
        for b in sorted(row, key=lambda b: b.x):
            x, y = round(b.x / scale), round(b.y / scale)
            right = min(original_w, round((b.x + b.width) / scale))
            bottom = min(original_h, round((b.y + b.height) / scale))
            result.append(Box(x, y, right - x, bottom - y))
    return result
