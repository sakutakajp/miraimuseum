# MIRAI: STAR DIVE — Stage 1 "ASTEROID BELT" 実装仕様

Status: implementation-ready draft
Updated: 2026-10-06
Target: V2 MVP / 宇宙 × 3Dシューティング Stage 1

## 0. この文書の役割

この文書は、Codex が `MIRAI: STAR DIVE` の Stage 1 を実装するための一次仕様とする。

既存 README の「宇宙 × 3Dシューティング」を出発点にするが、単純な敵ウェーブ型シューティングではなく、約80秒の短いプレイの中で、映像・操作・音・ゲーム性が一体化した高品質なリアルタイム3D体験を作る。

優先順位は次の通り。

1. 触った瞬間に気持ちいいこと
2. 約80秒の中で展開が変わり続けること
3. 6〜9歳でも説明なしで遊べること
4. 大人はスコアアタックを楽しめること
5. Webで動く3D作品として強い第一印象を作ること
6. 学習要素はゲームを中断せず、遊んだ後の興味につなげること

この Stage 1 は「3Dシューティングのシステムを薄く一通り作る」ためのMVPではない。今後の3D作品の品質基準を決める vertical slice とする。

---

## 1. ゲーム概要

### タイトル

- シリーズ名: `MIRAI: STAR DIVE`
- Stage 1: `ASTEROID BELT`
- 日本語表示名候補: `小惑星帯をぬけろ`
- 展示テーマ: 宇宙
- あそびかた: 3Dシューティング

### 一文で表す体験

> 光のかけらを追い、危険な小惑星の隙間をかすめながら、80秒で宇宙を駆け抜ける。

### 基本条件

- スマートフォン縦画面を基準にする。
- 後方視点の3Dレールシューティング。
- プレイヤーは画面上をドラッグして宇宙船を上下左右に動かす。
- 射撃は自動。
- 仮想スティック、射撃ボタン、ボムボタンは置かない。
- Stage 1は約80秒。
- 3D物理エンジンは使わない。
- 子どもは「避ける・撃つ・最後まで進む」で楽しめる。
- 上級者は `CHAIN` と `NEAR` を維持してハイスコアを狙う。

---

## 2. 既存仕様からの変更

README の既存宇宙シューティング仕様より、この文書を優先する。

### 維持するもの

- 宇宙 × 3Dシューティング
- 後方視点
- スマートフォン縦画面
- ドラッグ移動
- 自動射撃
- シールド制
- スコア
- Three.js + TresJS 方針
- Nuxt/Vueを博物館本体として維持
- localStorageへのベストスコア・進行保存
- 3D物理エンジンなし

### 変更するもの

- Stage 1は30〜60秒ではなく約80秒とする。
- 「敵を順番に倒す」だけの構成にはしない。
- 回避、射撃、NEAR、環境変化、カメラ演出を1本の振付として設計する。
- クリアタイムはStage 1のスコア要素から外す。レール進行で時間差がほぼ出ないため。
- アイテム収集を主要スコア要素にしない。
- 通常のコンボに加えて、危険な近接回避を評価する `NEAR` / `RISK` システムを導入する。
- 「発見」はプレイ中の長文ポップアップではなく、短い視覚表現とリザルト後の展示へ分離する。

---

## 3. 世界観と導入

### 導入

博物館の宇宙展示で、展示データではない謎の光が検出される。

ガイドロボットは長く説明しない。初回導入では短く次の趣旨だけ伝える。

> 「……これ、展示データじゃない。」

主人公は展示世界へ入り、この作品の表現に合わせて小型宇宙船の姿になる。

### 長期ストーリーへの接続

Stage 1終盤の「謎の光」には、他の展示世界にも現れる共通の記号を一瞬だけ表示できる構造にする。

この記号の意味はStage 1では説明しない。

クリア後、ガイドロボットが必要なら次の一言だけ表示する。

> 「……また、このマーク。」

