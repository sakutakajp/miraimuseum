# STAR DIVE Stage 1 実装メモ

仕様: [STAR DIVE Stage 1](star-dive-stage1.md)。既存の `star-flight` IDを維持して、作品名とゲーム本体を `MIRAI: STAR DIVE — ASTEROID BELT` に更新した。

## 体験と操作

| 時間 | 場面 | 主な変化 |
| --- | --- | --- |
| 0–13.3秒 | DIVE | 暗転から機体・星雲・エンジンが現れる。初回だけ指のアニメーション。ダメージなし |
| 13.3–26.7秒 | FIRST CONTACT | 中央のSHARD 3個、左右の編隊、CHAIN |
| 26.7–40秒 | ASTEROID FIELD | 3層の小惑星、小数の実障害物、NEARとDISCOVERY |
| 40–53.3秒 | RISK | 左の狭い高得点ルートと右の広いルート。連続NEARでトレイルと音楽が変わる |
| 53.3–66.7秒 | INSIDE | GATE CORE、亀裂・開放、発光結晶トンネル、出口の光 |
| 66.7–80秒 | BREAK OUT | 謎の記号、MIRAI BURST、岩の分裂、飛散する破片、静かな一拍、白い博物館への帰還 |

指を押した位置へ機体が飛ぶことはなく、機体の現在位置を基準にドラッグする。離すと最後の目標を維持。機体・roll/pitch・カメラは別の減衰で追従する。マウス、矢印、WASDにも対応。発射は自動で、射線近くの対象に弱い補正をかける。

初回は80秒。再挑戦では時計を10.5秒地点から始め、導入を短縮する。失敗から800ms後に再挑戦画面を表示する。終了したゲームの音源・入力・Threeリソースはアンマウント時に破棄する。

## ゲームルールと保存

- SHARDは1hit / 100点、COREは3hit / 300点、GATE COREは3hit / 500点。生物的な敵は登場しない。
- 同時に存在するターゲットは3個まで。装飾小惑星には当たり判定がない。
- 破壊点は `round(base × (1 + min(chain, 20) × 0.05) × risk)`。CHAIN猶予は1.5秒。
- 障害物との最接近距離を通過中に記録し、無接触で通過完了したときだけNEARを1回加算。フレーム間で障害物が機体を横切る場合も判定する。
- NEARでRISKを0.5ずつ増やし、上限3.0。被弾でCHAINとRISKをリセット。シールドは3、被弾後は1.2秒無敵。
- 3個のゲートを破壊すると開放ボーナス1500点。逃しても57.3秒で開き、進行不能にしない。
- クリア時に残シールド×2000点。失敗時はBEST・クリア・解放・発見を更新しない。
- `mirai-museum:v2` の既存記録を保持し、クリア時に `discoveries: ['asteroid']` を保存。Stage 2解放はデータだけで、未実装の開始ボタンは出さない。
- 結果でMAX CHAIN / NEAR / SHIELD、短い知識、展示への入口を表示。博物館からも保存した発見を開ける。日本語ルビ／英語対応。

## 構成と描画

`app/components/StarDiveGame.client.vue` が博物館との境界。純粋な時計・入力・スコア・ゲーム進行は `app/games/star-dive/`。Vueへ渡すHUDスナップショットは約12回/秒で、機体・弾・小惑星・カメラはゲームループからThreeオブジェクトを直接操作する。

`AudioEngine` は恐竜用の音処理から独立し、master / music / SFX / compressorを持つ。音の利用が許可されると `AudioContext.currentTime` をステージ時計に使う。未許可／利用不能でも単調時計で進行でき、許可時に時間を飛ばさず切り替える。setTimeoutは先読みスケジューラーだけに使う。音楽は144 BPM、RISKで追加レイヤー、NEARは16分音符に量子化できる。

PBR素材と低解像度の室内環境マップ、ACES tone mapping、bloom、grain、vignette、短い色収差。強さは場面とイベントに応じて変化する。外部の大きなモデルやテクスチャを読み込まず、機体と3種のターゲットはStorybookと共通の手続き生成モデル。小惑星・弾・破片・トンネルの壁と結晶はInstancedMesh。

画質はhigh / medium / low。持続的なフレーム負荷に応じてDPR・ポスト処理解像度・粒子数・機体と小惑星のLOD・トンネル密度を調整する。lowでは高負荷のbloomパスを省略する。品質が変わっても当たり判定や得点は変わらない。reduced motionではshake / roll / FOV変化 / 色収差 / 強いフラッシュを抑える。

現在の実描画はWebGL2。`visual/renderer.ts` はWebGPUアダプターを優先選択して失敗時にWebGL2へ戻すための独立した選択契約を用意しているが、WebGPU用のシーン／ポスト処理アダプターはまだ登録していない。WebGL2が利用不能、またはcontext lossの場合は博物館へ戻れるエラー画面を表示する。

## 確認方法

```
npm test
npm run typecheck
npm run test:e2e
npm run test:star-dive
npm run test:storybook
```

`npm run test:star-dive` は開発サーバーの `?starDiveDebug=1` を使う。開発限定パネルで場面移動、0.5/1/2倍速、無敵、衝突球、FPS、画質固定、clear/failを操作できる。本番ビルドではquery parameterがあってもパネルを生成しない。

Storybookの `STAR DIVE / Stage 1` には6場面、low品質、reduced motion、3種ターゲットを用意。`STAR DIVE / UI` でHUD・結果・展示を確認できる。

ブラウザー検証はChromiumのスマホ相当viewportで実施する。実機のiOS/AndroidにおけるFPS、バッテリー負荷、WebGPU描画は未計測。実機での60fps / 最低30fpsは追加の測定・調整が必要。

## 検証結果（2026-10-06）

- 単体テスト49件: 時計、得点、CHAIN、NEARの一回判定、RISKリセット、無敵時間、クリア限定保存、バックエンド選択を含め成功。
- 本番ブラウザー4シナリオ: 博物館・言語・恐竜clear/fail、STAR DIVE通しクリア、射撃のフィードバックを確認。修正後は影響した射撃シナリオを再実行して成功。
- 開発ブラウザー3シナリオ: 場面移動、low品質、pause/visibility、音楽時計の同期、clear保存と再読み込み、展示、fail時BEST維持、retry、context loss、WebGL2利用不能時の復帰を確認。
- Storybook29項目: 既存資産と新規15項目を確認。最後の岩の配置調整後にRISK / INSIDEを再確認。
- Nuxt型チェック、本番ビルド、Storybookビルド、差分の空白チェックに成功。
