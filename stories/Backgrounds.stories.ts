import type { Meta, StoryObj } from "@storybook-vue/nuxt";
import DinosaurPreview from "./DinosaurPreview.vue";
import WorldIllustration from "../app/components/WorldIllustration.vue";
import SpacePreview from "./SpacePreview.vue";
const meta = {
  title: "Backgrounds/Dinosaur",
  component: DinosaurPreview,
  tags: ["autodocs"],
  args: { distance: 2200 },
  argTypes: {
    distance: { control: { type: "range", min: 0, max: 5800, step: 50 } },
  },
} satisfies Meta<typeof DinosaurPreview>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Present: Story = { args: { distance: 0 } };
export const AncientForest: Story = {};
export const Chase: Story = { args: { distance: 4500 } };
export const Illustration: Story = {
  render: () => ({
    components: { WorldIllustration },
    template: '<WorldIllustration style="width:480px;max-width:100%" />',
  }),
};
export const Starfield: Story = {
  render: () => ({
    components: { SpacePreview },
    template: '<SpacePreview mode="background" />',
  }),
};
