import type { Meta, StoryObj } from "@storybook-vue/nuxt";
import DinosaurPreview from "./DinosaurPreview.vue";
import WorldIllustration from "../app/components/WorldIllustration.vue";
const meta = {
  title: "Backgrounds/Dinosaur",
  component: DinosaurPreview,
  tags: ["autodocs"],
  args: { seconds: 17 },
  argTypes: {
    seconds: { control: { type: "range", min: 0, max: 76.8, step: 0.1 } },
    quality: { control: "select", options: ["high", "medium", "low"] },
  },
} satisfies Meta<typeof DinosaurPreview>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Present: Story = { args: { seconds: 0 } };
export const AncientForest: Story = {};
export const Chase: Story = { args: { seconds: 33.8 } };
export const Flash: Story = { args: { seconds: 38.42 } };
export const Fallout: Story = { args: { seconds: 55.4 } };
export const Boundary: Story = { args: { seconds: 76.3 } };
export const LowQuality: Story = { args: { seconds: 55.4, quality: "low" } };
export const ReducedMotion: Story = {
  args: { seconds: 38.42, reducedMotion: true },
};
export const Illustration: Story = {
  render: () => ({
    components: { WorldIllustration },
    template: '<WorldIllustration style="width:480px;max-width:100%" />',
  }),
};
