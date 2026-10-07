# MIRAI CORE — Interactive Game Hub Specification

Version: 1.0
Date: 2026-10-07
Status: Approved direction / implementation-ready
Target branch: work

## 1. Purpose

トップページの Floating Earth を単なるビジュアルではなく、MIRAI MUSEUM 全体へ入るための3Dゲームランチャーとして扱う。

初期実装では、地球表面を小さな恐竜が歩く。ユーザーは地球を回して恐竜を発見し、恐竜を選択すると短い没入トランジションを経て /dinosaur に入る。

将来的には恐竜だけでなく、人工衛星、ロボット、飛行機、船、気象現象などを追加し、MIRAI CORE 自体が展示・ゲーム・学問テーマを探索するナビゲーションになる。

この仕様では初回実装の品質を最優先し、最初から複数オブジェクトを増やさない。P0は恐竜1体のみ。

## 2. Product principle

- 地球は背景ではなくUIである。
- 恐竜はボタンに見せない。最初は生き物として存在し、発見した後にだけゲームへの入口だと理解できる。
- 常時ラベルや巨大CTAを出さない。
- ユーザーが「あれ、何か歩いている」と気づくサイズ感を優先する。
- クリック可能であることはホバー、視線、微細な発光、カーソル、短いラベルで段階的に伝える。
- ページ遷移ではなく、宇宙→地球→恐竜時代へ移動したように感じさせる。
- 既存の地球操作、自転、大気表現、reduced motion、静止画fallbackを壊さない。

## 3. Existing implementation to preserve

現在のホームは以下を前提とする。

- app/pages/index.vue
- app/components/landing/FloatingEarthExperience.vue
- app/experiences/floating-earth/FloatingEarthWorld.ts
- app/experiences/floating-earth/interaction.ts
- app/experiences/floating-earth/model.ts
- public/floating-earth/earth-vivid.glb
- /dinosaur route
- Three.js 0.186系
- 地球の自転 0.035 rad/s
- OrthographicCamera ベースの現行構図
- スクロール、ドラッグ、タップ、キーボードによる地球回転
- WebGL失敗時の earth-photo.webp fallback

既存右上の恐竜ゲーム直行再生ボタンはP0では削除せず、アクセシビリティとfallback用の第2導線として維持してよい。ただし視覚的主役は恐竜オブジェクトに移す。

## 4. Core experience

### 4.1 Idle

初期ロード完了後、地球は現在と同じ速度でゆっくり自転する。

恐竜は地球表面の一点に貼り付くのではなく、球面上の短いルートを歩き続ける。ルートは地球正面に定期的に現れるよう設計する。ユーザーが何も操作しなくても20〜35秒程度のうちに一度は見つけられることを目標にする。

恐竜の画面上サイズは地球直径の約3〜6%を目安にし、巨大なマスコットに見せない。

### 4.2 Discovery

恐竜が画面前面側に来たときのみ、発見可能状態になる。

PC:
- pointer が恐竜のhit areaへ入る
- 歩行速度を少し落とす
- 恐竜の頭または体をユーザー方向へ10〜20度向ける
- cursorをpointerへ
- 250〜400ms遅延後に小さなラベルを表示

Mobile:
- 1回目のタップで選択状態
- 恐竜が一度止まり、こちらを見る
- 小さなラベルを表示
- 同じ恐竜をもう一度タップ、またはラベルをタップすると開始
- ただし操作テンポが悪い場合は1タップ開始へ簡単に切り替えられる設計にする

表示ラベルの初期案:

01 / LOST WORLD
DINOSAUR
EXPLORE →

ラベルはDOM overlayでよい。Three.js内へ文字を描かない。恐竜のworld positionをprojectして画面座標へ追従させる。

### 4.3 Activation transition

恐竜を決定した瞬間に通常のNuxtLink遷移を実行しない。

推奨タイムライン:

