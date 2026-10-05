import type { Meta, StoryObj } from "@storybook-vue/nuxt";
import PixelSprite from "../app/components/PixelSprite.vue";
import { sprites } from "../app/data/sprites";
const meta = {
  title: "Characters/PixelSprite",
  component: PixelSprite,
  tags: ["autodocs"],
  args: { name: "player", label: "主人公" },
  argTypes: { name: { control: "select", options: Object.keys(sprites) } },
  decorators: [
    () => ({
      template:
        '<div style="width:240px;height:240px;display:grid;place-items:center;background:#e4dfca;border-radius:16px"><story /></div>',
    }),
  ],
} satisfies Meta<typeof PixelSprite>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Explorer: Story = {};
export const Robot: Story = { args: { name: "robot", label: "ロボット" } };
export const Tyrannosaurus: Story = {
  args: { name: "rex", label: "ティラノサウルス" },
};
