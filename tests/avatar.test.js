const test = require("node:test");
const assert = require("node:assert");
const AV = require("../js/avatar.js");

function player(gold) { return { gold, avatar: AV.normalise(undefined) }; }

test("new players own the free items and wear the default look", () => {
  const p = player(0);
  for (const it of AV.ITEMS.filter((i) => i.price === 0)) assert.ok(AV.owns(p.avatar, it.id));
  assert.deepStrictEqual(p.avatar.look, AV.DEFAULT_LOOK);
});

test("buying spends gold, adds the item and puts it on", () => {
  const p = player(300);
  assert.deepStrictEqual(AV.buy(p, "hat-cap"), { ok: true });
  assert.strictEqual(p.gold, 50);
  assert.ok(AV.owns(p.avatar, "hat-cap"));
  assert.strictEqual(p.avatar.look.hat, "hat-cap");
  assert.strictEqual(AV.buy(p, "hat-cap").reason, "owned");
});

test("cannot buy without enough gold", () => {
  const p = player(10);
  assert.strictEqual(AV.buy(p, "hat-crown").reason, "gold");
  assert.strictEqual(p.gold, 10);
  assert.ok(!AV.owns(p.avatar, "hat-crown"));
});

test("equip only works for owned items; optional slots can be empty", () => {
  const p = player(0);
  assert.strictEqual(AV.equip(p.avatar, "hat", "hat-crown"), false);
  assert.strictEqual(AV.equip(p.avatar, "jersey", null), false);
  assert.strictEqual(AV.equip(p.avatar, "skin", "skin-4"), true);
  assert.strictEqual(AV.equip(p.avatar, "hat", null), true);
  assert.strictEqual(p.avatar.look.hat, null);
});

test("normalise drops unknown or unowned items from saved data", () => {
  const a = AV.normalise({ owned: ["bogus", "hat-cap"], look: { hat: "hat-crown", jersey: "jersey-blue", glasses: null } });
  assert.ok(!a.owned.includes("bogus"));
  assert.strictEqual(a.look.hat, null);
  assert.strictEqual(a.look.jersey, "jersey-orange");
});

test("svg draws the equipped colours", () => {
  const out = AV.svg({ skin: "skin-4", jersey: "jersey-blue", shoes: "shoes-red", hat: "hat-crown", glasses: null, extra: null });
  assert.ok(out.startsWith("<svg"));
  assert.ok(out.includes("#7a4a2a") && out.includes("#1c7ed6") && out.includes("#e03131"));
  for (const it of AV.ITEMS) assert.ok(AV.itemPreview(it).length > 0);
});

test("items get harder to buy: tiers rise with price and each slot is cheapest first", () => {
  for (const slot of AV.SLOTS) {
    const items = AV.itemsFor(slot.id);
    for (let i = 1; i < items.length; i++) assert.ok(items[i].price >= items[i - 1].price);
  }
  const order = AV.TIERS.map((t) => t.id);
  const sorted = [...AV.ITEMS].sort((a, b) => a.price - b.price);
  for (let i = 1; i < sorted.length; i++) {
    assert.ok(order.indexOf(AV.tierFor(sorted[i]).id) >= order.indexOf(AV.tierFor(sorted[i - 1]).id));
  }
  // Every paid tier has something in it, and the top item is a long-term goal.
  for (const t of ["rookie", "pro", "allstar", "legend"]) assert.ok(AV.ITEMS.some((it) => AV.tierFor(it).id === t), t);
  assert.ok(Math.max(...AV.ITEMS.map((it) => it.price)) >= 10000);
});
