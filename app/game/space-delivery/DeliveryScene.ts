import Phaser from "phaser";
import { SHIP_RADIUS, velocityFor } from "./physics";
import type { DeliveryRuntime } from "./runtime";
import type { Flight } from "./types";
export class DeliveryScene extends Phaser.Scene {
  private art!: Phaser.GameObjects.Graphics;
  private lines!: Phaser.GameObjects.Graphics;
  private ship!: Phaser.GameObjects.Graphics;
  private elapsed = 0;
  private dockingAge = 0;
  private deliveredFlight?: Flight;
  constructor(
    private runtime: DeliveryRuntime,
    private reducedMotion: boolean,
    private ready: () => void,
  ) {
    super("space-delivery");
  }
  create() {
    this.art = this.add.graphics();
    this.lines = this.add.graphics();
    this.ship = this.add.graphics();
    this.ready();
  }
  override update(_time: number, delta: number) {
    this.runtime.tick(delta / 1000);
    if (this.runtime.mode !== "paused")
      this.elapsed += Math.min(delta / 1000, 0.1);
    if (this.runtime.mode === "success") {
      if (this.deliveredFlight !== this.runtime.flight) {
        this.deliveredFlight = this.runtime.flight;
        this.dockingAge = 0;
      }
      this.dockingAge += Math.min(delta / 1000, 0.1);
    }
    this.draw();
  }
  private cat(
    g: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    happy: boolean,
    color = 0xffe5c6,
  ) {
    g.fillStyle(color);
    g.fillTriangle(x - 13, y - 6, x - 12, y - 21, x - 2, y - 11);
    g.fillTriangle(x + 13, y - 6, x + 12, y - 21, x + 2, y - 11);
    g.fillEllipse(x, y, 29, 25);
    g.fillStyle(0xe89aa5);
    g.fillTriangle(x - 10, y - 11, x - 10, y - 17, x - 5, y - 11);
    g.fillTriangle(x + 10, y - 11, x + 10, y - 17, x + 5, y - 11);
    g.lineStyle(1.7, 0x26344b);
    g.beginPath();
    if (happy) {
      g.arc(x - 6, y - 2, 3, Math.PI, Math.PI * 2);
      g.moveTo(x + 3, y - 2);
      g.arc(x + 6, y - 2, 3, Math.PI, Math.PI * 2);
    } else {
      g.moveTo(x - 6, y - 3);
      g.lineTo(x - 6, y);
      g.moveTo(x + 6, y - 3);
      g.lineTo(x + 6, y);
    }
    g.strokePath();
    g.fillStyle(0xd48692);
    g.fillTriangle(x - 2, y + 2, x + 2, y + 2, x, y + 4);
    g.lineStyle(1, 0xc38d86, 0.7);
    g.lineBetween(x - 9, y + 3, x - 17, y + 1);
    g.lineBetween(x + 9, y + 3, x + 17, y + 1);
  }
  private parcel(
    g: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    size = 12,
  ) {
    g.fillStyle(0xeeb46b);
    g.fillRoundedRect(x - size / 2, y - size / 2, size, size, 2);
    g.fillStyle(0xffdfad);
    g.fillRect(x - 1.5, y - size / 2, 3, size);
    g.lineStyle(1, 0x9f7548);
    g.strokeRect(x - size / 2, y - size / 2, size, size);
  }
  private star(
    g: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    alpha: number,
  ) {
    const points = Array.from({ length: 10 }, (_, i) => {
      const a = -Math.PI / 2 + (i * Math.PI) / 5,
        r = i % 2 ? 5.5 : 12;
      return { x: x + Math.cos(a) * r, y: y + Math.sin(a) * r };
    });
    g.fillStyle(0xffd66d, alpha);
    g.fillPoints(points, true);
    g.lineStyle(1.5, 0xffedb5, alpha);
    g.strokePoints(points, true);
  }
  private path(
    points: { x: number; y: number }[],
    color: number,
    alpha: number,
    dots = false,
  ) {
    const g = this.lines;
    if (dots) {
      g.fillStyle(color, alpha);
      points.forEach((p, i) => {
        if (i % 2 === 0) g.fillCircle(p.x, p.y, 1.8);
      });
    } else {
      g.lineStyle(1.3, color, alpha);
      g.beginPath();
      points.forEach((p, i) => {
        if (i % 3 !== 0 && i !== points.length - 1) return;
        if (i === 0) g.moveTo(p.x, p.y);
        else g.lineTo(p.x, p.y);
      });
      g.strokePath();
    }
  }
  private draw() {
    const r = this.runtime,
      s = r.stage,
      g = this.art;
    g.clear();
    this.lines.clear();
    this.ship.clear();
    g.fillStyle(0x0c142c);
    g.fillRect(0, 0, 360, 520);
    g.fillStyle(0x17233c, 0.7);
    g.fillEllipse(95, 380, 300, 510);
    g.fillStyle(0x1e2045, 0.25);
    g.fillEllipse(315, 100, 260, 330);
    for (let i = 0; i < 65; i++) {
      const x = ((i * 137.51 + 25) % 350) + 5,
        y = ((i * 81.43 + 18) % 510) + 5;
      g.fillStyle(i % 5 === 0 ? 0xb3cbe4 : 0x647293, i % 5 === 0 ? 0.52 : 0.3);
      g.fillCircle(x, y, i % 7 === 0 ? 1.1 : 0.6);
    }
    for (const p of s.planets) {
      g.lineStyle(1, p.color, 0.12);
      g.strokeCircle(p.x, p.y, p.radius * 2.4);
      g.fillStyle(0x000000, 0.2);
      g.fillEllipse(p.x + 3, p.y + 7, p.radius * 2 + 5, p.radius * 2 + 5);
      g.fillStyle(p.color);
      g.fillCircle(p.x, p.y, p.radius);
      g.fillStyle(0x101b4f, 0.25);
      g.fillEllipse(
        p.x + p.radius * 0.27,
        p.y + p.radius * 0.16,
        p.radius * 1.35,
        p.radius * 1.62,
      );
      g.fillStyle(0xffffff, 0.11);
      g.fillEllipse(
        p.x - p.radius * 0.25,
        p.y - p.radius * 0.28,
        p.radius * 0.9,
        p.radius * 0.6,
      );
      g.fillStyle(0xffffff, 0.14);
      g.fillCircle(
        p.x - p.radius * 0.42,
        p.y - p.radius * 0.35,
        p.radius * 0.13,
      );
      g.lineStyle(1, 0xffffff, 0.22);
      g.strokeCircle(p.x, p.y, p.radius);
      g.lineStyle(3, p.color, 0.25);
      g.beginPath();
      g.arc(p.x, p.y, p.radius + 5, -2.6, -1.3);
      g.strokePath();
    }
    for (const rock of s.obstacles) {
      const pts = Array.from({ length: 8 }, (_, i) => {
        const a = (i * Math.PI) / 4,
          rad = rock.radius * (i % 2 ? 0.86 : 1);
        return { x: rock.x + Math.cos(a) * rad, y: rock.y + Math.sin(a) * rad };
      });
      g.fillStyle(0x6e7b96);
      g.fillPoints(pts, true);
      g.lineStyle(1.5, 0xb1bbcd);
      g.strokePoints(pts, true);
      g.fillStyle(0x38455f);
      g.fillCircle(rock.x - 3, rock.y + 2, rock.radius * 0.27);
    }
    const d = s.destination,
      success = r.mode === "success";
    g.fillStyle(0x86ead6, 0.05);
    g.fillCircle(d.x, d.y, d.radius + 9);
    g.fillStyle(0x71e1c8, 0.06);
    g.fillCircle(d.x, d.y, d.radius);
    g.lineStyle(success ? 4 : 2.5, 0x8ef3d5, success ? 1 : 0.85);
    g.strokeCircle(d.x, d.y, d.radius);
    g.lineStyle(1, 0x8ef3d5, 0.26);
    g.strokeCircle(d.x, d.y, d.radius + 5);
    for (let i = 0; i < 4; i++) {
      const a =
        (i * Math.PI) / 2 + (this.reducedMotion ? 0 : this.elapsed * 0.14);
      g.fillStyle(0xd4fff0);
      g.fillCircle(
        d.x + Math.cos(a) * d.radius,
        d.y + Math.sin(a) * d.radius,
        2.5,
      );
    }
    // Receiver is outside the safe ring. Its parcel icon identifies the destination without relying on color.
    const stationX = Math.min(328, d.x + d.radius + 19),
      stationY = d.y;
    g.fillStyle(0x263b52);
    g.fillRoundedRect(stationX - 20, stationY - 12, 40, 38, 9);
    g.lineStyle(1, 0x8ef3d5, 0.45);
    g.strokeRoundedRect(stationX - 20, stationY - 12, 40, 38, 9);
    this.cat(g, stationX, stationY - 5, success && this.dockingAge > 0.55);
    if (!success || this.dockingAge > 1)
      this.parcel(g, stationX, stationY + 20, 11);
    for (let i = 0; i < s.stars.length; i++) {
      const star = s.stars[i]!;
      if (!r.flight.collected.includes(i)) this.star(g, star.x, star.y, 1);
      else {
        g.lineStyle(1, 0xffd66d, 0.35);
        g.strokeCircle(star.x, star.y, 7);
      }
    }
    g.lineStyle(1.5, 0x97adc7, 0.35);
    g.strokeEllipse(s.launch.x, s.launch.y + 12, 38, 12);
    this.path(r.previousTrail, 0xa6b9d8, 0.2);
    this.path(r.trail, 0xbceeff, 0.58);
    if (r.mode === "ready" || r.mode === "aiming") {
      this.path(r.prediction.points, 0xd6edff, 0.78, true);
      if (r.prediction.state.outcome === "failure") {
        const p = r.prediction.state.position;
        this.lines.lineStyle(2, 0xff9ba6, 0.9);
        this.lines.lineBetween(p.x - 4, p.y - 4, p.x + 4, p.y + 4);
        this.lines.lineBetween(p.x - 4, p.y + 4, p.x + 4, p.y - 4);
      }
      const v = velocityFor(r.shot),
        len = 30 + (r.shot.speed / s.maxSpeed) * 18,
        mag = Math.hypot(v.x, v.y),
        nx = v.x / mag,
        ny = v.y / mag;
      this.lines.lineStyle(2.5, 0xffd77a);
      this.lines.lineBetween(
        s.launch.x + nx * 18,
        s.launch.y + ny * 18,
        s.launch.x + nx * len,
        s.launch.y + ny * len,
      );
      const tip = { x: s.launch.x + nx * len, y: s.launch.y + ny * len };
      this.lines.lineBetween(
        tip.x,
        tip.y,
        tip.x - nx * 7 - ny * 4,
        tip.y - ny * 7 + nx * 4,
      );
      this.lines.lineBetween(
        tip.x,
        tip.y,
        tip.x - nx * 7 + ny * 4,
        tip.y - ny * 7 - nx * 4,
      );
    }
    const ship = this.ship,
      fly = r.mode === "flying" || (r.mode === "paused" && r.flight.time > 0),
      p = success
        ? d
        : fly || r.mode === "failure"
          ? r.flight.position
          : s.launch;
    const dock = this.reducedMotion ? 1 : Math.min(1, this.dockingAge / 0.55);
    const smoothDock = dock * dock * (3 - 2 * dock);
    ship.setPosition(
      success
        ? r.flight.position.x + (d.x - r.flight.position.x) * smoothDock
        : p.x,
      success
        ? r.flight.position.y + (d.y - r.flight.position.y) * smoothDock
        : p.y,
    );
    const v = fly ? r.flight.velocity : velocityFor(r.shot);
    ship.setRotation(success ? 0 : Math.atan2(v.x, -v.y));
    if (success && this.dockingAge > 0.55 && this.dockingAge < 1) {
      const transfer = this.reducedMotion ? 1 : (this.dockingAge - 0.55) / 0.45;
      this.parcel(
        this.lines,
        d.x + (stationX - d.x) * transfer,
        d.y + 9 + 11 * transfer,
        10,
      );
    }
    if (r.mode === "failure") {
      ship.fillStyle(0xd9e4fa, 0.25);
      for (let i = 0; i < 5; i++)
        ship.fillCircle(Math.cos(i * 1.3) * 12, Math.sin(i * 1.3) * 12, 6);
      return;
    }
    if (fly && !this.reducedMotion) {
      ship.fillStyle(0xffc779, 0.8);
      ship.fillTriangle(-4, 11, 4, 11, 0, 20 + Math.sin(this.elapsed * 30) * 3);
    }
    ship.fillStyle(0x7bcdbf);
    ship.fillTriangle(-8, 1, -15, 12, -5, 10);
    ship.fillTriangle(8, 1, 15, 12, 5, 10);
    ship.fillStyle(0xfff1d8);
    ship.fillEllipse(0, 0, SHIP_RADIUS * 2 + 7, 28);
    ship.lineStyle(1, 0xd8ddec);
    ship.strokeEllipse(0, 0, 21, 28);
    ship.fillStyle(0xffedcb);
    ship.fillTriangle(-7, -6, -8, -16, -1, -10);
    ship.fillTriangle(7, -6, 8, -16, 1, -10);
    ship.fillStyle(0x48617f);
    ship.fillCircle(0, -1, 7.5);
    ship.fillStyle(0xffdec0);
    ship.fillEllipse(0, 0, 10, 8);
    ship.fillStyle(0x20344a);
    ship.fillCircle(-2, -1, 1);
    ship.fillCircle(2, -1, 1);
    if (!success || this.dockingAge < 0.55) this.parcel(ship, 0, 9, 6);
    if (success && !this.reducedMotion && this.dockingAge < 1.6) {
      for (let i = 0; i < 12; i++) {
        const a = (i * Math.PI) / 6 + this.elapsed * 0.3,
          rad = 26 + Math.sin(this.elapsed * 2 + i) * 8;
        this.lines.fillStyle(i % 2 ? 0xffd66d : 0x8ef3d5, 0.8);
        this.lines.fillCircle(
          d.x + Math.cos(a) * rad,
          d.y + Math.sin(a) * rad,
          2,
        );
      }
    }
  }
}
