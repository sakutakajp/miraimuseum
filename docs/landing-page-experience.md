# MIRAI MUSEUM — Landing Page Experience Specification

> 2026-10-09: エンジン・現行構成は [Babylon.js一次仕様](babylon-full3d-spec.md) と [実装記録](deep-time-implementation.md) を優先する。本書のPhaser / Three.js / TresJS構成・旧ファイルパス・旧検証件数は移行前の記録。ゲームの操作・音楽・美術方針は変更理由を記した箇所以外維持する。
> **2026-10-09 更新:** エンジン選定・フル3D化・11ゲーム構成は [Babylon.js / フル3D共通仕様](babylon-full3d-spec.md) を優先する。本書のThree.js / Phaser / TresJSおよび2D描画の記述は移行前の設計・実装記録であり、新規実装の採用指示ではない。既存のゲーム固有要件は共通仕様と矛盾しない範囲で維持する。記載された過去のテスト結果はBabylon.js版の検証結果ではない。


Version: 1.0  
Date: 2026-10-06  
Status: Design direction approved for specification  

## 1. Goal

MIRAI MUSEUM（みらい博物館）のトップページを、ゲームへの入口を並べる通常のLPではなく、それ自体が最初の「展示体験」になるWebサイトとして設計する。

品質目標は「子供向けサイトとして良い」ではない。年齢をデザイン軸から外し、初見の大人でも思わず触りたくなる、国際的なデジタル・エクスペリエンス水準を狙う。

ユーザーに最初の60秒で伝えることは3つだけ。

1. ここは普通の博物館ではない。
2. 世界のあらゆる学問はつながっている。
3. 見るだけでなく、触って・遊んで・発見できる。

### North Star

> インターネット上に存在する、まだ誰も見たことがない博物館。

### Brand statement

> EVERYTHING IS CONNECTED.  
> すべての学問は、つながっている。

既存の「遊びながら自然に学ぶ」「発見→一言→展示→深掘り」という思想は維持する。ただしトップページでは説明しすぎず、まず体験で理解させる。

---

## 2. What changes / What remains

### Remains

- MIRAI MUSEUM / みらい博物館というブランド
- すべての学問を横断する博物館という世界観
- 展示テーマ × ゲームジャンルのクロス
- 各ゲームが2D / 2.5D / 3D、ドット絵 / リアル / 抽象表現など別々の表現を持てる方針
- Nuxt / Vue / TypeScriptをサイトの基盤とする
- Phaserを2Dゲームに使用する
- Three.js + TresJSを3D展示・3Dゲームに使用する
- スマートフォン縦画面を第一級の体験として扱う
- 将来的なCapacitor化を妨げない

### Replaced

- 「子供向けらしい」配色・イラスト・UIを判断基準にしない
- 一般的なカードグリッド中心のトップページをやめる
- 長い説明文でコンセプトを説明しない
- 「テーマ一覧」「ゲーム一覧」を最初から同じ見た目で並べない
- すべてを同じアートスタイルに統一しない
- サイバーパンク風のネオンHUDをブランドの共通言語にしない
- 3Dを使うこと自体を目的にしない

---

## 3. Art direction

### Concept: Quiet Museum / Impossible Exhibits

ベースは静かな現代美術館・自然史博物館。そこへ、現実では同じ空間に存在しないものが侵入する。

- Obsidian Black: `#08090B`
- Bone White: `#F1EFE8`
- Museum Gray: `#A9A9A4`
- Signal White: `#FFFFFF`
- Accent colorsは展示テーマから動的に供給する

ページ全体を常時ネオンにしない。宇宙展示なら星の青、生命なら生体的な緑、恐竜なら土・琥珀、数学なら高彩度の抽象色など、展示がサイトの色を一時的に侵食する。

### Typography

- ブランド名・巨大見出し: 幾何学的でニュートラルなSans
- 日本語本文: 高可読のゴシック
- 展示番号・座標・分類情報: Mono
- 1画面の文字数は少なくする
- 80〜160px相当の巨大タイポグラフィをデスクトップで使用可能
- モバイルでは文字を小さくするのではなく、改行構成を変える

### Texture

