import type { StorybookConfig } from "@storybook-vue/nuxt";
const config: StorybookConfig = {
  stories: ["../stories/**/*.stories.ts"],
  addons: ["@storybook/addon-docs"],
  framework: { name: "@storybook-vue/nuxt", options: {} },
  staticDirs: ["../public"],
};
export default config;
