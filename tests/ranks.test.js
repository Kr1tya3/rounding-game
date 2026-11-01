const test = require("node:test");
const assert = require("node:assert");
const K = require("../js/ranks.js");

test("there are five ranks, rising from Rookie to Legend", () => {
  assert.strictEqual(K.RANKS.length, 5);
  assert.strictEqual(K.RANKS[0].name, "Rookie");
  assert.strictEqual(K.RANKS[4].name, "Legend");
  for (let i = 1; i < K.RANKS.length; i++) assert.ok(K.RANKS[i].min > K.RANKS[i - 1].min);
});

test("game points mix accuracy and gold", () => {
  assert.strictEqual(K.gamePoints({ right: 10, answered: 10, gold: K.GOLD_FOR_FULL }), 100);
  assert.strictEqual(K.gamePoints({ right: 0, answered: 10, gold: 0 }), 0);
  assert.strictEqual(K.gamePoints({ right: 5, answered: 10, gold: K.GOLD_FOR_FULL / 2 }), 50);
  // Gold above the cap doesn't add more.
  assert.strictEqual(K.gamePoints({ right: 10, answered: 10, gold: 5000 }), 100);
  assert.strictEqual(K.gamePoints({ right: 0, answered: 0, gold: 0 }), 0);
});

test("only the last 10 games count", () => {
  const p = {};
  for (let i = 0; i < 10; i++) K.recordGame(p, { right: 0, answered: 10, gold: 0 });
  assert.strictEqual(K.rating(p.games).rank.id, "rookie");
  for (let i = 0; i < 10; i++) K.recordGame(p, { right: 10, answered: 10, gold: 1000 });
  assert.strictEqual(p.games.length, 10);
  const r = K.rating(p.games);
  assert.strictEqual(r.points, 100);
  assert.strictEqual(r.rank.id, "legend");
  assert.strictEqual(r.next, null);
});

test("a new player starts as a Rookie", () => {
  const r = K.rating(undefined);
  assert.strictEqual(r.games, 0);
  assert.strictEqual(r.rank.id, "rookie");
  assert.strictEqual(r.next.id, "team-player");
});

test("ranks reward harder levels and careful play", () => {
  const rank = (g) => K.rankFor(K.gamePoints(g)).id;
  // Perfect round on level 1 (5 gold a basket, gold medal bonus, some speed bonus): ~125 gold.
  assert.strictEqual(rank({ right: 10, answered: 10, gold: 125 }), "hoop-hero");
  // Perfect round on level 3: ~240 gold.
  assert.strictEqual(rank({ right: 10, answered: 10, gold: 240 }), "star");
  // Silver on the hardest level: ~700 gold.
  assert.strictEqual(rank({ right: 9, answered: 10, gold: 700 }), "legend");
  // Mashing one button in the Time Trial: 5 right out of 14.
  assert.strictEqual(rank({ right: 5, answered: 14, gold: 25 }), "rookie");
  // Careful Time Trial: 15 right out of 16.
  assert.strictEqual(rank({ right: 15, answered: 16, gold: 75 }), "hoop-hero");
});
