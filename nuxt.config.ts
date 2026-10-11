export default defineNuxtConfig({
  ssr: true,
  vite: { optimizeDeps: { include: ["@babylonjs/core", "@babylonjs/loaders/glTF"] } },
  nitro: { prerender: { routes: ["/", "/dinosaur", "/games", "/games/caesar", "/naps", "/about"] } },
  compatibilityDate: "2026-10-05",
  devtools: { enabled: false },
  css: [
    "~/assets/css/main.css",
    "~/assets/css/museum.css",
    "~/assets/css/deep-time.css",
  ],
  app: {
    head: {
      htmlAttrs: { lang: "ja" },
      title: "みらい博物館",
      meta: [
        {
          name: "description",
          content:
            "黒猫ルゥと展示の向こうへ。文字の仕掛けや森の冒険で、おひるねの場所を見つける博物館。",
        },
        { name: "theme-color", content: "#0b1429" },
        {
          name: "viewport",
          content: "width=device-width, initial-scale=1, viewport-fit=cover",
        },
      ],
      link: [
        { rel: "icon", type: "image/x-icon", href: "/favicon.ico" },
        { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },

      ],
    },
  },
});
