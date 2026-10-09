# Earth and exhibition assets

## 現在のホーム（2026-10-09）

Babylon.jsで `earth-vivid.glb`、`dinosaur.glb`、解放後の `cybertruck.glb`、常設の `statue-of-liberty-optimized.glb` を使用する。地球の静止画は `earth-photo.webp`。以下の `model.json` / `earth.svg` は初期ホームの生成原本と出典として保存しており、現在のホームは読み込まない。

## 初期のlow-poly Earthの制作記録

The homepage's Earth is an original, deterministic faceted interpretation of
the user's visual direction: cobalt/cyan oceans, green/ochre continents,
sculpted white weather ribbons and a thin luminous atmosphere. It contains no
pixels from the user-provided reference. Clouds and colors are authored artwork,
not current weather or a scientific elevation model.

`model.json` contains compact indexed surface/cloud vertices, triangle indices
and one sRGB RGB color per face. The former loader converted face colors into Three.js's
linear working color space, expands vertices once and uses unlit materials
without tone mapping. It makes one same-origin request and uses no runtime
texture reads, tile server or third-party service.

`earth.svg` is the matching server-rendered/no-WebGL poster. Its 1024-square
viewBox contains a radius-453.1-pixel surface, raised clouds and a soft blue rim.
The initial pose is XYZ pitch 30°, yaw 100°, roll 0°: the Americas face the
camera. Geography uses longitude zero = +Z, longitude -90° = -X, north = +Y.

## Sources and rights

**Coastlines:** Natural Earth 1:50m land polygons, revision
`ca96624a56bd078437bca8184e78163e5039ad19`, from
[natural-earth-vector](https://github.com/nvkelso/natural-earth-vector/blob/ca96624a56bd078437bca8184e78163e5039ad19/geojson/ne_50m_land.geojson).
Natural Earth's datasets are public domain. Credit: Natural Earth contributors / NACIS.

**Dry/vegetated color classification:** NASA Blue Marble Next Generation,
May 2004, `BMNG_world.topo.bathy.200405.3.2048x1024.jpg`, from the
[NASA WorldWind repository](https://github.com/NASAWorldWind/WebWorldWind/blob/5ffe2dfc54ab4d744fc9e587af9639c9910db228/images/BMNG_world.topo.bathy.200405.3.2048x1024.jpg).
Credit: NASA Earth Observatory / NASA Goddard Space Flight Center. NASA's source
colors inform broad dry/vegetated regions; the exhibition palette is original.

The source repository declares Apache License 2.0; a copy is included in
[LICENSE-APACHE-2.0.txt](LICENSE-APACHE-2.0.txt). Original source copyright:

> Copyright 2003–2006, 2009, 2017, 2020, 2022 United States Government, as
> represented by the Administrator of the National Aeronautics and Space
> Administration. All rights reserved.

These assets are modified, authored derivatives. They contain no NASA logo and
imply no NASA endorsement.

## Reproduction

```sh
python3 scripts/build-floating-earth-assets.py
```

The offline generator needs Python 3, NumPy and Pillow. Originals are cached in
`/tmp/mirai-earth-sources`; missing files are downloaded from pinned revisions
and checked against their SHA-256 hashes before use. The app and normal build
do not require Python, those packages or network access. An optional local
preview can be generated with `--preview /tmp/floating-earth.webp`.

Source SHA-256:

```text
day.jpg       7405c39a220bc37519474eba54625a0d1a02b6ad954895147c103a1bc8dd61fb
land.geojson  e874b27a51d146452be360cafb3cc50c86001074a67d534113e6534682f9826b
```

## Babylon.js移行（2026-10-09）

全GLBはバイトを変更せず使用する。地球の青・雲影・大気は実行時のShaderMaterial、展示の縮尺・向き・原点は親TransformNodeで補正する。車のシルバーは実行時のスタジオ反射で維持する。

`statue-of-liberty-optimized.glb` はユーザー提供GLBの未編集コピー。1,824,472 bytes、SHA-256 `85e893c00645e230c88ab4a432752f011c8bebefa86878b4c6a004927fb5c614`。出典・別途ライセンスは添付時に提示されていないため、地球素材のApacheライセンスをこのモデルへ転用しない。常設の展示で、ゲーム定義の11展示とは区別する。
