import type { PlayerController } from "../player";
export class InputController {
  private pointer: number | null = null;
  private startX = 0;
  private startY = 0;
  private originX = 0;
  private originY = 0;
  keys = new Set<string>();
  constructor(private player: PlayerController) {}
  down(event: PointerEvent) {
    if (this.pointer !== null) return;
    this.pointer = event.pointerId;
    this.startX = event.clientX;
    this.startY = event.clientY;
    this.originX = this.player.x;
    this.originY = this.player.y;
    this.player.target(this.originX, this.originY);
  }
  move(event: PointerEvent, rect: DOMRect) {
    if (event.pointerId !== this.pointer) return;
    this.player.target(
      this.originX + ((event.clientX - this.startX) / rect.width) * 6,
      this.originY - ((event.clientY - this.startY) / rect.height) * 4,
    );
  }
  up(event?: PointerEvent) {
    if (!event || event.pointerId === this.pointer) this.pointer = null;
  }
  update(dt: number) {
    let x = 0,
      y = 0;
    if (this.keys.has("arrowleft") || this.keys.has("a")) x--;
    if (this.keys.has("arrowright") || this.keys.has("d")) x++;
    if (this.keys.has("arrowup") || this.keys.has("w")) y++;
    if (this.keys.has("arrowdown") || this.keys.has("s")) y--;
    if (x || y)
      this.player.target(
        this.player.targetX + x * dt * 4,
        this.player.targetY + y * dt * 4,
      );
  }
  clear() {
    this.keys.clear();
    this.up();
  }
}
