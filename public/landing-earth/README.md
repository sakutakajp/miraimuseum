# MIRAI CORE — Earth textures

These textures are bundled locally; the landing page makes no runtime request
to NASA, a tile server, or a third-party CDN. Geography is the same across all
observation layers. Lighting, visibility, and overlays belong to the renderer.

## Sources and rights

**Day:** NASA Blue Marble Next Generation, May 2004, with shaded relief and
bathymetry. Original: `BMNG_world.topo.bathy.200405.3.2048x1024.jpg` from the
[official NASA WorldWind repository](https://github.com/NASAWorldWind/WebWorldWind/blob/5ffe2dfc54ab4d744fc9e587af9639c9910db228/images/BMNG_world.topo.bathy.200405.3.2048x1024.jpg).
Credit: NASA Earth Observatory / NASA Goddard Space Flight Center.

**Night:** NASA 2012 Earth at Night composite. Original:
`dnb_land_ocean_ice_2012.png` from the
[same NASA repository](https://github.com/NASAWorldWind/WebWorldWind/blob/5ffe2dfc54ab4d744fc9e587af9639c9910db228/images/dnb_land_ocean_ice_2012.png).
Credit: NASA Earth Observatory / NOAA / Suomi NPP VIIRS.
This derivative removes the dim blue base image and preserves the measured
lights' locations as a restrained warm emission map.

The source repository's
[license declaration](https://github.com/NASAWorldWind/WebWorldWind/blob/5ffe2dfc54ab4d744fc9e587af9639c9910db228/README.md#license)
is Apache License 2.0. A copy is included in
[LICENSE-APACHE-2.0.txt](LICENSE-APACHE-2.0.txt). Source copyright notice:

> Copyright 2003–2006, 2009, 2017, 2020, 2022 United States Government, as
> represented by the Administrator of the National Aeronautics and Space
> Administration. All rights reserved.

No NASA logo or endorsement is implied or included.

**Coastline mask:** Natural Earth, 1:50m land polygons, revision
`ca96624a56bd078437bca8184e78163e5039ad19` of
[natural-earth-vector](https://github.com/nvkelso/natural-earth-vector/blob/ca96624a56bd078437bca8184e78163e5039ad19/geojson/ne_50m_land.geojson).
Natural Earth's [repository README](https://github.com/nvkelso/natural-earth-vector)
declares its datasets public domain. Credit: Natural Earth contributors / NACIS.

**Relief / vegetation channels and clouds:** original MIRAI MUSEUM authored
derivatives. Relief is an illustrative field derived from the NASA day image's
land color and the Natural Earth coastline. It is **not a scientific elevation
model**. Cloud coverage is deterministic procedural cirrus/jet-belt artwork,
**not a satellite cloud observation or current weather**. These fields support
the art direction without adding large terrain/weather assets.

## Texture contract

All maps are ordinary equirectangular maps, no mirrored longitude:

- Image left/right: 180° W / 180° E.
- Image center: Greenwich / 0° longitude.
- Image top/bottom: north pole / south pole.
- Image `y = 0.5`: equator.
- Three.js `TextureLoader` keeps its standard `flipY = true`.
- Surface UV: `u = fract(atan(z, -x) / (2π))`,
  `v = asin(y) / π + 0.5` for a normalized sphere-local vector.
- Horizontal wrap is `RepeatWrapping`; vertical wrap is `ClampToEdgeWrapping`.

| Local path | Dimensions | Channels | Three.js color space |
| --- | --- | --- | --- |
| `/landing-earth/day.webp` | 2048 × 1024 | RGB NASA day albedo | `SRGBColorSpace` |
| `/landing-earth/night.webp` | 2048 × 1024 | RGB warm city-light emission, black background | `SRGBColorSpace` |
| `/landing-earth/relief.webp` | 2048 × 1024 | R: illustrative relief; G: vegetation confidence; B: actual coastline land mask | `NoColorSpace` |
| `/landing-earth/clouds.webp` | 1024 × 512 | Grayscale cloud coverage, 0–1 | `NoColorSpace` |

Relief/vegetation are zero in the ocean. Antialiased coastline pixels may be
between zero and one. Use the **B channel** for ocean specular masking; use G
only as a subdued vegetation overlay. Keep relief internal to the surface:
it must not distort the recognizable Earth silhouette. Cloud coverage uses
no alpha channel; sample R. Cloud seams are periodic, with restrained pole
coverage. The texture samples alone do not define the opening exposure:
the Threshold stays almost black through authored directional light and rim.

## Reproduction

Run from the repository root:

```sh
python scripts/build-landing-earth-assets.py
```

The offline authoring script requires Python, Pillow, and NumPy. It downloads
only the pinned NASA / Natural Earth originals into `/tmp/mirai-earth-sources`
and verifies their SHA-256 hashes. Generated WebP files are checked in; these
tools and network access are not required for `npm run build` or runtime.

Original SHA-256 hashes:

```text
day.jpg       7405c39a220bc37519474eba54625a0d1a02b6ad954895147c103a1bc8dd61fb
night.png     c1893c1a97634f9d9dc45a62f83916c77cae742d5128551f8d7c4e4f5296ed36
land.geojson  e874b27a51d146452be360cafb3cc50c86001074a67d534113e6534682f9826b
```

The copies remain dated observation composites, not live data. Geographic
recognizability matters; national borders, educational annotations, and a
DX-style globe grid are intentionally absent.
