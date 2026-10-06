#!/usr/bin/env python3
"""Build the locally bundled Earth textures from pinned, licensed geography.

Requires Python 3, Pillow and NumPy. The app/build never needs these packages or
network access: generated WebP files are checked in. Originals are cached outside
the repository. Relief and clouds are an art treatment, not scientific data.
"""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path
import urllib.request

import numpy as np
from PIL import Image, ImageDraw


WORLDWIND_REV = "5ffe2dfc54ab4d744fc9e587af9639c9910db228"
NATURAL_EARTH_REV = "ca96624a56bd078437bca8184e78163e5039ad19"
SOURCES = {
    "day.jpg": (
        f"https://raw.githubusercontent.com/NASAWorldWind/WebWorldWind/{WORLDWIND_REV}/images/BMNG_world.topo.bathy.200405.3.2048x1024.jpg",
        "7405c39a220bc37519474eba54625a0d1a02b6ad954895147c103a1bc8dd61fb",
    ),
    "night.png": (
        f"https://raw.githubusercontent.com/NASAWorldWind/WebWorldWind/{WORLDWIND_REV}/images/dnb_land_ocean_ice_2012.png",
        "c1893c1a97634f9d9dc45a62f83916c77cae742d5128551f8d7c4e4f5296ed36",
    ),
    "land.geojson": (
        f"https://raw.githubusercontent.com/nvkelso/natural-earth-vector/{NATURAL_EARTH_REV}/geojson/ne_50m_land.geojson",
        "e874b27a51d146452be360cafb3cc50c86001074a67d534113e6534682f9826b",
    ),
}
WIDTH, HEIGHT = 2048, 1024


def source(name: str, directory: Path) -> Path:
    url, expected = SOURCES[name]
    target = directory / name
    if not target.exists():
        with urllib.request.urlopen(url, timeout=45) as response:
            target.write_bytes(response.read())
    if hashlib.sha256(target.read_bytes()).hexdigest() != expected:
        raise ValueError(f"Source checksum differs: {target}")
    return target


def land_mask(path: Path) -> np.ndarray:
    """Rasterize actual Natural Earth coastlines with antialiased edges."""
    scale = 2
    canvas = Image.new("L", (WIDTH * scale, HEIGHT * scale), 0)
    draw = ImageDraw.Draw(canvas)
    data = json.loads(path.read_text())
    for feature in data["features"]:
        geometry = feature["geometry"]
        polygons = (
            [geometry["coordinates"]]
            if geometry["type"] == "Polygon"
            else geometry["coordinates"]
        )
        for polygon in polygons:
            for index, ring in enumerate(polygon):
                points = [
                    (
                        (lon + 180) / 360 * WIDTH * scale,
                        (90 - lat) / 180 * HEIGHT * scale,
                    )
                    for lon, lat, *_ in ring
                ]
                draw.polygon(points, fill=255 if index == 0 else 0)
    canvas = canvas.resize((WIDTH, HEIGHT), Image.Resampling.LANCZOS)
    return np.asarray(canvas, dtype=np.float32) / 255


