1476 dinosaur-stage1.md
# MIRAI: DEEP TIME — Stage 1 "CRETACEOUS // LAST DAY" 実装仕様

Version: 1.0  
Date: 2026-10-06  
Status: Implementation-ready draft  
Engine: Phaser 3 / TypeScript  
Target: Web first, mobile portrait first-class, future Capacitor compatible

## 0. この仕様の位置づけ

この文書は、みらい博物館の「恐竜 × 2D横スクロールアクション」Stage 1を、既存プロトタイプから高品質な作品へ全面的に再設計する一次仕様である。

READMEの恐竜ゲーム概要、現行 DinosaurScene.ts / expedition.ts の挙動と本仕様が衝突する場合、Stage 1については本仕様を優先する。

品質目標は「子ども向けWebゲームとして良い」ではない。

> 普通のインディーゲームとして販売されていても、映像・音・入力・リトライ・レベル設計の完成度に違和感がない。

これを品質基準とする。

### 参照した設計原則

Geometry Dashから採用するもの:

- 自動前進 + 1入力という強い制約
- 一撃死と高速リトライ
- 決定論的なレベル
- 音楽と障害物・カメラ・VFXの同期
- 見た目より少し寛容な当たり判定
- 到達率 / NEW BESTによる再挑戦動機
- 多層パララックスと明確なセクション構造

Bauhaus Builderから採用するもの:

- UIとゲーム世界を別のデザインにしない
- 色・タイポグラフィ・形・アニメーションを一つの視覚言語にする
- Gameplay SceneとUI Sceneを責務分離する
- 短く気持ちのよい200–400ms程度のUI motion
- 操作状態を視覚・音で即時に返す

採用しないもの:

- Geometry Dashのネオン、Portal、Gravity反転、変身、UIそのもの
- Bauhaus Builderの配色や図形そのもの
- 子ども向けらしい色・マスコット・説明口調

---

## 1. High concept

正式タイトル:

    MIRAI: DEEP TIME
    STAGE 01
    CRETACEOUS // LAST DAY

短い説明:

> 6600万年前。恐竜時代、最後の日を走る。

プレイヤーは後期白亜紀の世界を約76.8秒間走る。前半は静かな大地、恐竜の群れ、T. rexの接近。後半、空が白く光り、環境が崩壊していく。

ゴールは「隕石から逃げ切って生き残る」ことではない。

最後には世界が白く消え、その白が地層のK–Pg境界へ接続する。Stageをクリアしたプレイヤーは、初めて「自分が走っていた世界が地球史の一瞬だった」と理解する。

ゲーム中に長い説明はしない。知識は世界のアートディレクションへ埋め込み、詳しい展示はプレイ後に開く。

---

## 2. 今回、既存実装から廃止するもの

以下は互換維持しない。必要なら既存コードを置き換える。

- 衝突後に130相当戻る処理
- 1.35秒の無敵時間
- 3回失敗後の自動ジャンプ
- 「だいじょうぶ。もう一度、ぴょん！」等の救済文言
- プレイ中のDiscovery Toast
- 6個の発見アイテムを集めることをStageの中心にする設計
- 既存の明るいベージュ / 緑中心の背景
- 現行の子ども向けピクセルスプライトを最終アートとして使うこと
- setIntervalベースの簡易BGM
- DinosaurScene 1ファイルへ描画・入力・進行・カメラを集中する構造
- 毎フレーム全背景をGraphicsで再描画する方式

### 維持するもの

- Phaserを2Dゲームエンジンとして使う
- Nuxtの博物館シェルから独立したゲームとして起動する
- 自動横スクロール
- タップ / Space / ↑のシンプルな入力
- スマートフォン縦画面を第一級にする
- PCでもプレイ可能
- localStorageへBESTを保存できる共通方針
- ミュート / pause / visibility pause

---

## 3. Core loop

入力は1つだけ。

    TAP / CLICK / SPACE / ARROW UP = JUMP

### 禁止

- double jump
- attack
- duck
- swipe action
- virtual d-pad
- player-controlled horizontal movement

複雑さを入力へ追加しない。

難易度は次から作る:

