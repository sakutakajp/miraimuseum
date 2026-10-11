# 暗号の遺跡 — Stage 1・2

実装日: 2026-10-11。提供された `caesar-game-codex-instructions.md` と3枚の参考画像を基準に実装。

## 起動と経路

```sh
npm ci
npm run dev
```

ホームの「ゲーム一覧」→ `/games` →「暗号の遺跡」→ `/games/caesar`。Stage 1から開始。「ステージ選択へ」からStage 1・2をいつでも選択できる。追加のAPI・ログイン・環境変数は不要。両ページは本番ビルドでprerenderする。

## 実装

| 責務 | ファイル |
| --- | --- |
| A〜Zの循環、文字列変換、1文字置換 | `app/games/caesar/cipher.ts` |
| 問題種別・入力・期待結果・通信記録 | `app/games/caesar/questions.ts` |
| 日本語の案内・ラベル・ヒント | `app/games/caesar/copy.ts` |
| 漢字の読み、ネイティブruby表示 | `app/games/caesar/readings.ts` / `ReadableText.vue` |
| 入力・実行・誤答・演出・次問待ちの状態遷移 | `app/games/caesar/state.ts` |
| 初回正誤・実行数・ヒント数、version 1の保存 | `app/games/caesar/progress.ts` |
| UI・同期ドラッグ・復習欄 | `app/components/games/caesar/` |
| 背景のファンタジーイラスト＋橋・探検者・光の動き | `app/games/caesar/scene.ts` / `geometry.ts` |
| 共通のEngine・Scene・描画・visibility・解放 | 既存の `app/three-d/runtime.ts` |

Stage 1の文字帯は右に引くと左隣の文字が中央へ来る。3本の変位は共通で、表示と判定は指を離した整数のずらし量で更新する。長いドラッグは1回につき最大3文字。横ドラッグは `touch-action: pan-y` の領域内だけで扱い、縦スクロールを許可する。キーボードでは右キーが戻す、左キーが進める。ボタン操作も可能。FDW → ECV → DBU → CATを履歴にも残す。

Stage 2は実行するまで結果を伏せる。方向／数／修正位置／修正文字を変えると誤答結果を伏せる。解読は−3・+23、暗号化は+3・−23を認め、23の同値解には循環の説明を出す。修正位置を変えると未選択の場所を元のFDYへ戻し、完成したFDWだけを正解にする。正解後は「次へ」を押すまで進まない。実行中の再実行や、演出中の二重遷移を受け付けない。リセット・ステージ選択・退出は保留タイマーを取り消す。

文字・ラベル・ボタンはDOM。背景はユーザーの追加指定に合わせた2枚の生成イラスト。参考画像の砂岩の遺跡、青緑の峡谷、金色の猫像・魔法の通信機を同じ画風で描いた。`public/caesar/` にWebPで収録し、文字は画像に焼き込まない。橋をつなぐ動き・探検者の横断・通信機の回復する光は、透明なBabylon.js 8のcanvasに小さなメッシュで重ねる。ふつう／かるいで描画解像度を切り替える。タブ非表示で描画を停止し、退出でScene・Engine・listener・ResizeObserverを解放する。背景失敗時も文字操作を続けられ、再表示では新しいcanvasを用意する。reduced motionでは演出を短縮。音声は追加していない。

ゲームと一覧の漢字にはルビを付ける。低学年向けに「出力」を「できた文字」にするなど案内を簡単にした。読みは `readings.ts` の最長一致で区切り、`ruby` / `rt` で表示する。読み上げではルビを重複しない。画質のselect選択肢はひらがな。

独立した保存キーは `mirai-museum:caesar:v1`。破損・非対応バージョン・保存拒否・容量不足でも遊べる。Stageのクリアは共通 `mirai-museum:v2` の `rosetta` にも保存し、既存ゲームの記録を保持する。英単語やクリアを理解度の点数にはしない。終了時の復習欄では解読・暗号化・同じ鍵について、初回正誤・実行回数・ヒント数を表示する。

## 検証

```sh
npm run typecheck
npm test
npm run build
./node_modules/.bin/playwright test
./node_modules/.bin/playwright test --config playwright.runtime.config.ts tests/runtime-browser/caesar.spec.ts
```

ロジックの単体検証は `tests/caesar.test.ts`。ルビの読み・文脈・漢字の網羅は `tests/caesar-readings.test.ts`。本番ブラウザ検証は `tests/browser/caesar.spec.ts`。資源とcontext lossの検証は `tests/runtime-browser/caesar.spec.ts`。本番のブラウザテストでは既存ホーム・恐竜への遷移も合わせて確認する。橋・通信機・終了・ゲーム一覧の実際のDOMでも、漢字にルビがあることを確認する。

確認対象はLinux ChromiumのPC 1440×1000、スマホ縦390×844・幅320、タッチのエミュレーション、キーボードのみ、reduced motion。実行前の結果非表示、誤答・ヒント・同値解・修正位置変更・再挑戦・保存拒否・描画不能を検証する。画面画像はPlaywrightの `test-results/production` に出力する。資源の測定結果は `test-results/runtime` に出力する。

2026-10-11の検証: 型チェック・本番ビルド成功、単体77件、本番ブラウザ8件、描画資源のブラウザ検証1件が通過。PCの両ステージ・橋の接続・終了・一覧、スマホ縦の両ステージのスクリーンショットを作成した。

10回のやり直し前後で17メッシュ・6マテリアルを維持（Stage 1初期の描画5回）。3回のSPA退出ごとにEngine・Scene・描画ループ・listenerがすべて0、再入場で1・1・1・2に復帰した。タブ非表示でループ0、復帰で1。context loss後に資源0へ解放し、新しいcanvasで再表示できた。FPSはソフトウェアWebGLと自動操作の影響を受けるため、実機の性能値として扱わない。

iOS／Android実機、Safari、Firefox、Capacitor実機は未検証。背景はイラスト、動く部分は軽量な手続き的モデルで構成している。公開・本番デプロイは行っていない。
