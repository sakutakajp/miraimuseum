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
    """Art-directed weather, packed as coverage / optical height / cirrus.

    The flow is baked offline rather than animated or evaluated in the shader.
    Local vortices gather broken cumulus into fronts; an independent high layer
    retains delicate, stretched filaments. This is artwork, not measured weather.
    """
    yy, xx = np.mgrid[0:HEIGHT, 0:WIDTH].astype(np.float32)
    x, y = xx / WIDTH, yy / (HEIGHT - 1)
    latitude = (0.5 - y) * np.pi

    def smooth(low: float, high: float, value: np.ndarray) -> np.ndarray:
        t = np.clip((value - low) / (high - low), 0, 1)
        return t * t * (3 - 2 * t)

    def thread_noise(
        longitude: np.ndarray,
        vertical: np.ndarray,
        frequency_x: int,
        frequency_y: int,
        seed: int,
    ) -> np.ndarray:
        # Separate axis frequencies keep longitude periodic while stretching
        # threads east-west. Multiplying UV.x by a fraction would break its seam.
        rng = np.random.default_rng(seed)
        grid = rng.random((frequency_y + 2, frequency_x), dtype=np.float32)
        px = np.mod(longitude, 1) * frequency_x
        py = np.clip(vertical, 0, 1) * frequency_y
        ix, iy = np.floor(px).astype(int), np.floor(py).astype(int)
        fx, fy = px - ix, py - iy
        fx, fy = fx * fx * (3 - 2 * fx), fy * fy * (3 - 2 * fy)
        a = grid[iy, ix % frequency_x]
        b = grid[iy, (ix + 1) % frequency_x]
        c = grid[iy + 1, ix % frequency_x]
        d = grid[iy + 1, (ix + 1) % frequency_x]
        return (a + (b - a) * fx) * (1 - fy) + (c + (d - c) * fx) * fy

    flow_x = x.copy()
    flow_y = y.copy()
    # Longitude distances wrap at the antimeridian. Vortices are individually
    # localized so the globe does not turn into uniform sinusoidal marbling.
    weather_systems = (
        (-40, 42, 0.044, 2.1),
        (-17, -43, 0.047, -1.8),
        (65, -37, 0.050, -1.5),
        (151, 43, 0.041, 2.2),
        (-130, -48, 0.052, -1.9),
        (-170, 16, 0.026, 1.7),
        (106, 17, 0.024, 1.5),
        (24, 57, 0.032, 1.0),
    )
    for longitude, lat, radius, spin in weather_systems:
        cx, cy = (longitude + 180) / 360, (90 - lat) / 180
        longitude_scale = 2 * np.cos(np.deg2rad(lat))
        dx = ((x - cx + 0.5) % 1 - 0.5) * longitude_scale
        dy = y - cy
        distance2 = (dx * dx + dy * dy) / (radius * radius)
        angle = spin * np.exp(-distance2 * 0.70)
        cosine, sine = np.cos(angle), np.sin(angle)
        flow_x += (dx * cosine - dy * sine - dx) / longitude_scale
        flow_y += dx * sine + dy * cosine - dy

    # Smaller advection breaks the smooth fronts into feathered cloud edges.
    broad_warp = periodic_noise(flow_x, flow_y, 28, 8106) - 0.5
    cross_warp = periodic_noise(flow_x + 0.23, flow_y, 34, 492) - 0.5
    sample_x = flow_x + broad_warp * 0.012
    sample_y = flow_y + cross_warp * 0.013
    region = periodic_noise(sample_x, sample_y, 14, 341)
    fronts = periodic_noise(sample_x, sample_y, 38, 883)
    cells = periodic_noise(sample_x, sample_y, 92, 714)
    detail = periodic_noise(sample_x, sample_y, 224, 1026)
    feather = periodic_noise(sample_x, sample_y, 488, 295)
    micro = periodic_noise(sample_x, sample_y, 832, 154)
    field = (
        region * 0.26
        + fronts * 0.29
        + cells * 0.23
        + detail * 0.13
        + feather * 0.06
        + micro * 0.03
    )
    # Humid midlatitudes and the broken equatorial belt leave quieter gaps at
    # subtropical latitudes. This is a compositional bias, not a climate model.
    wet_belt = 0.021 * np.cos(latitude * 6) + 0.009 * np.cos(latitude * 12)
    lower = smooth(0.49, 0.74, field + wet_belt)
    lower *= 0.76 + 0.24 * cells
    # Height is correlated with opacity but has finer relief inside each cloud,
    # enabling silver side lighting without adding another shell or ray march.
    optical_height = np.sqrt(lower) * (
        0.20 + cells * 0.34 + detail * 0.28 + feather * 0.12 + micro * 0.06
    )

    # The high layer uses the same weather flow, with anisotropic frequencies:
    # long fine threads, interrupted by a separate low-frequency envelope.
    thread_x = flow_x + broad_warp * 0.007
    thread_y = flow_y + cross_warp * 0.012 + broad_warp * 0.006
    wisps = thread_noise(thread_x, thread_y, 84, 208, 466)
    fibers = thread_noise(thread_x, thread_y, 160, 460, 1597)
    envelope = periodic_noise(flow_x + 0.17, flow_y, 46, 217)
    cirrus = smooth(0.62, 0.86, wisps * 0.66 + fibers * 0.34)
    cirrus *= smooth(0.53, 0.77, envelope) * 0.32
    cirrus *= 0.25 + 0.75 * (1 - lower)

    # Ease all longitude variation away at the poles: a sphere should not have
    # a noisy pinwheel, and the polar pixel rows must meet at one scalar value.
    polar_blend = smooth(1.34, np.pi / 2, np.abs(latitude))
    lower = lower * (1 - polar_blend) + 0.055 * polar_blend
    optical_height = optical_height * (1 - polar_blend) + 0.12 * polar_blend
    cirrus *= 1 - polar_blend
    channels = np.stack([lower, optical_height, cirrus], axis=-1)
    return Image.fromarray(np.round(np.clip(channels, 0, 1) * 255).astype(np.uint8))


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
    # A high quality encoding preserves the small coverage / height details
    # without delivering the much larger lossless authoring image at runtime.
    cloud_coverage().save(output / "clouds.webp", "WEBP", quality=92, method=6)
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
