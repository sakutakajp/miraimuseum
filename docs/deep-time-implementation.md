# 恐竜ゲーム — Stage 1 implementation

> **2026-10-09 更新:** エンジン選定・フル3D化・11ゲーム構成は [Babylon.js / フル3D共通仕様](babylon-full3d-spec.md) を優先する。本書のThree.js / Phaser / TresJSおよび2D描画の記述は移行前の設計・実装記録であり、新規実装の採用指示ではない。既存のゲーム固有要件は共通仕様と矛盾しない範囲で維持する。記載された過去のテスト結果はBabylon.js版の検証結果ではない。


一次仕様は [dinosaur-stage1.md](dinosaur-stage1.md)。実装範囲はStage 1のみ。Stage 2のレベルや起動導線は追加していない。現在の画面では旧タイトル、ステージ名、experience番号を表示しない。

## 起動と操作

`/dinosaur` → START。ホームの地球が表示されたらroute、Phaser、scene、ブラキオサウルスGLB、背景のSVG画像、音声を先読みする。GLBはparse、画像と音声はdecodeまで済ませる。ホームのブラキオサウルスからは `/dinosaur?play=1` へ遷移し、STARTと300msのタイトル遷移を省いて開始する。`preload.ts` がruntimeと読み込みの寿命、`player-model.ts` と `plate-assets.ts` がモデルと画像の引き渡しを管理する。先読みに失敗した画像と音声はゲーム側で通常通り読み込む。

ホームのtap中にAudioContextをresumeし、decode済みAudioBufferとともにゲームのAudioDirectorへ一度だけ引き渡すことで、Safariでも音声の起動をユーザー操作に結び付ける。先読み中は音声を再生せず、別ページへの移動で未使用のcontextを閉じる。tap後に遷移しなかった場合も60秒後に閉じる。ホームでは追加のPhaser.Gameを作らない。

主人公はホームと同じ `public/floating-earth/dinosaur.glb` を使うブラキオサウルス。モデルは足元を原点、高さを54 world unitsに正規化して右向きに配置する。歩行、pose切り替え、着地の変形は行わず、固定poseのままジャンプ座標に追従する。タップ / クリック / Space / ↑で固定軌道のジャンプ。Escapeまたは右上のpauseで停止し、非表示になったタブも停止する。pauseのSOUNDでmuteを切り替える。直接アクセス時のSTARTはユーザー操作でAudioContextを解除し、300msの遷移後に開始する。physics、collision、50ジャンプの時刻は変更しない。

`rendering/Brachiosaurus3D.ts` はPhaserのExternとして、地形と前景の間にThree.jsのmeshを描く。CanvasとWebGL2 contextを共有し、描画前後でstateを戻す。白い環境光と暖色の方向光で元の素材を照らす。GLBが読めなければ立体のplaceholderを使い、WebGL2が使えない環境ではCanvasと固定SVGへ戻る。モデルは一度だけゲームへ引き渡し、終了時にgeometry、material、texture、skeletonとThree rendererを解放する。共有contextはPhaserが管理する。

一撃死。死亡は短いhit stop、印刷片の破砕、到達率 / NEW BEST、画面のワイプで構成し、760ms後に同じPhaser.Gameで自動再走する。失敗リザルト・巻き戻し・無敵時間・自動救済・収集ポップアップは使用しない。

## 決定論的なレベル

`app/game/dinosaur` にゲーム固有のコードを隔離した。

- `FixedStepWorld`: 1/240秒、描画から独立したAABB、70ms coyote、100ms buffer。速度・段差・崩れる足場・落下物は固定時刻で評価する。入力には時刻を保持し、SYNCは実際の入力時刻を評価する。
- `StageClock`: tick由来のelapsed / beat / bar / section。150 BPM、48小節、18,432 ticks、76.8秒。
- `levels/stage01`: 50ジャンプの音楽グリッド、距離に焼き込んだcollision、速度曲線、恐竜 / camera / visual / audio cue。障害物にランダム配置はない。
- `SpatialSectionSystem`: 400 world unitsのchunkで衝突候補と画面付近の描画物を絞る。障害物・地形・VFXはプールを再利用する。
- `TriggerSystem`: previous/current timeのcrossingで一度だけ発火。resetで同じ振付を再生する。

長いrender deltaは一度の処理を制限し、処理しきれないfixed tickを保持する。隠れたタブでは停止し、pause時に残りの描画accumulatorを捨てる。画面比率・quality・reduced motionは物理と障害物時刻に影響しない。

## 映像と音

CALM → HERD → PREDATOR → FLASH → FALLOUT → BOUNDARY。空、遠景地形、地形の塊、植生、恐竜、ゲーム地面、前景、粒子を別の深度で描く。Bone / Obsidian / Fossil / Fern / Ironの印刷色に鉱物の粒を重ねる。背景の大きな文字、分類ラベル、endingの地層ラベルは表示しない。操作、pause、score、展示のUIは維持する。Impact Orangeは衝突の閃光以降に使用する。

TriceratopsとT. rexは遠・中・近で異なる線・光の処理を持つSVG plate。T. rexは遠景、横断、近景の頭部、追走へ進むが、プレイヤーのcollision対象にはしない。FLASH直後には安全な鑑賞区間を設けた。FALLOUTは落下する石、燃える枝、崩れる足場と短い再ジャンプを組み合わせる。最後の入力後は死亡を無効にし、ズームを引き、世界を白へ、一本の黒い線をK–Pg境界の地層へ変える。

