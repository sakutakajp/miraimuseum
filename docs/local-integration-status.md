# ローカル統合状態（2026-10-18）

確認時のremote workは `ae3576a`、mainは `2cbdd76`。以下はそのworkに対するローカルの追加であり、push・PR・マージ・配信はしていない。リポジトリ可視性の変更は別作業。

| 項目 | 状態・対象 |
|---|---|
| チラつき修正 | `301b64e`を祖先として保持。5作品の操作中DPRを固定。描画コードの再実装なし |
| 図書館比較 | 元の10mと20m実験を保持。20mは標準化しない |
| アセット確認 | `/dev/assets`を直接閲覧可能。トップ・サイトマップに追加せずnoindex。生成元は公開用の説明のみ |
| 本探し | `/play/library-books`。10mの既存図書館を使用。鑑賞モードへ復帰可能 |
| 検索登録 | `/`以外は既定noindex。SSR・静的HTML・生成404・将来のページを対象 |
| 縮尺規範 | 10m・100m・500m・2km。図書館10mのみ確定。他作品は変更しない |
| データセンター | 正式ソースの転送失敗で未統合。横幅10mは比較候補であり未確定 |
| 里山 | 正式ZIP/HTMLの転送失敗で未統合。代替再実装は行わない |

今回の補強は、アセット・比較画面が履歴キャッシュから復元された際の再初期化、および引用符なしrobots metaとnoindexの競合除去。モデル・配置・通常時の見た目は変更しない。解放済みのメッシュIDや停止済みの比較ループをそのまま再利用しないよう、復元時にページを読み直す。

## 確認手順

```sh
npm run typecheck
npm run typecheck:exhibits
npm run test:indexing
npm run build
# 本番プレビューを別ターミナルで起動後
MUSEUM_URL=http://127.0.0.1:3017 npx playwright test --config playwright.integration.config.ts
BOOK_HUNT_URL=http://127.0.0.1:3017 npx playwright test --config playwright.book-hunt.config.ts --project=mobile
```

静的配信を確認する場合は `npm run generate`。トップ以外の生成HTMLにrobots noindexがあることを確認する。

5作品の描画コードは301b64eと同一のため、既存のPC/スマホ全10ケースのチラつき検証結果を引き継ぐ。今回の対象は新たに変更した履歴復元・noindexと、本探しとの統合確認。履歴復元テストはブラウザーがBFCacheを採用するかに依存しないようpersisted付きpagehide/pageshowを発火させる。実機Safari/GPU、Cloudflare本番の確認とは区別する。

ローカル成功は本番反映を意味しない。外部書込みの再開前に最新remoteとの差分・可視性・対象範囲・必須チェックを改めて確認する。