長いストーリーシーンは作らない。将来の「博物館・ロボットの秘密」への伏線としてのみ使う。

---

## 4. アートディレクション

### 基本方針

幼児向けの玩具風宇宙にはしない。

6〜9歳が怖がらず、大人が見ても成立する、スタイライズされたシネマティックSFとする。

### 色

- 背景: ほぼ黒に近い深い青紫
- 星・主光源: 白〜青白
- プレイヤー: 明るい白 / シアンを基本に、博物館側とのつながりとして小さく暖色を入れる
- 通常ターゲット: シアン / ライム系
- 危険: オレンジ〜赤
- 高RISK状態: 青白 → 紫 → 金の順にリッチになる
- 謎の光: 通常ゲーム内で使わない色を1色割り当て、識別できるようにする

### 画面の質感

- PBRを基本にする。
- HDR environment を使用できる構造にする。
- Bloomは常時最大にせず、場面とインパクトに応じて強度を変える。
- Grainは極薄く使う。
- Chromatic Aberrationは加速、NEAR、被弾など短時間だけ強くする。
- Vignetteは画面中央への視線誘導に薄く使用する。
- 強い点滅や高速ストロボを連続使用しない。

### 「Web 3Dらしさ」を見せる場面

次の3箇所は特に立体感を強調する。

1. 画面のすぐ横を小惑星が通過する
2. 巨大小惑星の内部へカメラごと突入する
3. 終盤で小惑星が割れ、破片の間をカメラが抜ける

---

## 5. 入力とプレイヤー操作

### タッチ

- `pointerdown`: 現在位置を操作基準にする。
- `pointermove`: 指位置から正規化座標 `[-1, 1] x [-1, 1]` の目標位置を作る。
- 宇宙船は目標位置へ即座にteleportせず、減衰付き追従をする。
- `pointerup`: 最後の位置付近を維持し、中央へ強制的に戻さない。
- UI上の操作（pause等）はゲーム入力に伝播させない。

### PC

MVPでもデバッグ可能にする。

- マウスドラッグ: タッチと同じ
- WASD / Arrow: 移動
- Space: デバッグ用途の開始/決定に利用可。ただし射撃ボタンにはしない

### 操作感

プレイヤー位置、機体の向き、カメラを同じ値に直結させない。

最低限、次の3段階に分離する。

1. `targetPosition`: 入力から決まる目標
2. `shipPosition`: targetへ追従する実位置
3. `cameraRig`: shipよりさらに少し遅れて追従

機体は横移動時にroll、上下移動時にpitchを加える。

移動速度が上がるほどエンジントレイルを伸ばす。

---

## 6. 射撃

### 基本

- 射撃は常時自動。
- 画面奥方向へ一定間隔で発射する。
- Stage 1では武器切替を入れない。
- ターゲットが射線付近にある場合、わずかなaim assistを許可する。
- aim assistは「勝手に別方向へ撃っている」と感じるほど強くしない。

### 弾表現

- 弾そのものよりtrailを重視する。
- 発射時にmuzzle flash。
- 命中時に小さなspark。
- 破壊時に破片 + emissive flash + camera impulse。
- 高CHAIN時は見た目と音を少しリッチにしてよいが、DPSを大幅に変えない。

### ターゲット種

Stage 1では3種類まで。

#### A. SHARD

- 最も基本的な1hitターゲット。
- 数個をリズムに合わせて配置する。
- 子どもが何もしなくても一部は撃破できる配置を含める。

#### B. CORE

- 2〜3hit。
- 大きめで狙いやすい。
- 破壊時のフィードバックを強くする。

#### C. GATE CORE

- 小惑星内部への入口など、演出と進行を兼ねるターゲット。
- 一定数を破壊すると障害物が割れてルートが開く。
- 失敗して進行不能にはしない。必要なら時間経過でも開くが、成功時にスコアボーナスを与える。

生物的な敵キャラクターはStage 1には出さない。