- 完全なフラット塗りではなく、非常に薄いfilm grainを全体に加える
- ガラス、石、紙、金属、標本ケースなど「物質感」を使う
- bloomは展示物だけに限定
- chromatic aberration / glitchは常用しない

---

## 4. The protagonist of the site: MIRAI CORE = EARTH

トップページ全体をつなぐ唯一の3Dオブジェクトを MIRAI CORE と呼ぶ。MIRAI COREの正体は地球である。

この変更の中心原則:

> 地球が変わるのではなく、見方が変わる。

Sceneごとに地球を細胞・結晶・機械など別の物体へmesh morphさせない。同じ地球を一貫して画面に残し、その表面・内部・周辺へ異なる「観測レイヤー」を重ねることで、SPACE / LIFE / MATTER / MACHINEを表現する。

MIRAI COREは「知識を違う尺度で見た同じ世界」であり、最終的には「私たちが住んでいる世界そのもの」を意味する。

### Visual layers

1. EARTH / BASE — 海、大陸、雲、大気。暗闇では輪郭だけが見える。
2. SPACE — 宇宙から見た地球。大気、雲、夜側、軌道スケール。
3. LIFE — 植生、生物圏、海洋の微細な粒子、生命ネットワークが地表へ侵入する。
4. MATTER — 地表が部分的に透過・侵食され、地層、プレート、鉱物、結晶、分子構造の視点が現れる。
5. MACHINE — 都市光、人工物、通信、軌道、インフラが「人工的な地層」として重なる。
6. CONNECTED — すべての観測レイヤーが短時間だけ同居し、地球が点群 / 輪郭 / データへ解体されScene 02へ渡る。

### Rules

- 地球のsilhouette、回転軸、camera continuityを全状態で維持する。
- Blue Marble写真を貼っただけの「普通の地球儀」にしない。
- LIFEを明るい緑発光、MACHINEを青い通信線だらけにする等、ありがちなscience / DX表現へ逃げない。
- 地球の存在感はlighting、cloud shell、atmosphere、night side、surface reliefの質で作る。
- scroll progressは「別モデルへの切替」ではなく観測レイヤーのmix / reveal / mask / shader parameterとして扱う。
- MIRAI COREは1つのThree.js scene内でcamera / Earth transformを連続補間する。
- 最後に点群へ解体するまで、地球本体を別オブジェクトへ置換しない。

MIRAI CORE = EARTHとすることで、後続の宇宙、生命、恐竜、数学、機械の展示はすべて「同じ世界の別の見方」として接続される。

---

## 5. Global page structure

デスクトップでは約12〜16 viewport分の体験を想定。モバイルは情報量を減らすのではなく、カメラ演出と構図を縦画面用に再設計する。

| Scene | Name | Primary emotion | Main technology |
|---|---|---|---|
| 00 | Threshold | 「何だこれは」 | DOM + Three.js |
| 01 | Scale Shift | 驚き | Three.js + scroll timeline |
| 02 | Everything Is Connected | 発見 | DOM typography + shader |
| 03 | Exhibition Portals | 探索 | Three.js + Vue |
| 05 | Knowledge Constellation | 理解 | WebGL nodes + DOM labels |
| 06 | Game Archive | 選びたくなる | Vue + motion + theme transitions |
| 07 | Manifesto | 余韻 | sticky + typography + media |
| 08 | Enter the Museum | 行動 | minimal DOM + transition |

---

## 6. Scene-by-scene specification

### Scene 00 — THRESHOLD / 0–100vh

#### Visual

黒に近い空間。ページロード直後はナビゲーションを見せない。

中央より少し右に巨大なMIRAI CORE = EARTHが暗闇から浮かぶ。最初の1秒では「地球」と断定できない程度に暗くする。見えるのは細い大気のrim、夜側の雲、海面のわずかなspecularだけ。

スクロールとともに光が回り込み、雲と大陸の情報が少しずつ現れ、ユーザーが「あ、地球だった」と気づく構成にする。

上部左:

MIRAI MUSEUM / みらい博物館

中央または下部:

EXPLORE THE WORLD OF KNOWLEDGE.

その下に非常に小さく:

SCROLL TO ENTER

#### Motion

