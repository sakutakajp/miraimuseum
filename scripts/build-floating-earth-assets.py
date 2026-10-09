#!/usr/bin/env python3
"""Build the deliberately stylized, faceted Earth and its matching SVG poster.

Requires Python 3, NumPy and Pillow only when regenerating these checked-in assets.
Geography comes from pinned Natural Earth coastlines and NASA Blue Marble colors.
Clouds, elevation and colors are authored artwork, not measured scientific data.
No part of the user-provided reference image is copied into the generated assets.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import math
from pathlib import Path
import urllib.request

import numpy as np
from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parents[1]
SOURCES = {
    "day.jpg": (
        "https://raw.githubusercontent.com/NASAWorldWind/WebWorldWind/"
        "5ffe2dfc54ab4d744fc9e587af9639c9910db228/images/"
        "BMNG_world.topo.bathy.200405.3.2048x1024.jpg",
        "7405c39a220bc37519474eba54625a0d1a02b6ad954895147c103a1bc8dd61fb",
    ),
    "land.geojson": (
        "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/"
        "ca96624a56bd078437bca8184e78163e5039ad19/geojson/ne_50m_land.geojson",
        "e874b27a51d146452be360cafb3cc50c86001074a67d534113e6534682f9826b",
    ),
}


def source(name: str, directory: Path) -> Path:
    url, expected = SOURCES[name]
    target = directory / name
    if not target.exists():
        with urllib.request.urlopen(url, timeout=45) as response:
            target.write_bytes(response.read())
    if hashlib.sha256(target.read_bytes()).hexdigest() != expected:
        raise ValueError(f"Unexpected source checksum: {target}")
    return target


def icosphere(subdivisions: int = 4) -> tuple[np.ndarray, np.ndarray]:
    phi = (1 + math.sqrt(5)) / 2
    vertices = [(-1, phi, 0), (1, phi, 0), (-1, -phi, 0), (1, -phi, 0),
                (0, -1, phi), (0, 1, phi), (0, -1, -phi), (0, 1, -phi),
                (phi, 0, -1), (phi, 0, 1), (-phi, 0, -1), (-phi, 0, 1)]
    vertices = [np.asarray(v, dtype=float) / np.linalg.norm(v) for v in vertices]
    faces = [(0, 11, 5), (0, 5, 1), (0, 1, 7), (0, 7, 10), (0, 10, 11),
             (1, 5, 9), (5, 11, 4), (11, 10, 2), (10, 7, 6), (7, 1, 8),
             (3, 9, 4), (3, 4, 2), (3, 2, 6), (3, 6, 8), (3, 8, 9),
             (4, 9, 5), (2, 4, 11), (6, 2, 10), (8, 6, 7), (9, 8, 1)]
    for _ in range(subdivisions):
        cache: dict[tuple[int, int], int] = {}

        def midpoint(a: int, b: int) -> int:
            edge = tuple(sorted((a, b)))
            if edge not in cache:
                v = vertices[a] + vertices[b]
                cache[edge] = len(vertices)
                vertices.append(v / np.linalg.norm(v))
            return cache[edge]

        refined = []
        for a, b, c in faces:
            ab, bc, ca = midpoint(a, b), midpoint(b, c), midpoint(c, a)
            refined.extend(((a, ab, ca), (b, bc, ab), (c, ca, bc), (ab, bc, ca)))
        faces = refined
    result = np.asarray(vertices)
    # A small tangent-space displacement removes the perfect latitude-like
    # rows of a subdivided icosahedron without changing the planet silhouette.
    rng = np.random.default_rng(604684)
    displacement = rng.normal(0, .0065, result.shape)
    displacement -= result * np.sum(displacement * result, axis=1)[:, None]
    result += displacement
    result /= np.linalg.norm(result, axis=1)[:, None]
    return result, np.asarray(faces, dtype=np.int32)


def geography(land_path: Path) -> np.ndarray:
    width, height = 2048, 1024
    mask = Image.new("L", (width, height), 0)
    draw = ImageDraw.Draw(mask)
    for feature in json.loads(land_path.read_text())["features"]:
        geometry = feature["geometry"]
        polygons = [geometry["coordinates"]] if geometry["type"] == "Polygon" else geometry["coordinates"]
        for polygon in polygons:
            for index, ring in enumerate(polygon):
                points = [((lon + 180) / 360 * width, (90 - lat) / 180 * height)
                          for lon, lat, *_ in ring]
                draw.polygon(points, fill=255 if index == 0 else 0)
    return np.asarray(mask)


def coordinates(vertices: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
    return np.rad2deg(np.arctan2(vertices[:, 0], vertices[:, 2])), np.rad2deg(np.arcsin(np.clip(vertices[:, 1], -1, 1)))


def sample(image: np.ndarray, longitude: np.ndarray, latitude: np.ndarray) -> np.ndarray:
    height, width = image.shape[:2]
    x = ((longitude + 180) / 360 * width).astype(int) % width
    y = np.clip(((90 - latitude) / 180 * height).astype(int), 0, height - 1)
    return image[y, x]


def smoothstep(low: float, high: float, value: np.ndarray) -> np.ndarray:
    value = np.clip((value - low) / (high - low), 0, 1)
    return value * value * (3 - 2 * value)


def cloud_field(longitude: np.ndarray, latitude: np.ndarray) -> np.ndarray:
    """Broad, raised weather ribbons with recognizable spiral-shaped systems."""
    coverage = np.zeros_like(longitude)

    def ribbon(distance: np.ndarray, half_width: np.ndarray | float) -> None:
        nonlocal coverage
        coverage = np.maximum(coverage, 1 - smoothstep(half_width * .45, half_width, distance))

    # The western-Pacific curl and Atlantic front frame, rather than cover,
    # the green American continent in the initial pose.
    systems = [(-151, 35, 26, 7.3, 1), (-39, 41, 23, 6.0, 1),
               (148, 39, 23, 6.2, 1), (47, -37, 24, 5.6, -1),
               (-13, -48, 25, 4.8, -1)]
    for lon, lat, radius, width, spin in systems:
        dx = ((longitude - lon + 180) % 360 - 180) * math.cos(math.radians(lat))
        dy = latitude - lat
        dx += np.sin(dy * .22) * 1.3
        dy += np.sin(dx * .18) * 1.0
        nearest = np.full_like(longitude, 1e3)
        for t in np.linspace(0, 1, 160):
            theta = -1.6 + t * 6.7
            r = 1 + t ** .8 * radius + math.sin(theta * 2.4) * .7
            px, py = r * math.cos(theta * spin), r * math.sin(theta * spin)
            # Taper both ends and let the outside front swell asymmetrically:
            # these are weather plumes, not closed ornamental rings.
            local_width = width * (.18 + .82 * math.sin(math.pi * t))
            local_width *= .82 + .23 * math.sin(theta * 1.5 + .6)
            nearest = np.minimum(nearest, np.hypot(dx - px, dy - py) / local_width)
        ribbon(nearest, 1)

    rad = np.deg2rad(longitude)
    # Arctic and Southern Ocean fronts are intentionally interrupted. The
    # clean negative spaces keep individual white polygon shapes legible.
    north = 62 + 8 * np.sin(rad * 2 + .9) + 3 * np.sin(rad * 5)
    south = -53 + 8 * np.sin(rad * 2 - .8) + 3 * np.sin(rad * 4 + 1.1)
    northern_width = 5.5 + 2.5 * np.sin(rad + 1.8) ** 2
    ribbon(np.abs(latitude - north), northern_width)
    southern_envelope = smoothstep(.22, .7, np.sin(rad * 3 - .7) * .5 + .5)
    ribbon(np.abs(latitude - south) + (1 - southern_envelope) * 12,
           6.5 + np.sin(rad * 3) ** 2 * 3)
    # A broad, gently bent southern-Pacific front stays open at its ends.
    dx = ((longitude + 130 + 180) % 360 - 180) * .83
    dy = latitude + 12 - np.sin(np.deg2rad(longitude + 130) * 2.5) * 8
    ribbon(np.hypot(dx / 36, dy / 6), 1)
    # Tapered Caribbean / west-African fragments retain open tropical seas.
    for lon, lat, half_length, tilt in ((-75, 18, 13, .14), (-13, 8, 11, -.18), (98, -8, 12, .22)):
        dx = ((longitude - lon + 180) % 360 - 180) * math.cos(math.radians(lat))
        dy = latitude - lat - dx * tilt
        ribbon(np.hypot(dx / half_length, dy / 2.1), 1)
    return coverage


def surface_colors(vertices: np.ndarray, faces: np.ndarray, land: np.ndarray, day: np.ndarray) -> np.ndarray:
    centers = vertices[faces].mean(axis=1)
    centers /= np.linalg.norm(centers, axis=1)[:, None]
    lon, lat = coordinates(centers)
    on_land = sample(land, lon, lat) > 127
    photo = sample(day, lon, lat).astype(float) / 255
    # Preserve inland water encoded in Blue Marble, including the Great Lakes;
    # Natural Earth's land outlines alone can encompass these lake pixels.
    inland_water = (photo[:, 2] > photo[:, 1] * 1.35) & (photo[:, 2] > .11)
    inland_water &= (lat > -60) & (lat < 65)
    on_land &= ~inland_water
    rng = np.random.default_rng(817204)
    facet = rng.uniform(.80, 1.20, len(faces))
    wave = (.5 + .5 * np.sin(np.deg2rad(lon) * 3 + np.deg2rad(lat) * 2))
    wave = wave * .65 + rng.random(len(faces)) * .35
    deep, vivid = np.array([9, 40, 185]), np.array([5, 131, 236])
    colors = deep[None, :] * (1 - wave[:, None]) + vivid[None, :] * wave[:, None]

    # Coast waters carry short turquoise accents, rather than cyan oceans.
    coastal = np.zeros(len(faces), dtype=bool)
    for dx, dy in ((3, 0), (-3, 0), (0, 3), (0, -3)):
        coastal |= sample(land, lon + dx, np.clip(lat + dy, -90, 90)) > 127
    coastal &= ~on_land
    colors[coastal] = colors[coastal] * .65 + np.array([4, 202, 220]) * .35

    dryness = np.clip((photo[:, 0] - photo[:, 1]) * 5 + (photo.mean(axis=1) - .16) * 2.0, 0, 1)
    dryness = np.clip(dryness + np.exp(-((lon + 109) / 10) ** 2 - ((lat - 29) / 13) ** 2) * .28, 0, 1)
    # NASA colors inform a warm/dry versus humid/green classification. The
    # vivid exhibition palette intentionally does not reproduce the texture.
    lush, dry = np.array([72, 150, 48]), np.array([237, 184, 68])
    terrain = lush[None, :] * (1 - dryness[:, None]) + dry[None, :] * dryness[:, None]
    variation = .5 + .5 * np.sin(np.deg2rad(lon) * 9 - np.deg2rad(lat) * 7)
    terrain += variation[:, None] * np.array([29, 27, 1])
    colors[on_land] = terrain[on_land]
    # Greenland and Antarctica remain bright ice, not lime-green land.
    frozen = on_land & ((lat < -66) | (lat > 74) | ((lat > 61) & (lon > -62) & (lon < -20)))
    frozen |= on_land & (lat > 55) & (photo.mean(axis=1) > .4) & (np.ptp(photo, axis=1) < .065)
    colors[frozen] = np.array([206, 231, 248])
    colors *= facet[:, None]
    return np.round(np.clip(colors, 0, 255)).astype(np.uint8)


def cloud_mesh(vertices: np.ndarray, faces: np.ndarray) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    centers = vertices[faces].mean(axis=1)
    centers /= np.linalg.norm(centers, axis=1)[:, None]
    lon, lat = coordinates(centers)
    coverage = cloud_field(lon, lat)
    visible = coverage > .39
    face_ids = np.flatnonzero(visible)
    top_faces = faces[visible]
    lon_v, lat_v = coordinates(vertices)
    heights = 1.012 + cloud_field(lon_v, lat_v) * .021
    raised = vertices * heights[:, None]
    rng = np.random.default_rng(650107)
    # Distinct ivory/ice-blue facets keep the clouds sculptural and opaque.
    variance = rng.uniform(.79, 1.055, len(face_ids))
    colors = np.round(np.clip(np.array([241, 247, 255])[None, :] * variance[:, None], 0, 255)).astype(np.uint8)
    positions = list(raised)
    result_faces = [tuple(face) for face in top_faces]
    result_colors = list(colors)
    edges: dict[tuple[int, int], tuple[int, int] | None] = {}
    for a, b, c in top_faces:
        for start, end in ((a, b), (b, c), (c, a)):
            key = tuple(sorted((int(start), int(end))))
            if key in edges:
                edges[key] = None
            else:
                edges[key] = (int(start), int(end))
    # Opaque perimeter skirts turn white paint into cloud relief. Their blue
    # facets are only visible at grazing angles and add tactile depth.
    for edge in edges.values():
        if edge is None:
            continue
        a, b = edge
        bottom_a, bottom_b = len(positions), len(positions) + 1
        positions.extend((vertices[a] * 1.006, vertices[b] * 1.006))
        result_faces.extend(((a, bottom_a, bottom_b), (a, bottom_b, b)))
        side = np.array([154, 190, 236], dtype=np.uint8)
        result_colors.extend((side, side))
    return np.asarray(positions), np.asarray(result_faces), np.asarray(result_colors)


def serialize(vertices: np.ndarray, faces: np.ndarray, colors: np.ndarray) -> dict:
    return {
        "vertices": np.round(vertices, 5).ravel().tolist(),
        "faces": faces.ravel().tolist(),
        "colors": colors.ravel().tolist(),
    }


def poster(meshes: list[tuple[np.ndarray, np.ndarray, np.ndarray]], output: Path, preview: Path | None) -> None:
    yaw, pitch = math.radians(100), math.radians(30)
    rx = np.array([[1, 0, 0], [0, math.cos(pitch), -math.sin(pitch)], [0, math.sin(pitch), math.cos(pitch)]])
    ry = np.array([[math.cos(yaw), 0, math.sin(yaw)], [0, 1, 0], [-math.sin(yaw), 0, math.cos(yaw)]])
    rotation = rx @ ry
    projected = []
    for vertices, faces, colors in meshes:
        vertices = vertices @ rotation.T
        for face, color in zip(faces, colors, strict=True):
            triangle = vertices[face]
            normal = np.cross(triangle[1] - triangle[0], triangle[2] - triangle[0])
            if normal[2] <= 0:
                continue
            points = [(512 + x * 453.1, 512 - y * 453.1) for x, y, _ in triangle]
            projected.append((float(triangle[:, 2].mean()), points, tuple(int(v) for v in color)))
    projected.sort(key=lambda item: item[0])
    svg = ['<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" fill="none">',
           '<defs><radialGradient id="halo"><stop offset=".88" stop-color="#009dff" stop-opacity="0"/><stop offset=".90" stop-color="#026aff" stop-opacity=".1"/><stop offset=".915" stop-color="#00aaff" stop-opacity=".75"/><stop offset=".922" stop-color="#46e2ff" stop-opacity=".7"/><stop offset=".955" stop-color="#0878ff" stop-opacity=".2"/><stop offset="1" stop-color="#0059ff" stop-opacity="0"/></radialGradient></defs>',
           '<circle cx="512" cy="512" r="494" fill="url(#halo)"/>']
    raster = Image.new("RGB", (1024, 1024), (0, 0, 0))
    draw = ImageDraw.Draw(raster)
    for _, points, color in projected:
        path = "M" + "L".join(f"{x:.2f},{y:.2f}" for x, y in points) + "Z"
        fill = "#" + "".join(f"{channel:02x}" for channel in color)
        # Matching strokes close hairline AA seams between adjoining faces.
        svg.append(f'<path d="{path}" fill="{fill}" stroke="{fill}" stroke-width=".55"/>')
        draw.polygon(points, fill=color)
    svg.append('</svg>')
    (output / "earth.svg").write_text("\n".join(svg) + "\n")
    if preview is not None:
        raster.save(preview, "WEBP", quality=92, method=6)


def build(source_directory: Path, output: Path, preview: Path | None) -> None:
    source_directory.mkdir(parents=True, exist_ok=True)
    output.mkdir(parents=True, exist_ok=True)
    land = geography(source("land.geojson", source_directory))
    day = np.asarray(Image.open(source("day.jpg", source_directory)).convert("RGB"))
    vertices, faces = icosphere(4)
    colors = surface_colors(vertices, faces, land, day)
    clouds = cloud_mesh(vertices, faces)
    asset = {
        "version": 1,
        "surface": serialize(vertices, faces, colors),
        "clouds": serialize(*clouds),
    }
    (output / "model.json").write_text(json.dumps(asset, separators=(",", ":")) + "\n")
    poster([(vertices, faces, colors), clouds], output, preview)
    print(f"Earth: {len(faces)} surface facets, {len(clouds[1])} cloud facets")
    print(f"Model: {(output / 'model.json').stat().st_size:,} bytes")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--sources", type=Path, default=Path("/tmp/mirai-earth-sources"))
    parser.add_argument("--output", type=Path, default=ROOT / "public/floating-earth")
    parser.add_argument("--preview", type=Path, help="Optional local WebP art preview; not a shipped asset")
    options = parser.parse_args()
    build(options.sources, options.output, options.preview)