- 0ms: input lock。地球のdrag/wheelを一時停止。
- 0–180ms: 地球の自転を減速。
- 80–300ms: 恐竜が歩行を止め、カメラ方向を見る。
- 180–520ms: 恐竜位置を画面中心寄りにするため地球回転を最短経路で補間。
- 300–800ms: カメラまたはscene scaleで恐竜へ高速すぎないpush-in。
- 420–900ms: 画面上に MESOZOIC ERA / CRETACEOUS など短い時代ラベルを表示。
- 700–1150ms: 大気の青いrim lightを強め、背景黒を保ったまま地球表面が画面を占有。
- 1000–1350ms: blackout / depth fade。
- 1150–1400ms: navigateTo('/dinosaur')。

総時間は約1.2〜1.5秒。演出のために2秒以上待たせない。

prefers-reduced-motion ではズームと大回転を行わず、恐竜選択→短い100〜200ms fade→/dinosaur とする。

## 5. Dinosaur behavior

最低限の状態:

- walking
- noticing
- selected
- entering

任意追加:

- idle
- look-around

walking中は球面ルートを移動する。一定時間ごとに小さく停止する演出は可能だが、P0でランダムAIを作り込みすぎない。

AnimationMixerを使い、GLB内に Walk / Idle 等のclipがある場合は利用する。clip名は大文字小文字を無視して候補検索する。該当clipがなければ静止モデルでも位置移動は成立させる。

恐竜モデルの初期契約:

- path: /floating-earth/dinosaur.glb
- forward axis: 実装側で補正可能にする
- feet origin がモデル原点でなくても offset を設定可能にする
- scaleはコード定数として調整可能にする
- Walk clip推奨
- Idle clip推奨

現時点のリポジトリには dinosaur.glb は存在しない。Codexは低品質な本番用恐竜を自動生成しない。モデル未配置時は既存ホームを壊さず、恐竜機能だけ無効化する。開発専用debug markerを使う場合はproductionで表示しない。

## 6. Walking on a sphere

恐竜はEarth meshの頂点へ直接依存させず、MIRAI COREの論理球面上に配置する。

球面位置の基本式:

x = r * sin(phi) * cos(theta)
y = r * cos(phi)
z = r * sin(phi) * sin(theta)

r は地球の見た目半径 + surfaceOffset。

重要なのは地球表面への接線姿勢である。

1. local positionをnormalizeしてsurface normalを求める。
2. dinosaur.upをsurface normalへ合わせる。
3. 進行方向ベクトルを球面接平面へ射影する。
4. model forwardを進行方向へ向ける。
5. quaternionをslerpし、フレーム間の回転ジャンプを避ける。

緯度経度を直接増減する単純実装でもよいが、極付近を通過するルートはP0では避ける。

地球の既存rotation Group配下に dinosaur root を置くことを基本とする。これにより地球をドラッグした際に恐竜も地球と一緒に回る。

ただし恐竜自身のwalking transformと地球全体のrotation transformは分離する。

推奨階層:

floating
└─ rotation
   └─ pose
      ├─ earth
      └─ entityLayer
         └─ dinosaurRoot

大気haloは現状同様floating直下でよい。

## 7. Route design

P0では1本のルートだけ作る。

条件:

- 正面に見える区間を必ず含む
- 裏側へ回り込む区間も含む
- 地球の縁を横切る瞬間がある
- 海の真上を長時間歩いて見えないような違和感を避ける
- 地形の厳密な高度追従はP0では不要

ルートはコードに散在させず、entity definitionに集約する。

例として次のようなデータ構造を想定する:

EntityDefinition
- id
- type
- modelUrl
- route
- scale
- surfaceOffset
- routeSpeed
- targetRoute
- label
- era

将来、satellite等は surface-bound ではなく orbital entity として別movement strategyを使えるようにする。

## 8. Hit testing

Raycasterを使用する。

恐竜の見た目meshそのものだけをhit targetにすると小さすぎるため、透明な簡易hit volumeを別に持たせる。