- 初期ロード 0.0–0.5s: 黒
- 0.5–1.4s: 地球のatmosphere rimとcloud edgeだけ出現
- 0.9–1.8s: ブランド名をフェードではなくmask reveal
- pointer / touchに地球が最大2〜3度だけ遅れて反応
- idle時は実際の惑星らしい非常に遅い自転
- スクロール開始時、cameraとkey lightが動き、地球であることが判明する
- Scene 01へ入る瞬間も地球は同じ位置・回転状態から連続する

#### Sound

初期状態はmute。音ONボタンだけ右上に小さく置く。ONにすると非常に低いmuseum room tone + atmospheric resonance。

自動再生音声は行わない。

---

### Scene 01 — SCALE SHIFT / 100–360vh

テーマ:

> 地球が変わるのではなく、見方が変わる。

Three sceneはsticky 100dvh。スクロール距離を1つの地球に対する観測レイヤーの変化として利用する。

#### Sequence

0–20% / SPACE  
暗闇から地球が十分に判別できる状態へ。大気、雲、海、夜側の都市光をrestrainedに見せる。宇宙から見た惑星として成立させる。

20–40% / LIFE  
地球本体はそのまま。地表に植生・生物圏の反応が広がり、海には微細な粒子、陸には生命ネットワークのような有機的パターンが短く現れる。地球が巨大な生命体にも見える瞬間を作る。

40–60% / MATTER  
LIFEレイヤーが沈み、地表の一部がmask / dissolveで透過・侵食される。地層、プレート、鉱物、結晶格子、分子レベルのmotifが「地球を構成する物質」として侵入する。教科書的な断面図にはしない。

60–82% / MACHINE  
夜側の都市光、軌道上の人工物、通信、海底ケーブルやインフラを抽象化した細い構造が重なる。青いnetwork lineを世界中へ張る典型的なDX地球儀にはしない。「人間が地球に人工的な地層を追加した」ように見せる。

82–100% / CONNECTED  
SPACE / LIFE / MATTER / MACHINEの特徴が短時間だけ同時に見える。地球のsilhouetteを最後まで保った後、表面が点群・輪郭線・微細なfragmentへ分解し、Bone WhiteのScene 02へ渡す。

#### Copy

各状態に長文を出さない。

SPACE  
LIFE  
MATTER  
MACHINE

だけを展示分類ラベルとして表示。

補助ラベルを使う場合も、ATMOSPHERE / BIOSPHERE / LITHOSPHERE / TECHNOSPHERE程度に抑える。

#### Implementation

- Scroll progressは1箇所のExperienceDirectorから0–1で管理
- Earth objectはScene 00〜01で同一instanceを維持
- 観測レイヤーはmaterial mix、texture mask、secondary shell、line/particle layerで表現
- object animationとDOM animationは同じprogress / clockを参照
- scroll listener内で直接大量更新しない
- rAF内でlerp / damp
- scroll velocityはlayer revealへごく小さなenergy responseを与える程度
- prefers-reduced-motionではSPACE / LIFE / MATTER / MACHINEを離散的なcrossfadeで見せる
- 最後のdissolveまでEarth geometryのidentityを失わせない

---

### Scene 02 — EVERYTHING IS CONNECTED / 360–520vh

Scene 01の答え。

白〜アイボリーへ大胆に反転する。

画面いっぱいの日本語:

> すべての学問は、  
> つながっている。

補助コピー:

> 宇宙も、生命も、数も、機械も。  
> 見方を変えれば、同じ世界の一部になる。

Scene 01で地球から離れたpoint / contour / fragmentが背景へ残る。それらはgenericな原子軌道だけを描くのではなく、軌道、細胞cluster、結晶格子、networkなど「複数の見方」を短く横断してから静かになる。

重要なのは、Scene 02で新しい概念を追加することではなく、SPACE / LIFE / MATTER / MACHINEが最初から同じ地球に存在していたと理解させること。

文字は1文字ずつ派手に出さず、line mask / clipで静かにresolveする。

Scene 03へ入る時、残ったpoint fieldは各Exhibition Portalへ吸い寄せられる余地を残す。

---

### Scene 03 — EXHIBITION PORTALS / 520–820vh

