import type { Meta, StoryObj } from "@storybook-vue/nuxt";
import StarDivePreview from "./StarDivePreview.vue";
const meta = {
  title: "STAR DIVE/Stage 1",
  component: StarDivePreview,
  tags: ["autodocs"],
  args: { time: 6, quality: "medium", reduced: false },
  argTypes: {
    time: { control: { type: "range", min: 0, max: 79.9, step: 0.1 } },
    quality: { control: "select", options: ["high", "medium", "low"] },
    object: {
      control: "select",
      options: [undefined, "shard", "core", "gate"],
    },
  },
} satisfies Meta<typeof StarDivePreview>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Dive: Story = {};
export const FirstContact: Story = { args: { time: 18 } };
export const AsteroidField: Story = { args: { time: 33 } };
export const Risk: Story = { args: { time: 45 } };
export const Inside: Story = { args: { time: 62 } };
export const BreakOut: Story = { args: { time: 73 } };
export const LowQuality: Story = { args: { time: 62, quality: "low" } };
export const ReducedMotion: Story = { args: { time: 73, reduced: true } };
export const Shard: Story = { args: { time: 18, object: "shard" } };
export const Core: Story = { args: { time: 18, object: "core" } };
export const GateCore: Story = { args: { time: 18, object: "gate" } };
