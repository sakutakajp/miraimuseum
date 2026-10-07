# Floating Earth ホーム

`/` は黒い空間に写真ベースの地球が浮かぶホーム。タイトルは Google Fonts の M PLUS Rounded 1c Bold (700)。ロゴ、コピー、画像クレジットの表示は削除し、右上の再生アイコンから `/dinosaur` の恐竜ゲームへ直接移動する。地球素材の出典とライセンスは `public/floating-earth/` に保持する。

## 表示と操作

青い大気の発光、地表の明るさ、静止画の光を強める。地球は常に 0.035 rad/s（約3分で1回転）で自転する。自転と操作の角度は別々に管理し、スクロール、ドラッグ、タップ、矢印キーの操作を加算する。Homeで初期姿勢へ戻す。Ctrl＋スクロールの拡大操作は妨げない。

reduced motionでは浮遊と操作後の慣性を停止する。ゆっくりした自転は維持する。非表示タブでは描画を停止し、復帰時の経過時間をリセットする。

## 読み込み

サーバーが出力する初期画面から `Loading...` を表示する。読み込み中は静止画とCanvasを含む地球全体を非表示にし、描画用のサイズは維持する。Three.jsと `/floating-earth/earth-vivid.glb` の読み込み・初回描画が完了したら消す。失敗時も読み込み表示を終了し、`earth-photo.webp` の静止画を残す。JavaScript無効でも恐竜ゲームへのリンクは表示する。

## ページ

`/museum` と博物館の一覧・詳細・ステージ選択は削除。恐竜ゲームは `/dinosaur` で動作し、終了・退出後はホームへ戻る。ゲーム内の結果、展示、端末への記録保存は維持する。

## 次期実装: MIRAI CORE Game Hub

Floating Earth をゲームへの3Dランチャーへ進化させる。地球表面を恐竜が歩き、その恐竜を発見・選択すると、地球から恐竜時代へ入っていく短いトランジションを経て `/dinosaur` へ遷移する。

実装仕様、球面歩行、hit testing、モバイル操作、fallback、将来の複数ゲームentity設計は [mirai-core-game-hub.md](./mirai-core-game-hub.md) を正とする。

## 検証

`npm run typecheck`、`npm test`、`npm run build`、`npx playwright test`。恐竜の詳細な実行時検証は `npm run test:deep-time`。

## 恐竜の発見演出

この段階は出現演出のみ。歩行、hover、tap、ゲームへのトランジションは後続で実装する。右上の `/dinosaur` リンクは維持する。

地球の表示後に恐竜を独立して読み込み、初めは見せない。通常は1.2秒の間から光点が現れ、2秒前後から青白いglow、柔らかなradial flare、14点のsparkle、淡い縦方向の光が強まる。1.95〜2.95秒で小さな恐竜がフェードし、控えめなscale（88〜100%）とせり上がりを加える。3.5秒で光が収束し、薄い残光だけを残す。assetの読み込みが遅くても、光から始まる順序を飛ばさない。

reduced motionでは約1.15秒までに短いフェードと微光で出現する。拡大縮小、せり上がり、粒子、光柱を使わない。タブ非表示時は地球と同じ時計で停止する。

構造:

```text
floating → rotation → EarthRoot (pose)
                       ├─ PhotographicEarth
                       └─ EntityLayer
                          └─ DinosaurSurfaceAnchor
                             ├─ DinosaurEntityRoot → appearance → DinosaurVisual
                             └─ DinosaurEffectRoot
```

`entities.ts` にモデルURL、サイズ、球面法線、surface offset、モデル向きを集約する。球面法線をup方向にし、半径1 + offset0.008に足元を置く。恐竜の最大寸法は0.10（地球直径の5%）。モデルと光は地球と一緒に回り、opaqueなEarthの深度で裏側が遮蔽される。光にもdepth testを適用し、裏側から透けるHUD表現を避ける。post-processing/bloomは追加しない。

`DinosaurModel.ts` は `/floating-earth/dinosaur.glb` を読み、足元を原点に正規化する。添付されたMeshyモデルを軽量化して使用（約1.46MB、24,790 triangle、JPEG 1024px、42-bone rig維持、animation clipなし。decoder不要）。読み込みはEarth readinessを待たせない。404や破損時は今回の明示的な依頼に従い、静かなマット素材のtemporary placeholderで出現演出を維持する。モデル読み込み失敗は地球の失敗扱いにしない。既存のWebGL static fallbackを維持する。

将来は `DinosaurEntityRoot` の下にAnimationMixerを追加し、球面anchorの位置・姿勢を更新する。選択処理はrootのmeshをraycastし、地球dragの判定と統合する。今回のGLBにWalk clipはないため、歩行にはclip付きassetか別アニメーションが必要になる。
