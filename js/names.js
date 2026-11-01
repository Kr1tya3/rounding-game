// Funny, child-friendly player names. Pure logic, no DOM, so it can be tested in Node.
(function (root) {
  "use strict";

  var ADJECTIVES = [
    "Bouncy", "Speedy", "Sneaky", "Wobbly", "Zippy", "Giggly", "Mighty", "Fluffy", "Sparkly", "Dizzy",
    "Jumpy", "Snazzy", "Turbo", "Cosmic", "Jolly", "Sleepy", "Funky", "Wiggly", "Brave", "Bubbly",
    "Super", "Crunchy", "Fearless", "Happy", "Lucky", "Dazzling", "Clever", "Rapid", "Silly", "Zany"
  ];

  var NOUNS = [
    "Badger", "Pancake", "Penguin", "Noodle", "Rocket", "Llama", "Muffin", "Panda", "Dumpling", "Walrus",
    "Meatball", "Otter", "Waffle", "Hedgehog", "Kangaroo", "Pickle", "Narwhal", "Sloth", "Burrito", "Gecko",
    "Koala", "Pretzel", "Dragon", "Platypus", "Cupcake", "Hamster", "Tornado", "Turnip", "Yeti", "Flamingo"
  ];

  var MAX_LENGTH = 20;

  function pick(list, rand) { return list[Math.floor(rand() * list.length)]; }

  // e.g. "Bouncy Badger"
  function generate(rand) {
    rand = rand || Math.random;
    return pick(ADJECTIVES, rand) + " " + pick(NOUNS, rand);
  }

  // Tidy a typed name. Letters (any language), numbers, spaces and - ' . only,
  // single spaces, max 20 characters. Returns null if nothing usable is left.
  function clean(text) {
    var s = String(text == null ? "" : text)
      .replace(/[^\p{L}\p{N} '.-]/gu, "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, MAX_LENGTH)
      .trim();
    return /[\p{L}\p{N}]/u.test(s) ? s : null;
  }

  var api = { ADJECTIVES: ADJECTIVES, NOUNS: NOUNS, MAX_LENGTH: MAX_LENGTH, generate: generate, clean: clean };

  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.Names = api;
})(this);