- obstacle spacing
- landing position
- consecutive jumps
- terrain height
- moving/collapsing surfaces
- section speed
- camera tension
- audio rhythm
- visual pressure

---

## 4. Jump feel

ジャンプは固定軌道を基本にする。押下時間で大きく高さを変えない。

開始チューニング値:

- fixed physics step: 1 / 240 sec
- run speed: configでsectionごとに倍率指定
- coyote time: 70ms
- jump buffer: 100ms
- input-to-visible-response target: 50ms以下
- landing squash: 80–120ms
- jump anticipation: 入力遅延を生む事前animationは禁止

当たり判定:

- playerのvisual silhouetteより横幅を約10–15% inset
- 足元判定はvisualと一致させる
- obstacleも尖った装飾部分をhitboxへ含めない
- 「当たっていないように見える死」を最優先で避ける

プレイヤーが失敗したとき「ゲームに騙された」ではなく「自分のタイミングが遅かった / 早かった」と感じられること。

---

## 5. Failure / retry

通常runでは一撃死。

Stage途中のcheckpointは置かない。

### Death sequence

目標800ms以内:

| 時間 | 処理 |
|---:|---|
| 0–70ms | hit-stop / audio impact |
| 70–240ms | player shatter / camera recoil |
| 180–420ms | current percent / NEW BEST |
| 350–700ms | world strip / reset prepare |
| 650–900ms | next attempt begins |

Game Over modalを開かない。

死亡時のUI例:

    64%
    NEW BEST

または:

    ATTEMPT 07 // 64%

### Retry quality gate

- restart時にVue/Nuxt routeを再読み込みしない
- Phaser Game自体をdestroy/recreateしない
- textures/audioを再ロードしない
- level runtimeだけをdeterministic resetする
- musicも同じstart pointへ戻る
- restartのたびGC spikeを起こさない

---

## 6. Music grid

Stage 1は音楽から設計する。

- tempo: 150 BPM
- meter: 4/4
- length: 48 bars
- 1 beat: 0.4 sec
- 1 bar: 1.6 sec
- 8 bars: 12.8 sec
- total authored run: 76.8 sec

6 section × 8 bars。

ゲーム開始前にユーザー操作でAudioContextをunlockする。

### StageClock

音・物理・camera・visual triggerは同じStageClockを見る。

StageClockが提供する値:

    elapsedSeconds
    beat
    bar
    sectionIndex
    sectionProgress

GameplayのcollisionをAudioAnalyser値に依存させない。

AudioAnalyserは、bass / transientに反応するvisual pulse等の非決定論的装飾にのみ使える。

---

## 7. 76.8秒の全体構成

| Bars | Time | Section | Speed | Dramatic role |
|---|---:|---|---:|---|
| 1–8 | 0–12.8s | 01 CALM | 1.00x | rulesを身体で理解 |
| 9–16 | 12.8–25.6s | 02 HERD | 1.00x | 世界に生命を入れる |
| 17–24 | 25.6–38.4s | 03 PREDATOR | 1.00→1.15x | 緊張を上げる |
| 25–32 | 38.4–51.2s | 04 FLASH | 1.15x | 世界観を反転 |
| 33–40 | 51.2–64.0s | 05 FALLOUT | 1.15→1.30x | gameplay peak |
| 41–48 | 64.0–76.8s | 06 BOUNDARY | 1.30→0 | emotional resolution |

ゲーム難易度のピークと映像のピークを完全には一致させない。

最難関はFALLOUT。BOUNDARYでは操作密度を落として余韻を作る。

---

## 8. Section 01 — CALM

目的:

- tutorial modalなしで操作を理解させる
- 最初の3ジャンプでゲームのリズムを理解させる
- art directionを提示する

### Choreography

Bar 1:

- 走り出した状態から開始
- UIは最小
-遠景に巨大な地形

Bar 2:

- 最初の低い障害物
- kickとjump opportunityを一致

Bar 3–4:

- 単独障害物
- landingが次のbeatへ気持ちよく接続

Bar 5–6:

- 小さな高低差
- foreground fernが一度だけ画面を横切る

Bar 7–8:

- 2連続challenge
- HERDへ繋がる足音をaudioへ混ぜる

