// Pure rounding and question logic. No DOM here, so it can be tested in Node.
(function (root) {
  "use strict";

  // Levels: each place value has a "pick" stage (multiple choice) then a "type" stage.
  // gold = coins earned per basket; harder levels pay more.
  var LEVELS = [
    { id: 1, unit: 10, mode: "pick", name: "Tens", stage: "Pick the answer", gold: 5 },
    { id: 2, unit: 10, mode: "type", name: "Tens", stage: "Type the answer", gold: 8 },
    { id: 3, unit: 100, mode: "pick", name: "Hundreds", stage: "Pick the answer", gold: 10 },
    { id: 4, unit: 100, mode: "type", name: "Hundreds", stage: "Type the answer", gold: 15 },
    { id: 5, unit: 1000, mode: "pick", name: "Thousands", stage: "Pick the answer", gold: 20 },
    { id: 6, unit: 1000, mode: "type", name: "Thousands", stage: "Type the answer", gold: 25 },
    // Mixed: a number in the thousands, rounded to the nearest ten, hundred or thousand.
    { id: 7, unit: "mixed", mode: "pick", name: "Mixed", stage: "Pick the answer", gold: 30 },
    { id: 8, unit: "mixed", mode: "type", name: "Mixed", stage: "Type the answer", gold: 40 }
  ];

  var MIXED_UNITS = [10, 100, 1000];

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

  // Mixed choices: the answer, the other neighbouring multiple, and the number
  // rounded to a different place (the classic mix-up), e.g. 4,576 to the nearest
  // ten: 4,580 / 4,570 / 4,600.
  function makeMixedChoices(n, unit, rand) {
    var answer = roundTo(n, unit);
    var lower = Math.floor(n / unit) * unit;
    var other = answer === lower ? lower + unit : lower;
    var choices = [answer, other];
    var candidates = shuffle(MIXED_UNITS.filter(function (u) { return u !== unit; }), rand)
      .map(function (u) { return roundTo(n, u); })
      .concat([lower - unit, lower + 2 * unit]);
    for (var i = 0; i < candidates.length && choices.length < 3; i++) {
      var c = candidates[i];
      if (c > 0 && choices.indexOf(c) === -1) choices.push(c);
    }
    return shuffle(choices, rand);
  }

  function makeQuestion(level, rand) {
    rand = rand || Math.random;
    var mixed = level.unit === "mixed";
    var unit = mixed ? MIXED_UNITS[Math.floor(rand() * MIXED_UNITS.length)] : level.unit;
    // Mixed numbers are always in the thousands and never end in 0.
    var n;
    if (mixed) {
      do { n = randInt(1001, 9999, rand); } while (n % 10 === 0);
    } else {
      n = pickNumber(unit, rand);
    }
    var lower = Math.floor(n / unit) * unit;
    var q = {
      number: n,
      unit: unit,
      answer: roundTo(n, unit),
      lower: lower,
      upper: lower + unit
    };
    if (level.mode === "pick") q.choices = mixed ? makeMixedChoices(n, unit, rand) : makeChoices(n, unit, rand);
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