---

## 7. NEAR / RISK システム

### 目的

操作を増やさず、子どもと上級者の遊びを二層化する。

### 判定

障害物には最低2つの半径を持たせる。

- `collisionRadius`: 接触ダメージ
- `nearRadius`: NEAR判定

プレイヤーが `nearRadius` 内へ入り、`collisionRadius` には触れずに通過完了した場合、NEAR成功とする。

同一障害物からNEARを複数回取得できないようにする。

### RISK

- 初期: `x1.0`
- NEAR連続成功で段階的に増える。
- 最大値は初期実装では `x3.0` 程度を上限候補とする。
- 被弾でRISKを `x1.0` へ戻す。
- 一定時間NEARしなくても急激には0へ戻さず、必要なら緩やかな減衰にする。

### 演出

NEAR成功時:

- `NEAR` の短いタイポグラフィ
- 小さなcamera impulse
- whoosh系SE
- 画面端に短い色収差
- engine emissiveを一瞬強くする

高RISK時:

- エンジン色/トレイルが少し変化
- BGMへ追加レイヤーを入れられる設計にする
- 画面全体を過剰に光らせない

---

## 8. CHAIN

### 基本

- ターゲットを短い間隔で連続破壊するとCHAINが増える。
- 一定時間破壊できないとCHAINは切れる。
- 被弾でCHAINを切る。
- UIには常時大きく表示せず、節目で `CHAIN x10` のように強調する。

### 初期チューニング候補

- chain grace: 1.2〜1.8秒
- 初期実装値は1.5秒
- Stage 1で想定する最大表示は30〜50程度

正確な値は実機プレイで調整する。

---

## 9. シールド、被弾、失敗

### シールド

- 3。
- 被弾すると1減る。
- 被弾直後は短い無敵時間を設ける。
- 無敵中は再被弾しない。

### 被弾演出

- camera shakeは短く、小さくする。
- 船体emissive / UI shieldを反応させる。
- BGMは止めない。
- 100〜200ms程度の強い反応は許容するが、長い操作不能を作らない。
- CHAINとRISKをリセットする。

### シールド0

Stage 1では明確に失敗とする。

- 破壊表現を短く見せる。
- 2秒以内に `RETRY` を選べる状態にする。
- リトライで長いイントロを毎回見せない。導入トランジションを短縮できる。
- ベストスコアは失敗runでは更新しない。

---

## 10. スコア

### 方針

「何をすると上手いのか」が直感的に分かる式にする。

Stage 1では、主に次の3要素で決める。

1. ターゲット破壊
2. CHAIN
3. NEAR / RISK

残りシールドはクリアボーナスにする。

### 実装しやすい初期式

各ターゲット破壊時:

```text
targetScore = baseScore * chainMultiplier * riskMultiplier
```

初期候補:

```text
baseScore:
  SHARD      100
  CORE       300
  GATE CORE  500

chainMultiplier = 1 + min(chain, 20) * 0.05
riskMultiplier  = 1.0 / 1.5 / 2.0 / 2.5 / 3.0
```

クリア時:

```text
shieldBonus = remainingShield * 2000
```

スコアは整数へ丸める。

この式はコンテンツ量が確定したら再調整してよい。ただし、Stage 1実装中にスコア要素を増やしすぎない。

### 保存

- Stage 1 best score
- game best score
- Stage 1 cleared
- Stage 2 unlock flag（Stage 2未実装でもデータ構造だけ持てる）

保存先は既存方針どおりlocalStorage。

---

## 11. 80秒の演出タイムライン

### 音楽基準

- 144 BPM
- 4/4
- 48小節
- 約80秒
- 8小節を大きな1セクションとして、6セクション構成

ゲーム進行は絶対秒だけでなく `beat` / `bar` からも参照できるようにする。

`AudioContext.currentTime` を音同期の基準にし、`setInterval` を音楽タイミングのマスタークロックにしない。

