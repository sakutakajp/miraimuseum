import type { Shot, Vec } from "./types";
export const MAX_DRAG = 56,
  MIN_DRAG = 8;
export function clampDrag(drag: Vec): Vec {
  const distance = Math.hypot(drag.x, drag.y),
    scale = Math.min(1, MAX_DRAG / (distance || 1));
  return { x: drag.x * scale, y: drag.y * scale };
}
export function shotFromDrag(drag: Vec, maxSpeed: number): Shot | undefined {
  const d = clampDrag(drag),
    distance = Math.hypot(d.x, d.y);
  if (distance < MIN_DRAG) return;
  return {
    angle: (Math.atan2(-d.x, d.y) * 180) / Math.PI,
    speed: (distance / MAX_DRAG) * maxSpeed,
  };
}
export function dragFromShot(shot: Shot, maxSpeed: number): Vec {
  const r = (shot.angle * Math.PI) / 180,
    d = (shot.speed / maxSpeed) * MAX_DRAG;
  return { x: -Math.sin(r) * d, y: Math.cos(r) * d };
}
export function adjustShot(
  shot: Shot,
  angle: number,
  speed: number,
  maxSpeed: number,
): Shot {
  return {
    angle: ((shot.angle + angle + 540) % 360) - 180,
    speed: Math.max(22, Math.min(maxSpeed, shot.speed + speed)),
  };
}