- desktop hit area: 見た目の約1.5〜2倍
- mobile hit area: 約2〜2.5倍
- hit volumeはrenderしない
- 地球の裏側にいる恐竜は選択不可

裏側判定は camera-to-entity と sphere normal の向き、またはdepth/occlusionの簡易判定で行う。

最低条件として、画面上では恐竜が地球の裏に隠れているのにクリックできる状態を禁止する。

## 9. Interaction conflict resolution

現在は地球全体がbuttonとしてpointer入力を受け取るため、恐竜クリックと地球ドラッグを区別する必要がある。

ルール:

- pointerdown時にraycast
- dinosaur hitならentity candidateとして記録
- pointer移動がdrag thresholdを超えたらentity activationをキャンセルし地球dragへ
- pointerupまでthreshold未満ならentity activation
- 地球の空き領域は従来通りdrag/tap

drag thresholdはCSS px固定ではなく、pointer typeごとに4〜10px程度で調整する。

恐竜選択中はwheel/dragによる地球操作を短時間lockする。

## 10. DOM / Vue responsibilities

FloatingEarthWorldは3D worldとpointer hit結果を管理する。

FloatingEarthExperience.vueは以下を管理する。

- loading/fallback
- selected entity state
- projected label position
- transition overlay
- navigation
- accessible fallback link

Three.js classからVueへイベントを返せるようにする。

推奨イベント:

- entityhover
- entityleave
- entityfocus
- entityactivate
- entityscreenposition
- transitionstart

DOM側でpointerイベントを二重管理しない。

## 11. Suggested file changes

P0の推奨変更:

1. app/experiences/floating-earth/entities.ts を新規作成
   - EntityDefinition
   - dinosaur定義
   - route data

2. app/experiences/floating-earth/DinosaurEntity.ts を新規作成
   - GLTF load
   - AnimationMixer
   - sphere walking
   - orientation
   - hit volume
   - state machine

3. app/experiences/floating-earth/FloatingEarthWorld.ts を拡張
   - entityLayer
   - Raycaster
   - update(delta)
   - projected screen position
   - activation transition hooks

4. app/components/landing/FloatingEarthExperience.vue を拡張
   - discover label
   - transition DOM
   - navigateTo('/dinosaur')
   - selected state

5. public/floating-earth/dinosaur.glb を追加
   - asset license/creditも同directoryへ追加

6. tests
   - unit: sphere position/orientation helper
   - e2e: dinosaur activation when model is available
   - fallback: missing dinosaur modelでもhomeが使用可能

## 12. Architecture rule for future game objects

恐竜専用コードをFloatingEarthWorldへ大量に直書きしない。

将来のentity例:

- Dinosaur: surface walker → /dinosaur
- Satellite: orbit → space game
- Robot: surface/stationary → robotics game
- Aircraft: atmospheric orbit → flight game
- Ship: surface route → ocean game
- Storm: shader/particle region → weather game

entityは最低限次を公開する。

- object3D
- update(delta)
- setInteractiveState(state)
- dispose()
- getHitTargets()
- getAnchorWorldPosition()

移動方式は surfaceWalker / orbit / stationary などへ分離できる形にする。

## 13. Visual direction

恐竜だけ別世界の鮮やかなキャラクターにしない。

- soft low-polyまたは高品質stylized 3D
- matte / satin material
- 地球のライティングと同じ空間に存在して見えること
- emissive outlineを常時つけない
- hover時も極細のrimまたはbrightness上昇程度
- labelは小さく、museum captionのように扱う
- neon HUD化しない

恐竜のサイズは、存在に気づくぎりぎりの小ささから調整を始める。

## 14. Lighting and shadow

P0ではリアルな地形shadowを必須にしない。

ただし浮いて見える問題を防ぐため、次のいずれかを使う。

