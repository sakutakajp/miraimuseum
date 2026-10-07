# Floating Earth ホーム

`/` は黒い空間に写真ベースの地球が浮かぶホーム。タイトルは Google Fonts の M PLUS Rounded 1c Bold (700)。ロゴ、コピー、画像クレジット、右上の再生アイコンは表示しない。地球上のブラキオサウルスをタップすると `/dinosaur?play=1` へ移動し、読み込み後にゲームが始まる。地球素材の出典とライセンスは `public/floating-earth/` に保持する。

## 表示と操作

青い大気の発光、地表の明るさ、静止画の光を強める。地球は常に 0.035 rad/s（約3分で1回転）で自転する。自転と操作の角度は別々に管理し、スクロール、ドラッグ、タップ、矢印キーの操作を加算する。Homeで初期姿勢へ戻す。Ctrl＋スクロールの拡大操作は妨げない。

地球とブラキオサウルスの表示サイズを同じ比率で20%拡大する。モデル同士の大きさの比率と球面上の配置は維持し、画面高さが足りない場合は上下の見切れを避ける範囲に制限する。低速な端末では解像度を落とし、qualityの下限をlowにして地球の回転と恐竜のタップを維持する。描画速度だけで静止画へ切り替えず、モデル読み込み・WebGLの失敗時のみfallbackに戻る。fallback画像には四角い画像外枠のdrop-shadowを付けない。

reduced motionでは浮遊と操作後の慣性を停止する。ゆっくりした自転は維持する。非表示タブでは描画を停止し、復帰時の経過時間をリセットする。

恐竜の選択は実体meshをraycastし、opaqueな地表との距離を比較する。輪郭光や雲のmeshは選択対象にせず、実体の近くにtouchで10px、mouseで6pxの許容範囲を設ける。出現途中でも正面に実体が見えた時から選択できる。7px以上動くドラッグは恐竜上から始めても地球を回し、ゲームを起動しない。キーボードには恐竜の位置に追従するfocus可能な透明buttonを用意し、Enter / Spaceでも開始できる。

右上の控えめなボタンで日本語と英語を切り替える。選択は保存し、ゲームとホームを往復しても引き継ぐ。文書のlang、description、操作の読み上げ、fallbackのリンクも選択言語に揃える。

フッターのTipsはGoogle FontsのDotGothic16を使い、「スクロールで回す」と「ブラキオサウルスをタップ」を5.5秒ごとに一つずつ表示する。文字サイズは14px、画面の高さが500px以下の横向きでは12px。切り替えは短いfadeだけにし、reduced motionではfadeを省く。非表示タブではTipsを進めず、読み上げには変化しない全文の操作説明を用意する。

## 読み込み

サーバーが出力する初期画面から `読み込み中...` / `Loading...` を表示する。読み込み中は静止画とCanvasを含む地球全体を非表示にし、描画用のサイズは維持する。Three.jsと `/floating-earth/earth-vivid.glb` の読み込み・初回描画が完了したら消す。失敗時も読み込み表示を終了し、`earth-photo.webp` とフッターの控えめなゲームへのリンクを残す。JavaScript無効でも恐竜ゲームへのリンクは表示する。

地球の初回描画後、`game/dinosaur/preload.ts` でゲームのroute、Phaser、scene、ブラキオサウルスGLB、背景SVG plate、音声を先読みする。GLBはparseし、画像とAudioBufferはdecodeして保持し、tap時にゲームへ引き渡す。ゲームでも同じGLBを固定poseの3Dモデルとして描く。ホームで第二のWebGL rendererは作らず、音声はtapまで再生しない。恐竜からの起動はSTARTと300msのタイトル遷移を省き、準備が整い次第プレイを開始する。画像・音声の先読み失敗時は通常の読み込み、GLB失敗時は3D placeholderに戻る。別ページへの移動時は未使用の読み込み、モデル、画像、AudioContextを解放する。

## ページ

`/museum` と博物館の一覧・詳細・ステージ選択は削除。恐竜ゲームは `/dinosaur` で動作し、終了・退出後はホームへ戻る。ゲーム内の結果と端末への記録保存は維持し、`OPEN EXHIBIT` と展示画面は削除する。

