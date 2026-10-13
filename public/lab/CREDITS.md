# MIRAI MUSEUM · Roman miniature

Original procedural artwork created for this repository, 2026-10-13.
Model, textures and HDR environment: CC0-1.0.

Rebuild with Blender 4.3.2:

```sh
blender -b --python scripts/build-roman-lab.py
```

The Blender source uses seed 42 and metre-scale, right-handed Y-up scene data.
Both engines load the exact same `roman-town.glb` and `roman-sky.hdr`.
Packed PBR base-color textures are also kept as PNG source files.
Resident limb, tree, boat and water motion is shared TypeScript animation data.
The town is a stylized interpretation, not an archaeological reconstruction.