画面へ「タップしてジャンプ」と文章表示しない。

初回のみ必要なら、最初の障害物前に極小のtouch glyphを1回だけ出し、ジャンプ入力で即座に消す。

---

## 9. Section 02 — HERD

目的:

- 背景ではなく「生きている白亜紀」を見せる
- 画面の前後関係を増やす

### Visual

- distant herd
- midground Triceratops
- foregroundを一頭だけ横切る
- 土埃を足音と同期
- cameraへ1–2px相当の低周波振動

恐竜を障害物の記号にしすぎない。

### Gameplay

- 足跡の窪み
- roots
- fallen wood / rock
- terrain step
- 最初のprecision landing

このsectionは難しくしすぎない。恐竜を見る余裕を残す。

---

## 10. Section 03 — PREDATOR

T. rexを登場させる。

### Appearance progression

1. distant silhouette
2. midground crossing
3. bass dropでforegroundへ寄る
4. chase compositionへ移行

T. rexをplayerへ直接collisionさせる設計を中心にしない。

T. rexは「失敗判定」より「圧力」として使う。

### Gameplay

- speed ramp 1.00 → 1.15
- shorter recovery distance
- two-jump rhythm
- terrain crestで一瞬player silhouetteを空へ抜く
- landing直後に次のdecision

### Camera

- FOV相当の見え方を少しtightにする
- playerを通常より少し左へ
- T. rex出現時のみ短いimpulse
- constant shakeは禁止

---

## 11. Section 04 — FLASH

Bar 25 entryがStage全体の最大の転換点。

### Event

1. 主要楽器が一瞬止まる
2. sky luminanceが急上昇
3. distant dinosaursの動きが止まる
4. player以外の彩度が落ちる
5.低周波impact
6. Impact Orangeが世界へ侵入

flashはphotosensitivity配慮を行う。

- full-white strobeを繰り返さない
- flashは単発
- reduced-effects設定ではpeak luminance / durationを抑える

### Gameplay

FLASH直後に理不尽な初見殺しを置かない。

プレイヤーが演出を見る250–500ms相当の余裕を作ってからchallengeを再開する。

---

## 12. Section 05 — FALLOUT

ゲームプレイの最難関。

新規操作は追加しない。

既知のjumpだけで難度を上げる。

### Obstacles

- falling debris
- collapsing ground
- burning branch
- consecutive rocks
- broken ledges
- precision landing
- foreground ejecta that does not own collision

collisionを持つ物体とpure VFXを視覚的に区別できること。

「派手だから何に当たるか分からない」は失格。

### Speed

1.15 → 1.30。

速度変化はtriggerで滑らかに行う。

### Difficulty

- hardest patternは1つに絞る
- そのpattern前に同じgrammarの簡易版を経験させる
- unavoidable blind jumpは禁止
- camera演出によって必要なobstacleを隠さない

---

## 13. Section 06 — BOUNDARY

FALLOUTで難度をピークにしたあと、意図的に空間を作る。

### Visual progression

- music layers drop
- ash dominates
- palette becomes near monochrome
- dinosaur presence disappears
- world detail recedes

### Gameplay

- obstacle density decreases
- 2–3 meaningful jumpsのみ
-最後の数秒は走ること自体を見せる

### Ending

最終入力後、失敗判定を止める。

遠景が白く消える。

player silhouetteも白へ溶ける。

完全な白から、1本の黒い水平線が出る。

cameraが引く / compositionが変わり、それが地層中の境界線だったと分かる。

表示:

    66.0 Ma
    CRETACEOUS — PALEOGENE BOUNDARY

その後:

    RUN COMPLETE

このending中に「恐竜は絶滅しました」と説明しない。

詳細はExhibitへ渡す。

---

## 14. Art direction

Concept:

> Editorial Paleontology × Motion Graphics × 2D Action

ピクセルアートを最終表現にしない。

### Base palette

- Obsidian: #10110F
- Bone: #E9E4D8
- Fossil: #B7A68A
- Fern: #53654B
- Iron: #A94732
- Impact: #F05A38

常時Impact colorを使わない。

