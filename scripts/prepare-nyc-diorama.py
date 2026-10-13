"""Deterministic, local cutouts from the supplied photograph. No AI/API is used.

Requires Pillow, NumPy and SciPy. Run `npm run diorama:prepare` after editing
public/diorama/nyc-layout.json. Coordinates always refer to the original image.
"""
from pathlib import Path
import argparse
import hashlib
import json

import numpy as np
from PIL import Image, ImageDraw, ImageFilter
from scipy.ndimage import distance_transform_edt, gaussian_filter

ROOT = Path(__file__).resolve().parents[1]


def interpolate(points, x):
    return float(np.interp(x, [p[0] for p in points], [p[1] for p in points]))


def stroke_polygons(layer):
    """Thin bridge cables are also reproducible polygon coordinates."""
    strokes = list(layer.get("strokes", []))
    if "hangers" in layer:
        h = layer["hangers"]
        cable = layer["strokes"][1]["points"]
        for t in np.linspace(0, 1, h["count"]):
            x = h["from"][0] * (1 - t) + h["to"][0] * t
            bottom = h["deckFrom"][1] * (1 - t) + h["deckTo"][1] * t
            strokes.append({"points": [[x, interpolate(cable, x)], [x, bottom]], "width": h["width"]})
    result = []
    for stroke in strokes:
        for a, b in zip(stroke["points"], stroke["points"][1:]):
            v = np.asarray(b, dtype=float) - a
            length = np.linalg.norm(v)
            if length == 0:
                continue
            n = np.array([-v[1], v[0]]) / length * stroke["width"] / 2
            result.append([(np.asarray(a) + n).tolist(), (np.asarray(b) + n).tolist(),
                           (np.asarray(b) - n).tolist(), (np.asarray(a) - n).tolist()])
    return result


def polygon_mask(size, polygons, holes=(), scale=3):
    mask = Image.new("L", (size[0] * scale, size[1] * scale))
    draw = ImageDraw.Draw(mask)
    for polygon in polygons:
        draw.polygon([(round(x * scale), round(y * scale)) for x, y in polygon], fill=255)
    for hole in holes:
        draw.polygon([(round(x * scale), round(y * scale)) for x, y in hole], fill=0)
    return mask.resize(size, Image.Resampling.LANCZOS)


def fit_sky(rgb, removal):
    """Fit only empty sky from this image; preserve the original outside the city."""
    height, width = rgb.shape[:2]
    yy, xx = np.mgrid[:height, :width]
    x, y = xx / width, yy / height
    features = np.stack([x**i * y**j for i in range(4) for j in range(4-i)], axis=-1)
    # Empty right/bottom borders anchor the lower field, avoiding extrapolated
    # cyan/white patches under the plinth at a changed camera angle.
    valid = (removal < 1) & ((yy < 620) | (xx > 1220) | (yy > 1230)) & (xx % 12 == 0) & (yy % 12 == 0)
    coefficients = np.linalg.lstsq(features[valid], rgb[valid], rcond=None)[0]
    return np.clip(features @ coefficients, 0, 255).astype(np.uint8)


