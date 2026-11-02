// Pure rounding and question logic. No DOM here, so it can be tested in Node.
(function (root) {
  "use strict";

  // Levels: each place value has a "pick" stage (multiple choice) then a "type" stage.
  // gold = coins earned per basket; harder levels pay more.
  // speed = seconds for a "lightning" answer (double it for a "quick" one).
  var LEVELS = [
    { id: 1, unit: 10, mode: "pick", name: "Tens", stage: "Pick the answer", gold: 5, speed: 4 },
    { id: 2, unit: 10, mode: "type", name: "Tens", stage: "Type the answer", gold: 8, speed: 7 },
    { id: 3, unit: 100, mode: "pick", name: "Hundreds", stage: "Pick the answer", gold: 10, speed: 4 },
    { id: 4, unit: 100, mode: "type", name: "Hundreds", stage: "Type the answer", gold: 15, speed: 7 },
    { id: 5, unit: 1000, mode: "pick", name: "Thousands", stage: "Pick the answer", gold: 20, speed: 4 },
    { id: 6, unit: 1000, mode: "type", name: "Thousands", stage: "Type the answer", gold: 25, speed: 7 },
    // Mixed: a number in the thousands, rounded to the nearest ten, hundred or thousand.
    { id: 7, unit: "mixed", mode: "pick", name: "Mixed", stage: "Pick the answer", gold: 30, speed: 6 },
    { id: 8, unit: "mixed", mode: "type", name: "Mixed", stage: "Type the answer", gold: 40, speed: 10 }
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

  // ---------- Speed bonus ----------
  // Correctness always comes first: a wrong answer earns nothing however fast,
  // and a slow right answer still earns the full basket gold. Being quick only
  // adds a little extra on top.
  var SPEED_TIERS = [
    { id: "lightning", factor: 1, pct: 50, icon: "⚡", name: "Lightning shot" },
    { id: "quick", factor: 2, pct: 25, icon: "🔥", name: "Quick shot" }
  ];

  function speedTier(level, seconds) {
    for (var i = 0; i < SPEED_TIERS.length; i++) {
      if (seconds <= level.speed * SPEED_TIERS[i].factor) return SPEED_TIERS[i];
    }
    return null;
  }

  function speedBonus(level, seconds) {
    var t = speedTier(level, seconds);
    return t ? Math.round(level.gold * t.pct / 100) : 0;
  }

  // ---------- Time trial ----------
  // Always unlocked. Multiple-choice questions from the place values the
  // player has reached, as many as they can in 60 seconds.
  // penalty = seconds taken off the clock for each wrong answer, so tapping
  // randomly (right about 1 time in 3) loses time faster than it scores.
  var TRIAL = { seconds: 60, gold: 5, bestBonus: 50, penalty: 5 };

  function makeTrialQuestion(unlocked, rand) {
    rand = rand || Math.random;
    var pool = LEVELS.filter(function (l) { return l.mode === "pick" && l.id <= Math.max(1, unlocked); });
    return makeQuestion(pool[Math.floor(rand() * pool.length)], rand);
  }

  // Accept typed answers like "1,000" or " 300 ".
  function parseAnswer(text) {
    var cleaned = String(text).replace(/[\s,]/g, "");
    if (!/^\d+$/.test(cleaned)) return null;
    return parseInt(cleaned, 10);
  }

  // Why a typed answer can't be read, so the game can explain it kindly.
  // Returns null when the answer is fine.
  function answerProblem(text) {
    var t = String(text).trim();
    if (t === "") return "empty";
    if (parseAnswer(t) !== null) return null;
    if (/[a-z]/i.test(t)) return "letters";
    if (/^-/.test(t)) return "minus";
    if (/\d[.]\d/.test(t)) return "dot";
    return "other";
  }

  var ANSWER_HELP = {
    empty: "Type your answer in the box first, then shoot! 🏀",
    letters: "Oops! Only numbers can go in the hoop. Use the number keys 0 to 9.",
    minus: "No minus sign needed. Just type the number!",
    dot: "Rounded answers are whole numbers, so no dot needed!",
    other: "Oops! Only numbers can go in the hoop. Use the number keys 0 to 9."
  };

  function formatNumber(n) {
    return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  }

  var api = {
    LEVELS: LEVELS,
    QUESTIONS_PER_ROUND: QUESTIONS_PER_ROUND,
    PASS_MARK: PASS_MARK,
    SPEED_TIERS: SPEED_TIERS,
    TRIAL: TRIAL,
    speedTier: speedTier,
    speedBonus: speedBonus,
    makeTrialQuestion: makeTrialQuestion,
    roundTo: roundTo,
    makeQuestion: makeQuestion,
    parseAnswer: parseAnswer,
    answerProblem: answerProblem,
    ANSWER_HELP: ANSWER_HELP,
    formatNumber: formatNumber
  };

  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.Rounding = api;
})(this);
