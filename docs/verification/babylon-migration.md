# Babylon.js移行の検証記録

2026-10-09。対象は共通基盤、3Dホーム、恐竜ランStage 1。一次仕様は [babylon-full3d-spec.md](../babylon-full3d-spec.md)。残る10ゲームは登録定義のみで、プレイ可能とは表示しない。

## 作業元と保護

`origin/main` の `2cbdd76` が `origin/work` の `ddbe4bb` を含むことを確認し、そのmainから独立した `babylon-refresh` worktreeを作成した。作業開始前の `git pull --ff-only origin main` は最新であることを確認した。push前にも両ブランチをfetchして更新の有無を確認する。リポジトリ内に適用対象のAGENTS.mdは無かった。

元のwork checkoutにあった自由の女神の追加、Three.jsホーム、仕様書、テスト等の未コミット変更はそのまま保護した。自由の女神GLBだけを内容変更せず新しい実装へコピーした。既存の画面構図、黒と青のホーム、240Hzのルール、保存キー、音源を確認してから刷新した。

## 実装と判定の変更

Engine / Scene・描画ループ・非同期素材・入力・設定を `app/three-d` へ分離した。VueはページとHUD、Babylonは全3D空間、TSの既存ルールは判定と音楽グリッドを担当する。部品・配置・ルールを分け、ステージのカメラ・照明・向き・サイズを3D描画へ接続した。

地球は元GLBの画像・雲・傾斜を使用し、Babylon用shaderで雲影と青い大気を描く。車のシルバーには実行時のスタジオ反射を使用する。ボーンを持つホーム恐竜は表示姿勢に合わせた非表示の選択メッシュを作り、地球をrayの遮蔽物に含める。モデル選択時は地球のタップ回転を発生させない。GLB原本は変更しない。

恐竜ランのジャンプ、速度、重力、衝突inset、coyote、buffer、50入力、得点、76.8秒、760ms retryは維持した。3D化で判定時刻や判定形状を変更していない。描画の傾き・脚振り・山・群れ・影は判定へ影響しない。完成した歩行クリップが無いため、既存ボーンの小さな手続き的動作を使用している。

Phaser、Three.js、`@types/three` を依存から削除した。Tres向けcompiler設定、旧Phaser Scene、Three描画、旧ピクセルゲームUI、描画に依存した旧テスト、未参照の生成済み2D plateを整理した。GLB・音源・翻訳・出典・生成スクリプトは保持し、ピクセルアート原本は `source-art/pixel` へ移した。旧ゲームの未知IDと追加保存フィールドも新しい結果の書き込み時に保持する。

## 検証環境と実行方法

Linux、Node 24.19、Nuxt 4.5.2、Vue 3.5.43、Babylon 8.56.2、Playwright 1.58.2、Chromium。WebGL2はANGLE / SwiftShaderのソフトウェア描画。PC 1280×720、モバイル相当390×844と844×390。タッチイベントとviewportのエミュレーションを使用し、実機として扱わない。

```sh
npm ci
npm test
npm run typecheck
npm run build
npm run test:browser
npm run test:runtime
npm run build-storybook
# TCPサーバーを使わず、prerenderされた本番HTML・JS・GLBを検証する場合
npm run test:browser:static
```

本番ブラウザ検証はNitroのHTTPサーバー、runtime検証はNuxt devサーバーとdev限定の観測APIを使用する。静的検証は `.output/public` の実際のHTML・JS・モデルをPlaywrightのrequest interceptionで配信する。APIの代用UIや偽の成功画面は使用しない。ブラウザ起動には、この環境ではソケット利用の許可が必要だった。

| 確認 | 結果 |
| --- | --- |
| 単体テスト | 7ファイル49件成功。決定論、実ルールclear、pause/retry、保存互換、車の解放、GLB同一性、読み込みabort/timeout、音声破棄を含む |
| TypeScript | `npm run typecheck` 成功 |
| 本番ビルド | `npm run build` 成功。`/` と `/dinosaur` のprerender HTML・payload・素材を生成 |
| 静的本番ブラウザ | 3件成功。ホームからゲーム、裏側の選択防止、ドラッグ、車の実タッチ選択、日英、縦横、画質保存、503時の復帰 |
| HTTP本番ブラウザ | 3件すべて成功。最新ビルドをNitroから配信し、静的検証と同じ導線・操作・復帰を確認 |
| runtimeブラウザ | 4件すべて成功。実入力jump / 空中pause / 10retry / 実ルールclear / 初回の車解放 / 3往復 / 6区間描画 / touch / visibility / quality / context loss / 読み込み中退出 / 実時間clearとreload後の保存 |
| Storybook | `npm run build-storybook` 成功。ブラウザ操作は未実施 |