## 次期実装: MIRAI CORE Game Hub

Floating Earth をゲームへの3Dランチャーへ進化させる。地球表面を恐竜が歩き、その恐竜を発見・選択すると、地球から恐竜時代へ入っていく短いトランジションを経て `/dinosaur` へ遷移する。

実装仕様、球面歩行、hit testing、モバイル操作、fallback、将来の複数ゲームentity設計は [mirai-core-game-hub.md](./mirai-core-game-hub.md) を正とする。

## 検証

`npm run typecheck`、`npm test`、`npm run build`、`npx playwright test`。恐竜の詳細な実行時検証は `npm run test:deep-time`。

## 恐竜の発見演出

出現演出とtapによる起動を実装する。歩行やゲームへ入る専用トランジションは後続のスコープ。

地球の表示後に恐竜を独立して読み込み、初めは見せない。通常は1.2秒の間から光点が現れ、白いglow、柔らかなradial flare、14点のsparkleが強まる。白い光柱は球面法線の方向へ0.75秒かけて地表から伸び、上端と側面を柔らかくぼかす。1.95〜2.95秒で恐竜がフェードし、控えめなscale（88〜100%）とせり上がりを加える。3.5秒で光柱が収束し、地表の薄い残光と恐竜の輪郭光を残す。assetの読み込みが遅くても、光から始まる順序を飛ばさない。

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

`entities.ts` にモデルURL、サイズ、球面法線、surface offset、モデル向きを集約する。球面法線をup方向にし、半径1 + offset0.008に足元を置く。恐竜の最大寸法は0.432（前回0.72の60%、地球直径の21.6%）。カメラの表示範囲には恐竜のサイズと余白を含め、回転後も頭や尾がCanvasから見切れないようにする。初期の発見点は地球の上端寄りに置き、長い首と白い光柱を黒い背景に見せる。モデルと光は地球と一緒に回り、裏半球ではanchor全体を非表示にする。前半球でもopaqueなEarthの深度で地表との遮蔽を保つ。光にもdepth testを適用し、裏側から透けるHUD表現を避ける。bloomは恐竜の輪郭の外側に限定する。

`DinosaurGlow.ts` が実体のsilhouette maskを描き、二方向のGaussian blurから柔らかい白い光を作る。元のsilhouetteを切り抜いて輪郭の外側だけに加算し、光の強度は前回の50%（strength 0.5）にする。本体のemissiveと表面へのrim light加算は使わず、元のテクスチャと通常の照明を維持する。maskは地球の深度による遮蔽と出現のopacityに追従する。出現後も輪郭の白い発光を維持し、地球の青い大気発光は維持する。追加の発光meshは作らず、raycastは実体だけを対象にする。render targetとshaderはworldの終了時に破棄する。

濃い茶色の皮膚が影で沈みすぎないよう、白いAmbientLight（intensity 2.4）を補助光として加える。既存のDirectionalLightで立体感を残し、本体のemissiveは0を維持する。地球の独自shaderと輪郭のbloomはscene lightingを参照しないため、補助光はそれらの発光色や明るさを変えない。

`DinosaurModel.ts` は `/floating-earth/dinosaur.glb` を読み、足元を原点に正規化する。添付されたMeshyモデルを軽量化して使用（約1.46MB、24,790 triangle、JPEG 1024px、42-bone rig維持、animation clipなし。decoder不要）。読み込みはEarth readinessを待たせない。404や破損時は今回の明示的な依頼に従い、静かなマット素材のtemporary placeholderで出現演出を維持する。モデル読み込み失敗は地球の失敗扱いにしない。既存のWebGL static fallbackを維持する。

将来は `DinosaurEntityRoot` の下にAnimationMixerを追加し、球面anchorの位置・姿勢を更新する。選択処理は `selection.ts`、キーボードのfocus範囲はモデルのboundsから投影する。tap後の遷移には専用のカメラ演出を追加できる。今回のGLBにWalk clipはないため、歩行にはclip付きassetか別アニメーションが必要になる。
