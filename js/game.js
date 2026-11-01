// Screens, game flow and the basketball animation.
(function () {
  "use strict";

  var R = window.Rounding;
  var STORAGE_KEY = "roundingHoops.v1";

  var state = {
    level: null,
    questionIndex: 0,
    score: 0,
    question: null,
    answered: false
  };

  // ---------- Saved progress (this device only) ----------
  function loadProgress() {
    try {
      var data = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (data && typeof data.unlocked === "number") return data;
    } catch (e) { /* storage blocked or empty */ }
    return { unlocked: 1, best: {} };
  }

  function saveProgress(p) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(p)); } catch (e) { /* ignore */ }
  }

  var progress = loadProgress();

  // ---------- Helpers ----------
  function $(id) { return document.getElementById(id); }

  function show(screenId) {
    var screens = document.querySelectorAll(".screen");
    for (var i = 0; i < screens.length; i++) screens[i].classList.remove("active");
    $(screenId).classList.add("active");
    window.scrollTo(0, 0);
  }

  function unitWord(unit) {
    return unit === 10 ? "ten" : unit === 100 ? "hundred" : "thousand";
  }

  // ---------- Home ----------
  function renderLevels() {
    var list = $("level-list");
    list.innerHTML = "";
    R.LEVELS.forEach(function (lvl) {
      var locked = lvl.id > progress.unlocked;
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "level-card" + (locked ? " locked" : "");
      btn.disabled = locked;
      var best = progress.best[lvl.id];
      btn.innerHTML =
        '<span class="level-num">' + lvl.id + "</span>" +
        '<span class="level-name">' + lvl.name + "</span>" +
        '<span class="level-stage">' + (locked ? "🔒 Locked" : lvl.stage) + "</span>" +
        (best != null ? '<span class="level-best">Best: ' + best + "/" + R.QUESTIONS_PER_ROUND + "</span>" : "");
      btn.addEventListener("click", function () { startLevel(lvl); });
      list.appendChild(btn);
    });
  }

  // ---------- Play ----------
  function startLevel(lvl) {
    state.level = lvl;
    state.questionIndex = 0;
    state.score = 0;
    $("sb-level").textContent = lvl.id + " · " + lvl.name;
    show("screen-play");
    nextQuestion();
  }

  function nextQuestion() {
    state.answered = false;
    state.question = R.makeQuestion(state.level);
    var q = state.question;

    $("sb-shot").textContent = (state.questionIndex + 1) + "/" + R.QUESTIONS_PER_ROUND;
    $("sb-score").textContent = state.score;
    $("q-number").textContent = R.formatNumber(q.number);
    $("q-unit").textContent = unitWord(q.unit);
    $("feedback").textContent = "";
    $("feedback").className = "feedback";
    $("hint").innerHTML = "";
    $("btn-next").style.display = "none";
    resetBall();

    var choices = $("choices");
    var form = $("type-form");
    choices.innerHTML = "";

    if (state.level.mode === "pick") {
      form.style.display = "none";
      choices.style.display = "";
      q.choices.forEach(function (c) {
        var b = document.createElement("button");
        b.type = "button";
        b.className = "btn choice";
        b.textContent = R.formatNumber(c);
        b.addEventListener("click", function () { answer(c, b); });
        choices.appendChild(b);
      });
    } else {
      choices.style.display = "none";
      form.style.display = "";
      var input = $("type-input");
      input.value = "";
      input.disabled = false;
      input.focus();
    }
  }

  function answer(value, button) {
    if (state.answered) return;
    var q = state.question;
    var correct = value === q.answer;
    state.answered = true;

    // Lock the inputs
    var btns = $("choices").querySelectorAll("button");
    for (var i = 0; i < btns.length; i++) {
      btns[i].disabled = true;
      if (Number(btns[i].textContent.replace(/,/g, "")) === q.answer) btns[i].classList.add("right");
    }
    if (button && !correct) button.classList.add("wrong");
    $("type-input").disabled = true;

    var fb = $("feedback");
    if (correct) {
      state.score++;
      $("sb-score").textContent = state.score;
      fb.textContent = pick(["Swish! 🎉", "Nothing but net!", "Slam dunk!", "Great shot!"]);
      fb.className = "feedback good";
      shootBall(true);
    } else {
      fb.textContent = "Missed! The answer is " + R.formatNumber(q.answer) + ".";
      fb.className = "feedback bad";
      shootBall(false);
      $("hint").innerHTML = numberLineHint(q);
    }

    var last = state.questionIndex + 1 >= R.QUESTIONS_PER_ROUND;
    $("btn-next").textContent = last ? "See results →" : "Next shot →";
    $("btn-next").style.display = "";
    $("btn-next").focus();
  }

  function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

  // A number line from the lower to the upper multiple, with the halfway mark.
  function numberLineHint(q) {
    var x0 = 30, x1 = 290;
    var pos = x0 + (q.number - q.lower) / q.unit * (x1 - x0);
    var mid = (x0 + x1) / 2;
    var half = q.lower + q.unit / 2;
    var f = R.formatNumber;
    var why = q.number === half
      ? f(q.number) + " is exactly halfway, so we round <b>up</b> to " + f(q.answer) + "."
      : f(q.number) + " is closer to <b>" + f(q.answer) + "</b> than to " + f(q.answer === q.upper ? q.lower : q.upper) + ".";
    return (
      '<svg viewBox="0 0 320 70" class="numline" role="img" aria-label="Number line from ' + f(q.lower) + " to " + f(q.upper) + '">' +
      '<line x1="' + x0 + '" y1="30" x2="' + x1 + '" y2="30" stroke="currentColor" stroke-width="3"/>' +
      tick(x0, f(q.lower), q.answer === q.lower) +
      tick(x1, f(q.upper), q.answer === q.upper) +
      '<line x1="' + mid + '" y1="22" x2="' + mid + '" y2="38" stroke="currentColor" stroke-width="1.5" stroke-dasharray="3 2"/>' +
      '<text x="' + mid + '" y="55" text-anchor="middle" font-size="11" fill="currentColor" opacity="0.7">halfway ' + f(half) + "</text>" +
      '<circle cx="' + pos + '" cy="30" r="7" fill="var(--ball)"/>' +
      '<text x="' + pos + '" y="14" text-anchor="middle" font-size="13" font-weight="700" fill="currentColor">' + f(q.number) + "</text>" +
      "</svg><p>" + why + "</p>"
    );
  }

  function tick(x, label, highlight) {
    return '<line x1="' + x + '" y1="20" x2="' + x + '" y2="40" stroke="currentColor" stroke-width="3"/>' +
      '<text x="' + x + '" y="58" text-anchor="middle" font-size="14" font-weight="' + (highlight ? 800 : 400) + '" fill="' +
      (highlight ? "var(--good)" : "currentColor") + '">' + label + "</text>";
  }

  // ---------- Ball animation ----------
  function resetBall() {
    var ball = $("ball");
    ball.className = "ball";
    void ball.offsetWidth; // restart animations
  }

  function shootBall(score) {
    var ball = $("ball");
    resetBall();
    ball.classList.add(score ? "shot-in" : "shot-miss");
  }

  // ---------- Results ----------
  function finishRound() {
    var lvl = state.level;
    var passed = state.score >= R.PASS_MARK;
    var prevBest = progress.best[lvl.id];
    if (prevBest == null || state.score > prevBest) progress.best[lvl.id] = state.score;
    var unlockedNew = false;
    if (passed && lvl.id === progress.unlocked && lvl.id < R.LEVELS.length) {
      progress.unlocked = lvl.id + 1;
      unlockedNew = true;
    }
    saveProgress(progress);

    $("result-title").textContent = passed ? "Great game! 🏆" : "Good effort! 💪";
    $("result-score").textContent = state.score + " / " + R.QUESTIONS_PER_ROUND + " baskets";
    var msg;
    if (unlockedNew) msg = "You unlocked level " + (lvl.id + 1) + "!";
    else if (passed && lvl.id === R.LEVELS.length) msg = "You beat the final level. You're a rounding champion!";
    else if (passed) msg = "Brilliant shooting.";
    else msg = "Score " + R.PASS_MARK + " or more to unlock the next level. Have another go!";
    $("result-msg").textContent = msg;

    var hasNext = lvl.id < R.LEVELS.length && lvl.id + 1 <= progress.unlocked;
    $("btn-next-level").style.display = hasNext ? "" : "none";
    show("screen-result");
  }

  // ---------- Wiring ----------
  $("type-form").addEventListener("submit", function (e) {
    e.preventDefault();
    if (state.answered) return;
    var v = R.parseAnswer($("type-input").value);
    if (v === null) {
      $("feedback").textContent = "Type a number, then shoot!";
      $("feedback").className = "feedback";
      return;
    }
    answer(v, null);
  });

  $("btn-next").addEventListener("click", function () {
    state.questionIndex++;
    if (state.questionIndex >= R.QUESTIONS_PER_ROUND) finishRound();
    else nextQuestion();
  });

  $("btn-quit").addEventListener("click", function () { renderLevels(); show("screen-home"); });
  $("btn-levels").addEventListener("click", function () { renderLevels(); show("screen-home"); });
  $("btn-again").addEventListener("click", function () { startLevel(state.level); });
  $("btn-next-level").addEventListener("click", function () { startLevel(R.LEVELS[state.level.id]); });

  renderLevels();
})();
