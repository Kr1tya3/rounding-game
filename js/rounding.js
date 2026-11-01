// Pure rounding and question logic. No DOM here, so it can be tested in Node.
(function (root) {
  "use strict";

  // Levels: each place value has a "pick" stage (multiple choice) then a "type" stage.
  var LEVELS = [
    { id: 1, unit: 10, mode: "pick", name: "Tens", stage: "Pick the answer" },
    { id: 2, unit: 10, mode: "type", name: "Tens", stage: "Type the answer" },
    { id: 3, unit: 100, mode: "pick", name: "Hundreds", stage: "Pick the answer" },
    { id: 4, unit: 100, mode: "type", name: "Hundreds", stage: "Type the answer" },
    { id: 5, unit: 1000, mode: "pick", name: "Thousands", stage: "Pick the answer" },
    { id: 6, unit: 1000, mode: "type", name: "Thousands", stage: "Type the answer" }
  ];

  var QUESTIONS_PER_ROUND = 10;
  var PASS_MARK = 7;

  // Round half up, as taught in primary school (45 -> 50, 250 -> 300).
  function roundTo(n, unit) {
    return Math.floor((n + unit / 2) / unit) * unit;
  }

  function randInt(min, max, rand) {
    return min + Math.floor(rand() * (max - min + 1));
  }

  function shuffle(arr, rand) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(rand() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  // Number to round: from just above one unit up to the next place value,
  // never already a multiple of the unit. e.g. tens: 11..99, hundreds: 101..999.
  function pickNumber(unit, rand) {
    var n;
    do {
      n = randInt(unit + 1, unit * 10 - 1, rand);
    } while (n % unit === 0);
    return n;
  }

  // Three choices: the two neighbouring multiples, plus one more nearby multiple.
  function makeChoices(n, unit, rand) {
    var lower = Math.floor(n / unit) * unit;
    var upper = lower + unit;
    var extra = rand() < 0.5 ? lower - unit : upper + unit;
    if (extra <= 0) extra = upper + unit;
    return shuffle([lower, upper, extra], rand);
  }

  function makeQuestion(level, rand) {
    rand = rand || Math.random;
    var n = pickNumber(level.unit, rand);
    var q = {
      number: n,
      unit: level.unit,
      answer: roundTo(n, level.unit),
      lower: Math.floor(n / level.unit) * level.unit,
      upper: Math.floor(n / level.unit) * level.unit + level.unit
    };
    if (level.mode === "pick") q.choices = makeChoices(n, level.unit, rand);
    return q;
  }

  // Accept typed answers like "1,000" or " 300 ".
  function parseAnswer(text) {
    var cleaned = String(text).replace(/[\s,]/g, "");
    if (!/^\d+$/.test(cleaned)) return null;
    return parseInt(cleaned, 10);
  }

  function formatNumber(n) {
    return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  }

  var api = {
    LEVELS: LEVELS,
    QUESTIONS_PER_ROUND: QUESTIONS_PER_ROUND,
    PASS_MARK: PASS_MARK,
    roundTo: roundTo,
    makeQuestion: makeQuestion,
    parseAnswer: parseAnswer,
    formatNumber: formatNumber
  };

  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.Rounding = api;
})(this);
