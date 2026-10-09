import type { DiscoveryId } from '../data/discoveries';
export interface DiscoveryTranslation {
  name: string;
  category: string;
  facts: readonly [string, string, string];
  detail: string;
}
export const discoveryEnglish: Record<DiscoveryId, DiscoveryTranslation> = {
  strata: {
    name: 'Rock layers', category: "Earth's records",
    facts: ['The stripes in the ground record a long history.', 'Sand and mud pile up to form rock layers.', 'Unless the layers have been overturned, the lower ones are older.'],
    detail: 'Layers formed by sand, mud, and other materials piling up. Fossils preserved in them help us learn about ancient life and environments.',
  },
  ammonite: {
    name: 'Ammonite', category: 'Fossils of the sea',
    facts: ['An ancient sea animal with a spiral shell.', 'Ammonites were relatives of squid and octopuses.', 'They lived in the seas during the age of dinosaurs, too.'],
    detail: 'An extinct animal with a spiral shell. Different species had different shell shapes. Their fossils can help us work out the ages of rock layers.',
  },
  fossil: {
    name: 'Tyrannosaurus fossil', category: 'A doorway to the past',
    facts: ['Fossils are clues left behind by ancient life.', 'Footprints can become fossils, too—not just bones.', 'Studying fossils helps us discover what ancient animals looked like.'],
    detail: 'Fossils preserve the remains or traces of ancient life, including bodies and footprints. Scientists study fossil Tyrannosaurus bones to understand its shape and how it moved.',
  },
  fern: {
    name: 'Fern', category: 'A world of green',
    facts: ['Ferns are plants that do not grow flowers.', 'They reproduce using spores instead of seeds.', 'Relatives of ferns grew during the age of dinosaurs.'],
    detail: 'Ferns grow without flowers or seeds and reproduce using spores. Look under a leaf: some species have groups of tiny sacs that produce spores.',
  },
  triceratops: {
    name: 'Triceratops', category: 'Cretaceous companions',
    facts: ['A plant-eating dinosaur with three horns.', 'It had a large frill behind its head.', 'It lived at the same time as Tyrannosaurus.'],
    detail: 'A dinosaur that lived in North America about 68–66 million years ago. Scientists think it used its beak-like mouth to eat plants.',
  },
  rex: {
    name: 'Tyrannosaurus', category: 'A big encounter',
    facts: ['A meat-eating dinosaur with large, strong teeth.', 'Scientists think it had a well-developed sense of smell.', 'It lived about 68–66 million years ago.'],
    detail: 'A meat-eating dinosaur that lived in North America near the end of the Cretaceous period. Its long tail helped it balance as it walked on two hind legs.',
  },
  moon: {
    name: 'Moon', category: "Earth's neighbor",
    facts: ["The Moon's gravity is about one-sixth of Earth's.", 'The Moon reflects sunlight instead of making its own light.', 'The surface of the Moon has many craters.'],
    detail: 'A celestial body that orbits Earth. It has almost no air, and impacts from rocks have left craters on its surface. Its shape seems to change because we see different portions of its sunlit side.',
  },
  earth: {
    name: 'Earth', category: 'Our home planet',
    facts: ["About 70% of Earth's surface is ocean.", 'Earth takes about one year to orbit the Sun.', 'Air and liquid water support life on Earth.'],
    detail: 'The planet we call home. From space, you can see blue oceans and white clouds. Earth spins to give us day and night while also traveling around the Sun.',
  },
  saturn: {
    name: 'Saturn', category: 'The ringed planet',
    facts: ["Saturn's rings are made of tiny pieces of ice and rock.", 'Saturn is made mostly of hydrogen and helium.', 'Saturn has many moons.'],
    detail: 'The sixth planet from the Sun. Its great rings are made of many tiny particles, not one solid sheet. It has no solid ground like Earth.',
  },
  comet: {
    name: 'Comet', category: 'A traveler in space',
    facts: ['Comets contain ice and dust.', 'Near the Sun, a comet develops a tail of gas and dust.', "A comet's tail points mostly away from the Sun."],
    detail: 'An icy, dusty body that travels around the Sun. As it warms near the Sun, gas and dust escape and may form a bright head and a long tail. It is different from a shooting star.',
  },
  nebula: {
    name: 'Nebula', category: 'A cradle for stars',
    facts: ['A nebula is a cloud of gas and dust in space.', 'New stars can be born inside nebulae.', 'Some nebulae are left behind when stars reach the end of their lives.'],
    detail: 'A cloud of gas and dust spread through space. In some places, gravity pulls gas together to form new stars. Not every nebula is forming stars.',
  },
  blackhole: {
    name: 'Black hole', category: 'A big encounter',
    facts: ['A place where gravity is so strong that even light cannot escape.', 'Some form when very massive stars reach the end of their lives.', 'They do not suck in everything far away.'],
    detail: 'Inside a certain boundary, gravity is so strong that even light cannot escape. Scientists learn about black holes by studying light from nearby gas and the motion of surrounding stars. On our adventure, we observe from a safe distance.',
  },
  coral: {
    name: 'Coral', category: 'Tiny ocean builders',
    facts: ['Corals are animals, not plants.', 'Some species live together as groups of tiny bodies.', 'Coral reefs provide homes for many kinds of life.'],
    detail: 'Animals related to sea anemones. Corals that build hard skeletons can grow together over a long time to form reefs, where many fish and other creatures live.',
  },
  jellyfish: {
    name: 'Jellyfish', category: 'Drifting life',
    facts: ["Most of a jellyfish's body is water.", 'It swims by moving its bell.', 'Its tentacles have a way to catch tiny prey.'],
    detail: 'Soft-bodied relatives of corals and sea anemones. They swim by squeezing their bells to push out water. Different species have different shapes and lifestyles, and some are venomous.',
  },
  turtle: {
    name: 'Sea turtle', category: 'Ocean-going reptiles',
    facts: ['Sea turtles breathe air using lungs.', 'They come onto sandy beaches to lay eggs.', 'Some sea turtles travel very long distances.'],
    detail: 'Reptiles that live in the sea. Their flipper-like limbs help them swim, but they have no gills like fish and must surface to breathe. Females lay eggs on sandy beaches.',
  },
  anglerfish: {
    name: 'Deep-sea anglerfish', category: 'A light in the deep',
    facts: ['Females have a glowing lure on their heads.', 'They live together with bacteria that produce light.', 'Scientists think the light lures prey closer.'],
    detail: 'Fish that live in deep water beyond the reach of sunlight. Females have an organ on their heads containing light-producing bacteria. Scientists think this light attracts prey in the dark ocean.',
  },
  vent: {
    name: 'Hydrothermal vent', category: 'A warm seafloor spring',
    facts: ['A place where hot water flows out of the seafloor.', 'Some microbes make nutrients without sunlight.', 'Other creatures depend on these microbes to live.'],
    detail: "Water seeps into the seafloor, is heated by Earth's interior, and flows back out. Microbes get energy from chemicals in this water. Clams, shrimp, and other animals can gather around these places.",
  },
  whale: {
    name: 'Sperm whale', category: 'A big encounter',
    facts: ['Sperm whales are mammals that dive deep into the sea.', 'They breathe with lungs and return to the surface for air.', 'They use echoes to search for prey.'],
    detail: 'A toothed whale with a large head. It dives deep to look for squid and other prey, then returns to the surface to breathe air. Like us, it is a mammal: it gives birth to young and feeds them milk.',
  },
};
