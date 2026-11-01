const test = require("node:test");
const assert = require("node:assert");
const A = require("../js/achievements.js");

function fresh() { return { unlocked: 1, best: {}, totalBaskets: 0, trophies: {} }; }
const ids = (list) => list.map((t) => t.id);

test("medalFor uses 7/9/10 thresholds", () => {
  assert.strictEqual(A.medalFor(undefined), null);
  assert.strictEqual(A.medalFor(6), null);
  assert.strictEqual(A.medalFor(7).id, "bronze");
  assert.strictEqual(A.medalFor(8).id, "bronze");
  assert.strictEqual(A.medalFor(9).id, "silver");
  assert.strictEqual(A.medalFor(10).id, "gold");
});

test("trophies are awarded once", () => {
  const p = fresh();
  p.totalBaskets = 1;
  assert.deepStrictEqual(ids(A.awardTrophies(p, { streak: 1 })), ["first-basket"]);
  assert.deepStrictEqual(A.awardTrophies(p, { streak: 2 }), []);
  assert.ok(p.trophies["first-basket"]);
});

test("streak, perfect game and champion trophies", () => {
  const p = fresh();
  p.totalBaskets = 10;
  p.best = { 1: 10, 2: 7 };
  const got = ids(A.awardTrophies(p, { streak: 10, roundScore: 10 }));
  assert.deepStrictEqual(got.sort(), ["first-basket", "hot-hand", "perfect-game", "tens-champ"].sort());
});

test("hall of fame needs gold everywhere", () => {
  const p = fresh();
  p.best = { 1: 10, 2: 10, 3: 10, 4: 10, 5: 10, 6: 10, 7: 10, 8: 9 };
  assert.ok(!ids(A.awardTrophies(p, {})).includes("hall-of-fame"));
  p.best[8] = 10;
  assert.deepStrictEqual(ids(A.awardTrophies(p, {})), ["hall-of-fame"]);
});

test("treasure chest at 500 gold", () => {
  const p = fresh();
  p.gold = 490;
  assert.ok(!ids(A.awardTrophies(p, {})).includes("treasure-chest"));
  p.gold = 500;
  assert.deepStrictEqual(ids(A.awardTrophies(p, {})), ["treasure-chest"]);
});
