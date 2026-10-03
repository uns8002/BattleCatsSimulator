import argparse
import json
import sys
from dataclasses import asdict
from datetime import datetime
from pathlib import Path

import cv2
import numpy as np

from .detection import detect_frames


def save_image(path: Path, image: np.ndarray) -> None:
    # 日本語パスも扱えるようにバイト列として入出力する。
    success, data = cv2.imencode(".png", image)
    if not success:
        raise ValueError(f"画像を書き出せません: {path}")
    path.write_bytes(data.tobytes())


def main() -> int:
    parser = argparse.ArgumentParser(description="図鑑の矩形枠候補を検出してPNGに切り出します")
    parser.add_argument("image", type=Path, help="入力画像（PNG/JPEG推奨）")
    parser.add_argument("--output", type=Path, default=Path("output"))
    parser.add_argument("--min-group", type=int, default=3, help="同サイズの枠の最低数（2以上）")
    parser.add_argument("--inset", type=float, default=0, help="枠内側の切り詰め率（0〜0.2）")
    args = parser.parse_args()
    if args.min_group < 2 or not 0 <= args.inset <= 0.2:
        parser.error("--min-groupは2以上、--insetは0〜0.2で指定してください")
    try:
        data = np.frombuffer(args.image.read_bytes(), dtype=np.uint8)
        if not data.size:
            raise ValueError("入力ファイルが空です")
        image = cv2.imdecode(data, cv2.IMREAD_COLOR)
        if image is None:
            raise ValueError("画像を読み込めません。PNG/JPEGを使用してください")
        boxes = detect_frames(image, min_group=args.min_group)
        # 実行ごとに分け、前回の切り出しが今回の結果に混在するのを防ぐ。
        destination = args.output / f"{args.image.stem}_{datetime.now():%Y%m%d_%H%M%S_%f}"
        destination.mkdir(parents=True, exist_ok=False)
        annotated = image.copy()
        records = []
        for index, box in enumerate(boxes, 1):
            dx, dy = round(box.width * args.inset), round(box.height * args.inset)
            x, y = box.x + dx, box.y + dy
            width, height = box.width - 2 * dx, box.height - 2 * dy
            filename = f"character_{index:03d}.png"
            save_image(destination / filename, image[y:y + height, x:x + width])
            cv2.rectangle(annotated, (box.x, box.y), (box.x + box.width - 1, box.y + box.height - 1), (0, 0, 255), 2)
            cv2.putText(annotated, str(index), (box.x + 3, box.y + 20), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 0, 255), 2)
            records.append({"file": filename, "detected_box": asdict(box),
                            "crop_box": {"x": x, "y": y, "width": width, "height": height}})
        save_image(destination / "annotated.png", annotated)
        metadata = {"source": str(args.image.resolve()), "width": image.shape[1],
                    "height": image.shape[0], "count": len(boxes), "inset": args.inset,
                    "min_group": args.min_group, "frames": records}
        (destination / "detections.json").write_text(json.dumps(metadata, ensure_ascii=False, indent=2), encoding="utf-8")
        print(f"入力: {args.image}\n画像サイズ: {image.shape[1]} x {image.shape[0]}\n検出数: {len(boxes)}\n保存先: {destination.resolve()}")
        if not boxes:
            print("枠候補が見つかりませんでした。annotated.pngと実画像を確認して検出条件を調整してください。", file=sys.stderr)
            return 2
        return 0
    except (OSError, ValueError, cv2.error) as error:
        print(f"エラー: {error}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
