# MIRAI: DEEP TIME — Stage 1 implementation

一次仕様は [dinosaur-stage1.md](dinosaur-stage1.md)。実装範囲は `CRETACEOUS // LAST DAY` のみ。Stage 2のレベルや起動導線は追加していない。

## 起動と操作

`/dinosaur` → START。タップ / クリック / Space / ↑で固定軌道のジャンプ。Escapeまたは右上のpauseで停止し、非表示になったタブも停止する。pauseのSOUNDでmuteを切り替える。STARTはユーザー操作でAudioContextを解除し、300msのタイトル遷移後に開始する。

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

CALM → HERD → PREDATOR → FLASH → FALLOUT → BOUNDARY。空、遠景地形、地形の塊、植生、恐竜、ゲーム地面、前景、粒子を別の深度で描く。Bone / Obsidian / Fossil / Fern / Ironの印刷色に、鉱物の粒と分類タイポグラフィを重ねる。Impact Orangeは衝突の閃光以降に使用する。

TriceratopsとT. rexは遠・中・近で異なる線・光の処理を持つSVG plate。T. rexは遠景、横断、近景の頭部、追走へ進むが、プレイヤーのcollision対象にはしない。FLASH直後には安全な鑑賞区間を設けた。FALLOUTは落下する石、燃える枝、崩れる足場と短い再ジャンプを組み合わせる。最後の入力後は死亡を無効にし、ズームを引き、世界を白へ、一本の黒い線をK–Pg境界の地層へ変える。

描画はWebGL優先のPhaser.AUTO、`pixelArt:false`。背景・地面はキャッシュしたtextureとImageプールを移動する。TileSpriteのscroll時の大きなcanvas再転送を避け、ポストエフェクトに依存しない。環境の脱色も初期生成したgray textureで行い、プレイヤーを脱色しない。粒子、前景密度、恐竜の補助描写を順に下げる3 quality tiersを持つ。

音源は本作品用のオリジナル電子音楽。76.8秒のmineral / pulse 2ステムと、jump / land / death / step / rock / rex / impact / UI / clearをOggとAACで収録した。`scripts/build-deep-time-audio.py` で固定seedのPCMから再生成できる（numpy / ffmpegが必要）。ブラウザ内のoscillatorやsetIntervalで曲を演奏しない。

`AudioDirector`が共通AudioContext時刻で2ステムを開始し、pause / resume / reset / mute / bus / sourceの解放を管理する。例外的な180ms超の同期ずれだけを補正する。リトライ時は残響も解放し、同じ開始点から再生する。アートの再生成元は `scripts/build-deep-time-art.py`。第三者のアート・音源は含まない。

## UIと保存

`DinosaurRunScene` はphysicsと演出、`DinosaurUIScene` はHUD / pause / 到達率 / clear / exhibit。Nuxtはhost、loading / fatal、博物館への遷移と、Canvasと同じ位置のfocus可能なsemantic controlを担当する。展示文章にはscreen reader用の同じ内容も付与した。背景・物理を毎frame Vueへ送らない。

失敗は到達率だけを更新。clear scoreは `50,000 + SYNC × 40,000 + 10,000`、最大100,000。RankはS ≥ 92,000 / A ≥ 84,000 / B ≥ 72,000 / C。試行数は競争の優劣に使わない。

`mirai-museum:deep-time:v1` にbest progress / clear score / sync / rank / clear / lifetime attemptsを保存する。clearのみ共通 `mirai-museum:v2` にも渡す。旧保存領域は保持し、旧プロトタイプのクリアを新しいDEEP TIMEのクリアとして表示しない。旧DinosaurScene / Expeditionは過去のprototype用途で残したが、博物館のDEEP TIMEとStorybook背景は新実装を使う。

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

- `npm test`: 79件pass。新しいStage 1は12件で、60 / 120 Hz / 不規則renderの同一world state、全50challengeの無補助clear、large delta、coyote / buffer / inset、cue / speed / collapse / SYNC / Rank / 保存を確認した。
- `npm run typecheck`、本番build、Storybook build: pass。
- DEEP TIME開発Playwright: 操作 / 空中pause / visibility / 20回以上の連続retry、実physicsの100,000点clear / 展示 / 永続保存、4画面サイズ / reduced motion / low / context loss、およびFLASH時の既存Rexの静止とphysics継続を確認した。
- 390×844 / 430×932 / 1440×900 / 1280×800の構図を画像で確認。6場面の静止画、K–Pg ending、clear展示も確認した。ブラウザのpageerrorは通常動作で発生していない。
- Ogg / AACの両ステムは24 kHz / stereo / 76.8秒。音源・アートは起動時だけ読み込み、連続retryでCanvas / texture / input listener数が増えず、audio sourceとVFXも上限内に収まることを確認した。

Chromiumのソフトウェア描画による確認と、モバイル実機のGPU性能は分けて扱う。iPhone Safari実機の音声復帰・温度・safe areaはこの環境では未計測。
