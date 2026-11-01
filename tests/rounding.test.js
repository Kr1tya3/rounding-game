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
      assert.ok(q.number > level.unit && q.number < level.unit * 10);
      assert.notStrictEqual(q.number % level.unit, 0);
      assert.strictEqual(q.answer, R.roundTo(q.number, level.unit));
      if (level.mode === "pick") {
        assert.strictEqual(q.choices.length, 3);
        assert.strictEqual(new Set(q.choices).size, 3);
        assert.ok(q.choices.includes(q.answer));
        assert.ok(q.choices.every((c) => c > 0 && c % level.unit === 0));
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
