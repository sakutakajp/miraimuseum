import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve, relative, dirname, join } from "node:path";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  dimensions,
  cropImage,
  resize,
  enlarge,
  makePalette,
  quantize,
  png,
  validateAnimationFrames,
} from "./pixel/raster.mjs";

const args = process.argv.slice(2),
  root = process.cwd();
function flag(name, fallback) {
  const at = args.indexOf(`--${name}`);
  return at < 0 ? fallback : args[at + 1];
}
if (args.includes("--help")) {
  console.log(
    "node scripts/pixel-assets.mjs [--config assets/pixel-art.config.json] [--profiles fine,standard,coarse] [--assets id,id] [--out public/museum/pixel] [--previews docs/pixel-previews] [--manifest path]",
  );
  process.exit(0);
}
const configPath = resolve(
  root,
  flag("config", "assets/pixel-art.config.json"),
);
const config = JSON.parse(readFileSync(configPath, "utf8"));
if (config.version !== 1) throw new Error("Unsupported configuration version");
const referencePixel =
  config.reference.viewport.width / config.reference.render.width;
if (
  referencePixel !==
    config.reference.viewport.height / config.reference.render.height ||
  !Number.isInteger(referencePixel) ||
  referencePixel < 1
)
  throw new Error("Reference must define square integer CSS pixels");
if (config.profiles.standard.pixelSize !== referencePixel)
  throw new Error("Standard profile must match the shared render resolution");
const profiles = flag("profiles", Object.keys(config.profiles).join(",")).split(
  ",",
);
for (const name of profiles)
  if (
    !config.profiles[name] ||
    !Number.isInteger(config.profiles[name].pixelSize) ||
    config.profiles[name].pixelSize < 1
  )
    throw new Error(`Unknown or invalid profile ${name}`);
const selected = flag("assets", "").split(",").filter(Boolean);
for (const id of selected)
  if (!config.assets.some((a) => a.id === id))
    throw new Error(`Unknown asset ${id}`);
if (!config.assets.every((a) => /^[a-z0-9][a-z0-9-]*$/.test(a.id)))
  throw new Error("Invalid asset ID");
if (new Set(config.assets.map((a) => a.id)).size !== config.assets.length)
  throw new Error("Asset IDs must be unique");
const sourcePaths = new Set([
  configPath,
  ...config.assets.map((a) => resolve(root, a.input)),
]);
const assets = config.assets.filter(
  (a) => !selected.length || selected.includes(a.id),
);
const out = resolve(root, flag("out", config.output)),
  previews = resolve(root, flag("previews", config.previews));
if (out === previews)
  throw new Error(
    "Processed assets and enlarged previews need separate folders",
  );
function writeOutput(path, data) {
  if (sourcePaths.has(resolve(path)))
    throw new Error("Refusing to overwrite source or configuration");
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, data);
}
mkdirSync(out, { recursive: true });
mkdirSync(previews, { recursive: true });
const decoded = new Map(),
  inputHashes = new Map();
function run(command, arguments_) {
  const result = spawnSync(command, arguments_, {
    maxBuffer: 128 * 1024 * 1024,
  });
  if (result.error)
    throw new Error(
      `${command} is required for image decoding: ${result.error.message}`,
    );
  if (result.status !== 0)
    throw new Error(`${command}: ${result.stderr.toString()}`);
  return result.stdout;
}
function decode(input) {
  const path = resolve(root, input);
  if (decoded.has(path)) return decoded.get(path);
  const metadata = JSON.parse(
    run("ffprobe", [
      "-v",
      "error",
      "-select_streams",
      "v:0",
      "-count_frames",
      "-show_entries",
      "stream=width,height,nb_read_frames",
      "-of",
      "json",
      path,
    ]),
  );
  const { width, height, nb_read_frames } = metadata.streams[0];
  if (Number(nb_read_frames) > 1)
    throw new Error(
      "List animation frames or sprite cells explicitly instead of using an animated container",
    );
  if (width * height > 16_000_000)
    throw new Error("Image exceeds 16 million pixels");
  const data = run("ffmpeg", [
    "-hide_banner",
    "-loglevel",
    "error",
    "-i",
    path,
    "-frames:v",
    "1",
    "-f",
    "rawvideo",
    "-pix_fmt",
    "rgba",
    "pipe:1",
  ]);
  if (data.length !== width * height * 4)
    throw new Error("Invalid decoded RGBA dimensions");
  inputHashes.set(
    input,
    createHash("sha256").update(readFileSync(path)).digest("hex"),
  );
  const image = { width, height, data };
  decoded.set(path, image);
  return image;
}
const results = [],
  palettes = {};
