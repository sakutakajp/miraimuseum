import type { Meta, StoryObj } from "@storybook-vue/nuxt";
import SpacePreview from "./SpacePreview.vue";
const meta = {
  title: "Objects/Impact",
  component: SpacePreview,
  tags: ["autodocs"],
  args: { mode: "impact", kind: "burst", age: 0.16, animate: true },
  argTypes: {
    kind: {
      control: "select",
      options: ["burst", "spark", "pickup", "damage"],
    },
    age: { control: { type: "range", min: 0, max: 0.64, step: 0.01 } },
    mode: { table: { disable: true } },
  },
} satisfies Meta<typeof SpacePreview>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Explosion: Story = {};
export const Spark: Story = { args: { kind: "spark" } };
export const Pickup: Story = { args: { kind: "pickup" } };
export const Damage: Story = { args: { kind: "damage" } };
export const FrozenFrame: Story = { args: { animate: false, age: 0.2 } };
