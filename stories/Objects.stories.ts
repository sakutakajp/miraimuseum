import type { Meta, StoryObj } from "@storybook-vue/nuxt";
import SpacePreview from "./SpacePreview.vue";
import PixelSprite from "../app/components/PixelSprite.vue";
import { sprites } from "../app/data/sprites";
const meta = {
  title: "Objects/Space",
  component: SpacePreview,
  tags: ["autodocs"],
  args: { mode: "object", kind: "enemy", animate: true },
  argTypes: {
    kind: { control: "select", options: ["enemy", "rock", "item"] },
    mode: { table: { disable: true } },
  },
} satisfies Meta<typeof SpacePreview>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Enemy: Story = {};
export const Asteroid: Story = { args: { kind: "rock" } };
export const Item: Story = { args: { kind: "item" } };
export const PixelObjects: Story = {
  render: () => ({
    components: { PixelSprite },
    setup() {
      return {
        names: Object.keys(sprites).filter(
          (n) => !["player", "robot", "rex", "triceratops"].includes(n),
        ),
      };
    },
    template:
      '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:20px"><figure v-for="name in names" :key="name" style="margin:0;text-align:center"><PixelSprite :name="name" :label="name" style="width:100px;height:100px"/><figcaption>{{name}}</figcaption></figure></div>',
  }),
};