- dinosaur feet直下に非常に薄いblob/contact shadow
- model自身の簡易self shadow
- 地表方向へ短いAO風darkening

影は地球の雲影・大気表現を壊さない程度に限定する。

## 15. Performance

Earth GLBが約11MBあるため、追加assetは慎重に扱う。

目標:

- dinosaur GLBは可能なら2〜5MB以下
- textureはWebP/KTX2等を検討
- Draco/Meshoptは導入コストとCloudflare buildを確認してから採用
- 画面外・裏側でもAnimationMixerは低コストなので継続可能だが、将来entity数が増えたらupdate頻度を落とす
- document.hidden時は現在同様rAF停止
- QualityManagerのstatic tierではdinosaur機能を切り、静止画ホームへfallback

P0でpost-processing pipelineを追加しない。既存の軽量な描画を維持する。

## 16. Accessibility and fallback

3D恐竜を操作できない状況でも /dinosaur へ到達できなければならない。

- 既存右上のリンクを維持、または同等のaccessible linkを残す
- keyboardで恐竜entityをfocus/selectできる仕組みを用意する
- Enter/Spaceでactivate
- aria label: 恐竜ゲームをはじめる
- reduced motion対応
- WebGL unavailable時は現行earth-photo.webp + direct link
- dinosaur model load failureはEarth全体の失敗扱いにしない

## 17. Transition copy

P0では文字を増やしすぎない。

推奨:

MESOZOIC ERA
CRETACEOUS

または

01 / DEEP TIME
CRETACEOUS // LAST DAY

表示は最大2行。0.5秒前後だけ見せる。

## 18. Acceptance criteria

P0完了条件:

- 地球は現状通りロード・自転・drag・wheel操作できる
- dinosaur.glbが存在する場合、恐竜が球面上を歩く
- 恐竜のup方向が球面法線に追従し、不自然に傾かない
- 地球回転時、恐竜が地球からずれない
- 地球裏側では恐竜が正しく隠れる
- 地球裏側の恐竜をクリックできない
- hover/tap時だけ控えめな発見UIが出る
- dragとdinosaur tapが競合しない
- activate後に約1.2〜1.5秒のtransitionを経て /dinosaur へ移動する
- reduced motionでは短いfadeだけで移動する
- dinosaur modelが404でも地球ホームは壊れない
- WebGL失敗時は既存静止画fallbackが維持される
- keyboard/direct linkでゲームへ移動できる
- npm run typecheck が通る
- npm test が通る
- npm run build が通る
- Playwrightでhome→dinosaur導線を確認できる

## 19. Implementation order for Codex

### P0 — required

1. entity layerとデータ定義
2. dinosaur GLB loader with graceful optional failure
3. sphere route + orientation
4. raycast hit testing
5. desktop hover / mobile tap
6. small DOM label
7. activation transition
8. /dinosaur navigation
9. reduced motion / fallback / tests

### P1 — polish after P0 works

- dinosaur head turn / noticing animation
- contact shadow
- transition timing polish
- route adjustment based on real continent visibility
- mobile tap behavior AB choice
- sound cue when sound system exists

### P2 — future

- multiple game entities
- discovered state / collection
- unknown signal hints
- entity unlocks
- MIRAI CORE as full museum navigation

## 20. Non-goals

P0では以下を行わない。

- 地形meshへの正確な足IK
- 地球全体の物理シミュレーション
- 恐竜群れAI
- 複数恐竜
- RPG的探索
- 新しいゲーム選択カード一覧
- 大規模post-processing
- 地球GLBの作り直し

## 21. Final design decision

MIRAI COREは今後、MIRAI MUSEUMのロゴ的オブジェクトではなく、ゲームと展示を発見するためのInteractive Game Universeとして育てる。

最初の入口は恐竜。

ユーザーがボタンを押すのではなく、地球を見て、何かが歩いていることに気づき、触れ、そのまま時代へ入っていく体験をMIRAI MUSEUMの代表的な導線にする。