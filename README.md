# MIRAI MUSEUM

黒い空間に浮かぶ地球に触れて、恐竜時代の冒険へ。

- `/`: 写真ベースの地球。約3分で1回転する自転、スクロール、ドラッグ、タップ、キーボードの回転操作。青い大気の発光と初回の `Loading...` 表示。
- タイトルは Google Fonts の M PLUS Rounded 1c Bold (700)。右上の小さな再生アイコンから恐竜ゲームへ直接移動。
- `/dinosaur`: MIRAI: DEEP TIME — CRETACEOUS // LAST DAY。既存の恐竜ゲーム、結果、ゲーム内展示、記録保存を維持。退出時はホームへ戻る。
- `/museum` の一覧・詳細・ステージ選択ページは削除。宇宙シューティングの開発はキャンセルし、実装・仕様・テスト・プレビューを削除。

## 開発

```sh
npm ci
npm run dev
npm run typecheck
npm test
npm run build
npm run test:e2e
npm run test:deep-time
```

恐竜ゲーム仕様: [dinosaur-stage1.md](docs/dinosaur-stage1.md)。地球モデルの出典とライセンスは `public/floating-earth/` に保存。reduced motionでは浮遊と操作後の慣性を抑制する。地球のゆっくりした自転は維持し、非表示タブでは描画を停止する。
