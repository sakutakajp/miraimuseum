import type { SceneRuntime } from "./runtime";
/** One primary pointer / non-repeating key, with HUD events kept outside the canvas. */
export function bindJumpInput(runtime: SceneRuntime, jump: () => void, pause: () => void) {
  runtime.listen(runtime.canvas, "pointerdown", ((event: PointerEvent) => {
    if (!event.isPrimary || event.button !== 0) return;
    event.preventDefault(); runtime.canvas.focus(); jump();
  }) as EventListener);
  runtime.listen(window, "keydown", ((event: KeyboardEvent) => {
    if (event.repeat) return;
    if (event.code === "Escape") { event.preventDefault(); pause(); return; }
    if (event.target instanceof HTMLElement && event.target.closest("button,input,select,a")) return;
    if (["Space", "ArrowUp"].includes(event.code)) { event.preventDefault(); jump(); }
  }) as EventListener);
}
