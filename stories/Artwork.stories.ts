import type { Meta, StoryObj } from "@storybook-vue/nuxt";
import GameArtwork from "../app/components/GameArtwork.vue";
const meta = {
  title: "Backgrounds/GameArtwork",
  component: GameArtwork,
  tags: ["autodocs"],
  args: { game: "dinosaur-run" },
  argTypes: {
    game: { control: "select", options: ["dinosaur-run", "star-flight"] },
  },
  decorators: [
    () => ({
      template:
        '<div style="width:560px;max-width:100%;height:320px;border-radius:22px;overflow:hidden"><story style="height:100%" /></div>',
    }),
  ],
} satisfies Meta<typeof GameArtwork>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Dinosaur: Story = {};
export const Space: Story = { args: { game: "star-flight" } };