ここで初めて「選べる」ことを明確にする。

カードグリッドは禁止。

ユーザーは巨大な展示室の前を横切るように、1画面につき1〜1.5展示を見る。

Initial portals:

1. `01 / COSMOS` — 宇宙
2. `02 / LIFE` — 生命
3. `03 / DEEP TIME` — 恐竜・地球史
4. `04 / MACHINE` — ロボティクス・工学
5. `05 / MIND` — AI・認知
6. `06 / PATTERN` — 数学・物理

#### Interaction

- scrollで展示室を移動
- pointer hover / touch holdでその世界が20〜30%だけ漏れ出す
- 選択すると詳細ページへ普通に切り替えるのではなく、展示内へcamera push-inしてroute transition

#### Example

`DEEP TIME`に近づくと白い美術館の床へ薄く砂が広がる。照明の影だけ先に巨大な恐竜になる。恐竜本体を最初から全面に出さない。

`MACHINE`では床にSO-101を直接置くのではなく、精密機械の分解図・サーボ断面・関節軌道が展示物として浮く。

---


### Scene 05 — KNOWLEDGE CONSTELLATION / 980–1160vh

「学問体系の裏面」を可視化するセクション。

真っ黒な空間に戻り、展示テーマをnodeとして配置する。ただし普通のnetwork chartにはしない。

最初は数個の星に見える。scroll / pointerで接近するとラベルが現れ、関係線が光る。

Example connections:

- 恐竜 ↔ 進化 ↔ 遺伝 ↔ AI
- 宇宙 ↔ 元素 ↔ 化学 ↔ 生命
- 数学 ↔ 音楽 ↔ 波 ↔ 量子
- ロボット ↔ 身体 ↔ 神経 ↔ 認知

クリック / tapすると「この接続を遊ぶ」ゲームへの導線を出せる。

重要: 正確な教育コンテンツは将来データ追加できる構造にし、このLP段階では少数の象徴的な接続だけ使う。

---

### Scene 06 — GAME ARCHIVE / 1160–1420vh

ゲーム一覧への実用的な入口。ただしビジュアル品質を落とさない。

Desktop:

- 横方向のcinematic rail
- 画面中央の作品だけ100% contrast / scale
- 隣の作品は一部だけ見切れる
- title / theme / genre / playtime / score statusを別レイヤーで表示

Mobile:

- vertical-firstのsnap list
- 1作品70〜82dvh程度
- スクロールすると次作品のビジュアルが前作品を侵食する

各作品の背景・色・3D・イラストは独立してよい。共通なのは情報階層・遷移品質・入力感だけ。

Filtersは常時表示しない。`EXPLORE`を開くと、`THEME / GENRE / DURATION / 2D / 3D`を選べる。

---

### Scene 07 — MANIFESTO / 1420–1600vh

再び静かにする。

ゲームを見せた直後なので、派手な演出を重ねない。

巨大文字をスクロールで1文ずつ見せる。

> わからないから、触ってみる。  
> 触ったから、気になってくる。  
> 気になったら、世界は展示物になる。

最後だけ:

> MIRAI MUSEUM  
> EXPLORE THE WORLD OF KNOWLEDGE.

背景ではMIRAI COREが最初の未知の標本へ戻る。

円環構造を作り、ページの最後が最初とつながる。

---

### Scene 08 — ENTER THE MUSEUM / 1600vh+

ここで初めて通常ナビゲーションを明確にする。

Primary:

`ENTER THE MUSEUM` → ゲーム / 展示一覧

Secondary:

- EXHIBITIONS
- GAMES
- ABOUT
- COLLECTION

Footerは企業サイト的な巨大footerにしない。必要な法的情報・SNS等だけを静かに置く。

---

## 7. Navigation

Scene 00ではロゴ + soundのみ。

Scene 02以降、極小のmuseum navigationが出現する。

Desktop:

- Left top: `MM / 000`
- Right top: `EXHIBITIONS  GAMES  ABOUT  SOUND`
- 現在地はページ番号ではなく展示番号で示す

Mobile:

- Left top: MM mark
- Right top: menu / sound
- bottom navigationは使わない。ゲーム中UIとの衝突を避ける

---

## 8. Motion language