描画はWebGL2を優先し、PhaserとThree.jsで同じCanvasを使う。WebGL2が使えなければPhaser.Canvasに切り替える。`pixelArt:false`。背景・地面はキャッシュしたtextureとImageプールを移動する。TileSpriteのscroll時の大きなcanvas再転送を避け、ポストエフェクトに依存しない。環境の脱色も初期生成したgray textureで行い、プレイヤーを脱色しない。粒子、前景密度、恐竜の補助描写を順に下げる3 quality tiersを持つ。

音源は本作品用のオリジナル電子音楽。76.8秒のmineral / pulse 2ステムと、jump / land / death / step / rock / rex / impact / UI / clearをOggとAACで収録した。`scripts/build-deep-time-audio.py` で固定seedのPCMから再生成できる（numpy / ffmpegが必要）。ブラウザ内のoscillatorやsetIntervalで曲を演奏しない。

`AudioDirector`が共通AudioContext時刻で2ステムを開始し、pause / resume / reset / mute / bus / sourceの解放を管理する。例外的な180ms超の同期ずれだけを補正する。リトライ時は残響も解放し、同じ開始点から再生する。背景アートの再生成元は `scripts/build-deep-time-art.py`。ブラキオサウルスは提供されたGLBを使用する。

## UIと保存

`DinosaurRunScene` はphysicsと演出、`DinosaurUIScene` はHUD / pause / 到達率 / clear。Nuxtはhost、loading / fatal、ホームへの遷移と、Canvasと同じ位置のfocus可能なsemantic controlを担当する。`OPEN EXHIBIT` とゲーム内の展示は削除し、clear後は再走とホームへの移動だけを表示する。背景・物理を毎frame Vueへ送らない。

画面上端・下端のsafe areaを差し引き、高さ800 world unitsの構図が縦に収まるscaleと地面位置を選ぶ。pause / clearは実際の文字の高さを使って配置し、全体を利用可能な高さに収める。横向きの狭い画面では操作ボタンを横一列にする。semantic controlにも同じscaleと位置を適用する。

言語はホーム右上から日本語 / 英語を選択し、ページ間と再読み込み後も引き継ぐ。`copy.ts` で開始・pause・音声・clear・score・retry・失敗・保存エラー・読み上げ文言を両言語で管理する。Canvasとsemantic controlは同じ言語を使い、文書の `lang` とページのdescriptionも切り替える。

失敗は到達率だけを更新。clear scoreは `50,000 + SYNC × 40,000 + 10,000`、最大100,000。RankはS ≥ 92,000 / A ≥ 84,000 / B ≥ 72,000 / C。試行数は競争の優劣に使わない。

`mirai-museum:deep-time:v1` にbest progress / clear score / sync / rank / clear / lifetime attemptsを保存する。clearのみ共通 `mirai-museum:v2` にも渡す。タイトルを削除しても内部の保存キーを維持し、既存の記録を引き継ぐ。旧プロトタイプのクリアは現行ゲームのクリアと区別する。旧DinosaurScene / Expeditionは過去のprototype用途で残したが、現行の恐竜ゲームとStorybook背景は新実装を使う。

## 開発確認

`/dinosaur?deepTimeDebug=1` はdevelopment限定。hitbox、beat/bar、fixed tick、FPS / frame time、coyote / buffer、chunk / quality、audio error / source count、VFX数、trigger履歴を表示する。section seek、無敵preview、low tierを指定できる。本番にはUIとwindowのdebug参照を出さない。

```sh
npm test
npm run typecheck
npm run test:deep-time
npm run test:e2e
npm run build-storybook
npm run test:storybook
```

確認済み:

- `npm test`: 98件pass。Stage 1の12件で、60 / 120 Hz / 不規則renderの同一world state、全50challengeの無補助clear、large delta、coyote / buffer / inset、cue / speed / collapse / SYNC / Rank / 保存を確認した。ホームの出現、光柱、球面配置、見切れ、地球による選択の遮蔽、輪郭付近のtap、音声の先読み・引き渡し・失敗後の再読み込み・解放も検証する。3D主人公の4件ではモデルの正規化、一度だけの引き渡しと解放、GLB不在時のplaceholder、safe areaを含む縦方向の構図を検証する。
- `npm run typecheck`、本番build: pass。本番Playwright 9件でホームの操作・先読みからのtouch起動・先読み失敗後の再起動・static fallback・一つずつ切り替わるTips・言語切り替えの保存とゲームへの引き継ぎを確認した。
- 恐竜ゲーム開発Playwright 6件: 実際のGLBの描画 / 共有context / 固定poseでのjump、操作 / 空中pause / visibility / 20回以上の連続retry、実physicsの100,000点clear / 再走 / 永続保存、4画面サイズ / reduced motion / low / context loss、スマホの上下のsafe area / メニューの重なり / 日本語と英語 / 展示ボタンの削除、およびFLASH時の既存Rexの静止とphysics継続を確認した。
- 390×664 / 390×844 / 430×932 / 844×390 / 1440×900 / 1280×800の構図、GLBの実際の描画、日本語と英語のclear画面を画像で確認した。
- Storybook buildとPlaywright 14件: pass。ゲームカードの言語と、3D主人公を共有する各場面のプレビューを確認した。
- Ogg / AACの両ステムは24 kHz / stereo / 76.8秒。ホームでの先読み完了後、実際のtouchから新たな素材ダウンロードとタイトル遷移を挟まず開始できることを検証する。連続retryでCanvas / texture / input listener数が増えず、audio sourceとVFXも上限内に収まることを確認した。

Chromiumのソフトウェア描画による確認と、モバイル実機のGPU性能は分けて扱う。iPhone Safari実機の音声復帰・温度・safe areaはこの環境では未計測。
