const test = require("node:test");
const assert = require("node:assert");
const N = require("../js/names.js");

test("generated names are two words from the lists and short enough", () => {
  for (let i = 0; i < 500; i++) {
    const name = N.generate();
    const [adj, noun] = name.split(" ");
    assert.ok(N.ADJECTIVES.includes(adj) && N.NOUNS.includes(noun), name);
    assert.ok(name.length <= N.MAX_LENGTH, name);
    assert.strictEqual(N.clean(name), name);
  }
});

test("clean tidies typed names", () => {
  assert.strictEqual(N.clean("  Zoë   the  Great  "), "Zoë the Great");
  assert.strictEqual(N.clean("<b>Max</b>"), "bMaxb");
  assert.strictEqual(N.clean("A very very long name indeed").length, 20);
  assert.strictEqual(N.clean("O'Neil-Smith Jr."), "O'Neil-Smith Jr.");
  assert.strictEqual(N.clean("!!!"), null);
  assert.strictEqual(N.clean("   "), null);
  assert.strictEqual(N.clean(undefined), null);
});
