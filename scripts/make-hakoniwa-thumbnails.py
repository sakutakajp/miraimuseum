"""ブラウザ検証で撮った作品画像から一覧用WebPを生成する。
使い方: python3 scripts/make-hakoniwa-thumbnails.py test-results/evidence/thumbnails
依存: Pillow。元の3D描画の色・構図を保ち、外部画像は使用しない。
"""
from pathlib import Path
import sys
from PIL import Image

source = Path(sys.argv[1])
destination = Path("public/images/hakoniwa")
destination.mkdir(parents=True, exist_ok=True)
for slug in ["sand-pedestal", "nyc-diorama", "library-diorama", "dino-diorama", "electric-town-diorama"]:
    image = Image.open(source / f"{slug}.png").convert("RGB")
    image.save(destination / f"{slug}.webp", quality=88, method=6)
