import type { Meta, StoryObj } from "@storybook-vue/nuxt";
import StarDiveResult from "../app/components/games/star-dive/StarDiveResult.vue";
import StarDiveHud from "../app/components/games/star-dive/StarDiveHud.vue";
import AsteroidExhibit from "../app/components/games/star-dive/AsteroidExhibit.vue";
const meta = {
  title: "STAR DIVE/UI",
  component: StarDiveResult,
  tags: ["autodocs"],
  args: {
    result: {
      game: "star-flight",
      stage: 1,
      cleared: true,
      score: 12470,
      health: 2,
      elapsed: 80,
      stats: { maxChain: 12, near: 6 },
      discoveries: ["asteroid"],
    },
    best: 12470,
    newBest: true,
  },
} satisfies Meta<typeof StarDiveResult>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Clear: Story = {};
export const Failure: Story = {
  args: {
    result: {
      game: "star-flight",
      stage: 1,
      cleared: false,
      score: 980,
      health: 0,
      elapsed: 34,
      stats: { maxChain: 3, near: 1 },
    },
    best: 12470,
    newBest: false,
  },
};
export const HUD: Story = {
  render: () => ({
    components: { StarDiveHud },
    setup: () => ({
      state: {
        time: 48,
        section: "risk",
        score: 7240,
        shield: 2,
        chain: 8,
        maxChain: 8,
        near: 4,
        risk: 3,
        gateOpen: false,
        finished: false,
        cleared: false,
        quality: "medium",
      },
    }),
    template:
      '<div class="star-dive" style="height:260px"><StarDiveHud :state="state" :muted="false" /></div>',
  }),
};
export const Exhibit: Story = {
  render: () => ({
    components: { AsteroidExhibit },
    template: "<AsteroidExhibit />",
  }),
};
