import type { Meta, StoryObj } from "@storybook-vue/nuxt";
import GameCard from "../app/components/GameCard.vue";
import RubyText from "../app/components/RubyText.vue";
import LanguageSwitch from "../app/components/LanguageSwitch.vue";
import { games } from "../app/games/catalog";
const meta = {
  title: "UI/GameCard",
  component: GameCard,
  tags: ["autodocs"],
  args: { game: games[0]!, record: { best: 0, unlocked: 1, stages: {} } },
  decorators: [
    () => ({ template: '<div style="max-width:430px"><story /></div>' }),
  ],
} satisfies Meta<typeof GameCard>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Dinosaur: Story = {};
export const Space: Story = { args: { game: games[1]! } };
export const Cleared: Story = {
  args: {
    record: {
      best: 2400,
      unlocked: 2,
      stages: { 1: { best: 2400, cleared: true } },
    },
  },
};
export const Buttons: Story = {
  render: () => ({
    components: { RubyText },
    template:
      '<div style="display:flex;gap:16px;flex-wrap:wrap"><button class="button primary"><RubyText text="冒険をはじめる" /></button><button class="button"><RubyText text="博物館にもどる" /></button><button class="button primary" disabled><RubyText text="ステージを選ぶ" /></button></div>',
  }),
};
export const Language: Story = {
  render: () => ({
    components: { LanguageSwitch, RubyText },
    template:
      '<div><LanguageSwitch /><h2><RubyText text="いろんな世界で、あそぼう。" /></h2></div>',
  }),
};
