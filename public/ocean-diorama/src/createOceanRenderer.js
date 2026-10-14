import * as THREE from '../vendor/three.module.js?v=safari-1';

export function createOceanRenderer() {
  let lastError;

  // Let Safari choose its GPU. Retry without MSAA on a fresh canvas when the
  // initial context cannot be created, instead of treating the browser as unsupported.
  for (const antialias of [true, false]) {
    const canvas = document.createElement('canvas');
    const attributes = {
      alpha: true,
      depth: true,
      stencil: false,
      antialias,
      premultipliedAlpha: true,
      preserveDrawingBuffer: false,
      powerPreference: 'default',
      failIfMajorPerformanceCaveat: false,
    };
    let context;

    try {
      context = canvas.getContext('webgl2', attributes);
      if (!context || context.isContextLost()) continue;

      const renderer = new THREE.WebGLRenderer({ canvas, context, ...attributes });
      return { renderer, reducedQuality: !antialias };
    } catch (error) {
      lastError = error;
      // A partially initialized renderer must not use up Safari's context limit.
      try {
        context?.getExtension('WEBGL_lose_context')?.loseContext();
      } catch {
        // A context already invalidated by the browser cannot be released again.
      }
    }
  }

  const error = new Error('Unable to initialize the ocean WebGL2 context.', { cause: lastError });
  error.code = 'OCEAN_WEBGL_CONTEXT';
  throw error;
}
