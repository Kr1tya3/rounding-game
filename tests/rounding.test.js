// Run with: node --test tests/
const test = require("node:test");
const assert = require("node:assert");
const R = require("../js/rounding.js");

test("roundTo rounds half up", () => {
  assert.strictEqual(R.roundTo(44, 10), 40);
  assert.strictEqual(R.roundTo(45, 10), 50);
  assert.strictEqual(R.roundTo(249, 100), 200);
  assert.strictEqual(R.roundTo(250, 100), 300);
  assert.strictEqual(R.roundTo(9500, 1000), 10000);
  assert.strictEqual(R.roundTo(1499, 1000), 1000);
});

test("questions are in range and choices contain the answer", () => {
  for (const level of R.LEVELS) {
    for (let i = 0; i < 2000; i++) {
      const q = R.makeQuestion(level);
      if (level.unit === "mixed") {
        assert.ok([10, 100, 1000].includes(q.unit));
        assert.ok(q.number > 1000 && q.number < 10000);
        assert.notStrictEqual(q.number % 10, 0);
      } else {
        assert.strictEqual(q.unit, level.unit);
        assert.ok(q.number > level.unit && q.number < level.unit * 10);
        assert.notStrictEqual(q.number % level.unit, 0);
      }
      assert.strictEqual(q.answer, R.roundTo(q.number, q.unit));
      if (level.mode === "pick") {
        assert.strictEqual(q.choices.length, 3);
        assert.strictEqual(new Set(q.choices).size, 3);
        assert.ok(q.choices.includes(q.answer));
        assert.ok(q.choices.every((c) => c > 0 && c % 10 === 0));
      } else {
        assert.strictEqual(q.choices, undefined);
      }
    }
  }
});

test("parseAnswer accepts commas and spaces", () => {
  assert.strictEqual(R.parseAnswer(" 1,000 "), 1000);
  assert.strictEqual(R.parseAnswer("300"), 300);
  assert.strictEqual(R.parseAnswer("abc"), null);
  assert.strictEqual(R.parseAnswer(""), null);
});

test("formatNumber adds thousands separators", () => {
  assert.strictEqual(R.formatNumber(10000), "10,000");
  assert.strictEqual(R.formatNumber(950), "950");
});

test("mixed levels use all three places", () => {
  const seen = new Set();
  for (let i = 0; i < 300; i++) seen.add(R.makeQuestion(R.LEVELS[6]).unit);
  assert.deepStrictEqual([...seen].sort((a, b) => a - b), [10, 100, 1000]);
});

test("harder levels pay more gold per basket", () => {
  for (let i = 1; i < R.LEVELS.length; i++) assert.ok(R.LEVELS[i].gold > R.LEVELS[i - 1].gold);
});

test("speed bonus: lightning +50%, quick +25%, slow still earns the basket", () => {
  const lvl = R.LEVELS[0]; // 5 gold, 4s lightning
  assert.strictEqual(R.speedTier(lvl, 2).id, "lightning");
  assert.strictEqual(R.speedBonus(lvl, 2), 3);  // 50% of 5, rounded
  assert.strictEqual(R.speedTier(lvl, 6).id, "quick");
  assert.strictEqual(R.speedBonus(lvl, 6), 1);
  assert.strictEqual(R.speedTier(lvl, 30), null);
  assert.strictEqual(R.speedBonus(lvl, 30), 0);
  const hard = R.LEVELS[7]; // 40 gold, 10s
  assert.strictEqual(R.speedBonus(hard, 9), 20);
  assert.strictEqual(R.speedBonus(hard, 19), 10);
  // The bonus is always smaller than the basket itself: correctness matters most.
  for (const l of R.LEVELS) assert.ok(R.speedBonus(l, 0) < l.gold);
});

test("typing levels and mixed levels allow more time", () => {
  for (let i = 0; i < R.LEVELS.length; i += 2) assert.ok(R.LEVELS[i + 1].speed > R.LEVELS[i].speed);
});

test("time trial questions are multiple choice from reached place values", () => {
  for (let i = 0; i < 300; i++) {
    const q1 = R.makeTrialQuestion(1);
    assert.strictEqual(q1.unit, 10);
    assert.strictEqual(q1.choices.length, 3);
    const q8 = R.makeTrialQuestion(8);
    assert.ok(q8.choices.includes(q8.answer));
  }
  const units = new Set();
  for (let i = 0; i < 300; i++) units.add(R.makeTrialQuestion(8).unit);
  assert.deepStrictEqual([...units].sort((a, b) => a - b), [10, 100, 1000]);
});