全演出に共通ルールを設ける。

### Rule 1 — Camera first

可能ならUIを動かすより、camera / object / lightを動かす。

### Rule 2 — No generic fade parade

各要素を順番にfade-upするだけのLP表現は避ける。mask reveal、material change、depth、occlusion、scale shiftなど内容に意味のある遷移を優先する。

### Rule 3 — One hero trick per scene

1セクションで主役となる仕掛けは1つ。それ以外は主役を補助する。

### Rule 4 — Motion communicates state

装飾だけのmotionを増やさない。接近=詳細、dissolve=学問の変換、camera push=展示へ入る、色侵食=テーマ切替、と意味を対応させる。

### Rule 5 — Physical response

pointer / touchには100ms以内に視覚反応を返す。大きな遷移完了は400〜900msでもよいが、入力を受け取ったことは即座に示す。

---

## 9. Sound direction

音はBGMを常時流すのではなく、空間を作る。

- Museum room tone
- CORE proximity resonance
- ガラス / 金属 / 紙 / 石のmaterial SE
- Exhibition portalごとの短いsignature sound

Sound ONはユーザー操作必須。

Web Audioのmaster gainを一元管理し、ゲーム側Audioへ遷移しても音量感が急変しないようにする。

---

## 10. Technical architecture

### Layers

```text
Nuxt App
├─ DOM Layer
│  ├─ Navigation
│  ├─ Typography
│  ├─ Accessibility
│  └─ Content / SEO
├─ Experience Layer
│  ├─ ExperienceDirector
│  ├─ ScrollTimeline
│  ├─ InputManager
│  ├─ AudioDirector
│  └─ QualityManager
├─ Three Layer (TresJS)
│  ├─ MuseumScene
│  ├─ MiraiCore
│  ├─ PortalScenes
│  ├─ ParticleSystem
│  └─ PostFX
└─ Game Layer
   ├─ Phaser games
   └─ Three.js games
```

### ExperienceDirector

ページ演出をコンポーネント単位で個別にscroll listenerへ接続しない。

`ExperienceDirector`が最低限次を管理する。

- normalized scroll progress
- current scene
- scene local progress
- scroll velocity
- viewport / safe-area
- pointer / touch normalized position
- reduced motion
- quality tier
- route transition state
- shared clock

### Rendering

- Desktop high: devicePixelRatio上限 1.5〜2.0
- Mobile high: DPR固定ではなくGPU時間を見て動的解像度
- heavy post-processingはquality tierでOFF可能
- static textureはKTX2 / WebP / AVIFを検討
- 3DはglTF / GLB、Draco/Meshoptを検討
- 初回表示に不要なPortal assetは遅延ロード

### HTML/Video hybrid

リアルタイム描画でしか価値がない箇所だけThree.jsを使う。

複雑な背景アニメーションやゲームpreviewは、live renderingより事前レンダリングvideoの方が品質/容量/電力のバランスが良ければvideoを使う。

---

## 11. Performance budgets

「高品質だから重い」を許容しない。

Target:

- 主要UI入力応答: < 100ms perceived response
- animation target: 60fps on modern desktop / high-end mobile
- adaptive target: 30fpsを下回る前にqualityを落とす
- initial 3D asset: 可能なら3–5MB以内 compressed
- initial total critical transfer: 段階ロードし、全展示assetを初回に取らない

QualityManager degradation order:

1. DPR
2. particle count
3. shadow resolution / dynamic shadows
4. bloom / DOF / secondary post FX
5. reflection quality
6. portal background detail
7. realtime sceneをpre-rendered fallbackへ

---

## 12. Accessibility

超ハイクオリティとaccessibilityを対立させない。

- 主要導線はDOMとして存在させる
- 3Dだけに情報を閉じ込めない
- keyboard navigationを用意
- focus visibleをブランドデザインとして作る
- `prefers-reduced-motion`では演出を削除するのではなく、状態間crossfadeへ変換
- soundなしでも意味が成立
- decorative canvasは適切にaccessibility treeから除外
- route transition後にfocusを論理的な見出しへ移す
- mobile modalにはfocus trap / Escape相当 / closeを用意

---

## 13. Mobile-specific direction