## リソースと性能

10回のリトライでは同じSceneを再使用し、mesh / material / texture / audio source数を比較する。3回のホーム→ゲーム→ホームではCanvasが1つ、engine / scene / loopが各1つ、ホームのAudioContextが0、listener数が同じことを確認する。GLB読み込み中の退出、非表示タブのpause、WebGL context lossからの再読込も個別に検証する。

最終実行の [リソース観測値](babylon-resources.json) では10リトライ前後ともmesh 156 / material 14 / texture 4 / draw call 14 / audio source 2。ゲーム中のengine / scene / loop / AudioContextは各1、listener 7。3往復後のホームは毎回engine / scene / loop各1、listener 10、AudioContext 0、未完了GLB 0だった。

geometry約1,082,808 bytes、texture約1,749,461 bytes。頂点・インデックス数と画像寸法からの概算で、GPUメモリの直接計測ではない。GLB元バイトのLRU上限32MiB、decode済みPCMの上限48MiBを別途設け、Scene / GPU / AudioContextはキャッシュしない。

ソフトウェア描画のFPSを端末GPUの性能として報告しない。今回のsnapshotはhighで8.99FPS、実時間clear後のlowで15.83FPS。平均FPS・最低FPSの端末ベンチマークではない。[実時間clearの記録](babylon-real-time-clear.json) は18,432 ticks・100,000点・S・SYNC 100%、最後の音声時計との差は−0.122秒で180ms以内だった。50の予約入力を通常の描画時計で処理した。実機で滑らかな描画を保証する計測は未実施。

## 画像

最終ブラウザ実行から画像を保存し、青い地球・白い雲・大気、恐竜・車・自由の女神の配置、車のシルバー、3D地形・障害物・群れ・捕食者・結果表示を目視確認した。

- [PCホーム](images/home-desktop.png)、[初回clear後のモバイル相当ホーム](images/home-first-clear.png)、[clear結果](images/game-clear.png)
- Stage 1: [CALM / 3秒](images/game-section-3.png)、[HERD / 17秒](images/game-section-17.png)、[PREDATOR / 31秒](images/game-section-31.png)、[FLASH / 39秒](images/game-section-39.png)、[FALLOUT / 55秒](images/game-section-55.png)、[BOUNDARY / 73秒](images/game-section-73.png)

## 未実施と追加素材

- iOS / Android / Capacitor実機、ネイティブ公開、実端末のsafe area・熱・音声復帰、GPUメモリの直接計測、端末GPUでのFPS測定は未実施。
- 音声の検証はWeb Audioのsource・時計・同期・停止処理。実機のスピーカーでの聴取は未実施。
- Storybookのブラウザ操作は未実施。本体のブラウザ検証とStorybookビルドは別に扱う。
- 50入力のクリアは実ルールへ入力を予約する自動検証。人が指で全区間をクリアした操作感の評価は未実施。Spaceとタッチによるジャンプ自体は確認する。
- 周囲のT. rex / トリケラトプスは手続き的な仮モデル。作品向けGLBと自然な歩行・走行クリップが必要。プレイヤーにも制作済みの歩行クリップは無い。
- 残る10ゲーム、専用ステージエディター、WebGPUは今回実装していない。

提供モデルのSHA-256を単体テストで固定して確認した。

| GLB | SHA-256 |
| --- | --- |
| Earth | `99aa5a81862006d7bfcdcf1212da351d7f65b136110263970cb7733a3c5b2dd3` |
| Dinosaur | `4f935d37aa3d5d07cf6da3c40bacf710f29d437f2d12c04ef64c9402871e8d24` |
| Cybertruck | `1838b4bea2a2024a0ff67a46ddad5308cad9234fea7818924a5fe73d3d321e18` |
| Statue | `85e893c00645e230c88ab4a432752f011c8bebefa86878b4c6a004927fb5c614` |
