export class PlayerController {
  x = 0;
  y = 0;
  targetX = 0;
  targetY = 0;
  roll = 0;
  pitch = 0;
  speed = 0;
  shield = 3;
  invulnerable = 0;
  target(x: number, y: number) {
    this.targetX = Math.max(-3, Math.min(3, x));
    this.targetY = Math.max(-2, Math.min(2, y));
  }
  update(dt: number) {
    const oldX = this.x,
      oldY = this.y,
      k = 1 - Math.exp(-dt * 12);
    this.x += (this.targetX - this.x) * k;
    this.y += (this.targetY - this.y) * k;
    const vx = (this.x - oldX) / Math.max(dt, 0.001),
      vy = (this.y - oldY) / Math.max(dt, 0.001);
    this.speed = Math.hypot(vx, vy);
    this.roll += (-vx * 0.07 - this.roll) * (1 - Math.exp(-dt * 8));
    this.pitch += (vy * 0.04 - this.pitch) * (1 - Math.exp(-dt * 8));
    this.invulnerable = Math.max(0, this.invulnerable - dt);
  }
  damage() {
    if (this.invulnerable || this.shield === 0) return false;
    this.shield--;
    this.invulnerable = 1.2;
    return true;
  }
}
export class CameraRig {
  x = 0;
  y = 3;
  roll = 0;
  fov = 60;
  update(
    player: PlayerController,
    dt: number,
    inside: boolean,
    reduced: boolean,
  ) {
    const k = 1 - Math.exp(-dt * 3);
    this.x += (player.x * 0.24 - this.x) * k;
    this.y += (3 + player.y * 0.18 - this.y) * k;
    this.roll += ((reduced ? 0 : player.roll * 0.12) - this.roll) * k;
    this.fov += ((inside && !reduced ? 67 : 60) - this.fov) * k;
  }
}
