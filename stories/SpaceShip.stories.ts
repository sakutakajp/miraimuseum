import type { Meta, StoryObj } from "@storybook-vue/nuxt";
import SpacePreview from "./SpacePreview.vue";
const meta = {
  title: "Characters/SpaceShip",
  component: SpacePreview,
  tags: ["autodocs"],
  args: { mode: "ship", damaged: false, x: 0, y: 0 },
  argTypes: {
    x: { control: { type: "range", min: -3, max: 3, step: 0.1 } },
    y: { control: { type: "range", min: -2, max: 2, step: 0.1 } },
    mode: { table: { disable: true } },
    kind: { table: { disable: true } },
  },
} satisfies Meta<typeof SpacePreview>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const Damaged: Story = { args: { damaged: true } };
