export default defineNuxtConfig({
  ssr: true,
  vite: { optimizeDeps: { include: ["@babylonjs/core", "@babylonjs/loaders/glTF"] } },
  nitro: { prerender: { routes: ["/", "/dinosaur"] } },
  compatibilityDate: "2026-10-05",
  devtools: { enabled: false },
  css: [
    "~/assets/css/main.css",
    "~/assets/css/deep-time.css",
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
      link: [
        { rel: "icon", type: "image/x-icon", href: "/favicon.ico" },
        { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
        { rel: "preconnect", href: "https://fonts.googleapis.com" },
        { rel: "preconnect", href: "https://fonts.gstatic.com", crossorigin: "anonymous" },
        { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=DotGothic16&family=M+PLUS+Rounded+1c:wght@700&display=swap" },
      ],
    },
  },
});
