# Three.js vs Babylon.js — Roman miniature

更新: 2026-10-13。検証・最適化を継続中の実装記録。

push時に取得したリモートの `work` は、サイトを最小Nuxtの「開発中」ページへ更新していた。これを最新の基準として保持し、ホームや削除済み展示を復活させず、独立したlabと必要なThree/Babylon/検証依存だけを追加した。以下の126件の旧テスト結果は統合前の記録。最新構成にはlabの9件の単体テストを追加し、統合後の確認を続ける。

## 現在の成果物

- `/lab` 比較、`/lab/three`、`/lab/babylon` の独立ページ。
- Nuxt 4.5.2 / Vue 3.5.43 / TypeScript 5.9.3。
- Three.js 0.186.1 (r186)、Babylon.js 8.32.0。
- Blender 4.3.2 で制作した同一 GLB と HDR。モデル・テクスチャはオリジナル CC0。
- 同一の神殿、アーチ式水道橋、屋根瓦付き住宅、市場、石畳、植物、川、舟、住民、噴水、積層台座。
- 共通 TypeScript のカメラ・キーボード・タッチ・ジョイスティック・固定時間刻み・A*経路探索・衝突・歩行・環境アニメーション。
- 5か所の調査、共通の回転水路パズル、噴水復活と住民の反応。
- 共通条件Aと追加AO/BloomのBを区別。固定解像度、昼夜、画質切替、統計パネル、PNG / 条件JSON、ブラウザ内の測定記録。

## 確認済み / 確認中

型検査、126件の単体テスト、Nuxtビルドが成功。ビルド成果物をChromiumとSwiftShaderで開き、両エンジンのGLB表示と昼夜描画を確認。比較画像はこの実際の描画から保存。

探索・パズル・エンジン切替・タッチ・Bのポスト処理のE2Eは実行準備済みで、結果の確認と修正を継続中。完了済みとは扱わない。iPhone Safari / Android Chromeの実機、ハードウェアGPUでの性能・電力・GPUメモリは未測定。

スクリーンショット取得直後のFPS表示はPNGエンコードとブラウザ操作の影響を受けるため、比較の実測値として採用しない。最終性能表は共通の「2秒準備 + 8秒サンプル」結果から追記する。

## 実装方法の比較

| 領域 | Three.js | Babylon.js |
| --- | --- | --- |
| GLB読込 | GLTFLoader、階層をtraverse | ImportMeshAsync、meshes / transformNodes |
| PBR | MeshStandardMaterial | PBRMaterial |
| 環境 | RGBELoader + PMREM | HDRCubeTexture + prefilter |
| 太陽・天空 | DirectionalLight / HemisphereLight | DirectionalLight / HemisphericLight |
| 共通の影 | PCFSoftShadowMap | ShadowGeneratorのPCF |
| 仕上げ | ACES / fog / SRGB | imageProcessing ACES / fog |
| Bの追加効果 | EffectComposer + SSAOPass + UnrealBloomPass + OutputPass | SSAO2RenderingPipeline + DefaultRenderingPipeline |
| 水の演出 | 共通法線データ / InstancedMesh | 共通法線データ / thin instances |
| 入力・移動・衝突・パズル | colspan相当: エンジンに依存しない同一TypeScript | 同左 |
| GPU解放 | geometry / material / texture / targets / rendererを明示解放 | scene / pipeline / instrumentation / engineを解放 |

### 測定APIの限界

FPSと平均フレーム時間は共通のrequestAnimationFrame / performance.nowで測る。ロード時間はエンジンの遅延import開始から初回描画終了までで、GLBとHDR、シェーダー準備を含む。ブラウザキャッシュ・端末の影響がある。

Three.js: `renderer.info.autoReset=false` と各フレーム先頭の `info.reset()` で、影とポスト処理を含むcalls / trianglesを読む。テクスチャ数は `info.memory.textures`。

Babylon.js: `SceneInstrumentation.drawCallsCounter.current`、`scene.getActiveIndices()/3`、`engine.getLoadedTexturesCache().length` を読む。三角形とテクスチャの集計範囲はThree.jsと異なるため、同じ定義の量として単純比較しない。

GPUメモリ・消費電力はどちらも「計測不可」。APIの取得値を架空のMBへ換算しない。FPS 60 / 30は目標であり達成結果ではない。

### 移動と物理

今回は重力や剛体が不要な街歩き。半径付きキャラクターと障害物を共通判定し、壁沿いの滑り、細かい移動サブステップ、川と台座端の境界、橋を実装。A*は対角の角抜けを禁止する。エンジン内蔵の衝突やHavokを使っていないので、その実装難易度・実行性能の優劣は本実装から判断できない。

### 型と保守

Adapter契約で描画だけを分離。配置・視点・品質・アニメーション・パズルを一方のエンジンだけ変更する構成にはしない。Vueに毎フレームの状態を全部流さず、UIは約10Hz、計測表示は約1秒単位。GLBとHDR、描画エンジンのロードはクライアントに限定する。

### 発生した不具合と修正

1. Nuxtのclient-only描画ではmounted時のcanvas参照がまだnullになる場合があった。参照をpost-flushで監視し、DOMが存在してから一度だけ初期化する。
2. 屋根瓦に屋根原点のX加算が不足し、瓦が空中へ並んだ。Blenderの生成座標を修正してGLBを再出力。
3. 台座の土層が川面を覆った。川の範囲を土層から切り離した。
4. 縦画面で台座が切れた。両エンジンに同じ画角計算を追加し、幅を保持する。
5. HDRCubeTextureに存在しないonErrorObservableを参照した。正式なconstructorのonErrorを使う。
6. Three.jsの既存shader errorコールバックに型不一致があった。native WebGLProgramの型への明示変換のみ追加し、処理を維持。
7. Viteの初回依存再最適化が画面を再ロードし、検証が中断された。ビルド済み本番構成で検証する。

## 100展示への判断（暫定）

Q1: 共通アセットから両方で同じ構図の箱庭を表現できた。美しさはアセット、構図、材質、照明の調整に大きく依存する。Bの検証を終える前に勝者を断定しない。

Q2: Three.jsは部品ごとの構成が明示的。Babylon.jsは標準の統合パイプラインを利用できる。一方、Babylonのside-effect import、right-handed設定、HDR APIの確認も必要だった。作業量の計測とE2Eの修正記録を最終版へ追記する。

Q3: 本実装の移動・ゲームは共通なので、エンジン間で同じ難易度。Babylon内蔵機能の効果はこの比較では実証していない。

Q4: スマホ実機の勝者は未判断。縦画面とタッチの自動検証だけでGPU、熱、バッテリー、Safari互換性の優位を主張しない。

Q5: 多数の展示には共通アセット・データ・ロジックと品質管理が最も大切。既存のBabylon採用方針は維持しつつ、今回の比較による根拠と未検証事項を区別する。最終推奨は検証終了後に記す。

## 再現コマンド

```sh
blender -b --python scripts/build-roman-lab.py
npm run typecheck
npm test
npm run build
npx playwright test --config playwright.roman.config.ts
```

カメラ条件・測定ログはブラウザ内に保存。撮影は共通の1440×960。エンジンを同時起動せず、同じ端末で同じ条件の測定を一つずつ行う。