### Section 1 — DIVE / 0:00–0:13.3 / bars 1–8

目的: 世界への侵入と操作理解。

- 博物館展示から宇宙へのトランジション。
- 最初は暗い画面に一点の光。
- カメラが寄ると宇宙船のエンジン光だと分かる。
- 発進と同時にBGM本体が始まる。
- 指のドラッグアニメーションを一度だけ表示。
- プレイヤーが動かすと機体roll、camera follow、trailが反応。
- 射撃ターゲットはまだ少ない。
- ここでは死亡させない。危険障害物を置かない。

### Section 2 — FIRST CONTACT / 0:13.3–0:26.7 / bars 9–16

目的: 自動射撃とCHAINを理解。

- 遠方にSHARD 3個。
- 画面中央付近に入ると自動射撃で破壊できる。
- 3個目の破壊だけフィードバックを少し強くする。
- その後、小さなターゲット編隊を左右に配置。
- プレイヤーが自分から位置を合わせると多く撃破できる。
- `CHAIN` を初めて見せる。

### Section 3 — ASTEROID FIELD / 0:26.7–0:40.0 / bars 17–24

目的: 3Dの奥行きと回避。

- 小惑星帯へ入る。
- 遠景・中景・前景の速度差を明確にする。
- カメラ直前を横切る大きな小惑星を演出用に置く。これは当たり判定なしでもよい。
- 実際に回避する小惑星を少数配置。
- 最初のNEARが偶然でも発生しやすい配置にする。
- 初NEAR成功時のみ、短い説明を兼ねた演出を表示してよい。

### Section 4 — RISK / 0:40.0–0:53.3 / bars 25–32

目的: Stage 1固有の上級遊びを提示。

- 巨大小惑星でルートが左右に分かれる。
- 安全な広いルートと、NEARを取りやすい狭いルートを作る。
- 正解ルートは作らない。
- 連続NEAR可能な3つ程度の障害物。
- RISKが上がるほどengine trail / audio layerが豊かになる。
- 同時にSHARDを配置し、回避とCHAINの両立を狙える。

### Section 5 — INSIDE / 0:53.3–1:06.7 / bars 33–40

目的: 最大の視覚変化。

- 正面を巨大小惑星が塞ぐ。
- 複数のGATE COREを自動射撃で破壊。
- 表面に亀裂。
- 岩が割れ、内部へ突入。
- 内部は発光する結晶空間。外宇宙とpaletteを大きく変える。
- camera FOVを少し広げる。
- 狭い空間を高速で飛ぶが、初見殺しにはしない。
- 最後の数小節で出口の白い光を見せる。

### Section 6 — BREAK OUT / 1:06.7–1:20.0 / bars 41–48

目的: クライマックスと博物館への回帰。

- 小惑星内部から脱出。
- 謎の光を正面に見せる。
- 通常弾が自動的に太いenergy beamへ変化。
- ここは追加操作を要求しない。
- beamのピークで巨大小惑星/障害物が割れる。
- 破片の間をカメラが通過。
- 一瞬だけ音数を減らし、謎の記号を見せる。
- 白い光で画面を包み、博物館側へ戻る。
- クリア成立。

---

## 12. カメラ仕様

カメラは品質の中心要素として扱う。

### Camera Rig

少なくとも次の概念を分離する。

```text
RailRoot
 ├─ PlayerAnchor
 │   └─ Ship
 └─ CameraRig
     └─ Camera
```

- `RailRoot` がステージ進行方向へ進む。
- `Ship` は画面平面内で移動。
- `CameraRig` はShipを減衰付きで追従。
- Cameraは状況に応じてFOV、roll、shake/impulseを加える。

### 通常時

- shipが右へ行くとcameraも少し右へ追う。
- camera追従量はshipより小さくする。
- 入力方向へわずかにlook-aheadする。

### 速度感

速度感を実移動速度だけに頼らない。

