// AUTO-GENERATED from src/components/games/slots/themed/themes{,.extra}.ts.
// Do NOT edit by hand. Re-run /tmp/extract-themes.mjs and overwrite.
//
// Each entry mirrors the *math* of one client themed slot: symbol id, pick
// weight, 3/4/5-of-a-kind payout (× per-line bet), wild id and jackpot id.
// The painter functions live only on the client.

export interface ServerThemeSym {
  id: string;
  weight: number;
  pays: [number, number, number];
  premium?: boolean;
}

export interface ServerTheme {
  id: string;
  wildId: string | null;
  jackpotId: string;
  symbols: ServerThemeSym[];
}

export const SERVER_THEMES: Record<string, ServerTheme> = {
  "buffalo-king": {
    "id": "buffalo-king",
    "jackpotId": "buffalo",
    "wildId": "buffalo",
    "symbols": [
      {
        "id": "card-10",
        "weight": 26,
        "pays": [
          1.5,
          4,
          10
        ]
      },
      {
        "id": "card-j",
        "weight": 24,
        "pays": [
          2,
          5,
          12
        ]
      },
      {
        "id": "card-q",
        "weight": 22,
        "pays": [
          2,
          6,
          15
        ]
      },
      {
        "id": "card-k",
        "weight": 20,
        "pays": [
          2.5,
          8,
          18
        ]
      },
      {
        "id": "card-a",
        "weight": 18,
        "pays": [
          3,
          10,
          22
        ]
      },
      {
        "id": "eagle",
        "weight": 12,
        "pays": [
          5,
          15,
          35
        ]
      },
      {
        "id": "wolf",
        "weight": 10,
        "pays": [
          6,
          18,
          45
        ]
      },
      {
        "id": "bear",
        "weight": 8,
        "pays": [
          8,
          25,
          60
        ],
        "premium": true
      },
      {
        "id": "buffalo",
        "weight": 5,
        "pays": [
          25,
          80,
          250
        ],
        "premium": true
      }
    ]
  },
  "dog-house": {
    "id": "dog-house",
    "jackpotId": "doghouse",
    "wildId": "dalmatian",
    "symbols": [
      {
        "id": "card-10",
        "weight": 26,
        "pays": [
          1.5,
          4,
          10
        ]
      },
      {
        "id": "card-j",
        "weight": 24,
        "pays": [
          2,
          5,
          12
        ]
      },
      {
        "id": "card-q",
        "weight": 22,
        "pays": [
          2,
          6,
          15
        ]
      },
      {
        "id": "card-k",
        "weight": 20,
        "pays": [
          2.5,
          8,
          18
        ]
      },
      {
        "id": "card-a",
        "weight": 18,
        "pays": [
          3,
          10,
          22
        ]
      },
      {
        "id": "collar",
        "weight": 12,
        "pays": [
          5,
          15,
          35
        ]
      },
      {
        "id": "bone",
        "weight": 10,
        "pays": [
          6,
          18,
          45
        ]
      },
      {
        "id": "puppy",
        "weight": 8,
        "pays": [
          8,
          25,
          60
        ],
        "premium": true
      },
      {
        "id": "dalmatian",
        "weight": 5,
        "pays": [
          20,
          60,
          200
        ],
        "premium": true
      },
      {
        "id": "doghouse",
        "weight": 4,
        "pays": [
          25,
          80,
          250
        ],
        "premium": true
      }
    ]
  },
  "fire-portals": {
    "id": "fire-portals",
    "jackpotId": "phoenix",
    "wildId": "flame",
    "symbols": [
      {
        "id": "card-10",
        "weight": 26,
        "pays": [
          1.5,
          4,
          10
        ]
      },
      {
        "id": "card-j",
        "weight": 24,
        "pays": [
          2,
          5,
          12
        ]
      },
      {
        "id": "card-q",
        "weight": 22,
        "pays": [
          2,
          6,
          15
        ]
      },
      {
        "id": "card-k",
        "weight": 20,
        "pays": [
          2.5,
          8,
          18
        ]
      },
      {
        "id": "card-a",
        "weight": 18,
        "pays": [
          3,
          10,
          22
        ]
      },
      {
        "id": "ember",
        "weight": 12,
        "pays": [
          5,
          15,
          35
        ]
      },
      {
        "id": "skull",
        "weight": 10,
        "pays": [
          6,
          18,
          45
        ]
      },
      {
        "id": "flame",
        "weight": 6,
        "pays": [
          12,
          30,
          90
        ],
        "premium": true
      },
      {
        "id": "phoenix",
        "weight": 4,
        "pays": [
          30,
          100,
          300
        ],
        "premium": true
      }
    ]
  },
  "fruit-party": {
    "id": "fruit-party",
    "jackpotId": "pineapple",
    "wildId": null,
    "symbols": [
      {
        "id": "cherry",
        "weight": 24,
        "pays": [
          2,
          5,
          12
        ]
      },
      {
        "id": "lemon",
        "weight": 22,
        "pays": [
          2,
          6,
          14
        ]
      },
      {
        "id": "orange",
        "weight": 20,
        "pays": [
          2.5,
          8,
          18
        ]
      },
      {
        "id": "plum",
        "weight": 18,
        "pays": [
          3,
          10,
          22
        ]
      },
      {
        "id": "watermelon",
        "weight": 14,
        "pays": [
          4,
          14,
          32
        ]
      },
      {
        "id": "grape",
        "weight": 12,
        "pays": [
          5,
          16,
          38
        ]
      },
      {
        "id": "strawberry",
        "weight": 10,
        "pays": [
          7,
          22,
          55
        ],
        "premium": true
      },
      {
        "id": "pineapple",
        "weight": 4,
        "pays": [
          25,
          80,
          250
        ],
        "premium": true
      }
    ]
  },
  "starlight": {
    "id": "starlight",
    "jackpotId": "crown",
    "wildId": "star",
    "symbols": [
      {
        "id": "gem-blue",
        "weight": 24,
        "pays": [
          1.5,
          4,
          10
        ]
      },
      {
        "id": "gem-purple",
        "weight": 22,
        "pays": [
          2,
          5,
          12
        ]
      },
      {
        "id": "gem-pink",
        "weight": 20,
        "pays": [
          2,
          6,
          15
        ]
      },
      {
        "id": "gem-green",
        "weight": 18,
        "pays": [
          2.5,
          8,
          18
        ]
      },
      {
        "id": "gem-orange",
        "weight": 14,
        "pays": [
          4,
          12,
          28
        ]
      },
      {
        "id": "gem-red",
        "weight": 12,
        "pays": [
          5,
          16,
          40
        ],
        "premium": true
      },
      {
        "id": "star",
        "weight": 8,
        "pays": [
          10,
          30,
          100
        ],
        "premium": true
      },
      {
        "id": "crown",
        "weight": 4,
        "pays": [
          30,
          100,
          300
        ],
        "premium": true
      }
    ]
  },
  "sugar-rush": {
    "id": "sugar-rush",
    "jackpotId": "lollipop",
    "wildId": null,
    "symbols": [
      {
        "id": "pink-bean",
        "weight": 24,
        "pays": [
          1.5,
          4,
          10
        ]
      },
      {
        "id": "blue-square",
        "weight": 22,
        "pays": [
          2,
          5,
          12
        ]
      },
      {
        "id": "green-square",
        "weight": 20,
        "pays": [
          2,
          6,
          15
        ]
      },
      {
        "id": "purple-heart",
        "weight": 18,
        "pays": [
          2.5,
          8,
          18
        ]
      },
      {
        "id": "donut",
        "weight": 14,
        "pays": [
          4,
          12,
          28
        ]
      },
      {
        "id": "cupcake",
        "weight": 12,
        "pays": [
          5,
          16,
          40
        ],
        "premium": true
      },
      {
        "id": "lollipop",
        "weight": 4,
        "pays": [
          30,
          100,
          300
        ],
        "premium": true
      }
    ]
  },
  "wild-west-gold": {
    "id": "wild-west-gold",
    "jackpotId": "sheriff",
    "wildId": "pistol",
    "symbols": [
      {
        "id": "card-10",
        "weight": 26,
        "pays": [
          1.5,
          4,
          10
        ]
      },
      {
        "id": "card-j",
        "weight": 24,
        "pays": [
          2,
          5,
          12
        ]
      },
      {
        "id": "card-q",
        "weight": 22,
        "pays": [
          2,
          6,
          15
        ]
      },
      {
        "id": "card-k",
        "weight": 20,
        "pays": [
          2.5,
          8,
          18
        ]
      },
      {
        "id": "card-a",
        "weight": 18,
        "pays": [
          3,
          10,
          22
        ]
      },
      {
        "id": "horseshoe",
        "weight": 12,
        "pays": [
          5,
          15,
          35
        ]
      },
      {
        "id": "whisky",
        "weight": 10,
        "pays": [
          6,
          18,
          45
        ]
      },
      {
        "id": "pistol",
        "weight": 6,
        "pays": [
          12,
          35,
          100
        ],
        "premium": true
      },
      {
        "id": "sheriff",
        "weight": 4,
        "pays": [
          30,
          100,
          300
        ],
        "premium": true
      }
    ]
  },
  "zeus-vs-hades": {
    "id": "zeus-vs-hades",
    "jackpotId": "zeus",
    "wildId": "lightning",
    "symbols": [
      {
        "id": "card-10",
        "weight": 26,
        "pays": [
          1.5,
          4,
          10
        ]
      },
      {
        "id": "card-j",
        "weight": 24,
        "pays": [
          2,
          5,
          12
        ]
      },
      {
        "id": "card-q",
        "weight": 22,
        "pays": [
          2,
          6,
          15
        ]
      },
      {
        "id": "card-k",
        "weight": 20,
        "pays": [
          2.5,
          8,
          18
        ]
      },
      {
        "id": "card-a",
        "weight": 18,
        "pays": [
          3,
          10,
          22
        ]
      },
      {
        "id": "helmet",
        "weight": 12,
        "pays": [
          5,
          15,
          35
        ]
      },
      {
        "id": "cerberus",
        "weight": 10,
        "pays": [
          6,
          18,
          45
        ]
      },
      {
        "id": "lightning",
        "weight": 6,
        "pays": [
          12,
          35,
          100
        ],
        "premium": true
      },
      {
        "id": "zeus",
        "weight": 4,
        "pays": [
          35,
          120,
          400
        ],
        "premium": true
      }
    ]
  },
  "book-dead": {
    "id": "book-dead",
    "jackpotId": "pharaoh",
    "wildId": "book",
    "symbols": [
      {
        "id": "card-a",
        "weight": 18,
        "pays": [
          3,
          10,
          22
        ]
      },
      {
        "id": "card-k",
        "weight": 20,
        "pays": [
          2.5,
          8,
          18
        ]
      },
      {
        "id": "card-q",
        "weight": 22,
        "pays": [
          2,
          6,
          15
        ]
      },
      {
        "id": "card-j",
        "weight": 24,
        "pays": [
          2,
          5,
          12
        ]
      },
      {
        "id": "card-10",
        "weight": 26,
        "pays": [
          1.5,
          4,
          10
        ]
      },
      {
        "id": "ankh",
        "weight": 12,
        "pays": [
          5,
          15,
          35
        ]
      },
      {
        "id": "scarab",
        "weight": 10,
        "pays": [
          6,
          18,
          45
        ]
      },
      {
        "id": "adventurer",
        "weight": 8,
        "pays": [
          8,
          25,
          60
        ],
        "premium": true
      },
      {
        "id": "book",
        "weight": 6,
        "pays": [
          10,
          30,
          100
        ],
        "premium": true
      },
      {
        "id": "pharaoh",
        "weight": 4,
        "pays": [
          30,
          100,
          300
        ],
        "premium": true
      }
    ]
  },
  "reactoonz": {
    "id": "reactoonz",
    "jackpotId": "gargantoon",
    "wildId": null,
    "symbols": [
      {
        "id": "one-eye-pink",
        "weight": 24,
        "pays": [
          1.5,
          4,
          10
        ]
      },
      {
        "id": "two-eye-blue",
        "weight": 22,
        "pays": [
          2,
          5,
          12
        ]
      },
      {
        "id": "three-eye-yellow",
        "weight": 20,
        "pays": [
          2,
          6,
          15
        ]
      },
      {
        "id": "four-eye-green",
        "weight": 18,
        "pays": [
          2.5,
          8,
          18
        ]
      },
      {
        "id": "gem-toon-blue",
        "weight": 14,
        "pays": [
          4,
          12,
          28
        ]
      },
      {
        "id": "gem-toon-pink",
        "weight": 12,
        "pays": [
          5,
          15,
          35
        ],
        "premium": true
      },
      {
        "id": "wild-toon",
        "weight": 6,
        "pays": [
          10,
          30,
          100
        ],
        "premium": true
      },
      {
        "id": "gargantoon",
        "weight": 4,
        "pays": [
          25,
          80,
          250
        ],
        "premium": true
      }
    ]
  },
  "starburst": {
    "id": "starburst",
    "jackpotId": "starburst",
    "wildId": "free",
    "symbols": [
      {
        "id": "gem-blue",
        "weight": 24,
        "pays": [
          1.5,
          4,
          10
        ]
      },
      {
        "id": "gem-purple",
        "weight": 22,
        "pays": [
          2,
          5,
          12
        ]
      },
      {
        "id": "gem-yellow",
        "weight": 20,
        "pays": [
          2,
          6,
          15
        ]
      },
      {
        "id": "gem-green",
        "weight": 18,
        "pays": [
          2.5,
          8,
          18
        ]
      },
      {
        "id": "gem-orange",
        "weight": 14,
        "pays": [
          4,
          12,
          28
        ]
      },
      {
        "id": "lucky-7",
        "weight": 8,
        "pays": [
          6,
          20,
          50
        ],
        "premium": true
      },
      {
        "id": "bar",
        "weight": 6,
        "pays": [
          10,
          30,
          80
        ],
        "premium": true
      },
      {
        "id": "starburst",
        "weight": 4,
        "pays": [
          25,
          80,
          250
        ],
        "premium": true
      }
    ]
  },
  "gonzo-quest": {
    "id": "gonzo-quest",
    "jackpotId": "eldorado",
    "wildId": "free",
    "symbols": [
      {
        "id": "azul",
        "weight": 24,
        "pays": [
          1.5,
          4,
          10
        ]
      },
      {
        "id": "rose",
        "weight": 22,
        "pays": [
          2,
          5,
          12
        ]
      },
      {
        "id": "amarillo",
        "weight": 20,
        "pays": [
          2,
          6,
          15
        ]
      },
      {
        "id": "verde",
        "weight": 18,
        "pays": [
          2.5,
          8,
          18
        ]
      },
      {
        "id": "snake",
        "weight": 14,
        "pays": [
          4,
          12,
          28
        ]
      },
      {
        "id": "free",
        "weight": 6,
        "pays": [
          8,
          25,
          80
        ],
        "premium": true
      },
      {
        "id": "eldorado",
        "weight": 4,
        "pays": [
          30,
          100,
          300
        ],
        "premium": true
      }
    ]
  },
  "dead-or-alive": {
    "id": "dead-or-alive",
    "jackpotId": "wanted",
    "wildId": "sheriff-star",
    "symbols": [
      {
        "id": "card-a",
        "weight": 18,
        "pays": [
          3,
          10,
          22
        ]
      },
      {
        "id": "card-k",
        "weight": 20,
        "pays": [
          2.5,
          8,
          18
        ]
      },
      {
        "id": "card-q",
        "weight": 22,
        "pays": [
          2,
          6,
          15
        ]
      },
      {
        "id": "card-j",
        "weight": 24,
        "pays": [
          2,
          5,
          12
        ]
      },
      {
        "id": "card-10",
        "weight": 26,
        "pays": [
          1.5,
          4,
          10
        ]
      },
      {
        "id": "whisky",
        "weight": 12,
        "pays": [
          5,
          15,
          35
        ]
      },
      {
        "id": "cactus",
        "weight": 10,
        "pays": [
          6,
          18,
          45
        ]
      },
      {
        "id": "sheriff-star",
        "weight": 6,
        "pays": [
          12,
          35,
          100
        ],
        "premium": true
      },
      {
        "id": "wanted",
        "weight": 4,
        "pays": [
          30,
          100,
          300
        ],
        "premium": true
      }
    ]
  },
  "money-train": {
    "id": "money-train",
    "jackpotId": "train",
    "wildId": "dynamite",
    "symbols": [
      {
        "id": "card-a",
        "weight": 18,
        "pays": [
          3,
          10,
          22
        ]
      },
      {
        "id": "card-k",
        "weight": 20,
        "pays": [
          2.5,
          8,
          18
        ]
      },
      {
        "id": "card-q",
        "weight": 22,
        "pays": [
          2,
          6,
          15
        ]
      },
      {
        "id": "card-j",
        "weight": 24,
        "pays": [
          2,
          5,
          12
        ]
      },
      {
        "id": "card-10",
        "weight": 26,
        "pays": [
          1.5,
          4,
          10
        ]
      },
      {
        "id": "safe",
        "weight": 12,
        "pays": [
          5,
          15,
          35
        ]
      },
      {
        "id": "gold-bag",
        "weight": 10,
        "pays": [
          6,
          18,
          45
        ]
      },
      {
        "id": "dynamite",
        "weight": 6,
        "pays": [
          12,
          35,
          100
        ],
        "premium": true
      },
      {
        "id": "train",
        "weight": 4,
        "pays": [
          30,
          100,
          300
        ],
        "premium": true
      }
    ]
  },
  "wanted-dead": {
    "id": "wanted-dead",
    "jackpotId": "gunslinger",
    "wildId": "revolver",
    "symbols": [
      {
        "id": "card-a",
        "weight": 18,
        "pays": [
          3,
          10,
          22
        ]
      },
      {
        "id": "card-k",
        "weight": 20,
        "pays": [
          2.5,
          8,
          18
        ]
      },
      {
        "id": "card-q",
        "weight": 22,
        "pays": [
          2,
          6,
          15
        ]
      },
      {
        "id": "card-j",
        "weight": 24,
        "pays": [
          2,
          5,
          12
        ]
      },
      {
        "id": "card-10",
        "weight": 26,
        "pays": [
          1.5,
          4,
          10
        ]
      },
      {
        "id": "horseshoe",
        "weight": 12,
        "pays": [
          5,
          15,
          35
        ]
      },
      {
        "id": "sherrif-badge",
        "weight": 10,
        "pays": [
          6,
          18,
          45
        ]
      },
      {
        "id": "revolver",
        "weight": 6,
        "pays": [
          12,
          35,
          100
        ],
        "premium": true
      },
      {
        "id": "gunslinger",
        "weight": 4,
        "pays": [
          30,
          100,
          300
        ],
        "premium": true
      }
    ]
  },
  "mental": {
    "id": "mental",
    "jackpotId": "doctor",
    "wildId": "lightning",
    "symbols": [
      {
        "id": "card-a",
        "weight": 18,
        "pays": [
          3,
          10,
          22
        ]
      },
      {
        "id": "card-k",
        "weight": 20,
        "pays": [
          2.5,
          8,
          18
        ]
      },
      {
        "id": "card-q",
        "weight": 22,
        "pays": [
          2,
          6,
          15
        ]
      },
      {
        "id": "card-j",
        "weight": 24,
        "pays": [
          2,
          5,
          12
        ]
      },
      {
        "id": "card-10",
        "weight": 26,
        "pays": [
          1.5,
          4,
          10
        ]
      },
      {
        "id": "pills",
        "weight": 12,
        "pays": [
          5,
          15,
          35
        ]
      },
      {
        "id": "syringe",
        "weight": 10,
        "pays": [
          6,
          18,
          45
        ]
      },
      {
        "id": "lightning",
        "weight": 6,
        "pays": [
          12,
          35,
          100
        ],
        "premium": true
      },
      {
        "id": "doctor",
        "weight": 4,
        "pays": [
          30,
          100,
          300
        ],
        "premium": true
      }
    ]
  },
  "tombstone": {
    "id": "tombstone",
    "jackpotId": "tombstone",
    "wildId": "revolver",
    "symbols": [
      {
        "id": "card-a",
        "weight": 18,
        "pays": [
          3,
          10,
          22
        ]
      },
      {
        "id": "card-k",
        "weight": 20,
        "pays": [
          2.5,
          8,
          18
        ]
      },
      {
        "id": "card-q",
        "weight": 22,
        "pays": [
          2,
          6,
          15
        ]
      },
      {
        "id": "card-j",
        "weight": 24,
        "pays": [
          2,
          5,
          12
        ]
      },
      {
        "id": "card-10",
        "weight": 26,
        "pays": [
          1.5,
          4,
          10
        ]
      },
      {
        "id": "cactus",
        "weight": 12,
        "pays": [
          5,
          15,
          35
        ]
      },
      {
        "id": "skull",
        "weight": 10,
        "pays": [
          6,
          18,
          45
        ]
      },
      {
        "id": "revolver",
        "weight": 6,
        "pays": [
          12,
          35,
          100
        ],
        "premium": true
      },
      {
        "id": "tombstone",
        "weight": 4,
        "pays": [
          30,
          100,
          300
        ],
        "premium": true
      }
    ]
  },
  "the-dog-house-megaways": {
    "id": "the-dog-house-megaways",
    "jackpotId": "doghouse",
    "wildId": "dalmatian",
    "symbols": [
      {
        "id": "card-a",
        "weight": 18,
        "pays": [
          3,
          10,
          22
        ]
      },
      {
        "id": "card-k",
        "weight": 20,
        "pays": [
          2.5,
          8,
          18
        ]
      },
      {
        "id": "card-q",
        "weight": 22,
        "pays": [
          2,
          6,
          15
        ]
      },
      {
        "id": "card-j",
        "weight": 24,
        "pays": [
          2,
          5,
          12
        ]
      },
      {
        "id": "card-10",
        "weight": 26,
        "pays": [
          1.5,
          4,
          10
        ]
      },
      {
        "id": "bone",
        "weight": 12,
        "pays": [
          5,
          15,
          35
        ]
      },
      {
        "id": "collar",
        "weight": 10,
        "pays": [
          6,
          18,
          45
        ]
      },
      {
        "id": "dalmatian",
        "weight": 6,
        "pays": [
          12,
          35,
          100
        ],
        "premium": true
      },
      {
        "id": "doghouse",
        "weight": 4,
        "pays": [
          35,
          120,
          350
        ],
        "premium": true
      }
    ]
  },
  "gems-bonanza": {
    "id": "gems-bonanza",
    "jackpotId": "mega-gem",
    "wildId": "jaguar",
    "symbols": [
      {
        "id": "gem-cyan",
        "weight": 22,
        "pays": [
          1.5,
          4,
          10
        ]
      },
      {
        "id": "gem-green",
        "weight": 20,
        "pays": [
          2,
          5,
          12
        ]
      },
      {
        "id": "gem-pink",
        "weight": 18,
        "pays": [
          2,
          6,
          15
        ]
      },
      {
        "id": "gem-blue",
        "weight": 16,
        "pays": [
          2.5,
          8,
          18
        ]
      },
      {
        "id": "gem-purple",
        "weight": 14,
        "pays": [
          4,
          12,
          28
        ]
      },
      {
        "id": "gem-yellow",
        "weight": 10,
        "pays": [
          6,
          20,
          50
        ],
        "premium": true
      },
      {
        "id": "gem-red",
        "weight": 8,
        "pays": [
          10,
          30,
          80
        ],
        "premium": true
      },
      {
        "id": "mega-gem",
        "weight": 4,
        "pays": [
          30,
          100,
          300
        ],
        "premium": true
      }
    ]
  },
  "aztec-king": {
    "id": "aztec-king",
    "jackpotId": "king",
    "wildId": "jaguar",
    "symbols": [
      {
        "id": "card-a",
        "weight": 18,
        "pays": [
          3,
          10,
          22
        ]
      },
      {
        "id": "card-k",
        "weight": 20,
        "pays": [
          2.5,
          8,
          18
        ]
      },
      {
        "id": "card-q",
        "weight": 22,
        "pays": [
          2,
          6,
          15
        ]
      },
      {
        "id": "card-j",
        "weight": 24,
        "pays": [
          2,
          5,
          12
        ]
      },
      {
        "id": "card-10",
        "weight": 26,
        "pays": [
          1.5,
          4,
          10
        ]
      },
      {
        "id": "sun-disc",
        "weight": 12,
        "pays": [
          5,
          15,
          35
        ]
      },
      {
        "id": "snake",
        "weight": 10,
        "pays": [
          6,
          18,
          45
        ]
      },
      {
        "id": "jaguar",
        "weight": 6,
        "pays": [
          12,
          35,
          100
        ],
        "premium": true
      },
      {
        "id": "king",
        "weight": 4,
        "pays": [
          30,
          100,
          300
        ],
        "premium": true
      }
    ]
  },
  "rise-of-giza": {
    "id": "rise-of-giza",
    "jackpotId": "sphinx",
    "wildId": "eye",
    "symbols": [
      {
        "id": "card-a",
        "weight": 18,
        "pays": [
          3,
          10,
          22
        ]
      },
      {
        "id": "card-k",
        "weight": 20,
        "pays": [
          2.5,
          8,
          18
        ]
      },
      {
        "id": "card-q",
        "weight": 22,
        "pays": [
          2,
          6,
          15
        ]
      },
      {
        "id": "card-j",
        "weight": 24,
        "pays": [
          2,
          5,
          12
        ]
      },
      {
        "id": "card-10",
        "weight": 26,
        "pays": [
          1.5,
          4,
          10
        ]
      },
      {
        "id": "ankh",
        "weight": 12,
        "pays": [
          5,
          15,
          35
        ]
      },
      {
        "id": "scarab",
        "weight": 10,
        "pays": [
          6,
          18,
          45
        ]
      },
      {
        "id": "eye",
        "weight": 6,
        "pays": [
          12,
          35,
          100
        ],
        "premium": true
      },
      {
        "id": "sphinx",
        "weight": 4,
        "pays": [
          30,
          100,
          300
        ],
        "premium": true
      }
    ]
  },
  "book-of-fallen": {
    "id": "book-of-fallen",
    "jackpotId": "fallen",
    "wildId": "book",
    "symbols": [
      {
        "id": "card-a",
        "weight": 18,
        "pays": [
          3,
          10,
          22
        ]
      },
      {
        "id": "card-k",
        "weight": 20,
        "pays": [
          2.5,
          8,
          18
        ]
      },
      {
        "id": "card-q",
        "weight": 22,
        "pays": [
          2,
          6,
          15
        ]
      },
      {
        "id": "card-j",
        "weight": 24,
        "pays": [
          2,
          5,
          12
        ]
      },
      {
        "id": "card-10",
        "weight": 26,
        "pays": [
          1.5,
          4,
          10
        ]
      },
      {
        "id": "rune",
        "weight": 12,
        "pays": [
          5,
          15,
          35
        ]
      },
      {
        "id": "skull",
        "weight": 10,
        "pays": [
          6,
          18,
          45
        ]
      },
      {
        "id": "book",
        "weight": 6,
        "pays": [
          12,
          35,
          100
        ],
        "premium": true
      },
      {
        "id": "fallen",
        "weight": 4,
        "pays": [
          35,
          120,
          350
        ],
        "premium": true
      }
    ]
  },
  "floating-dragon": {
    "id": "floating-dragon",
    "jackpotId": "dragon",
    "wildId": "pearl",
    "symbols": [
      {
        "id": "card-a",
        "weight": 18,
        "pays": [
          3,
          10,
          22
        ]
      },
      {
        "id": "card-k",
        "weight": 20,
        "pays": [
          2.5,
          8,
          18
        ]
      },
      {
        "id": "card-q",
        "weight": 22,
        "pays": [
          2,
          6,
          15
        ]
      },
      {
        "id": "card-j",
        "weight": 24,
        "pays": [
          2,
          5,
          12
        ]
      },
      {
        "id": "card-10",
        "weight": 26,
        "pays": [
          1.5,
          4,
          10
        ]
      },
      {
        "id": "koi",
        "weight": 12,
        "pays": [
          5,
          15,
          35
        ]
      },
      {
        "id": "lotus",
        "weight": 10,
        "pays": [
          6,
          18,
          45
        ]
      },
      {
        "id": "pearl",
        "weight": 6,
        "pays": [
          12,
          35,
          100
        ],
        "premium": true
      },
      {
        "id": "dragon",
        "weight": 4,
        "pays": [
          35,
          120,
          350
        ],
        "premium": true
      }
    ]
  },
  "hot-fiesta": {
    "id": "hot-fiesta",
    "jackpotId": "sombrero",
    "wildId": "maracas",
    "symbols": [
      {
        "id": "gem-pink",
        "weight": 24,
        "pays": [
          1.5,
          4,
          10
        ]
      },
      {
        "id": "chili",
        "weight": 22,
        "pays": [
          2,
          5,
          12
        ]
      },
      {
        "id": "lime",
        "weight": 20,
        "pays": [
          2,
          6,
          15
        ]
      },
      {
        "id": "taco",
        "weight": 14,
        "pays": [
          4,
          12,
          28
        ]
      },
      {
        "id": "maracas",
        "weight": 6,
        "pays": [
          12,
          35,
          100
        ],
        "premium": true
      },
      {
        "id": "sombrero",
        "weight": 4,
        "pays": [
          25,
          80,
          250
        ],
        "premium": true
      }
    ]
  },
  "lucky-lightning": {
    "id": "lucky-lightning",
    "jackpotId": "thor",
    "wildId": "lightning",
    "symbols": [
      {
        "id": "card-a",
        "weight": 18,
        "pays": [
          3,
          10,
          22
        ]
      },
      {
        "id": "card-k",
        "weight": 20,
        "pays": [
          2.5,
          8,
          18
        ]
      },
      {
        "id": "card-q",
        "weight": 22,
        "pays": [
          2,
          6,
          15
        ]
      },
      {
        "id": "card-j",
        "weight": 24,
        "pays": [
          2,
          5,
          12
        ]
      },
      {
        "id": "card-10",
        "weight": 26,
        "pays": [
          1.5,
          4,
          10
        ]
      },
      {
        "id": "cloud",
        "weight": 12,
        "pays": [
          5,
          15,
          35
        ]
      },
      {
        "id": "rain",
        "weight": 10,
        "pays": [
          6,
          18,
          45
        ]
      },
      {
        "id": "lightning",
        "weight": 6,
        "pays": [
          12,
          35,
          100
        ],
        "premium": true
      },
      {
        "id": "thor",
        "weight": 4,
        "pays": [
          35,
          120,
          350
        ],
        "premium": true
      }
    ]
  },
  "madame-destiny-megaways": {
    "id": "madame-destiny-megaways",
    "jackpotId": "madame",
    "wildId": "crystal",
    "symbols": [
      {
        "id": "card-a",
        "weight": 18,
        "pays": [
          3,
          10,
          22
        ]
      },
      {
        "id": "card-k",
        "weight": 20,
        "pays": [
          2.5,
          8,
          18
        ]
      },
      {
        "id": "card-q",
        "weight": 22,
        "pays": [
          2,
          6,
          15
        ]
      },
      {
        "id": "card-j",
        "weight": 24,
        "pays": [
          2,
          5,
          12
        ]
      },
      {
        "id": "card-10",
        "weight": 26,
        "pays": [
          1.5,
          4,
          10
        ]
      },
      {
        "id": "tarot",
        "weight": 12,
        "pays": [
          5,
          15,
          35
        ]
      },
      {
        "id": "cat",
        "weight": 10,
        "pays": [
          6,
          18,
          45
        ]
      },
      {
        "id": "crystal",
        "weight": 6,
        "pays": [
          12,
          35,
          100
        ],
        "premium": true
      },
      {
        "id": "madame",
        "weight": 4,
        "pays": [
          30,
          100,
          300
        ],
        "premium": true
      }
    ]
  },
  "wild-booster": {
    "id": "wild-booster",
    "jackpotId": "booster",
    "wildId": "wild-w",
    "symbols": [
      {
        "id": "card-a",
        "weight": 18,
        "pays": [
          3,
          10,
          22
        ]
      },
      {
        "id": "card-k",
        "weight": 20,
        "pays": [
          2.5,
          8,
          18
        ]
      },
      {
        "id": "card-q",
        "weight": 22,
        "pays": [
          2,
          6,
          15
        ]
      },
      {
        "id": "card-j",
        "weight": 24,
        "pays": [
          2,
          5,
          12
        ]
      },
      {
        "id": "card-10",
        "weight": 26,
        "pays": [
          1.5,
          4,
          10
        ]
      },
      {
        "id": "gem-green",
        "weight": 12,
        "pays": [
          5,
          15,
          35
        ]
      },
      {
        "id": "gem-orange",
        "weight": 10,
        "pays": [
          6,
          18,
          45
        ]
      },
      {
        "id": "wild-w",
        "weight": 6,
        "pays": [
          12,
          35,
          100
        ],
        "premium": true
      },
      {
        "id": "booster",
        "weight": 4,
        "pays": [
          25,
          80,
          250
        ],
        "premium": true
      }
    ]
  }
};
