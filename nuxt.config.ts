export default defineNuxtConfig({
  compatibilityDate: "2026-10-05",
  devtools: { enabled: false },
  vite: {
    optimizeDeps: {
      include: [
        "@babylonjs/core/Cameras/arcRotateCamera",
        "@babylonjs/core/Cameras/camera",
        "@babylonjs/core/Culling/ray",
        "@babylonjs/core/Engines/engine",
        "@babylonjs/core/Layers/layer",
        "@babylonjs/core/Materials/Textures/texture",
        "@babylonjs/core/Materials/shaderMaterial",
        "@babylonjs/core/Maths/math.color",
        "@babylonjs/core/Maths/math.vector",
        "@babylonjs/core/Maths/math.viewport",
        "@babylonjs/core/Meshes/Builders/boxBuilder",
        "@babylonjs/core/Meshes/mesh",
        "@babylonjs/core/Meshes/mesh.vertexData",
        "@babylonjs/core/Meshes/transformNode",
        "@babylonjs/core/scene",
      ],
    },
  },
  app: {
    head: {
      htmlAttrs: { lang: "ja" },
      title: "開発中",
    },
  },
});