Chapter 04で初めて赤橙が本格的に侵入することで意味を持たせる。

### Texture

- paper / mineral grain
- restrained halftone
- dry ink edge
- fossil plate / scientific printを想起する質感

ただし画面全体を古紙フィルターにしない。

背景の質感とgameplay silhouetteの可読性を分離する。

---

## 15. Typography as world

学習情報はプレイを止めるpopupではなく、世界へ統合する。

例:

    HELL CREEK FORMATION
    LATE CRETACEOUS
    66.0 Ma
    VERTEBRATA / DINOSAURIA

これらを:

-地層の巨大ラベル
- 背景のclassification mark
- landscapeを横断するtype
- section transition

として扱う。

通常のHUDとは見せ方を変えるが、同じtypographic systemを使う。

説明文を走りながら読ませない。

---

## 16. Layer system

最低6 visual layers:

1. atmosphere / sky
2. far geological silhouette
3. mountain / terrain mass
4. dinosaur midground
5. gameplay terrain
6. foreground vegetation / debris

追加VFX:

- dust
- pollen/spores
- ash
- ejecta
- impact haze

Parallax ratioはconfig化。

同じ速度のspriteを大量に並べて奥行きを偽装しない。

---

## 17. CameraDirector

cameraは固定followではなく、section choreographyの一部。

### Default

- player visual x: viewport widthの約26–30%
- look aheadを十分確保

### PREDATOR

- slight zoom/tight composition
- playerを2–4%左へ
- short impulse only

### FLASH

- single camera pulse

### FALLOUT

- playerをさらにわずかに左へ
-前方視野を増やす
- velocity lagを極小に追加

### BOUNDARY

- slow zoom-out
- camera movement自体を静かにする

camera transformによってcollision positionが変わらない設計にする。

---

## 18. UI

Gameplay UIはPhaser内のDinosaurUISceneを基本とする。

Nuxt DOMは:

- outer game host
- loading / fatal error fallback
- museum route transition

を担当する。

### During run

表示を絞る。

左上:

    DEEP TIME / 01

右上:

    63%

上端:

- 1–2px相当のprogress line

pause:

- safe-areaを考慮したcorner
- pointer eventがjumpへ伝播しない

通常runでは発見数、説明Toast、ライフアイコンを表示しない。

### UI motion

200–400msを基本。

Hover / pressed / disabledに別状態を持たせる。

音は軽いUI cueを持つが、ゲーム音楽より前へ出さない。

---

## 19. Result

失敗:

- modalを出さない
- percent / NEW BESTのみ
- auto retry

clear:

    CRETACEOUS // LAST DAY

    CLEAR        100%
    SYNC          93%
    ATTEMPTS       7

    SCORE      94,180
    RANK            S

    OPEN EXHIBIT
    RUN AGAIN

### Score

到達途中ではpercentageを主指標とする。

clear時のみ正式RUN SCOREを確定。

最大100,000:

- completion clear base: 50,000
- sync accuracy: 最大40,000
- full-run clear bonus: 10,000

一撃死ルールなので、clearしたrunは必ずfull-run。

SYNC:

- level dataのchallengeごとにideal jump timingを持つ
- 実際のinputとの時間差から0–1のaccuracyへ変換
- collision判定とは分離
- SYNCが低くても物理的に通過できればclear可能

Rank開始案:

- S: 92,000+
- A: 84,000+
- B: 72,000+
- C: clear

閾値はplaytestで調整する。

保存:

- best progress
- best clear score
- best sync
- best rank
- clear status
- attempt countは統計扱い。BEST競争の優劣には使わない

---

## 20. Exhibit handoff

プレイ中の6 discovery collectをやめる。

clear後にOPEN EXHIBITを解放。

Exhibit候補:

- K–Pg boundary
- Tyrannosaurus rex
- Triceratops
- Hell Creek Formation
- mass extinction
- fossil record

知識の流れ:

    PLAY
      → FEEL
      → WONDER
      → OPEN EXHIBIT
      → LEARN

教育情報のためにプレイを停止させない。

---

## 21. Code architecture