- star streak
- dust particle
- FOV
- trail length
- near object speed
- audio wind/whoosh

を組み合わせる。

### Shake

大きなランダムshakeを常用しない。

用途ごとに短いimpulseを用意する。

- small hit
- destroy
- NEAR
- breakout
- player damage

`prefers-reduced-motion` 時はcamera shake、roll、強いFOV変化を弱める。

---

## 13. VFX / Post Processing

### 必須

- bloom
- tone mapping / exposure control
- vignette
- subtle grain
- impact flash
- projectile trail
- engine trail
- hit spark
- destruction fragments
- star / dust particles

### できれば入れる

- short chromatic aberration impulse
- speed lines / elongated stars
- shield hit distortion
- heat / energy distortion

### ポストエフェクトの原則

PostFX値を固定しない。

`VisualDirector` が次のイベントに応じて短時間変更できるようにする。

```text
onNear()
onHit()
onDestroy()
onRiskChanged()
onSectionChanged()
onClimax()
```

---

## 14. Audio

### Audio Engine

既存 `app/game/audio.ts` の簡易シンセは恐竜プロトタイプ用として残してよいが、STAR DIVEでは独立したaudio engineを作る。

必須構成:

```text
AudioContext
 └─ master
     ├─ music
     └─ sfx
```

masterの手前または後段にDynamicsCompressorを使用可能にする。

### Clock

- 144 BPM。
- `AudioContext.currentTime` を音同期の基準にする。
- `beat`, `bar`, `sixteenth` を取得できるClock APIを用意する。
- SFXは必要に応じて `none`, `sixteenth`, `beat` の量子化再生を行えるようにする。

### 必要な音カテゴリ

- BGM base
- BGM risk layer
- shot
- hit
- destroy small
- destroy big
- near whoosh
- shield hit
- player damage
- gate break
- engine
- UI
- climax beam
- discovery sting

### 方針

- 射撃音を毎弾フルボリュームで鳴らしてうるさくしない。
- 命中、破壊、NEARなど意味のある瞬間を音で強調する。
- 高RISKでBGM layerが増える設計を優先する。
- tabがhiddenになったらAudioContext/ゲーム進行をpauseする。

---

## 15. HUD / UI

### 常時表示

最小限にする。

- SHIELD
- SCORE
- pause

CHAINは値が増えている時だけ目立たせる。
RISKは常時数値を見せてもよいが、視覚的な状態変化でも伝える。

### Event Typography

ゲーム内イベントとして次を使用する。

- `NEAR`
- `CHAIN x10` 等
- `RISK x2.0` 等
- `MIRAI BURST` またはclimax用名称
- `DISCOVERY`

DOM/CSS overlayを使用してよい。すべてをThree.js内へ描画する必要はない。

### 操作説明

文章説明は表示しない。

初回のみ:

- 指アイコン
- ドラッグ軌跡
- 実際のship反応

で理解させる。

---

## 16. Discovery / 学習要素

学習表示でプレイを止めない。

### プレイ中

初めて重要対象を通過/観測した際、必要なら次のような短い表示だけ許可する。

```text
DISCOVERY
小惑星
```

長文説明ダイアログは出さない。

### リザルト

Stage 1クリア後、最低1件を展示へ追加できる。

第一候補:

- 小惑星

一行知識の例:

> 小惑星は、太陽のまわりを回る小さな天体。

詳しい説明は博物館側の展示で任意に読む。

`discover → 一行知識 → 博物館展示 → optional deep dive` の流れを守る。

---

## 17. Result

クリア直後は長い集計アニメーションを行わない。

表示項目:

- CLEAR
- SCORE
- BEST（更新時）
- MAX CHAIN
- NEAR count
- remaining SHIELD
- discovery
- RETRY
- 博物館へ戻る

Stage 2が未実装の間はNEXTボタンを出さない、または「準備中」として非活性にする。

---

## 18. パフォーマンス設計

品質低下は後付けにしない。

### Tier

