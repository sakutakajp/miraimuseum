import type { Meta, StoryObj } from "@storybook-vue/nuxt";
import GameHUD from "../app/components/GameHUD.vue";
const meta = {
  title: "UI/GameHUD",
  component: GameHUD,
  tags: ["autodocs"],
  args: { health: 3, score: 1240, distance: 0.35 },
  argTypes: {
    health: { control: { type: "range", min: 0, max: 3, step: 1 } },
    distance: { control: { type: "range", min: 0, max: 1, step: 0.01 } },
  },
  decorators: [
    () => ({
      template:
        '<div style="position:relative;width:420px;max-width:100%;height:160px;background:#080d29"><story /></div>',
    }),
  ],
} satisfies Meta<typeof GameHUD>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Healthy: Story = {};
export const LastLife: Story = { args: { health: 1 } };
export const Goal: Story = { args: { score: 4500, distance: 1 } };
