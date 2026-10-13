# NYC diorama source and editable data

The only visual reference is the user-supplied 1254 × 1254 image, losslessly
converted from the uploaded JPEG to `nyc-source.png`. No replacement image,
external city assets, paid services or AI-generated architecture are used.

`nyc-layout.json` stores original-image pixel coordinates, traced polygons,
bridge cable paths, colours, facade ground lines, camera calibration, extrusion
thicknesses and independent parallax depths. `parallax.depthScale` controls the
overall depth separation. Geometry and materials live in
`app/experiences/nyc-diorama/`; the experiment is `/lab/nyc-diorama`.

To regenerate the checked-in transparent crops, ground underpainting and sky:

```sh
# Only needed for asset authoring, not for the Nuxt build/runtime.
python3 -m pip install pillow numpy scipy
npm run diorama:prepare
```

The generator reads the source and masks, writes `generated/manifest.json` and
cropped PNGs, and saves a mask guide and recomposition in `docs/nyc-diorama/`.
The manifest includes the source SHA-256 and each crop's original pixel bounds.
Foreground ownership prevents duplicated landmarks in the ground texture.
Sky-colour cleanup and a warm-colour key inside the bridge's traced envelope
preserve fine cables without an API. Antialiased polygon edges are reproducible.

Underpainting uses nearby source pixels; it does not recover unseen roads or
building facades. The backdrop uses a smooth field fitted to source sky colours
and preserves the source's contact-shadow residual. This shadow zooms with the
viewer, but does not physically change direction with camera rotation.

The projection model is a square box plus solid, stepped, folded facade
extrusions inferred from the traced silhouettes. The source camera view/
projection matrix supplies UVs in `ShaderMaterial`. The small fixed lens shear
matches the image's imperfect axonometric square. Hidden/grazing faces use
approximate source colours. This is a single-view prototype, not a surveyed
full-rotation model of New York.

The parallax model contains twelve independent fixed image cards, with
per-layer depths and source-aligned reference framing. Cards do not continually
billboard toward the viewer. The initial composition aligns with the source;
camera movement causes actual relative displacement. Underpaint covers exposed
regions, but wide movement can reveal the approximation.

To capture the comparison against a running dev or production server:

```sh
node scripts/capture-nyc-diorama.mjs http://127.0.0.1:3000
```

This uses the existing Playwright installation and Chromium. Captured mobile
viewport/DPR/touch behaviour is browser emulation; real phone FPS and thermal
performance need separate measurement.