最低3段階。

#### HIGH

- high LOD
- 高解像度texture
- bloom full
- particle high
- shadow/reflectionは必要な場面のみ高品質
- pixel ratio上限高め

#### MEDIUM

- medium/high LODを混在
- particle medium
- post effect解像度を下げる
- reflection品質を下げる

#### LOW

- low LOD
- texture low/half
- particle low
- expensive post effectを削減
- MSAA/post AAを軽量化
- pixel ratioを制限

### 動的解像度

初回から導入できるなら導入する。

- frame timeを移動平均で監視。
- 一時的なspikeで即座にtierを落とさない。
- 継続的に重い場合、renderer pixel ratio / render scaleを段階的に下げる。
- 安定状態が続けばゆっくり戻す。
- 変更幅は段階化し、フレームごとに解像度を変えない。

### 目標

- 基準端末で60fpsを目標。
- 60fps維持が難しい端末は30fps以上で安定することを優先。
- 視覚品質より、入力応答とフレーム安定を優先する。

### アセット

- GLB/glTF
- KTX2/Basisの利用を優先
- Draco / Meshoptを検討
- player shipなど主要モデルにLODを用意できる構造
- 不必要な4K textureを使わない
- 同種小惑星はInstancedMeshを優先
- particleは大量のObject3Dを個別生成しない

---

## 19. レンダリング互換性

目標:

1. WebGPUを使用できる環境ではWebGPUを優先できる構造
2. WebGL2 fallback
3. どちらも使用できない場合は、博物館側へ安全に戻れるエラーUI

WebGPU専用表現をStage 1クリアの必須条件にしない。

同一ゲームルールがWebGL2でも成立するようにする。

---

## 20. Accessibility / mobile

- `viewport-fit=cover` を維持。
- safe-areaをHUDに反映。
- `100dvh` を使用可能なレイアウト。
- Canvasゲーム中の意図しないブラウザscrollを防ぐ。
- pause、muteはタッチしやすいサイズ。
- `prefers-reduced-motion` でcamera shake / roll / flash / chromatic aberrationを弱める。
- muteでもゲームルールが理解できる。
- 色だけを唯一の危険判定にしない。
- tab非表示でpause。
- context loss / renderer初期化失敗時にエラーUIを出す。

---

## 21. 技術アーキテクチャ

### 基本分離

Nuxt/Vueは博物館とゲームホストを担当する。

STAR DIVEのper-frame simulationはVueのreactivityへ載せすぎない。

```text
Nuxt / Museum shell
        |
        v
GameHost.client.vue
        |
        v
StarDive runtime
 ├─ ExperienceDirector
 ├─ StageClock
 ├─ InputController
 ├─ PlayerController
 ├─ RailController
 ├─ TargetSystem
 ├─ CollisionSystem
 ├─ ScoreSystem
 ├─ CameraRig
 ├─ VisualDirector
 ├─ AudioEngine
 ├─ AssetManager
 └─ PerformanceManager
```

### Three.js / TresJS

- 既存方針どおり Three.js + TresJS を採用する。
- Vue/TresJSはmount、scene composition、UIとの接続に使ってよい。
- 弾、ターゲット、particle、camera等の高頻度更新は、不要なVue reactive updateを発生させない。
- Three.js objectをゲームループから直接更新してよい。

### Physics

物理エンジンは追加しない。

Stage 1は次で成立させる。

- sphere-sphere
- point/sphere
- simple bounding box
- pre-authored spline / rail position

---

## 22. 共通ゲームホストへの要求

既存 `GameStage.client.vue` の良いパターンを一般化する。

最低限、ゲームと博物館の境界は次を扱えるようにする。

```ts
type GameResult = {
  gameId: string
  stageId: string
  cleared: boolean
  score: number
  stats: Record<string, number>
  discoveries?: string[]
}
```

ゲーム側から博物館側へのイベント候補:

