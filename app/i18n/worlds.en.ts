import type { WorldId } from '../data/worlds';
export const worldEnglish: Record<WorldId, {
  name: string; subtitle: string; room: string; action: string; phases: Record<string, string>;
}> = {
  dinosaur: {
    name: 'Dinosaur World', subtitle: 'Step beyond the fossils.', room: 'Dinosaurs & Earth', action: 'jump',
    phases: { present: 'Where fossils sleep', rewind: 'Back through time', past: 'Cretaceous forest', chase: 'A big encounter', ending: 'Discoveries for the future' },
  },
  space: {
    name: 'Space World', subtitle: 'Launch into a sea of stars.', room: 'Stars & Space', action: 'boost',
    phases: { start: 'Leaving the Moon', middle: 'A path among planets', deep: 'Where stars are born', encounter: 'Black hole', ending: 'Bring the stars to the museum' },
  },
  ocean: {
    name: 'Ocean & Deep Sea', subtitle: 'Dive beyond the blue.', room: 'Ocean & Life', action: 'swim',
    phases: { start: 'The sunlit sea', middle: 'An ocean journey', deep: 'Beyond the sunlight', encounter: 'A great whale', ending: 'Bring the ocean to the museum' },
  },
};
