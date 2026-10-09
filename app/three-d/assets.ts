import { LoadAssetContainerAsync, TransformNode, Vector3, type AssetContainer, type Scene } from "@babylonjs/core";
import "@babylonjs/loaders/glTF";
import { assetBytes } from "./fetch";
import { runtimeResources } from "./runtime";

// Only compressed source bytes survive navigation. No Scene, texture or GPU handle is cached globally.
const byteCache = new Map<string, ArrayBuffer>();
const MAX_CACHE_BYTES = 32 * 1024 * 1024;
export const assetCacheBytes = () => [...byteCache.values()].reduce((total, bytes) => total + bytes.byteLength, 0);
export async function modelBytes(url: string, signal: AbortSignal) {
  signal.throwIfAborted();
  const cached = byteCache.get(url);
  if (cached) { byteCache.delete(url); byteCache.set(url, cached); return cached; }
  const bytes = await assetBytes(url, signal);
  if (bytes.byteLength <= MAX_CACHE_BYTES) {
    byteCache.set(url, bytes);
    while (assetCacheBytes() > MAX_CACHE_BYTES) byteCache.delete(byteCache.keys().next().value!);
  }
  return bytes;
}
export class SceneAssets {
  private containers = new Map<string, Promise<AssetContainer>>();
  private owned = new Set<AssetContainer>();
  private disposed = false;
  constructor(private scene: Scene, private signal: AbortSignal) {}
  load(url: string): Promise<AssetContainer> {
    let pending = this.containers.get(url);
    if (!pending) {
      pending = this.loadModel(url);
      this.containers.set(url, pending);
      void pending.catch(() => this.containers.delete(url));
    }
    return pending;
  }
  private async loadModel(url: string) {
    runtimeResources.assetLoads++;
    let container: AssetContainer | undefined;
    try {
      const bytes = await modelBytes(url, this.signal);
      this.signal.throwIfAborted();
      container = await LoadAssetContainerAsync(new Uint8Array(bytes), this.scene, { pluginExtension: ".glb", rootUrl: url.slice(0, url.lastIndexOf("/") + 1) });
      this.signal.throwIfAborted();
      if (this.disposed || this.scene.isDisposed) throw new DOMException("Disposed", "AbortError");
      container.animationGroups.forEach(group => group.stop());
      this.owned.add(container);
      return container;
    } catch (error) { container?.dispose(); throw error; }
    finally { runtimeResources.assetLoads--; }
  }
  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    for (const container of this.owned) container.dispose();
    this.owned.clear();
    this.containers.clear();
  }
}
export function instantiateModel(container: AssetContainer, name: string, size: number, yaw = 0, byHeight = false) {
  const root = new TransformNode(name, container.scene);
  const visual = new TransformNode(`${name}:visual`, container.scene);
  const instance = container.instantiateModelsToScene(n => `${name}:${n}`, false, { doNotInstantiate: true });
  instance.animationGroups.forEach(group => group.stop());
  instance.rootNodes.forEach(node => node.parent = visual);
  visual.rotation.y = yaw;
  visual.computeWorldMatrix(true);
  const meshes = visual.getChildMeshes().filter(mesh => mesh.getTotalVertices() > 0);
  if (!meshes.length) { instance.dispose(); root.dispose(); visual.dispose(); throw new Error("Empty model"); }
  let min = new Vector3(Infinity, Infinity, Infinity), max = min.scale(-1);
  for (const mesh of meshes) {
    mesh.computeWorldMatrix(true);
    mesh.skeleton?.prepare(true);
    // Rotating an axis-aligned box exaggerates spherical/model bounds. Measure
    // actual posed vertices once, as the previous precise GLB normalization did.
    const positions = mesh.getPositionData(true, true);
    if (!positions) continue;
    for (let i = 0; i < positions.length; i += 3) {
      const point = Vector3.TransformCoordinates(Vector3.FromArray(positions, i), mesh.getWorldMatrix());
      min = Vector3.Minimize(min, point); max = Vector3.Maximize(max, point);
    }
  }
  const span = max.subtract(min);
  const scale = size / (byHeight ? span.y : Math.max(span.x, span.y, span.z));
  if (!Number.isFinite(scale) || scale <= 0) throw new Error("Invalid model bounds");
  visual.scaling.setAll(scale);
  visual.position.set(-(min.x + max.x) / 2 * scale, -min.y * scale, -(min.z + max.z) / 2 * scale);
  visual.parent = root;
  return { root, visual, meshes, instance, height: span.y * scale };
}
