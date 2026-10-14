import * as THREE from '../vendor/three.module.js?v=safari-1';

// Use the water footprint for picking; reject the pedestal and background.
export function attachOceanBubble({ container, canvas, scene, camera, water }) {
  const bubble = document.createElement('button');
  bubble.type = 'button';
  bubble.className = 'ocean-bubble';
  bubble.textContent = '…';
  bubble.setAttribute('aria-label', '吹き出しを閉じる');
  bubble.hidden = true;
  container.appendChild(bubble);
  canvas.tabIndex = 0;
  canvas.setAttribute('aria-label', '海面。タップ、またはEnterキーで吹き出しを表示・非表示');
  canvas.setAttribute('aria-expanded', 'false');

  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  const anchor = new THREE.Vector3();
  const projected = new THREE.Vector3();
  const active = new Set();
  let gesture = null;

  function hide() {
    bubble.hidden = true;
    canvas.setAttribute('aria-expanded', 'false');
  }
  function update() {
    if (bubble.hidden) return;
    projected.copy(anchor).project(camera);
    const w = container.clientWidth, h = container.clientHeight;
    const x = Math.max(46, Math.min(w - 46, (projected.x + 1) * w / 2));
    const y = Math.max(82, Math.min(h - 16, (1 - projected.y) * h / 2));
    bubble.style.left = `${x}px`;
    bubble.style.top = `${y}px`;
  }
  function toggle() {
    if (!bubble.hidden) { hide(); return; }
    water.getWorldPosition(anchor);
    bubble.hidden = false;
    canvas.setAttribute('aria-expanded', 'true');
    update();
  }
  function onDown(event) {
    active.add(event.pointerId);
    if (active.size !== 1 || event.button !== 0) { gesture = null; return; }
    gesture = { id: event.pointerId, x: event.clientX, y: event.clientY, at: performance.now() };
  }
  function onMove(event) {
    if (gesture?.id === event.pointerId && Math.hypot(event.clientX - gesture.x, event.clientY - gesture.y) > 9) gesture = null;
  }
  function onUp(event) {
    const tap = gesture;
    gesture = null;
    active.delete(event.pointerId);
    if (!tap || tap.id !== event.pointerId || active.size || performance.now() - tap.at > 650 ||
        Math.hypot(event.clientX - tap.x, event.clientY - tap.y) > 9) return;
    const rect = canvas.getBoundingClientRect();
    pointer.set((event.clientX - rect.left) / rect.width * 2 - 1, 1 - (event.clientY - rect.top) / rect.height * 2);
    scene.updateMatrixWorld(true);
    camera.updateMatrixWorld(true);
    raycaster.setFromCamera(pointer, camera);
    const hit = raycaster.intersectObjects(scene.children, false)[0];
    if (hit?.object === water) toggle();
  }
  function onCancel(event) { active.delete(event.pointerId); gesture = null; }
  function onKey(event) {
    if (event.key === 'Escape') { hide(); return; }
    if ((event.key === 'Enter' || event.key === ' ') && !event.repeat) {
      event.preventDefault();
      toggle();
    }
  }
  function onBubbleClick() { hide(); canvas.focus({ preventScroll: true }); }
  const bindings = [['pointerdown', onDown], ['pointermove', onMove], ['pointerup', onUp], ['pointercancel', onCancel], ['keydown', onKey]];
  // Capture sees pointerup before OrbitControls releases pointer capture.
  for (const [type, listener] of bindings) canvas.addEventListener(type, listener, true);
  bubble.addEventListener('click', onBubbleClick);
  bubble.addEventListener('keydown', onKey);
  return {
    update,
    dispose() {
      for (const [type, listener] of bindings) canvas.removeEventListener(type, listener, true);
      bubble.removeEventListener('click', onBubbleClick);
      bubble.removeEventListener('keydown', onKey);
      active.clear();
      bubble.remove();
    },
  };
}
