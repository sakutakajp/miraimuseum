# 検索登録の対象

検索登録の対象はトップ `/` のみ。トップの既存title/canonical設定は変更しない。

- Nuxtのページは `app/app.vue` でトップ以外に `noindex, follow` を設定する。
- SSR・404などの応答は `server/middleware/indexing.ts` が同じ `X-Robots-Tag` を付ける。
- 箱庭のVite生成HTMLはHTML変換時に設定する。
- `nitro:build:public-assets` で静的HTMLを処理する。将来追加される静的展示も、トップの `index.html` 以外は対象。既存のrobots/bot別metaを置換し、canonicalは保持する。
- 静的生成のページ・200/404フォールバックは `prerender:generate` でも処理する。
- Cloudflareの静的配信には `public/_headers` を使い、`/` だけヘッダーを削除する。Workerが処理する応答はサーバーミドルウェアが担当する。

robots.txtのDisallowでは代用しない。noindexはアクセス制限ではない。`/dev/assets` は開発時だけ利用可能で、本番は404、静的生成の対象外。

確認: `npm run test:indexing`、`npm run typecheck`、`npm run build`、`npm run generate`。HTTP確認では `/` の指定が空、他のページ・静的展示・404にnoindexがあることを確認する。
