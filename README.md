# MIRAI MUSEUM

黒い空間の青い地球から、恐竜時代の76.8秒の冒険へ。

ホームと恐竜ランStage 1を **Babylon.js 8 / TypeScript** で実装しています。Nuxt 4 / Vueはページ、メニュー、HUD、日英表示を担当します。Phaser・Three.js・TresJSの旧描画コードと依存は整理済みです。

```sh
npm ci
npm run dev
npm run typecheck
npm test
npm run build
npm run preview
npm run test:browser     # 本番ビルドが必要
npm run test:browser:static # prerender済み本番素材を直接ブラウザ検証
npm run test:runtime     # dev限定の決定論・リソース検証
npm run generate         # Capacitor向けに使用できる静的Webアセット
```

一次仕様: [Babylon.js / フル3D共通仕様](docs/babylon-full3d-spec.md)。実装詳細: [共通基盤](docs/babylon-runtime.md)、[3Dホーム](docs/floating-earth.md)、[恐竜ラン](docs/deep-time-implementation.md)。検証結果は [検証記録](docs/verification/babylon-migration.md) に記載します。

`/` はGLBの地球と展示物。恐竜のタップまたはフォーカス後Enterで `/dinosaur?play=1` を開始します。地球はドラッグ・ホイール・矢印キーで回転、Homeで向きを復元します。恐竜ランは自動前進、タップ・Space・↑でジャンプ、Escapeで一時停止。失敗から760msで自動リトライします。クリア後は再走またはホームへ戻れます。

車は既存の恐竜クリア記録で解放します。初回クリア後にホームへ戻ると恐竜と同じ光柱で登場し、次のアクセスでも演出を再生します。同一訪問中の再クリアでは繰り返しません。車を選ぶと開発中の案内を表示します。自由の女神は常設の展示です。提供GLBは変更していません。地球の出典・ライセンスは `public/floating-earth/` に保存しています。

`app/three-d` がEngine / Scene、素材・音声、入力、品質・設定を管理します。`app/games/dinosaur` は3D表示とStage 1の制御・配置データ、`app/game/dinosaur` は引き継いだ240Hzの判定・150 BPMの時刻・得点・音声を管理します。毎フレームの状態はVueへ送りません。ステージ追加は部品・配置・ルールを変更し、他ジャンルへ同じ形式を強制しません。

`app/games/catalog.ts` に11ゲームのID・日英名称・展示物・実装状態・起動先を定義しています。遊べるのは恐竜ランStage 1のみです。残る10ゲームのSceneや仮の起動先は用意していません。地形・恐竜の周囲モデルは再利用する3D部品で構成し、T. rex・トリケラトプスは手続き的な仮モデルです。美術用GLBと制作済みの歩行クリップの追加は残作業です。

保存キー `mirai-museum:deep-time:v1`、`mirai-museum:v2`、`mirai-museum:language` を維持します。旧 `mirai-museum:v1` の記録は削除せず、ミュート設定を引き継ぎます。品質・音量は `mirai-museum:settings:v1`。保存を拒否された場合もプレイを続けられます。

WebGL2が必要です。ホームは描画不能時に静止画とゲームへのリンクを提示し、ゲームは再読み込み・ホームへの復帰を提示します。端末の画質設定とreduced motionに対応します。モバイルのブラウザエミュレーションと実機検証は別です。iOS / Android / Capacitor実機、GPUメモリの直接計測、ネイティブ公開は未実施です。

Storybook: `npm run storybook` / `npm run build-storybook`。旧ピクセルアートの原本は `source-art/pixel/`、地球素材の生成元とライセンスは保持しています。