for (const profile of profiles) {
  const density = config.profiles[profile].pixelSize;
  // Include all frames when making a palette, even for --assets selecting just one.
  const frames = config.assets.map((asset) => {
    const settings = { ...config.defaults, ...asset };
    const source = decode(asset.input),
      cut = asset.crop ? cropImage(source, asset.crop) : source;
    const size = dimensions(cut.width, cut.height, asset.display, density);
    if (!Number.isInteger(settings.previewScale) || settings.previewScale < 1)
      throw new Error("previewScale must be an integer");
    if (settings.paletteGroup && settings.dither)
      throw new Error("Animation palette groups require dithering off");
    if (settings.downsample === "nearest-neighbor")
      settings.downsample = "nearest";
    if (settings.downsample === "area") settings.downsample = "box";
    return {
      asset,
      settings,
      image: resize(cut, size.width, size.height, settings.downsample),
    };
  });
  validateAnimationFrames(
    frames.map((f) => ({ ...f.settings, image: f.image })),
  );
  const groups = new Map();
  for (const frame of frames) {
    const key = frame.settings.paletteGroup || frame.asset.id;
    const prior = groups.get(key) || [];
    prior.push(frame);
    groups.set(key, prior);
  }
  for (const [group, frames_] of groups) {
    const settings = frames_[0].settings;
    for (const frame of frames_)
      if (
        frame.settings.colors !== settings.colors ||
        JSON.stringify(frame.settings.palette) !==
          JSON.stringify(settings.palette)
      )
        throw new Error(
          `Palette group ${group} must have the same color settings`,
        );
    let palette = settings.palette;
    if (palette) {
      if (
        !Array.isArray(palette) ||
        !palette.length ||
        !palette.every((c) => /^#[0-9a-f]{6}$/i.test(c))
      )
        throw new Error("Palette must contain #RRGGBB colors");
      palette = palette.map((c) =>
        [1, 3, 5].map((at) => parseInt(c.slice(at, at + 2), 16)),
      );
    } else if (settings.colors !== null && settings.colors !== undefined)
      palette = makePalette(
        frames_.map((f) => f.image),
        settings.colors,
      );
    if (palette) palettes[`${profile}:${group}`] = palette;
    for (const frame of frames_) {
      if (!assets.includes(frame.asset)) continue;
      const image = quantize(frame.image, palette, frame.settings.dither);
      const destination = join(out, profile, `${frame.asset.id}.png`),
        preview = join(previews, profile, `${frame.asset.id}.png`);
      if (sourcePaths.has(destination) || sourcePaths.has(preview))
        throw new Error("Refusing to overwrite source");
      mkdirSync(dirname(destination), { recursive: true });
      mkdirSync(dirname(preview), { recursive: true });
      const encoded = png(image);
      writeOutput(destination, encoded);
      writeOutput(preview, png(enlarge(image, frame.settings.previewScale)));
      results.push({
        id: frame.asset.id,
        profile,
        width: image.width,
        height: image.height,
        pixelSize: density,
        display: frame.asset.display,
        source: frame.asset.input,
        sourceHash: inputHashes.get(frame.asset.input),
        output: relative(root, destination).replaceAll("\\", "/"),
        sha256: createHash("sha256").update(encoded).digest("hex"),
      });
    }
  }
}
const report = {
  version: 1,
  reference: config.reference,
  configHash: createHash("sha256").update(JSON.stringify(config)).digest("hex"),
  assets: results,
  palettes,
};
writeOutput(
  join(previews, "report.json"),
  JSON.stringify(report, null, 2) + "\n",
);
const manifestPath = flag(
  "manifest",
  !selected.length && profiles.includes("standard") && !args.includes("--out")
    ? config.manifest
    : undefined,
);
if (manifestPath) {
  const manifest = {
    version: 1,
    pixelSize: referencePixel,
    assets: Object.fromEntries(
      results
        .filter((r) => r.profile === "standard")
        .map((r) => [
          r.id,
          {
            src: "/" + r.output.replace(/^public\//, ""),
            width: r.width,
            height: r.height,
            pixelSize: r.pixelSize,
          },
        ]),
    ),
  };
  mkdirSync(dirname(resolve(root, manifestPath)), { recursive: true });
  writeOutput(
    resolve(root, manifestPath),
    JSON.stringify(manifest, null, 2) + "\n",
  );
}
const escape = (s) =>
  String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll('"', "&quot;");
const url = (r) =>
  escape(relative(previews, resolve(root, r.output)).replaceAll("\\", "/"));
const picture = (r, extra = "") =>
  `<img alt="${escape(r.id)}" src="${url(r)}" width="${r.width * r.pixelSize}" height="${r.height * r.pixelSize}" ${extra}>`;
const heroProfiles = profiles.filter(
  (profile) =>
    results.some((r) => r.id === "exterior-phone" && r.profile === profile) &&
    results.some((r) => r.id === "ru-idle-128" && r.profile === profile),
);
const heroes = heroProfiles
  .map((profile) => {
    const bg = results.find(
        (r) => r.id === "exterior-phone" && r.profile === profile,
      ),
      cat = results.find(
        (r) => r.id === "ru-idle-128" && r.profile === profile,
      );
    const position = `class="cat" style="left:${Number(cat.display.x) || 0}px;top:${Number(cat.display.y) || 0}px"`;
    return `<figure><figcaption>${escape(config.profiles[profile].label)}：1ドット ${bg.pixelSize} CSS px</figcaption><div class="phone">${picture(bg, 'class="background"')}<h2>みらい博物館</h2>${picture(cat, position)}<button>はいる</button></div></figure>`;
  })
  .join("");
const sections = assets
  .map(
    (asset) =>
      `<section><h2>${escape(asset.id)} / 表示 ${asset.display.width}×${asset.display.height}</h2><div class="comparison">${profiles
        .map((profile) => {
          const r = results.find(
            (r) => r.id === asset.id && r.profile === profile,
          );
          return `<figure><figcaption>${escape(config.profiles[profile].label)} ${r.width}×${r.height} → ${r.pixelSize}倍表示</figcaption><div class="frame" style="width:${asset.display.width}px;height:${asset.display.height}px">${picture(r)}</div></figure>`;
        })
        .join("")}</div></section>`,
  )
  .join("");
writeOutput(
  join(previews, "index.html"),
  `<!doctype html><html lang="ja"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>ドット粒度の比較</title><style>body{margin:24px;background:#0b1429;color:#f7ecd6;font-family:sans-serif}figure{margin:0}figcaption{padding:12px 0}.comparison{display:flex;gap:20px;overflow:auto;padding-bottom:16px}section{margin:40px 0}.frame{position:relative;overflow:hidden;background:repeating-conic-gradient(#182a40 0% 25%,#233750 0% 50%) 0/16px 16px;display:grid;place-items:center;flex:none}img{image-rendering:pixelated;max-width:none;display:block}.phone{position:relative;width:360px;height:640px;overflow:hidden;background:#0b1429}.phone .background{position:absolute;left:0;top:0}.phone h2{position:absolute;top:12px;left:20px;font-size:24px;text-shadow:0 2px 4px #001}.phone .cat{position:absolute;left:116px;top:445px}.phone button{position:absolute;left:100px;top:575px;width:160px;height:56px;background:#182943;color:#f7ecd6;font:700 20px sans-serif;border:1px solid #eac483}</style><h1>ドット粒度の比較</h1><p>同じ表示領域で比較。画像の1ドット幅を変え、文字・ボタンは加工しません。透過の格子は確認用です。</p><div class="comparison">${heroes}</div>${sections}</html>`,
);
console.log(
  `Processed ${results.length} assets. Reference ${config.reference.render.width}×${config.reference.render.height}, ${referencePixel} CSS px/dot. Preview: ${relative(root, join(previews, "index.html"))}`,
);
