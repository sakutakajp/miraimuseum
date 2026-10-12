import type { Stage } from "./types";
// Verified shots are test data only; the UI never reads them. Angles are clockwise from up.
export const stages: Stage[] = [
  {
    board: {
      width: 360,
      height: 520,
    },
    maxSpeed: 145,
    maxTime: 16,
    id: 1,
    nameKey: "stage1",
    hintKey: "hint1",
    parcelKey: "parcel1",
    launch: {
      x: 180,
      y: 455,
    },
    planets: [],
    obstacles: [],
    destination: {
      x: 180,
      y: 95,
      radius: 38,
    },
    stars: [
      {
        x: 180,
        y: 335,
        radius: 17,
      },
      {
        x: 180,
        y: 210,
        radius: 17,
      },
    ],
    references: {
      delivery: {
        angle: 0,
        speed: 85,
      },
      threeStars: {
        angle: 0,
        speed: 85,
      },
    },
  },
  {
    board: {
      width: 360,
      height: 520,
    },
    maxSpeed: 145,
    maxTime: 16,
    id: 2,
    nameKey: "stage2",
    hintKey: "hint2",
    parcelKey: "parcel2",
    launch: {
      x: 110,
      y: 455,
    },
    planets: [
      {
        x: 230,
        y: 270,
        radius: 33,
        mu: 130000,
        color: 6655487,
      },
    ],
    obstacles: [],
    destination: {
      x: 205,
      y: 110,
      radius: 34,
    },
    stars: [
      {
        x: 117.65198382766931,
        y: 353.27787479200765,
        radius: 19,
      },
      {
        x: 138.29689569002338,
        y: 245.05403649079835,
        radius: 19,
      },
    ],
    references: {
      delivery: {
        angle: 3,
        speed: 67,
      },
      threeStars: {
        angle: 3,
        speed: 67,
      },
    },
  },
  {
    board: {
      width: 360,
      height: 520,
    },
    maxSpeed: 145,
    maxTime: 16,
    id: 3,
    nameKey: "stage3",
    hintKey: "hint3",
    parcelKey: "parcel3",
    launch: {
      x: 170,
      y: 455,
    },
    planets: [
      {
        x: 180,
        y: 280,
        radius: 38,
        mu: 300000,
        color: 10586874,
      },
    ],
    obstacles: [],
    destination: {
      x: 190,
      y: 105,
      radius: 32,
    },
    stars: [
      {
        x: 230.35927987125683,
        y: 370.34230961855496,
        radius: 19,
      },
      {
        x: 253.27508159345587,
        y: 241.72119725925705,
        radius: 19,
      },
    ],
    references: {
      delivery: {
        angle: 41,
        speed: 67,
      },
      threeStars: {
        angle: 41,
        speed: 67,
      },
    },
  },
  {
    board: {
      width: 360,
      height: 520,
    },
    maxSpeed: 145,
    maxTime: 16,
    id: 4,
    nameKey: "stage4",
    hintKey: "hint4",
    parcelKey: "parcel4",
    launch: {
      x: 95,
      y: 455,
    },
    planets: [
      {
        x: 210,
        y: 280,
        radius: 36,
        mu: 180000,
        color: 16753246,
      },
    ],
    obstacles: [],
    destination: {
      x: 190,
      y: 90,
      radius: 35,
    },
    stars: [
      {
        x: 110.4629869575521,
        y: 344.6181192002755,
        radius: 19,
      },
      {
        x: 130.00760483946044,
        y: 258.30512980499714,
        radius: 11,
      },
    ],
    references: {
      delivery: {
        angle: -10,
        speed: 53,
      },
      threeStars: {
        angle: 7,
        speed: 101,
      },
    },
  },
  {
    board: {
      width: 360,
      height: 520,
    },
    maxSpeed: 145,
    maxTime: 16,
    id: 5,
    nameKey: "stage5",
    hintKey: "hint5",
    parcelKey: "parcel5",
    launch: {
      x: 145,
      y: 460,
    },
    planets: [
      {
        x: 225,
        y: 340,
        radius: 29,
        mu: 101500,
        color: 6655487,
      },
      {
        x: 95,
        y: 170,
        radius: 29,
        mu: 101500,
        color: 10586874,
      },
    ],
    obstacles: [],
    destination: {
      x: 195,
      y: 70,
      radius: 33,
    },
    stars: [
      {
        x: 147.25869521087964,
        y: 345.23579318857804,
        radius: 19,
      },
      {
        x: 170.96960736590714,
        y: 230.06663158444746,
        radius: 19,
      },
    ],
    references: {
      delivery: {
        angle: -2,
        speed: 73,
      },
      threeStars: {
        angle: -2,
        speed: 73,
      },
    },
  },
  {
    board: {
      width: 360,
      height: 520,
    },
    maxSpeed: 145,
    maxTime: 16,
    id: 6,
    nameKey: "stage6",
    hintKey: "hint6",
    parcelKey: "parcel6",
    launch: {
      x: 100,
      y: 460,
    },
    planets: [
      {
        x: 200,
        y: 335,
        radius: 31,
        mu: 115500,
        color: 16753246,
      },
      {
        x: 75,
        y: 150,
        radius: 28,
        mu: 94500,
        color: 10586874,
      },
    ],
    obstacles: [
      {
        x: 285,
        y: 205,
        radius: 17,
      },
      {
        x: 45,
        y: 235,
        radius: 13,
      },
    ],
    destination: {
      x: 185,
      y: 65,
      radius: 38,
    },
    stars: [
      {
        x: 132.06672952271157,
        y: 354.7448990941307,
        radius: 11,
      },
      {
        x: 165.26749537100895,
        y: 194.3566822609391,
        radius: 15,
      },
    ],
    references: {
      delivery: {
        angle: -2,
        speed: 55,
      },
      threeStars: {
        angle: 9,
        speed: 111,
      },
    },
  },
];