目標構成:

    app/game/dinosaur/
      config/
        gameplay.ts
        visual.ts
        audio.ts
      levels/
        stage01.ts
      scenes/
        DinosaurRunScene.ts
        DinosaurUIScene.ts
      systems/
        StageClock.ts
        FixedStepWorld.ts
        LevelRuntime.ts
        SpatialSectionSystem.ts
        TriggerSystem.ts
        CameraDirector.ts
        VisualDirector.ts
        AudioDirector.ts
        VfxDirector.ts
        ScoreSystem.ts
      rendering/
        BackgroundLayers.ts
        TerrainRenderer.ts
        DinosaurRenderer.ts
        PlayerRenderer.ts
        ImpactPipeline.ts
      types.ts

実際の命名は既存規約に合わせてよいが、責務分離は維持する。

### DinosaurRunScene

担当:

- input snapshot
- fixed-step world
- level runtime
- gameplay entities
- collision
- visual/camera director integration

HUD / result DOMを直接管理しない。

### DinosaurUIScene

担当:

- progress
- pause
- death / NEW BEST
- clear result
- canvas UI transitions

Gameplay physicsを持たない。

---

## 22. FixedStepWorld

Phaser Arcade PhysicsをStage 1のgameplay authorityにしない。

独自の小さなdeterministic worldを使う。

### Fixed update

    FIXED_DT = 1 / 240

render frameごとにaccumulatorへdeltaを加え、必要回数substepする。

spiral of death対策として:

- frame delta clamp
- max substeps
- hidden tabでpause

を実装。

### State

最低限:

    worldX
    playerY
    playerVelocityY
    grounded
    coyoteRemaining
    jumpBufferRemaining
    alive
    elapsedFixedSteps

float driftに依存してレベルtriggerが欠落しないよう、triggerはprevious/current timeのcrossingで処理する。

---

## 23. Collision

必要十分な形へ限定。

- player: inset AABBまたはcapsule相当
- static obstacle: authored AABB
- terrain: horizontal / stepped surface segments
- one-way platform:必要な場合のみ
- falling obstacle: deterministic kinematic AABB

物理エンジンを追加しない。

### Visual vs gameplay

collision geometryをdebug overlayで常に確認できるdev modeを用意する。

VFX particle / foreground debrisはcollisionを持たない。

---

## 24. Level data

Stage progressionをDinosaurRunSceneへhard-codeしない。

概念データ:

    {
      atBeat: 18,
      type: "obstacle",
      obstacle: "rock-small"
    }

    {
      atBeat: 64,
      type: "camera",
      cue: "rex-enter"
    }

    {
      atBeat: 96,
      type: "visual",
      cue: "impact-flash"
    }

データは少なくとも:

- obstacle
- terrain
- speed
- dinosaur choreography
- camera
- visual
- audio cue
- section
- sync challenge

を表現できること。

単位はworld distanceとbeat/timeを用途別に使う。

音楽同期イベントはbeat基準、collision geometryはworld distance基準を基本とする。

---

## 25. SpatialSectionSystem

長いstage全体のobjectを常時activeにしない。

worldを約400px相当または適切な固定幅sectionへ分割。

各section:

- gameplay geometry
- visual entities
- decorations
- activation / deactivation

を持つ。

camera前後の必要sectionだけactive。

object poolingを使い、FALLOUTで大量生成破棄しない。

---

## 26. Audio

現行の簡易oscillator scoreは最終版で使わない。

### Production audio

必要:

- bespoke 150 BPM music track
- jump
- landing
- death
- rock/terrain impacts
- herd footsteps
- rex presence / roar layer
- flash/impact
- UI
- clear

音楽はOgg / AAC等、対象browserに適した形式を用意する。

### AudioDirector

担当:

- unlock
- start scheduling
- pause/resume
- restart seek
- music layers
- SFX bus
- master mute
- visibility handling

AudioContext.currentTimeを利用し、タイミングの基準を明確にする。

音声再生開始とStageClockの同期誤差を監視する。

毎framecurrentTimeを無理にseekして音を壊さない。

---

## 27. Rendering strategy

Phaser WebGLを優先。

pixelArt: falseを基本。

roundPixelsを品質理由だけで常時trueにしない。

### Background