def nearest_fill(rgb, removed):
    """Conservative underpainting, not reconstruction of unseen architecture."""
    binary = removed > 30
    indices = distance_transform_edt(binary, return_distances=False, return_indices=True)
    filled = rgb[tuple(indices)].astype(float)
    softened = gaussian_filter(filled, sigma=(3, 3, 0))
    weight = np.minimum(1, removed.astype(float) / 255)[..., None]
    return np.clip(rgb * (1 - weight) + softened * weight, 0, 255).astype(np.uint8)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", type=Path, default=ROOT / "public/diorama/nyc-source.png")
    parser.add_argument("--layout", type=Path, default=ROOT / "public/diorama/nyc-layout.json")
    parser.add_argument("--output", type=Path, default=ROOT / "public/diorama/generated")
    args = parser.parse_args()
    layout = json.loads(args.layout.read_text())
    image = Image.open(args.source).convert("RGB")
    if list(image.size) != layout["imageSize"]:
        raise ValueError("Image size differs from calibration. Update nyc-layout.json first.")
    args.output.mkdir(parents=True, exist_ok=True)
    rgb = np.asarray(image)
    removal = np.asarray(polygon_mask(image.size, [layout["backgroundRemoval"]]))
    sky = fit_sky(rgb, removal)
    # A simple sky-colour test cleans small tracing margins without removing blue glass.
    difference = np.max(np.abs(rgb.astype(float) - sky.astype(float)), axis=-1)
    blue = (rgb[:, :, 2].astype(float) > rgb[:, :, 0] + 28.0) & (rgb[:, :, 2].astype(float) > rgb[:, :, 1] + 10.0)
    sky_pixels = blue & (difference < 19)
    masks, strokes = [], []
    for layer in layout["layers"]:
        wire_polygons = stroke_polygons(layer)
        strokes.append(wire_polygons)
        mask = np.asarray(polygon_mask(image.size, layer["polygons"], layer.get("holes", []))).copy()
        if wire_polygons:
            wires = np.asarray(polygon_mask(image.size, wire_polygons)).copy()
            warm_wire = (rgb[:,:,0].astype(float) > rgb[:,:,1] * 0.94) & (rgb[:,:,0].astype(float) > rgb[:,:,2] * 1.03)
            wires[~warm_wire] = 0
            mask = np.maximum(mask, wires)
        if layer.get("keyedPolygons"):
            area = np.asarray(polygon_mask(image.size, layer["keyedPolygons"])).copy()
            # Beige stone / bronze cables against blue sky and water, using this
            # image only. Keep fine cables which a hand-drawn stroke could miss.
            warm = (rgb[:,:,0].astype(float) > rgb[:,:,1] * 0.94) & (rgb[:,:,0].astype(float) > rgb[:,:,2] * 1.03)
            area[~warm] = 0
            mask = np.maximum(mask, area)
            wire_polygons.extend(layer["keyedPolygons"])
        if layer["kind"] not in ("base", "ground"):
            mask[sky_pixels] = 0
        masks.append(mask)
    # Remove foreground objects from the underlying ground. Water stays as underpaint.
    foreground = np.maximum.reduce([m for m, layer in zip(masks, layout["layers"])
                                    if layer["kind"] not in ("base", "ground")])
    expanded = np.asarray(Image.fromarray(foreground).filter(ImageFilter.MaxFilter(7)))
    plate = nearest_fill(rgb, expanded)
    # One continuous colour field prevents the former skyline appearing as
    # differently coloured blue silhouettes when the reconstructed city moves.
    background = sky.astype(float)
    yy = np.mgrid[:image.height, :image.width][0]
    shadow_region = (removal == 0) & (yy > 650)
    residual = rgb.astype(float) - sky.astype(float)
    shadow = np.minimum(residual, 0) * shadow_region[..., None]
    background = np.clip(background + shadow, 0, 255).astype(np.uint8)
    Image.fromarray(background).save(args.output / "background.jpg", quality=95, subsampling=0)
    Image.fromarray(plate).save(args.output / "ground.png", optimize=True)
    manifest = {"sourceSha256": hashlib.sha256(args.source.read_bytes()).hexdigest(),
                "imageSize": layout["imageSize"], "layers": []}
    preview = image.copy()
    draw = ImageDraw.Draw(preview)
    composed = Image.fromarray(background).convert("RGBA")
    for index, (layer, raw_mask) in enumerate(zip(layout["layers"], masks)):
        # Observed foreground belongs to exactly one layer; no duplicated buildings.
        later = np.maximum.reduce(masks[index+1:]) if index+1 < len(masks) else np.zeros_like(raw_mask)
        mask = np.minimum(raw_mask, 255 - later) if layer["kind"] not in ("base", "ground") else raw_mask
        texture_rgb = plate if layer["kind"] in ("base", "ground") else rgb
        alpha_image = Image.fromarray(mask)
        bounds = alpha_image.getbbox()
        if not bounds:
            raise ValueError(f"Empty mask: {layer['id']}")
        bounds = (max(0, bounds[0] - 3), max(0, bounds[1] - 3), min(image.width, bounds[2] + 3), min(image.height, bounds[3] + 3))
        # Bleed source RGB into the transparent gutter to avoid dark filtered edges.
        rgba = Image.fromarray(texture_rgb).convert("RGBA")
        rgba.putalpha(alpha_image)
        filename = f"{layer['id']}.png"
        rgba.crop(bounds).save(args.output / filename, optimize=True)
        manifest["layers"].append({"id": layer["id"], "file": f"/diorama/generated/{filename}",
                                   "bounds": list(bounds), "wirePolygons": strokes[index]})
        composed.alpha_composite(rgba)
        for polygon in layer["polygons"]:
            draw.line([tuple(p) for p in polygon] + [tuple(polygon[0])], fill=(235, 73, 85), width=2)
        draw.text((bounds[0] + 4, bounds[1] + 4), layer["id"], fill=(185, 25, 55))
    (args.output / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n")
    # QA artifacts are separate from browser assets.
    qa = ROOT / "docs/nyc-diorama"
    qa.mkdir(parents=True, exist_ok=True)
    preview.save(qa / "mask-guide.jpg", quality=92)
    composed.convert("RGB").save(qa / "recomposition.png", optimize=True)
    error = np.abs(np.asarray(composed.convert("RGB")).astype(float) - rgb.astype(float))
    metrics = {"recompositionMeanAbsoluteError": round(float(error.mean()), 4),
               "note": "Offline unlit layer composition, not a GPU rendering quality score.",
               "layerCount": len(masks), "sourceSha256": manifest["sourceSha256"]}
    (qa / "asset-metrics.json").write_text(json.dumps(metrics, indent=2) + "\n")
    print(f"Generated {len(masks)} cutouts; composition MAE {error.mean():.3f}/255")


if __name__ == "__main__":
    main()
