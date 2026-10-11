<script setup lang="ts">
import { historicalNotes } from "~/museum/exhibits";
import MusicToggle from "~/components/museum/MusicToggle.vue";
import MuseumMenu from "~/components/museum/MuseumMenu.vue";
import ReadableText from "~/components/games/caesar/ReadableText.vue";
useHead({ title: "みらい博物館", htmlAttrs: { lang: "ja" } });
</script>
<template>
  <main class="museum-about" lang="ja">
    <header class="museum-header">
      <NuxtLink to="/" class="museum-wordmark"
        ><ReadableText text="みらい博物館"
      /></NuxtLink>
      <div class="museum-header-actions"><MusicToggle /><MuseumMenu /></div>
    </header>
    <div class="museum-page-intro">
      <h1>おとなの かたへ</h1>
      <p>
        この博物館とルゥの時空移動は創作です。旅先の生活空間は資料を参考に描いています。
      </p>
    </div>
    <section
      v-for="(note, id) in historicalNotes"
      :key="id"
      class="history-box"
    >
      <h2>{{ id === "roman" ? "ひだまりの部屋" : "時空ねこの もりラン" }}</h2>
      <p>{{ note.place }}</p>
      <h3>ほんとうのこと</h3>
      <p>{{ note.fact }}</p>
      <p v-if="'cipher' in note">{{ note.cipher }}</p>
      <p v-if="'plants' in note">{{ note.plants }}</p>
      <h3>復元上の推定</h3>
      <p>{{ note.estimate }}</p>
      <h3>ゲームのくふう</h3>
      <p>{{ note.invention }}</p>
      <p v-if="id === 'roman'">
        ファウヌスの家などの住宅形式を参考にした架空の住宅です。実在の家の正確な復元ではありません。現代の遺跡の損傷を、そのまま当時の姿として描いていません。シーザー暗号の記述はスエトニウスの後世の伝記に基づきます。この家の扉に暗号装置があったという資料はありません。
      </p>
      <h3>参考資料</h3>
      <ul>
        <li v-for="source in note.sources" :key="source.url">
          <a :href="source.url" target="_blank" rel="noopener noreferrer"
            >{{ source.name }} ↗</a
          >
        </li>
      </ul>
    </section>
    <section class="history-box">
      <h2>文字盤と保存について</h2>
      <p>
        当時のラテン文字には、現代英字26文字の J・U・W
        を独立した文字として含みません。I と V
        は母音・子音の両方に使われました。ゲームの46文字のひらがな盤は、ずらす仕組みを学ぶための現代の学習用UIです。当時の文字や機械の復元ではありません。
      </p>
      <p>
        この遊びのシーザー暗号は、実際の大切な情報を守る用途には使えません。
      </p>
      <p>
        クリア記録はこのブラウザのローカル保存です。ログインや別端末への同期はありません。保存を使えない場合でも遊べます。小学1年生の子どもによる試遊は、技術的な動作確認とは別に必要です。
      </p>
      <p>
        読み上げはありません。音楽ボタンで、このゲーム用の短いオリジナルBGMを開始・停止できます。BGMはブラウザ内で合成しており、音声ファイルや外部サービスは使いません。音を出さずに遊ぶこともできます。
      </p>
      <NuxtLink class="museum-button" to="/">はくぶつかんへ</NuxtLink>
    </section>
  </main>
</template>
