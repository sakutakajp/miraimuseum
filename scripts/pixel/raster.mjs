import { deflateSync } from "node:zlib";

export function dimensions(sourceWidth, sourceHeight, display, pixelSize) {
  if (
    ![
      sourceWidth,
      sourceHeight,
      display.width,
      display.height,
      pixelSize,
    ].every((n) => Number.isFinite(n) && n > 0)
  )
    throw new Error("Dimensions must be positive");
  const scale = Math.min(
    display.width / (pixelSize * sourceWidth),
    display.height / (pixelSize * sourceHeight),
  );
  return {
    width: Math.max(1, Math.round(sourceWidth * scale)),
    height: Math.max(1, Math.round(sourceHeight * scale)),
  };
}
export function cropImage(image, rect) {
  const { x, y, width, height } = rect;
  if (
    ![x, y, width, height].every(Number.isInteger) ||
    x < 0 ||
    y < 0 ||
    width < 1 ||
    height < 1 ||
    x + width > image.width ||
    y + height > image.height
  )
    throw new Error("Crop must be an explicit rectangle inside the source");
  const data = Buffer.alloc(width * height * 4);
  for (let row = 0; row < height; row++)
    image.data.copy(
      data,
      row * width * 4,
      ((y + row) * image.width + x) * 4,
      ((y + row) * image.width + x + width) * 4,
    );
  return { width, height, data };
}
/** Box/area averages in premultiplied alpha; invisible RGB cannot tint the edge. */
export function resize(image, width, height, method = "box") {
  if (!["box", "nearest"].includes(method))
    throw new Error(`Unknown resize method ${method}`);
  const data = Buffer.alloc(width * height * 4),
    sx = image.width / width,
    sy = image.height / height;
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      const target = (y * width + x) * 4;
      if (method === "nearest") {
        const index =
          (Math.min(image.height - 1, Math.floor((y + 0.5) * sy)) *
            image.width +
            Math.min(image.width - 1, Math.floor((x + 0.5) * sx))) *
          4;
        image.data.copy(data, target, index, index + 4);
        if (!data[target + 3]) data.fill(0, target, target + 3);
        continue;
      }
      const left = x * sx,
        right = (x + 1) * sx,
        top = y * sy,
        bottom = (y + 1) * sy;
      let r = 0,
        g = 0,
        b = 0,
        alpha = 0,
        area = 0;
      for (let iy = Math.floor(top); iy < Math.ceil(bottom); iy++)
        for (let ix = Math.floor(left); ix < Math.ceil(right); ix++) {
          const weight =
            (Math.min(right, ix + 1) - Math.max(left, ix)) *
            (Math.min(bottom, iy + 1) - Math.max(top, iy));
          const index =
              (Math.min(image.height - 1, iy) * image.width +
                Math.min(image.width - 1, ix)) *
              4,
            a = image.data[index + 3] / 255;
          alpha += a * weight;
          area += weight;
          r += image.data[index] * a * weight;
          g += image.data[index + 1] * a * weight;
          b += image.data[index + 2] * a * weight;
        }
      data[target + 3] = Math.round((alpha / area) * 255);
      if (alpha && data[target + 3]) {
        data[target] = Math.round(r / alpha);
        data[target + 1] = Math.round(g / alpha);
        data[target + 2] = Math.round(b / alpha);
      }
    }
  return { width, height, data };
}
export function enlarge(image, factor) {
  if (!Number.isInteger(factor) || factor < 1)
    throw new Error("Enlargement must be an integer");
  return resize(image, image.width * factor, image.height * factor, "nearest");
}
/** One deterministic, alpha-weighted palette across every frame in the group. */
export function makePalette(images, count) {
  if (!Number.isInteger(count) || count < 2 || count > 256)
    throw new Error("Color count must be 2..256");
  const histogram = new Map();
  for (const image of images)
    for (let i = 0; i < image.data.length; i += 4) {
      if (!image.data[i + 3]) continue;
      const color = [image.data[i], image.data[i + 1], image.data[i + 2]],
        key = color.join(",");
      const prior = histogram.get(key);
      if (prior) prior.weight += image.data[i + 3] / 255;
      else histogram.set(key, { color, weight: image.data[i + 3] / 255 });
    }
  if (!histogram.size) return [[0, 0, 0]];
  const boxes = [
    [...histogram.values()].sort(
      (a, b) =>
        a.color[0] - b.color[0] ||
        a.color[1] - b.color[1] ||
        a.color[2] - b.color[2],
    ),
  ];
  const ranges = (box) =>
    [0, 1, 2].map((c) => {
      let low = 255,
        high = 0;
      for (const p of box) {
        low = Math.min(low, p.color[c]);
        high = Math.max(high, p.color[c]);
      }
      return high - low;
    });
  while (boxes.length < count) {
    let chosen = -1,
      score = -1;
    boxes.forEach((box, i) => {
      if (box.length < 2) return;
      const range = Math.max(...ranges(box)),
        s = range * box.reduce((n, p) => n + p.weight, 0);
      if (s > score) {
        score = s;
        chosen = i;
      }
    });
    if (chosen < 0) break;
    const box = boxes[chosen],
      range = ranges(box),
      channel = range.indexOf(Math.max(...range));
    box.sort(
      (a, b) =>
        a.color[channel] - b.color[channel] ||
        a.color[0] - b.color[0] ||
        a.color[1] - b.color[1] ||
        a.color[2] - b.color[2],
    );
    const half = box.reduce((n, p) => n + p.weight, 0) / 2;
    let weight = 0,
      cut = 1;
    for (let i = 0; i < box.length - 1; i++) {
      weight += box[i].weight;
      cut = i + 1;
      if (weight >= half) break;
    }
    boxes.splice(chosen, 1, box.slice(0, cut), box.slice(cut));
  }
  return boxes.map((box) => {
    const total = box.reduce((n, p) => n + p.weight, 0);
    return [0, 1, 2].map((c) =>
      Math.round(box.reduce((n, p) => n + p.color[c] * p.weight, 0) / total),
    );
  });
}
export function quantize(image, palette, dither = false) {
  if (!palette?.length) return image;
  const data = Buffer.from(image.data),
    errors = new Float64Array(data.length);
  for (let y = 0; y < image.height; y++)
    for (let x = 0; x < image.width; x++) {
      const index = (y * image.width + x) * 4;
      if (!data[index + 3]) {
        data.fill(0, index, index + 3);
        continue;
      }
      const color = [0, 1, 2].map((c) =>
        Math.max(0, Math.min(255, data[index + c] + errors[index + c])),
      );
      let nearest = palette[0],
        distance = Infinity;
      for (const entry of palette) {
        const d = entry.reduce((n, v, c) => n + (v - color[c]) ** 2, 0);
        if (d < distance) {
          distance = d;
          nearest = entry;
        }
      }
      nearest.forEach((value, c) => (data[index + c] = value));
      if (dither)
        for (const [dx, dy, w] of [
          [1, 0, 7 / 16],
          [-1, 1, 3 / 16],
          [0, 1, 5 / 16],
          [1, 1, 1 / 16],
        ]) {
          const nx = x + dx,
            ny = y + dy;
          if (nx < 0 || nx >= image.width || ny >= image.height) continue;
          const next = (ny * image.width + nx) * 4;
          if (!data[next + 3]) continue;
          nearest.forEach((v, c) => (errors[next + c] += (color[c] - v) * w));
        }
    }
  return { ...image, data };
}
const table = Array.from({ length: 256 }, (_, n) => {
  for (let i = 0; i < 8; i++) n = n & 1 ? 0xedb88320 ^ (n >>> 1) : n >>> 1;
  return n >>> 0;
});
function chunk(type, data) {
  const name = Buffer.from(type),
    body = Buffer.concat([name, data]),
    header = Buffer.alloc(4),
    crc = Buffer.alloc(4);
  header.writeUInt32BE(data.length);
  let value = 0xffffffff;
  for (const byte of body) value = table[(value ^ byte) & 255] ^ (value >>> 8);
  crc.writeUInt32BE((value ^ 0xffffffff) >>> 0);
  return Buffer.concat([header, body, crc]);
}
/** RGBA PNG with fixed filters/compression and no timestamps or ancillary metadata. */
export function png(image) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(image.width);
  header.writeUInt32BE(image.height, 4);
  header[8] = 8;
  header[9] = 6;
  const scanlines = Buffer.alloc((image.width * 4 + 1) * image.height);
  for (let y = 0; y < image.height; y++)
    image.data.copy(
      scanlines,
      y * (image.width * 4 + 1) + 1,
      y * image.width * 4,
      (y + 1) * image.width * 4,
    );
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", header),
    chunk("IDAT", deflateSync(scanlines, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

export function validateAnimationFrames(frames) {
  const groups = new Map();
  for (const frame of frames) {
    if (!frame.animationGroup) continue;
    if (frame.dither) throw new Error("Animation dithering can flicker");
    if (!frame.paletteGroup)
      throw new Error("Animation frames require a shared paletteGroup");
    const signature = `${frame.image.width}x${frame.image.height}:${frame.paletteGroup}`,
      old = groups.get(frame.animationGroup);
    if (old && old !== signature)
      throw new Error(
        "All animation frames must have the same resolution and palette group",
      );
    groups.set(frame.animationGroup, signature);
  }
}