```text
ready
score
pause
resume
complete(GameResult)
fail(GameResult)
error
```

博物館側からゲーム側:

```text
start
pause
resume
mute
dispose
```

既存恐竜ゲームを即座に全面改修する必要はない。STAR DIVE実装時に共通化できる最小境界から導入する。

---

## 23. STAR DIVEのライフサイクル

FunTechのようなシーン分離を参考にし、最低限次を持つ。

```ts
interface ExperienceSection {
  load?(ctx: LoadContext): Promise<void>
  enter?(ctx: FrameContext): void
  update(ctx: FrameContext): void
  render?(ctx: RenderContext): void
  exit?(ctx: FrameContext): void
  resize?(viewport: Viewport): void
  dispose?(): void
}
```

Stage 1 section:

```text
dive
first-contact
asteroid-field
risk
inside
break-out
```

Sectionの切替はフレームカウンタではなくStageClockを基準にする。

---

## 24. 推奨ファイル構成

実装時に状況に応じて調整してよいが、巨大な1ファイルへ集約しない。

```text
app/
  components/
    games/
      GameHost.client.vue
      star-dive/
        StarDiveGame.client.vue
        StarDiveHud.vue
        StarDiveResult.vue
  games/
    shared/
      types.ts
      storage.ts
    star-dive/
      index.ts
      config.ts
      StarDiveRuntime.ts
      ExperienceDirector.ts
      StageClock.ts
      input/
        InputController.ts
      player/
        PlayerController.ts
      camera/
        CameraRig.ts
      gameplay/
        CollisionSystem.ts
        ScoreSystem.ts
        TargetSystem.ts
        patterns.ts
      audio/
        AudioEngine.ts
        audioManifest.ts
      visual/
        VisualDirector.ts
        particles.ts
        post.ts
      performance/
        PerformanceManager.ts
      sections/
        DiveSection.ts
        FirstContactSection.ts
        AsteroidFieldSection.ts
        RiskSection.ts
        InsideSection.ts
        BreakOutSection.ts
```

TresJSの実際のcomponent構造に合わせて、`games/star-dive` の一部をVue SFC側へ寄せてもよい。

---

## 25. Deterministic choreography

Stage 1の主要配置は完全ランダムにしない。

80秒の「振付」を品質の中心とする。

- sectionごとにpatternを定義する。
- target/asteroidの重要配置はseed固定または完全固定。
- 装飾particleのみランダム可。
- 同一runで理不尽な配置が発生しない。
- 将来はpattern variationを追加できるようにする。

これにより、カメラ、音、VFXを特定の瞬間へ合わせ込める。

---

## 26. 実装フェーズ

Codexは一度に全ビジュアルを完成させようとせず、次の順でvertical sliceを成立させる。

### Phase A — Runtime skeleton

- Three.js + TresJS導入
- StarDive game route/host
- Canvas表示
- pause/dispose/resize
- StageClock
- section切替
- debug HUD

完了条件: 80秒のsection遷移が空シーンで最後まで動く。

### Phase B — Flight feel

- player placeholder model
- drag input
- damped movement
- roll/pitch
- camera rig
- star field
- engine trail placeholder

完了条件: ターゲットがなくても「動かして気持ちいい」。

### Phase C — Shooting

- auto fire
- SHARD / CORE
- collision
- CHAIN
- basic score
- destruction feedback

### Phase D — RISK

- asteroid obstacles
- shield
- damage/invulnerability
- NEAR detection
- RISK multiplier
- fail/retry

### Phase E — Choreography

- 6 sectionsの配置
- gate
- asteroid inside transition
- climax
- museum return

### Phase F — Audio / visual polish

- 144 BPM clock
- BGM layers
- SFX quantize
- post effects
- particles
- event typography
- result

### Phase G — Performance

- tier
- dynamic resolution
- LOD/instancing
- WebGL2 fallback確認
- mobile実機計測

---

## 27. Debug機能

