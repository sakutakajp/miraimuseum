# MIRAI MUSEUM

## 採用方針（2026-10-09）

3D展示と11ゲームは **Babylon.js + TypeScriptによるフル3D** に統一する。Nuxt / VueはサイトとUIを担当する。

一次仕様: [Babylon.js / フル3D共通仕様](docs/babylon-full3d-spec.md)。確定した11ゲーム、部品と配置データによるステージ制作、素材の軽量化、Capacitorを想定した構成、段階的な移行条件を記載。

現行コードはThree.js / Phaserを使用しており、Babylon.jsへの移行は未実施。以下は移行前の実装説明。

## 現行実装

黒い空間に浮かぶ地球に触れて、恐竜時代の冒険へ。

LPの中心オブジェクト **MIRAI COREの正体は地球** とする。原則は「地球が変わるのではなく、見方が変わる」。同じ地球に対してスクロールとともに **SPACE → LIFE → MATTER → MACHINE → CONNECTED** の観測レイヤーを重ね、最後に点群・輪郭へ解体して「すべての学問は、つながっている。」へ着地する。細胞・結晶・機械など別オブジェクトへのmesh morphは採用しない。

実装・デザイン判断では次の仕様を一次資料とする。

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