def periodic_noise(
    x: np.ndarray, y: np.ndarray, frequency: int, seed: int
) -> np.ndarray:
    """Smooth periodic longitude noise; no crack at the texture wrap seam."""
    rng = np.random.default_rng(seed)
    grid = rng.random((frequency // 2 + 2, frequency), dtype=np.float32)
    px = np.mod(x, 1) * frequency
    py = np.clip(y, 0, 1) * (frequency // 2)
    ix, iy = np.floor(px).astype(int), np.floor(py).astype(int)
    fx, fy = px - ix, py - iy
    fx, fy = fx * fx * (3 - 2 * fx), fy * fy * (3 - 2 * fy)
    a = grid[iy, ix % frequency]
    b = grid[iy, (ix + 1) % frequency]
    c = grid[iy + 1, ix % frequency]
    d = grid[iy + 1, (ix + 1) % frequency]
    return (a + (b - a) * fx) * (1 - fy) + (c + (d - c) * fx) * fy


def cloud_coverage() -> Image.Image:
    """Authored, deterministic cirrus/jet-belt coverage, never weather data."""
    yy, xx = np.mgrid[0:512, 0:1024].astype(np.float32)
    x, y = xx / 1024, yy / 511
    latitude = (0.5 - y) * np.pi
    warp = periodic_noise(x, y, 16, 8106) - 0.5
    # Advection around latitude bands produces long folds rather than round cells.
    warped_x = x + 0.025 * np.sin(latitude * 7 + warp * 3)
    warped_y = y + 0.015 * (periodic_noise(x + 0.2, y, 12, 492) - 0.5)
    coarse = periodic_noise(warped_x, warped_y, 20, 341)
    medium = periodic_noise(warped_x + warp * 0.025, warped_y, 48, 883)
    fine = periodic_noise(warped_x, warped_y, 112, 714)
    wisps = periodic_noise(warped_x + warp * 0.01, warped_y, 224, 1026)
    field = coarse * 0.34 + medium * 0.27 + fine * 0.25 + wisps * 0.14
    belt = 0.018 * np.cos(latitude * 6) + 0.008 * np.sin(latitude * 17)
    cloud = np.clip((field + belt - 0.54) * 4.2, 0, 1)
    cloud *= 0.74 + 0.26 * medium
    # Polar coverage gently settles to avoid a singular noisy disk at each pole.
    polar_blend = np.clip((np.abs(latitude) - 1.36) / 0.2, 0, 1)
    cloud = cloud * (1 - polar_blend) + 0.06 * polar_blend
    return Image.fromarray(np.round(cloud * 255).astype(np.uint8))


def build(source_directory: Path, output: Path) -> None:
    source_directory.mkdir(parents=True, exist_ok=True)
    output.mkdir(parents=True, exist_ok=True)
    day = Image.open(source("day.jpg", source_directory)).convert("RGB")
    night = Image.open(source("night.png", source_directory)).convert("RGB")
    land = land_mask(source("land.geojson", source_directory))
    day.save(output / "day.webp", "WEBP", quality=87, method=6)

    color = np.asarray(day, dtype=np.float32) / 255
    red, green, blue = color[:, :, 0], color[:, :, 1], color[:, :, 2]
    # An illustrative relief field, with the real coast and real source color.
    # It must not be used as physical elevation or to deform the Earth outline.
    warmth = np.clip((red + green) * 0.65 - blue * 0.9, 0, 1)
    snow = np.clip((np.minimum(red, np.minimum(green, blue)) - 0.4) * 2, 0, 1)
    relief = land * np.clip(0.16 + 0.7 * warmth + 0.1 * snow, 0, 1)
    vegetation = land * np.clip((green - red * 0.76 - blue * 0.12) * 4, 0, 1)
    channels = np.stack([relief, vegetation, land], axis=-1)
    Image.fromarray(np.round(channels * 255).astype(np.uint8)).save(
        output / "relief.webp", "WEBP", lossless=True, method=6
    )

    # Remove the NASA night composite's blue basemap; retain the actual spatial
    # distribution and warm color of its measured lights as an emission texture.
    emission = np.asarray(night, dtype=np.float32) / 255
    luminance = (
        emission[:, :, 0] * 0.2126
        + emission[:, :, 1] * 0.7152
        + emission[:, :, 2] * 0.0722
    )
    light = np.clip((luminance - 0.085) / 0.26, 0, 1)
    warmth = np.clip(
        (emission[:, :, 0] + emission[:, :, 1]) * 0.5
        - emission[:, :, 2] * 0.7,
        0,
        1,
    )
    light *= np.clip(warmth * 7, 0, 1) * land
    rgb = np.stack([light, light * 0.74, light * 0.39], axis=-1)
    Image.fromarray(np.round(rgb * 255).astype(np.uint8)).save(
        output / "night.webp", "WEBP", quality=88, method=6
    )
    cloud_coverage().save(output / "clouds.webp", "WEBP", quality=88, method=6)
    for texture in sorted(output.glob("*.webp")):
        with Image.open(texture) as image:
            print(f"{texture.name}: {image.size}, {texture.stat().st_size:,} bytes")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--source-directory", type=Path, default=Path("/tmp/mirai-earth-sources")
    )
    parser.add_argument(
        "--output", type=Path, default=Path(__file__).resolve().parents[1] / "public/landing-earth"
    )
    arguments = parser.parse_args()
    build(arguments.source_directory, arguments.output)