開発速度を上げるため、productionでは無効になるdebug操作を用意する。

推奨:

- section jump
- time scale 0.5 / 1 / 2
- invincible
- show collision spheres
- show FPS/frame time
- force quality tier
- force WebGL2
- mute music / mute SFX
- score / chain / risk表示

query parameterまたはdev-only panelでよい。

---

## 28. テスト

### Unit

少なくとも次は3D rendererなしでテスト可能にする。

- ScoreSystem
- CHAIN expiry
- NEAR one-shot判定
- RISK reset
- shield damage / invulnerability
- section timing
- progress save/parse

### Browser/E2E

- 宇宙ゲーム詳細からStage 1を起動できる
- Canvas/game surfaceが表示される
- pause/resumeできる
- visibility changeでpauseされる
- debug shortcutを使ってclear resultへ到達できる
- clearでbest scoreが保存される
- reload後もbest scoreが残る
- failからretryできる
- 博物館へ戻れる

GPU描画のピクセル完全一致テストはMVPの必須条件にしない。

---

## 29. Stage 1 MVPの受け入れ条件

機能が存在するだけでは完了としない。

### 必須機能

- [ ] スマホ縦画面で起動する
- [ ] ドラッグだけで移動できる
- [ ] 自動射撃する
- [ ] 3種以内のターゲットが動く
- [ ] 小惑星障害物がある
- [ ] シールド3
- [ ] CHAIN
- [ ] NEAR / RISK
- [ ] スコア
- [ ] 6 section / 約80秒
- [ ] clear / fail / retry
- [ ] result
- [ ] best score保存
- [ ] discoveryを1件以上博物館へ渡せる
- [ ] pause / mute / visibility pause
- [ ] WebGL2 fallback
- [ ] quality tier

### 品質ゲート

以下を満たすまでは「完成」と扱わない。

- [ ] shipを左右へ動かすだけでroll/camera/trailが連動し、手触りがある
- [ ] SHARDを壊した瞬間に映像と音の両方で明確な快感がある
- [ ] NEAR成功が説明を読まなくても分かる
- [ ] Section 1とSection 5のスクリーンショットが別の場面に見える
- [ ] 80秒の中に「静 → 動 → 最大 → 余韻」の変化がある
- [ ] HUDが3D映像を邪魔しない
- [ ] 低品質tierでもゲームプレイの意味が変わらない
- [ ] 初回プレイで長文チュートリアルを読ませない

---

## 30. MVPでやらないこと

Stage 1の品質を守るため、次は後回し。

- 5ステージ全部の実装
- 武器選択
- 機体選択
- 機体強化
- ガチャ/通貨
- オンラインランキング
- multiplayer
- 3D physics engine
- procedural infinite stage
- 多数の敵AI
- 複雑なboss AI
- 長い会話イベント
- ゲーム中の長文学習ポップアップ

---

## 31. 将来の5ステージ案

Stage 1完成後の方向性。今は実装しない。

1. `ASTEROID BELT` — 小惑星 / NEARの基本
2. `RINGS` — 土星の環 / 粒子と高速スラローム
3. `SOLAR STORM` — 太陽 / プラズマとタイミング回避
4. `NEBULA` — 星雲 / 幻想的で静かな空間と視界変化
5. `THE DARK` — ブラックホール / 重力レンズと博物館の秘密

各ステージは背景差し替えではなく、ゲームプレイとレンダリング表現の両方を変える。

---

## 32. 実装判断の原則

仕様に迷った場合は、次の順で判断する。

1. 操作の気持ちよさ
2. フレームレートと入力応答
3. 80秒の体験曲線
4. 視覚品質
5. スコアアタックの深さ
6. 学習情報量

「機能を増やす」より「1回のドラッグ、1発の命中、1回のNEARを気持ちよくする」ことを優先する。

Stage 1の成功基準は、機能一覧を満たすことではなく、プレイヤーが最初の15秒で「もう少し触っていたい」と感じること。
