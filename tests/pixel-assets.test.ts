import { expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { inflateSync } from "node:zlib";
import {
  cropImage,
  dimensions,
  resize,
  enlarge,
  makePalette,
  quantize,
  png,
  validateAnimationFrames,
} from "../scripts/pixel/raster.mjs";

const image = (width: number, height: number, bytes: number[]) => ({
  width,
  height,
  data: Buffer.from(bytes),
});
it("uses actual display footprints, not one file size for both the portrait background and cat", () => {
  expect(dimensions(576, 1024, { width: 360, height: 640 }, 2)).toEqual({
    width: 180,
    height: 320,
  });
  expect(dimensions(724, 724, { width: 96, height: 96 }, 2)).toEqual({
    width: 48,
    height: 48,
  });
  expect(dimensions(1536, 1024, { width: 336, height: 224 }, 2)).toEqual({
    width: 168,
    height: 112,
  });
  expect(() => dimensions(1, 1, { width: 0, height: 640 }, 2)).toThrow();
});
it("box resizing keeps color out of invisible pixels and preserves a translucent edge", () => {
  const source = image(2, 1, [255, 0, 0, 255, 0, 255, 0, 0]);
  expect([...resize(source, 1, 1, "box").data]).toEqual([255, 0, 0, 128]);
  expect([
    ...quantize(resize(source, 1, 1, "box"), [
      [255, 0, 0],
      [0, 0, 0],
    ]).data,
  ]).toEqual([255, 0, 0, 128]);
  expect([...resize(image(1, 1, [12, 88, 230, 0]), 1, 1, "box").data]).toEqual([
    0, 0, 0, 0,
  ]);
});
it("nearest enlargement duplicates exact RGBA blocks without blur or palette drift", () => {
  const source = image(2, 1, [200, 4, 55, 255, 7, 22, 99, 128]);
  const bigger = enlarge(source, 3);
  expect(bigger.width).toBe(6);
  expect(bigger.height).toBe(3);
  for (let y = 0; y < 3; y++)
    for (let x = 0; x < 6; x++)
      expect([
        ...bigger.data.slice((y * 6 + x) * 4, (y * 6 + x + 1) * 4),
      ]).toEqual(x < 3 ? [200, 4, 55, 255] : [7, 22, 99, 128]);
  expect(() => enlarge(source, 1.5)).toThrow();
});
it("only crops an explicitly valid rectangle and retains its aspect", () => {
  const source = image(2, 1, [255, 0, 0, 255, 0, 0, 255, 255]);
  expect([
    ...cropImage(source, { x: 1, y: 0, width: 1, height: 1 }).data,
  ]).toEqual([0, 0, 255, 255]);
  expect(() =>
    cropImage(source, { x: 0, y: 0, width: 3, height: 1 }),
  ).toThrow();
});
it("builds one repeatable palette from all poses, excluding invisible RGB", () => {
  const frames = [
    image(2, 1, [255, 0, 0, 255, 1, 250, 3, 0]),
    image(2, 1, [0, 0, 255, 255, 0, 0, 255, 128]),
  ];
  const palette = makePalette(frames, 2);
  expect(palette).toEqual(makePalette(frames, 2));
  expect(palette).toContainEqual([255, 0, 0]);
  expect(palette).toContainEqual([0, 0, 255]);
  for (const frame of frames) {
    const converted = quantize(frame, palette);
    for (let at = 0; at < frame.data.length; at += 4)
      expect(converted.data[at + 3]).toBe(frame.data[at + 3]);
  }
});
it("produces byte-identical PNGs with correct RGBA scanlines and no creation time", () => {
  const source = image(2, 1, [2, 4, 6, 255, 8, 10, 12, 128]),
    encoded = png(source);
  expect(encoded).toEqual(png(source));
  expect(encoded.readUInt32BE(16)).toBe(2);
  expect(encoded.readUInt32BE(20)).toBe(1);
  const length = encoded.readUInt32BE(33);
  expect(inflateSync(encoded.subarray(41, 41 + length))).toEqual(
    Buffer.from([0, ...source.data]),
  );
});
it("requires the same grid for all frames in one animation variant", () => {
  const first = {
    animationGroup: "walk",
    paletteGroup: "ru",
    image: { width: 48, height: 48 },
    dither: false,
  };
  expect(() =>
    validateAnimationFrames([
      first,
      { ...first, image: { width: 49, height: 48 } },
    ]),
  ).toThrow();
  expect(() =>
    validateAnimationFrames([first, { ...first, dither: true }]),
  ).toThrow();
  expect(() => validateAnimationFrames([first, { ...first }])).not.toThrow();
  expect(() =>
    validateAnimationFrames([first, { ...first, paletteGroup: "other" }]),
  ).toThrow();
  expect(() =>
    validateAnimationFrames([{ ...first, paletteGroup: undefined }]),
  ).toThrow();
});
it("applies a shared palette and matching display size to the actual three Ru poses", () => {
  const config = JSON.parse(
    readFileSync("assets/pixel-art.config.json", "utf8"),
  );
  for (const size of [96, 128]) {
    const frames = config.assets.filter(
      (a: any) => a.animationGroup === `ru-${size}`,
    );
    expect(frames).toHaveLength(3);
    expect(
      new Set(frames.map((a: any) => `${a.display.width}x${a.display.height}`))
        .size,
    ).toBe(1);
    expect(new Set(frames.map((a: any) => a.paletteGroup))).toEqual(
      new Set(["ru"]),
    );
  }
});

it("retains the actual cat eyes, collar gem, paws and transparent outline on the standard grid", () => {
  for (const size of [96, 128]) {
    const bytes = readFileSync(
      `public/museum/pixel/standard/ru-idle-${size}.png`,
    );
    const width = bytes.readUInt32BE(16),
      height = bytes.readUInt32BE(20);
    const length = bytes.readUInt32BE(33),
      scan = inflateSync(bytes.subarray(41, 41 + length));
    let amber = 0,
      gem = 0,
      paws = 0,
      transparent = 0,
      partial = 0;
    const palette = JSON.parse(
      readFileSync("docs/pixel-previews/report.json", "utf8"),
    ).palettes["standard:ru"].map((color: number[]) => color.join(","));
    for (let y = 0; y < height; y++)
      for (let x = 0; x < width; x++) {
        const i = y * (width * 4 + 1) + 1 + x * 4,
          [r, g, b, a] = scan.subarray(i, i + 4);
        if (a === 0) {
          transparent++;
          expect([r, g, b]).toEqual([0, 0, 0]);
          continue;
        }
        if (a < 255) partial++;
        expect(palette).toContain([r, g, b].join(","));
        if (y < height * 0.55 && r > 130 && g > 65 && b < r * 0.6) amber++;
        if (
          y > height * 0.3 &&
          y < height * 0.7 &&
          g > 110 &&
          b > 100 &&
          r < g * 0.8
        )
          gem++;
        if (y > height * 0.75 && a > 200 && r < 90 && g < 90 && b < 110) paws++;
      }
    expect(amber).toBeGreaterThan(3);
    expect(gem).toBeGreaterThan(0);
    expect(paws).toBeGreaterThan(12);
    expect(transparent).toBeGreaterThan(100);
    expect(partial).toBeGreaterThan(0);
  }
});
