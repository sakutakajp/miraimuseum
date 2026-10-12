import type { Meta, StoryObj } from '@storybook/vue3';
import FloatingEarthExperience from '../app/components/landing/FloatingEarthExperience.vue';
const meta = { title: 'Babylon / Home', component: FloatingEarthExperience, parameters: { layout: 'fullscreen' } } satisfies Meta<typeof FloatingEarthExperience>;
export default meta;
export const Home: StoryObj<typeof meta> = {};