スマホをデスクトップの縮小版にしない。

### Composition

- MIRAI COREを画面中央より少し上に配置し、親指領域を操作用に残す
- 大型タイポグラフィは縦組み/大胆な改行も許可
- safe-areaを常に考慮
- hover前提の情報はtouch holdまたはscroll revealへ置換

### Thermal / battery

- 長時間60fps描画を要求し続けない
- static sceneではrender demand方式も検討
- background移行時はWebGL loop / audioをpause
- `visibilitychange`を必ず扱う

---

## 14. Route transition: LP → game

最重要体験の一つ。

Bad:

`CTA click → white flash → new page → loading spinner → game`

Target:

`CTA → 展示物に接近 → 展示が画面を覆う → route swap → 同じ色/形からgame sceneが開始`


実際のrendererを永続化できない場合でも、transition overlayをDOM/videoで跨がせることで連続して見せる。

---

## 15. Content model

展示やゲーム情報をコンポーネントへ直書きしない。

Conceptual model:

```ts
type Exhibition = {
  id: string
  number: string
  title: string
  titleJa: string
  discipline: string[]
  accent: string
  hero: MediaRef
  model?: ModelRef
  relatedExhibitions: string[]
  games: string[]
}

type GameExperience = {
  id: string
  title: string
  theme: string[]
  genre: string[]
  renderer: 'phaser' | 'three'
  orientation: 'portrait'
  durationSeconds?: number
  preview: MediaRef
  accent: string
}
```

---

## 16. Anti-patterns

次はこのブランドでは原則禁止。

- 全画面に常時ネオン
- どこにでもglassmorphism
- 意味のないparticles
- 読みにくさを「高級感」と呼ぶ
- 3D loaderを長時間見せる
- scroll hijackingでユーザー入力を無視する
- すべてのセクションでparallax
- 角丸カードの大量配置
- 「詳しく見る」ボタンの連打
- 過剰なHUD / sci-fi frame
- すべてを同じease / fade-upで済ませる
- desktop版を縮小しただけのmobile版

---

## 17. Implementation phases

### Phase 1 — Experience prototype

1. 黒背景 + MIRAI CORE
2. 100dvh sticky canvas
3. Scene 00→01→02だけ実装
4. scroll progress / camera / dissolve検証
5. iPhone Safariで性能確認

この段階では全LPを作らない。「この博物館は本当にすごい」と感じる最初の20秒を先に成立させる。

### Phase 2 — Brand system

- typography
- navigation
- museum label component
- theme accent system
- motion tokens
- sound tokens
- accessibility states

### Phase 3 — Portals + Archive

- Exhibition portals
- game archive
- content data model
- route transition

### Phase 4 — Featured Experience

- seamless LP→game transition
- score / collection state連携

### Phase 5 — Polish

- sound design
- asset compression
- quality tiers
- reduced motion
- mobile thermal test
- Core Web Vitals / accessibility review

---

## 18. Acceptance criteria

トップページを完成と呼べる条件。

### Experience

- 最初の5秒でMIRAI MUSEUM固有の世界観が伝わる
- 最初の20秒以内に最低1回「予想外の変化」がある
- 各主要sceneに固有のhero interactionが1つある
- すべての演出がコンセプトと対応している
- LPからゲームへの遷移に「別アプリへ移動した」感がない

### Design

- 子供向けサイトに見えない
- ありがちなサイバーパンクにも見えない
- 既存の参考サイトのコピーに見えない
- 静かな展示空間と爆発的なゲーム表現の両方が一つのブランドとして成立する

### Engineering

- mobile portraitで主要体験が成立
- reduced motionで操作可能
- 低quality tierでもコンテンツが欠落しない
- 3Dロード失敗時もDOM/video fallbackで入口へ到達できる
- Phaser / Three.jsの各ゲームを独立ロードできる

---

## 19. Design principle to remember

このトップページの目的は、技術力を見せることではない。

ユーザーがページを閉じたあとに、

> 「あの博物館、もう一回行きたい」

と思うこと。

そのために3D、映像、音、タイポグラフィ、ゲームを使う。

MIRAI MUSEUMのトップページ自体を、最初の展示作品として作る。
