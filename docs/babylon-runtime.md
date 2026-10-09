# Babylon.js共通基盤

2026-10-09。一次仕様は `babylon-full3d-spec.md`。今回の完成範囲は共通基盤・ホーム・恐竜ランStage 1。

| 責務 | 実装 |
| --- | --- |
| Engine / Scene / 描画ループ / resize / visibility / context loss | `app/three-d/runtime.ts` |
| GLBのfetch、AssetContainerのScene内再利用、モデル補正、破棄 | `app/three-d/assets.ts` |
| 音声のfetch・decode・PCMキャッシュ | `app/three-d/audio.ts` |
| 単一ポインター・非リピートキー | `app/three-d/input.ts` |
| 品質・音量・ミュート・保存 | `app/three-d/settings.ts` |
| 所有資源のカウンター（dev QA用） | `app/three-d/diagnostics.ts` |
| ゲーム定義 / 共通記録 | `app/games/catalog.ts` / `progress.ts` |

Babylonはmounted後のdynamic importで初期化する。WebGL2を使い、WebGPUと剛体物理の依存は導入しない。恐竜のジャンプは固定判定を維持する。ゲーム定義は11件、実装済みだけが起動先を持つ。他ジャンルには個別の配置形式を追加する。

SceneRuntimeはEngineを1つ、Sceneを1つ、描画ループを1つ所有する。退出・エラーでAbortControllerを中断し、ループ、DOM listener、ResizeObserver、音声、AssetContainer、Scene、Engineを終了する。遅れて完了したGLBのparseも結果を破棄する。リトライは同じSceneのルールと演出をresetし、GPU素材を新規作成しない。非表示タブでループを停止し、恐竜ゲームをpauseする。復帰時には手動resumeする。

キャッシュはGLBの元バイトのみ最大32MiB、PCMは最大48MiBのLRU。Scene / GPU / AudioContextをグローバルに保持しない。異なるSceneへのGPU素材共有は行わない。同じScene内では部品・材質・テクスチャを再利用する。ホームは地球と解放された展示だけを読み、10未実装ゲームの素材は取得しない。

`high / medium / low` は描画pixel ratioの上限1.75 / 1.25 / 1。恐竜ランの影はhighのみ、装飾を各深度で減らす。物理240Hz、入力、配置、音楽時刻は品質に依存しない。reduced motionは慣性、車の移動、光柱、画面衝撃、灰を抑える。地球のゆっくりした回転は維持する。

恐竜ゲームの音声は既存の2ステムと効果音を使う。ホームの選択でAudioContextをresumeし、ゲームへ一度だけ所有権を渡す。使われなければ期限または退出で閉じる。AudioDirectorがmaster / music / sfx、開始時刻・例外的な180ms超の同期補正、pause / retryを担当する。音声が失敗しても案内付きで無音プレイできる。

保存形式は維持するため破壊的なデータ移行は不要。旧v1のミュートのみ新設定の未保存時に読み込む。既存のクリア / score / rank / attempts / 言語 / 解放を保持する。共通v2の旧未知ゲームのデータも書き込み時に残す。永続化できない場合はセッション内で遊べる。

Capacitorには `npm run generate` の `.output/public` をWebアセットとして使う。今回はCapacitor依存・iOS / Androidプロジェクト・ストア公開は追加していない。ページはAPIサーバーに依存しない。端末のWebView、AudioContext復帰、熱・GPU性能・safe areaの実測は後続作業。
