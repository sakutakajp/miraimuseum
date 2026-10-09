import type { Preview } from "@storybook/vue3";
import "../app/assets/css/main.css";
import "../app/assets/css/deep-time.css";
const preview: Preview = {
  globalTypes: {
    locale: {
      description: "表示言語",
      toolbar: {
        icon: "globe",
        items: [
          { value: "ja", title: "日本語" },
          { value: "en", title: "English" },
        ],
        dynamicTitle: true,
      },
    },
  },
  initialGlobals: { locale: "ja" },
  decorators: [
    (story, context) => ({
      components: { story },
      setup() {
        const { setLocale } = useLanguage();
        setLocale(context.globals.locale);
        return {};
      },
      template:
        '<story />',
    }),
  ],
  parameters: {
    layout: "fullscreen",
    controls: { expanded: true },
    options: {
      storySort: { order: ["Babylon"] },
    },
  },
};
export default preview;
