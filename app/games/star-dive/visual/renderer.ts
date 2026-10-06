import { WebGLRenderer, ACESFilmicToneMapping, SRGBColorSpace } from "three";

/** Backend selection is kept outside gameplay. A WebGPU visual adapter can be
 * registered without changing scoring, input, or the mandatory WebGL2 path. */
export async function selectBackend<T>(options: {
  forceWebGL2?: boolean;
  webGPU?: () => Promise<T>;
  webGL2: () => T;
}): Promise<T> {
  if (
    !options.forceWebGL2 &&
    typeof navigator !== "undefined" &&
    "gpu" in navigator &&
    options.webGPU
  ) {
    try {
      return await options.webGPU();
    } catch {
      /* Adapter acquisition can fail. */
    }
  }
  return options.webGL2();
}

export function createWebGL2Renderer(canvas: HTMLCanvasElement) {
  const context = canvas.getContext("webgl2", {
    alpha: false,
    antialias: false,
    powerPreference: "high-performance",
  });
  if (!context) throw new Error("WebGL2 unavailable");
  const renderer = new WebGLRenderer({ canvas, context, antialias: false });
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.outputColorSpace = SRGBColorSpace;
  return renderer;
}
