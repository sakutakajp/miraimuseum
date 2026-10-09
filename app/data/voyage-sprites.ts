// Original bitmap art: generated shapes are still square pixels.
function bitmap(
  width: number,
  height: number,
  pixel: (x: number, y: number) => string,
) {
  return Array.from({ length: height }, (_, y) =>
    Array.from({ length: width }, (_, x) => pixel(x, y)).join(""),
  );
}
function crew(helmet: string) {
  return [
    ".....oooooo.....",
    "....ohhhhhho....",
    "...ohnttttnho...",
    "...ohnttttnho...",
    "...ohnttttnho...",
    "....ohhhhho.....",
    ".....ooooo......",
    "...oohhhyhhoo...",
    "..obhhhhhhhho...",
    "..obhhhthhhho...",
    "...obhhhhhoo....",
    "....ohhhhho.....",
    "....onnnnnno....",
    "....onnoonno....",
    "....onnoonno....",
    "...ohhh..ohhh...",
    "..ohhhh..ohhhh..",
    "..ooooo..ooooo..",
  ].map((row) => row.replaceAll("h", helmet));
}
export const voyageSprites: Record<string, string[]> = {
  astronaut: crew("w"),
  diver: crew("y"),
  moon: bitmap(18, 18, (x, y) => {
    if (Math.hypot(x - 8.5, y - 8.5) > 8.5) return ".";
    if (Math.hypot(x - 5, y - 6) < 2.5 || Math.hypot(x - 12, y - 12) < 2)
      return "b";
    return x > 12 ? "b" : "c";
  }),
  earth: bitmap(18, 18, (x, y) => {
    if (Math.hypot(x - 8.5, y - 8.5) > 8.5) return ".";
    if ((y === 4 && x > 8) || (y === 12 && x < 7)) return "w";
    if (
      (x > 3 && x < 8 && y > 2 && y < 8) ||
      (x > 9 && x < 14 && y > 9 && y < 16)
    )
      return "l";
    return x > 13 ? "T" : "t";
  }),
  saturn: bitmap(28, 18, (x, y) => {
    const ring = Math.hypot((x - 13.5) / 13.5, (y - 8.5) / 3);
    const disc = Math.hypot(x - 13.5, y - 8.5);
    if (ring > 0.82 && ring < 1.05 && (y > 8 || disc > 7)) return "c";
    if (disc < 7) return y % 4 === 0 ? "b" : "y";
    return ".";
  }),
  comet: [
    "................tt...",
    "............tttttt...",
    ".........ttttwwwtt...",
    "......ttttwwwwtt.....",
    "....ttwwwwwtt........",
    "..ttwwwwtt...........",
    ".ttwwwtt.............",
    "ttwwwt...............",
    "twwwtt...............",
    ".tttt................",
  ],
  nebula: bitmap(24, 18, (x, y) => {
    const cloud = Math.sin(x * 0.7) * 1.4 + Math.cos(y * 0.8) * 1.2;
    if (Math.hypot((x - 11) / 1.4, y - 8) > 7 + cloud) return ".";
    if ((x === 8 && y === 7) || (x === 17 && y === 11)) return "w";
    return x > 13 ? "t" : (x + y) % 5 < 2 ? "v" : "p";
  }),
  blackhole: bitmap(26, 20, (x, y) => {
    const distance = Math.hypot((x - 12.5) / 1.2, y - 9.5);
    if (distance < 6) return "n";
    if (distance < 8) return y > 9 ? "Y" : "y";
    if (Math.abs(y - 10) < 1.5 && x > 0 && x < 25) return "c";
    return ".";
  }),
  coral: [
    "...rr.......rr..",
    "...RR...rr..RR..",
    ".rrRR...RR..RR..",
    ".RRRR...RRrrRR..",
    "...RRrrrRRRRR...",
    "...RRRRRRRR.....",
    ".......RR.......",
    "..rr...RR...rr..",
    "..RR...RR...RR..",
    "..RRrrrRRrrrRR..",
    "...RRRRRRRRRR...",
    ".......RR.......",
    "......RRRR......",
    ".....BBBBBB.....",
  ],
  jellyfish: [
    ".....pppppp.....",
    "...ppvvvvvvpp...",
    "..ppvvwvvwvvpp..",
    ".ppvvvvvvvvvvpp.",
    ".pvvvvvvvvvvvvp.",
    "ppvvvvvvvvvvvvpp",
    "pppppppppppppppp",
    "..p..p..p..p....",
    "..p..p..p..p....",
    "...p.p...p.p....",
    "...p..p..p..p...",
    "..p...p.p...p...",
    "..p....p....p...",
    "...p........p...",
  ],
  turtle: [
    "....GG......GG......",
    "...GllG....GllG.....",
    "....GG.GGGG.GG......",
    ".....GGllllGG.......",
    "....GllGllGllG......",
    "..GGGlllGGlllGGG....",
    ".GllGlllGGlllGlwwG..",
    ".GllGllGllGllGloooG.",
    "..GGGllllllllGllG...",
    "....GGllllllGG......",
    ".....GGGGGGGG.......",
    "....GG......GG......",
    "...GllG....GllG.....",
    "....GG......GG......",
  ],
  anglerfish: [
    "..........www.........",
    ".........wwwww........",
    ".........owwwo........",
    ".........o............",
    "....oooo.o............",
    "...onNnnoo............",
    "..onNNNnnno.......oo..",
    ".onNNwwNNnno.....onno.",
    "onNNNwoNNnnno..oonnno.",
    "onNNNNNNNnnnnoonnnno..",
    ".onNNNNNwNNnnnnnnno...",
    "..onnwNwNwnnnoooo.....",
    "...ooooooooo..........",
  ],
  vent: [
    ".....cc...cc......",
    "....cc...cc.......",
    ".....cc...cc......",
    "....cc..cc........",
    "......BBBB........",
    ".....BbBBB........",
    "....BbbBBB........",
    "....BbbBBB........",
    "....BbbBBB........",
    "...BbbbBBBB.......",
    "..BbbbbBBBBB......",
    ".BbbbbbBBBBBB.....",
    "BBBBBBBBBBBBBB....",
  ],
  whale: [
    "......oooooooooo................",
    "....oonnnnnnnnnnooo.............",
    "...onnNNNNNNNNNNnnnoo...........",
    "..onnNNNNNNNNNNNNNnnnoo.........",
    ".onnNwNNNNNNNNNNNNNNnnnoo.......",
    "onnNNwoNNNNNNNNNNNNNNnnnnoo.....",
    "onnNNNNNNNNNNNNNNNNNNNNnnnnoo...",
    "onnNNNNNNNNNNNNNNNNNNNNNnnnnno..",
    "onnNNNNNNNNNNNNNNNNNNNNNnnnnnno.",
    "onnnnnnnnnnNNNNNNNNNNNNnnnnnnnoo",
    ".onnnnnnnnnnnnNNNNNNNnnnnnnnoonno",
    "..ooooooooonnnnnnnnnnnnnnoo.oonno",
    ".........onnnnooooooooooo....onno",
    "..........onnno..............ooo",
    "...........ooo..................",
  ],
};
