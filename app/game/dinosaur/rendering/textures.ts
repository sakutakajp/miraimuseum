import Phaser from "phaser";
import { COLORS } from "../config/visual";
function rng(seed: number) {
  return () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}
export function createTextures(scene: Phaser.Scene) {
  const create = (
    name: string,
    width: number,
    height: number,
    draw: (c: CanvasRenderingContext2D) => void,
  ) => {
    if (scene.textures.exists(name)) return;
    const texture = scene.textures.createCanvas(name, width, height)!;
    draw(texture.context);
    texture.refresh();
  };
  create("dt-sky", 512, 1024, (c) => {
    const g = c.createLinearGradient(0, 0, 0, 1024);
    g.addColorStop(0, "#777e72");
    g.addColorStop(0.42, "#b1b19a");
    g.addColorStop(0.7, "#d2cdb6");
    g.addColorStop(1, "#757f65");
    c.fillStyle = g;
    c.fillRect(0, 0, 512, 1024);
    const rand = rng(66);
    for (let i = 0; i < 25000; i++) {
      c.fillStyle = i % 2 ? "rgba(16,17,15,.065)" : "rgba(233,228,216,.10)";
      c.fillRect(rand() * 512, rand() * 1024, 1, 1);
    }
  });
  for (const [name, color, seed] of [
    ["dt-geology", "#929980", 98],
    ["dt-mass", "#69755e", 127],
    ["dt-forest", "#3b4938", 32],
  ] as const)
    create(name, 1536, 560, (c) => {
      const r = rng(seed);
      c.fillStyle = color;
      c.beginPath();
      c.moveTo(0, 560);
      c.lineTo(0, 220 + Math.sin(seed) * 68);
      const heightAt = (x: number) =>
        220 +
        Math.sin((x * Math.PI * 2) / 1536 + seed) * 68 +
        Math.sin((x * Math.PI * 6) / 1536) * 29;
      for (let x = 0; x < 1536; x += 64)
        c.bezierCurveTo(
          x + 20,
          heightAt(x + 20),
          x + 44,
          heightAt(x + 44),
          x + 64,
          heightAt(x + 64),
        );
      c.lineTo(1536, 560);
      c.closePath();
      c.fill();
      if (name === "dt-forest")
        for (let i = 0; i < 32; i++) {
          const x = r() * 1536,
            y = 290 + r() * 90,
            h = 60 + r() * 135;
          c.strokeStyle = "#29382b";
          c.lineWidth = 3;
          c.beginPath();
          c.moveTo(x, y + 80);
          c.lineTo(x + 4, y - h);
          c.stroke();
          for (let j = 0; j < 14; j++) {
            const fy = y - h + (j * h) / 14,
              span = (1 - j / 18) * 38;
            for (const d of [-1, 1]) {
              c.lineWidth = 2;
              c.beginPath();
              c.moveTo(x + 4, fy);
              c.quadraticCurveTo(
                x + d * span * 0.5,
                fy - 10,
                x + d * span,
                fy - 15,
              );
              c.stroke();
              for (let k = 1; k < 6; k++) {
                const fx = x + (d * span * k) / 6;
                c.lineWidth = 1;
                c.beginPath();
                c.moveTo(fx, fy - k * 2.5);
                c.lineTo(fx + d * 7, fy - k * 2.5 - 10);
                c.stroke();
              }
            }
          }
        }
      c.strokeStyle = "rgba(233,228,216,.12)";
      c.lineWidth = 1;
      for (let k = 0; k < (name === "dt-forest" ? 0 : 7); k++) {
        c.beginPath();
        for (let x = 0; x <= 1536; x += 20) {
          const y = 300 + k * 16 + Math.sin(x / 90 + k) * 8;
          x ? c.lineTo(x, y) : c.moveTo(x, y);
        }
        c.stroke();
      }
      for (let i = 0; i < 10000; i++) {
        c.fillStyle = "rgba(16,17,15,.07)";
        c.fillRect(r() * 1536, 300 + r() * 260, 1 + r() * 2, 1);
      }
    });
  create("dt-ground", 512, 512, (c) => {
    c.fillStyle = "#10110f";
    c.fillRect(0, 0, 512, 512);
    const r = rng(194);
    for (let y = 7; y < 500; y += 22) {
      c.strokeStyle = y < 75 ? "#555849" : "#3c3e34";
      c.lineWidth = y % 3 === 0 ? 2 : 1;
      c.beginPath();
      for (let x = 0; x <= 512; x += 8) {
        const py = y + Math.sin(x / 37 + y) * 3;
        x ? c.lineTo(x, py) : c.moveTo(x, py);
      }
      c.stroke();
    }
    c.fillStyle = "#b7a68a";
    c.fillRect(0, 0, 512, 2);
    c.fillStyle = "#53654b";
    c.fillRect(0, 3, 512, 4);
    for (let i = 0; i < 2800; i++) {
      c.fillStyle = i % 2 ? "#414238" : "#262820";
      c.fillRect(r() * 512, 12 + r() * 500, 1 + r() * 3, 1);
    }
  });
  create("dt-fern", 512, 240, (c) => {
    const r = rng(169);
    for (let i = 0; i < 9; i++) {
      const x = i * 65 + 12,
        h = 70 + r() * 120;
      c.strokeStyle = "#10110f";
      c.lineWidth = 4;
      c.beginPath();
      c.moveTo(x, 240);
      c.quadraticCurveTo(x + 6, 180, x + 27, 240 - h);
      c.stroke();
      for (let j = 0; j < 11; j++) {
        const y = 232 - (j * h) / 12,
          w = (1 - j / 13) * 30;
        for (const d of [-1, 1]) {
          c.fillStyle = "#10110f";
          c.beginPath();
          c.moveTo(x + j * 2, y);
          c.quadraticCurveTo(
            x + j * 2 + d * w,
            y - 19,
            x + j * 2 + d * w * 1.2,
            y - 23,
          );
          c.quadraticCurveTo(x + j * 2 + d * w * 0.55, y + 1, x + j * 2, y);
          c.fill();
        }
      }
    }
  });
  create("dt-grain", 256, 256, (c) => {
    const r = rng(420);
    for (let i = 0; i < 6500; i++) {
      c.fillStyle = i % 2 ? "rgba(233,228,216,.12)" : "rgba(16,17,15,.1)";
      c.fillRect(r() * 256, r() * 256, 1, 1);
    }
  });
  for (const key of ["dt-sky", "dt-geology", "dt-mass", "dt-forest"]) {
    const src = scene.textures.get(key).getSourceImage() as HTMLCanvasElement;
    create(key + "-ash", src.width, src.height, (c) => {
      c.drawImage(src, 0, 0);
      const pixels = c.getImageData(0, 0, src.width, src.height);
      for (let i = 0; i < pixels.data.length; i += 4) {
        const l =
          pixels.data[i]! * 0.25 +
          pixels.data[i + 1]! * 0.6 +
          pixels.data[i + 2]! * 0.15;
        pixels.data[i] = l;
        pixels.data[i + 1] = l;
        pixels.data[i + 2] = l;
      }
      c.putImageData(pixels, 0, 0);
    });
  }
  create("dt-particle", 12, 12, (c) => {
    c.fillStyle = "#e9e4d8";
    c.beginPath();
    c.moveTo(2, 2);
    c.lineTo(11, 4);
    c.lineTo(8, 10);
    c.lineTo(1, 7);
    c.fill();
  });
  create("dt-sun", 256, 256, (c) => {
    const g = c.createRadialGradient(128, 128, 0, 128, 128, 128);
    g.addColorStop(0, "rgba(233,228,216,.7)");
    g.addColorStop(0.5, "rgba(233,228,216,.26)");
    g.addColorStop(1, "rgba(233,228,216,0)");
    c.fillStyle = g;
    c.fillRect(0, 0, 256, 256);
  });
}
export function loadPlates(scene: Phaser.Scene) {
  for (const species of ["rex", "tri"])
    for (const depth of ["far", "mid", "near"])
      for (let i = 0; i < 4; i++)
        scene.load.svg(
          `dt-${species}-${depth}-${i}`,
          `/deep-time/${species}-${depth}-${i}.svg`,
        );
  for (let i = 0; i < 8; i++)
    scene.load.svg(`dt-brachiosaurus-${i}`, `/deep-time/brachiosaurus-${i}.svg`);
  for (const kind of ["rock", "root", "branch"])
    scene.load.svg(`dt-${kind}`, `/deep-time/${kind}.svg`);
}
