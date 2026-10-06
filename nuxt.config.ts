export default defineNuxtConfig({
  compatibilityDate: "2026-10-05",
  devtools: { enabled: false },
  vue: {
    compilerOptions: {
      isCustomElement: (tag) =>
        /^Tres[A-Z]/.test(tag) &&
        !["TresCanvas", "TresCanvasContext", "TresPortal"].includes(tag),
    },
  },
  // Prebundle the lazy game dependency so Vite does not reload the page when
  // the first expedition starts in a fresh development container.
  vite: {
    optimizeDeps: {
      include: [
        "phaser",
        "three",
        "@tresjs/core",
        "three/examples/jsm/environments/RoomEnvironment.js",
        "three/examples/jsm/postprocessing/EffectComposer.js",
        "three/examples/jsm/postprocessing/RenderPass.js",
        "three/examples/jsm/postprocessing/UnrealBloomPass.js",
        "three/examples/jsm/postprocessing/ShaderPass.js",
        "three/examples/jsm/postprocessing/OutputPass.js",
      ],
    },
  },
  css: [
    "~/assets/css/main.css",
    "~/assets/css/v2.css",
    "~/assets/css/star-dive.css",
    "~/assets/css/deep-time.css",
    "~/assets/css/landing.css",
  ],
  app: {
    head: {
      htmlAttrs: { lang: "ja" },
      title: "みらい博物館 — 遊びのなかに、発見を。",
      meta: [
        {
          name: "description",
          content:
            "タップして、走って、発見しよう。恐竜の世界を冒険する、小さなWeb博物館。",
        },
        { name: "theme-color", content: "#f6f3e9" },
        {
          name: "viewport",
          content: "width=device-width, initial-scale=1, viewport-fit=cover",
        },
      ],
      link: [{ rel: "icon", type: "image/svg+xml", href: "/favicon.svg" }],
    },
  },
});