毎frameすべてをGraphics.clear→drawし直す構造を避ける。

優先:

- authored textures
- tileSprite where appropriate
- reusable geometry
- RenderTexture
- shader / pipeline
- pooled particles

### Shader

使う場合の候補:

- mineral grain
- impact heat distortion
- subtle color separation at death
- ash haze

Shaderを「豪華に見せるため」だけに重ねない。

post effectなしでもcompositionが成立すること。

---

## 28. Player visual

共通主人公の最終デザインは別決定でもよい。

Stage 1実装ではキャラクター表現を交換可能にする。

必要animation:

- run
- jump ascent
- apex
- fall
- land
- death

run cycleはmusic beatと完全固定しなくてよいが、足接地が大きくbeatから外れて不快にならないよう調整する。

旧pixel spriteを最終assetとしない。

---

## 29. Dinosaur choreography

恐竜は単なるbackground loopにしない。

各登場をtimeline cueとしてauthoringする。

### Triceratops

- herd entry
-足音
- depth crossing
- dust

### T. rex

-遠景 silhouette
- midground reveal
- foreground pressure
- chase

同じspriteのscaleだけを変えて奥行きを表現しない。

最低でも異なるdepth用のasset / lighting treatmentを持つ。

---

## 30. Responsive composition

スマートフォン縦画面を第一級にする。

### Mobile target

基準確認:

- 390 × 844
- 430 × 932

player:

- left 26–30%
- lower third

縦長の余白を:

- sky
- enormous typography
- dinosaur silhouettes
- impact light

のcompositionへ使う。

### Desktop

基準:

- 1440 × 900
- 1280 × 800

単純にworldを横へ広げすぎて、mobileよりobstacleを早く見られることは許容する。ただしlevel timing自体は変えない。

gameplay physicsはaspect ratioに依存させない。

---

## 31. Input

Mobile:

- canvas pointerdown
- passive browser behaviorを壊さない
- playing中は必要な範囲だけtouch-actionを制御
- multi-pointerの誤二重入力に注意

Desktop:

- Space
- ArrowUp
- pointer

keyboard repeatでmidair jump queueが意図せず残らないようにする。

pause button操作がjumpへ伝播しない。

---

## 32. Accessibility / effect safety

高難度とaccessibilityは別問題。

難易度を簡単にすることを必須とはしない。

必要:

- mute
- reduced screen shake
- reduced flash / high-intensity effects
- keyboard input
- focusable pause/result controls
- colorだけに依存しないcritical collision read

prefers-reduced-motion時:

- background parallax量を減らす
- camera impulseを減らす
- death fragmentationを簡略化
- FLASH peakを緩和

gameplay timingは変えない。

---

## 33. Performance tiers

目標:

- modern desktop: stable 60fps以上
- recent high-end mobile: stable 60fps
- lower device: gameplay timingを維持しながらvisualのみdegrade

degrade order:

1. particle count
2. foreground decorative layer density
3. shader samples
4. secondary dinosaur detail
5. post effects

変更してはいけないもの:

- physics timestep
- collision
- obstacle timing
- input behavior

低性能端末でもゲームの難易度が変わってはいけない。

---

## 34. Loading

generic spinnerを見せない。

必要assetが読み込めるまで:

    DEEP TIME / 01
    CRETACEOUS // LAST DAY

というタイトルカードを表示。

初回ユーザーgestureを:

- START
- audio unlock

へ利用。

準備完了後、200–400ms程度の短いtransitionで開始。

asset failure時はNuxt側のfatal fallbackへ戻れること。

---

## 35. State interface to museum shell

ゲーム固有内部stateをNuxtへ毎frame送らない。

museum側へ必要なevent:

    ready
    started
    progress-best-changed
    paused
    failed
    cleared
    leave
    fatal-error

clear payload:

    stageId
    progress
    score
    sync
    rank

ゲーム内部のparticle countやcamera stateはmuseum shellへ漏らさない。

---

## 36. Tests

### Unit

FixedStepWorld:

- same inputs produce same result
- jump buffer
- coyote time
- no midair second jump
- large render delta does not change authored outcome

Collision:

- visual inset rules
- obstacle pass/fail boundaries
