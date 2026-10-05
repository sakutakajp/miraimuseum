<script setup lang="ts">
import {
  discoveries,
  discoveriesFor,
  getDiscovery,
  factFor,
  type DiscoveryId,
} from "~/data/discoveries";
import { getWorld, worlds, type WorldId } from "~/data/worlds";
import { museumAudio } from "~/game/audio";
const { progress, foundCount, storageAvailable, finish, toggleSound } =
  useMuseum();
const view = ref<"home" | "museum" | "game" | "result">("home");
const selected = ref<DiscoveryId | null>(null);
const expedition = ref<DiscoveryId[]>([]);
const previousVisits = ref<Partial<Record<DiscoveryId, number>>>({});
const run = ref(0);
const activeWorld = ref<WorldId>("dinosaur");
const galleryWorld = ref<WorldId>("dinosaur");
const galleryItems = computed(() => discoveriesFor(galleryWorld.value));
const galleryInfo = computed(() => getWorld(galleryWorld.value));
const activeInfo = computed(() => getWorld(activeWorld.value));
const nextWorld = computed(
  () =>
    worlds[
      (worlds.findIndex((world) => world.id === activeWorld.value) + 1) %
        worlds.length
    ]!,
);
function worldFound(id: WorldId) {
  return discoveriesFor(id).filter((item) => progress.value.visits[item.id])
    .length;
}
const latestNew = computed(
  () => expedition.value.filter((id) => !previousVisits.value[id]).length,
);
const highlights = computed(() =>
  [...expedition.value]
    .sort(
      (a, b) =>
        (activeInfo.value.highlights.includes(a) ? -1 : 0) -
        (activeInfo.value.highlights.includes(b) ? -1 : 0),
    )
    .slice(0, 2),
);
function navigate(next: "home" | "museum") {
  view.value = next;
  window.scrollTo({ top: 0 });
}
function start(world: WorldId = "dinosaur") {
  activeWorld.value = world;
  galleryWorld.value = world;
  museumAudio.setMuted(progress.value.muted);
  void museumAudio.unlock();
  previousVisits.value = { ...progress.value.visits };
  expedition.value = [];
  run.value++;
  view.value = "game";
  window.scrollTo({ top: 0 });
}
function complete(ids: DiscoveryId[]) {
  expedition.value = ids;
  finish(ids);
  view.value = "result";
  window.scrollTo({ top: 0 });
}
function sound() {
  toggleSound();
  museumAudio.setMuted(progress.value.muted);
  if (!progress.value.muted) void museumAudio.unlock();
}
watch(
  () => progress.value.muted,
  (value) => museumAudio.setMuted(value),
);
</script>
<template>
  <div class="museum-app" :class="{ 'is-playing': view === 'game' }">
    <header v-if="view !== 'game'" class="site-header">
      <button
        class="brand"
        aria-label="みらい博物館のホーム"
        @click="navigate('home')"
      >
        <span class="brand-mark"><MuseumIcon name="museum" /></span
        ><span><strong>みらい博物館</strong><small>MIRAI MUSEUM</small></span>
      </button>
      <nav aria-label="メインメニュー">
        <button
          class="header-museum"
          :aria-label="`わたしの博物館、発見 ${foundCount} / ${discoveries.length}`"
          :class="{ active: view === 'museum' }"
          @click="navigate('museum')"
        >
          <MuseumIcon name="museum" /><span>わたしの博物館</span
          ><b
            >{{ foundCount }}<i> / {{ discoveries.length }}</i></b
          ></button
        ><button
          class="sound-button icon-button"
          :aria-label="progress.muted ? '音をオンにする' : '音をオフにする'"
          :aria-pressed="!progress.muted"
          @click="sound"
        >
          <MuseumIcon :name="progress.muted ? 'mute' : 'sound'" />
        </button>
      </nav>
    </header>
    <main>
      <template v-if="view === 'home'">
        <section class="hero">
          <div class="hero-copy">
            <span class="eyebrow"
              ><span class="tiny-spark">✳</span> A LITTLE ADVENTURE, A BIG
              DISCOVERY.</span
            >
            <h1>世界の「なぜ？」は、<br /><span>遊びのなかに。</span></h1>
            <p>
              走って、跳んで、見つける。<br />きみの発見で、博物館が広がっていく。
            </p>
            <div class="hero-actions">
              <button class="button primary" @click="start('dinosaur')">
                <MuseumIcon name="compass" />冒険をはじめる<MuseumIcon
                  name="arrow"
                /></button
              ><button class="text-button" @click="navigate('museum')">
                博物館をのぞいてみる <span>↗</span>
              </button>
            </div>
            <div class="hero-note">
              <span class="mini-dot" />タップひとつで遊べる <span>·</span> 1回
              約80秒 <span>·</span> ゲームオーバーなし
            </div>
          </div>
          <div class="hero-world">
            <div class="world-topline">
              <span><i /> A WINDOW TO ANOTHER WORLD</span><span>01 / 03</span>
            </div>
            <div class="world-window">
              <WorldIllustration /><span class="world-badge"
                >約6700万年前の世界</span
              ><span class="coordinate">NORTH AMERICA · LATE CRETACEOUS</span>
            </div>
            <div class="world-bottomline">
              <span>恐竜の世界</span
              ><span>きみは、なにを見つける？ <MuseumIcon name="star" /></span>
            </div>
            <span class="floating-discovery"
              ><MuseumIcon name="star" />発見は、すぐそこ。</span
            >
          </div>
        </section>
        <section class="worlds-section">
          <div class="section-title">
            <div>
              <span class="eyebrow">CHOOSE YOUR WORLD</span>
              <h2>今日は、どの世界へ？</h2>
            </div>
            <span class="section-note">小さな一歩から、大きな冒険。</span>
          </div>
          <div class="world-cards">
            <button
              v-for="world in worlds"
              :key="world.id"
              class="world-card available"
              :class="'world-' + world.id"
              :aria-label="world.name + 'を冒険する'"
              @click="start(world.id)"
            >
              <div class="world-card-copy">
                <span class="card-index"
                  >{{ world.index }} <span>OPEN FOR EXPLORATION</span></span
                >
                <h3>{{ world.name }}</h3>
                <p>{{ world.subtitle }}</p>
                <span class="card-bottom"
                  ><span
                    ><MuseumIcon name="star" />発見 {{ worldFound(world.id) }} /
                    {{ discoveriesFor(world.id).length }}</span
                  ><span class="round-arrow">↗</span></span
                >
              </div>
              <PixelSprite class="card-dinosaur" :name="world.sprite" />
            </button>
          </div>
        </section>
        <section class="museum-invitation">
          <div class="invitation-art">
            <PixelSprite name="robot" /><MuseumIcon name="star" />
          </div>
          <div>
            <span class="eyebrow">YOUR VERY OWN MUSEUM</span>
            <h2>
              {{
                foundCount
                  ? "きみの発見が、展示になった。"
                  : "まだ空っぽの棚に、最初の発見を。"
              }}
            </h2>
            <p>
              {{
                foundCount
                  ? `${foundCount} 個の発見が、きみの帰りを待っているよ。`
                  : "見つけたものが増えるたび、きみだけの博物館が育つ。"
              }}
            </p>
          </div>
          <button class="button secondary" @click="navigate('museum')">
            博物館へ <MuseumIcon name="arrow" />
          </button>
        </section>
      </template>
      <template v-else-if="view === 'museum'">
        <section class="gallery-heading">
          <div>
            <span class="eyebrow">THE THINGS YOU DISCOVERED</span>
            <h1>わたしの博物館<span>。</span></h1>
            <p>小さな発見が、世界をちょっと広くする。</p>
          </div>
          <div class="collection-counter">
            <strong
              >{{ foundCount }}<span>/ {{ discoveries.length }}</span></strong
            ><small>3つの世界の発見</small>
          </div>
        </section>
        <nav class="gallery-filters" aria-label="展示室">
          <button
            v-for="world in worlds"
            :key="world.id"
            :aria-pressed="galleryWorld === world.id"
            @click="galleryWorld = world.id"
          >
            {{ world.name }}
            <small
              >{{ worldFound(world.id) }} /
              {{ discoveriesFor(world.id).length }}</small
            >
          </button>
        </nav>
        <div class="gallery-toolbar">
          <span
            ><MuseumIcon name="museum" /> {{ galleryInfo.index }}　{{
              galleryInfo.room
            }}</span
          ><button class="text-button" @click="start(galleryWorld)">
            発見を探しに行く <span>↗</span>
          </button>
        </div>
        <div class="exhibit-grid">
          <button
            v-for="(item, i) in galleryItems"
            :key="item.id"
            class="exhibit-card"
            :class="{ undiscovered: !progress.visits[item.id] }"
            :disabled="!progress.visits[item.id]"
            :aria-label="
              progress.visits[item.id]
                ? `${item.name}の展示を見る`
                : `展示${i + 1}、未発見`
            "
            @click="selected = item.id"
          >
            <div class="exhibit-art" :style="{ '--exhibit-color': item.color }">
              <span class="exhibit-number">NO. 00{{ i + 1 }}</span
              ><span v-if="progress.visits[item.id]" class="found-stamp"
                ><MuseumIcon name="check" />発見済み</span
              ><PixelSprite :name="item.sprite" /><span
                v-if="!progress.visits[item.id]"
                class="unknown-symbol"
                >?</span
              ><span class="exhibit-plinth" />
            </div>
            <div class="exhibit-caption">
              <span class="eyebrow">{{
                progress.visits[item.id]
                  ? item.category
                  : "WAITING TO BE DISCOVERED"
              }}</span>
              <h2>
                {{ progress.visits[item.id] ? item.name : "まだ見ぬ発見"
                }}<span>{{ progress.visits[item.id] ? "↗" : "· · ·" }}</span>
              </h2>
              <p>
                {{
                  progress.visits[item.id]
                    ? factFor(item.id, (progress.visits[item.id] ?? 1) - 1)
                    : "冒険のどこかで、きみを待っている。"
                }}
              </p>
            </div>
          </button>
        </div>
        <div class="gallery-tip">
          <PixelSprite name="robot" />
          <p>
            同じものをもう一度見つけると、新しいひとことに出会えるよ。<small>{{
              storageAvailable
                ? "発見はこのブラウザーに自動で保存されます。"
                : "このブラウザーでは保存できません。発見はページを閉じるまで残ります。"
            }}</small>
          </p>
        </div>
      </template>
      <ClientOnly v-else-if="view === 'game'"
        ><GameStage
          :key="run"
          :world="activeWorld"
          :visits="previousVisits"
          :muted="progress.muted"
          @finish="complete"
          @leave="navigate('museum')"
          @sound="sound"
      /></ClientOnly>
      <section v-else-if="view === 'result'" class="results">
        <div class="result-emblem"><MuseumIcon name="star" /></div>
        <span class="eyebrow">EXPEDITION COMPLETE</span>
        <h1>おかえり、冒険家！</h1>
        <p>{{ activeInfo.name }}を冒険したよ。世界は、ちょっと広くなったね。</p>
        <div class="result-count">
          <strong>{{ expedition.length }}</strong
          ><span
            >個の発見
            <b v-if="latestNew">うち {{ latestNew }} 個が初めての発見</b></span
          >
        </div>
        <div class="highlight-grid">
          <article v-for="id in highlights" :key="id" class="highlight-card">
            <div>
              <PixelSprite :name="getDiscovery(id).sprite" /><span>{{
                previousVisits[id] ? "もうひとつ、わかった！" : "NEW DISCOVERY"
              }}</span>
            </div>
            <h2>{{ getDiscovery(id).name }}</h2>
            <p>{{ factFor(id, previousVisits[id] ?? 0) }}</p>
          </article>
        </div>
        <div class="result-discoveries">
          <span>今回見つけたもの</span>
          <div>
            <span v-for="id in expedition" :key="id"
              ><PixelSprite :name="getDiscovery(id).sprite" />{{
                getDiscovery(id).name
              }}</span
            >
          </div>
        </div>
        <p class="save-note">
          {{
            storageAvailable
              ? "発見を博物館に展示しました。自動で保存されています。"
              : "発見を展示しました。このブラウザーでは永続保存できません。"
          }}
        </p>
        <div class="result-actions">
          <button class="button primary" @click="navigate('museum')">
            <MuseumIcon name="museum" />博物館で見てみる<MuseumIcon
              name="arrow"
            /></button
          ><button class="button secondary" @click="start(activeWorld)">
            もう一度、冒険する
          </button>
          <button class="text-button" @click="start(nextWorld.id)">
            次は{{ nextWorld.name }}へ <span>↗</span>
          </button>
        </div>
      </section>
    </main>
    <footer v-if="view !== 'game'" class="site-footer">
      <span class="footer-brand"
        >MIRAI MUSEUM<span>遊びのなかに、発見を。</span></span
      ><span
        >小さな「なぜ？」が、未来のはじまり。<MuseumIcon name="star"
      /></span>
    </footer>
    <DiscoveryDialog
      v-if="selected"
      :id="selected"
      :visits="progress.visits[selected] ?? 0"
      @close="selected = null"
    />
  </div>
</template>
