// Screens, game flow and the basketball animation.
(function () {
  "use strict";

  var R = window.Rounding;
  var A = window.Achievements;
  var AV = window.Avatar;
  var N = window.Names;
  var STORAGE_KEY = "roundingHoops.v1";

  var state = {
    level: null,
    questionIndex: 0,
    score: 0,
    question: null,
    answered: false,
    streak: 0,        // baskets in a row, carried across rounds
    newTrophies: []   // trophies won during the current round
  };

  // ---------- Saved progress (this device only) ----------
  function loadProgress() {
    var p = { unlocked: 1, best: {}, totalBaskets: 0, trophies: {}, gold: 0, goldEarned: 0 };
    try {
      var data = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (data && typeof data.unlocked === "number") {
        p.unlocked = data.unlocked;
        p.best = data.best || {};
        p.totalBaskets = data.totalBaskets || 0;
        p.trophies = data.trophies || {};
        p.gold = data.gold || 0;
        p.goldEarned = data.goldEarned || p.gold;
        p.avatar = data.avatar;
        p.name = data.name;
      }
    } catch (e) { /* storage blocked or empty */ }
    p.avatar = AV.normalise(p.avatar);
    p.name = N.clean(p.name) || N.generate();
    return p;
  }

  function saveProgress(p) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(p)); } catch (e) { /* ignore */ }
  }

  var progress = loadProgress();
  saveProgress(progress); // keep a newly generated name from the very first visit

  // ---------- Helpers ----------
  function $(id) { return document.getElementById(id); }

  function show(screenId) {
    var screens = document.querySelectorAll(".screen");
    for (var i = 0; i < screens.length; i++) screens[i].classList.remove("active");
    $(screenId).classList.add("active");
    $("toast").classList.remove("show");
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
      var medal = A.medalFor(best);
      btn.innerHTML =
        '<span class="level-num">' + lvl.id + "</span>" +
        '<span class="level-name">' + lvl.name + "</span>" +
        '<span class="level-stage">' + (locked ? "🔒 Locked" : lvl.stage) + "</span>" +
        '<span class="level-pay"><span class="mini-coin" aria-hidden="true"></span>' + lvl.gold + " per basket</span>" +
        (best != null ? '<span class="level-best">Best: ' + best + "/" + R.QUESTIONS_PER_ROUND + "</span>" : "") +
        (medal ? '<span class="level-medal" title="' + medal.name + ' medal">' + medal.icon + "</span>" : "");
      btn.addEventListener("click", function () { startLevel(lvl); });
      list.appendChild(btn);
    });
    var won = Object.keys(progress.trophies).length;
    $("trophy-count").textContent = "(" + won + "/" + A.TROPHIES.length + ")";
  }

  // ---------- Play ----------
  function startLevel(lvl) {
    state.level = lvl;
    state.questionIndex = 0;
    state.score = 0;
    state.newTrophies = [];
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
      state.streak++;
      progress.totalBaskets++;
      addGold(state.level.gold);
      $("sb-score").textContent = state.score;
      fb.textContent = pick(["Swish! 🎉", "Nothing but net!", "Slam dunk!", "Great shot!"]);
      fb.className = "feedback good";
      shootBall(true);
      celebrate(A.awardTrophies(progress, { streak: state.streak }));
      saveProgress(progress);
    } else {
      state.streak = 0;
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

  // ---------- Gold ----------
  function renderGold() { $("gold-count").textContent = R.formatNumber(progress.gold); }

  function addGold(amount) {
    progress.gold += amount;
    progress.goldEarned += amount;
    renderGold();
    var pop = $("gold-pop");
    var counter = $("gold");
    pop.textContent = "+" + amount;
    pop.classList.remove("show");
    counter.classList.remove("bump");
    void pop.offsetWidth;
    pop.classList.add("show");
    counter.classList.add("bump");
  }

  // Show a pop-up for each new trophy and remember it for the results screen.
  function celebrate(trophies) {
    if (!trophies.length) return;
    state.newTrophies = state.newTrophies.concat(trophies);
    showToast(trophies.map(function (t) {
      return '<span class="toast-icon">' + t.icon + "</span> New trophy: <b>" + t.name + "</b>";
    }).join("<br>"));
  }

  function showToast(html) {
    var toast = $("toast");
    toast.innerHTML = html;
    toast.classList.remove("show");
    void toast.offsetWidth;
    toast.classList.add("show");
    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(function () { toast.classList.remove("show"); }, 2800);
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
    var prevMedal = A.medalFor(prevBest);
    if (prevBest == null || state.score > prevBest) progress.best[lvl.id] = state.score;
    var unlockedNew = false;
    if (passed && lvl.id === progress.unlocked && lvl.id < R.LEVELS.length) {
      progress.unlocked = lvl.id + 1;
      unlockedNew = true;
    }
    var medal = A.medalFor(state.score);
    var bonus = A.medalBonus(medal, lvl);
    if (bonus) addGold(bonus);
    var roundTrophies = A.awardTrophies(progress, { streak: state.streak, roundScore: state.score });
    state.newTrophies = state.newTrophies.concat(roundTrophies);
    saveProgress(progress);

    var medalText = "";
    if (medal) {
      var isNew = !prevMedal || medal.min > prevMedal.min;
      medalText = '<span class="medal-big">' + medal.icon + "</span>" +
        (isNew ? "You won a <b>" + medal.name + "</b> medal!" : medal.name + " medal");
    }
    $("result-medal").innerHTML = medalText;
    var basketGold = state.score * lvl.gold;
    $("result-gold").innerHTML =
      '<div class="pay-row"><span>' + state.score + " baskets × " + lvl.gold + "</span><b>+" + R.formatNumber(basketGold) + "</b></div>" +
      (bonus ? '<div class="pay-row"><span>' + medal.icon + " " + medal.name + " medal bonus</span><b>+" + R.formatNumber(bonus) + "</b></div>" : "") +
      '<div class="pay-row total"><span><span class="mini-coin" aria-hidden="true"></span> Gold earned</span><b>+' + R.formatNumber(basketGold + bonus) + "</b></div>";
    $("result-new").innerHTML = state.newTrophies.length
      ? "<h3>New trophies!</h3>" + state.newTrophies.map(function (t) {
          return '<div class="new-trophy"><span>' + t.icon + "</span> " + t.name + "</div>";
        }).join("")
      : "";

    $("result-title").textContent = passed
      ? "Great game, " + progress.name + "! 🏆"
      : "Good effort, " + progress.name + "! 💪";
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

  // ---------- Trophy room ----------
  function renderTrophyRoom() {
    var medals = $("medal-shelf");
    medals.innerHTML = "";
    R.LEVELS.forEach(function (lvl) {
      var medal = A.medalFor(progress.best[lvl.id]);
      var el = document.createElement("div");
      el.className = "shelf-item" + (medal ? "" : " empty");
      el.innerHTML =
        '<span class="shelf-icon">' + (medal ? medal.icon : "🎯") + "</span>" +
        '<span class="shelf-name">Level ' + lvl.id + "</span>" +
        '<span class="shelf-desc">' + lvl.name + " · " + (lvl.mode === "pick" ? "pick" : "type") + "</span>" +
        '<span class="shelf-desc">' + (medal ? medal.name : "No medal yet") + "</span>";
      medals.appendChild(el);
    });

    var shelf = $("trophy-shelf");
    shelf.innerHTML = "";
    A.TROPHIES.forEach(function (t) {
      var won = progress.trophies[t.id];
      var el = document.createElement("div");
      el.className = "shelf-item" + (won ? " won" : " empty");
      el.innerHTML =
        '<span class="shelf-icon">' + (won ? t.icon : "🔒") + "</span>" +
        '<span class="shelf-name">' + t.name + "</span>" +
        '<span class="shelf-desc">' + t.desc + "</span>";
      shelf.appendChild(el);
    });
  }

  function openTrophyRoom() { renderTrophyRoom(); show("screen-trophies"); }

  // ---------- Avatar + locker room ----------
  var locker = { slot: "jersey", tryOn: null };

  function renderAvatars() {
    var look = progress.avatar.look;
    $("topbar-name").textContent = progress.name;
    $("btn-avatar").setAttribute("aria-label", progress.name + ": open the locker room");
    $("topbar-avatar").innerHTML = AV.svg(look, { viewBox: "26 4 48 48" });
    $("court-player").innerHTML = AV.svg(look);
  }

  function lockerLook() {
    var look = {};
    for (var k in progress.avatar.look) look[k] = progress.avatar.look[k];
    if (locker.tryOn) look[locker.tryOn.slot] = locker.tryOn.id;
    return look;
  }

  function renderLocker() {
    $("locker-avatar").innerHTML = AV.svg(lockerLook(), { className: "big-avatar" });

    var tabs = $("slot-tabs");
    tabs.innerHTML = "";
    AV.SLOTS.forEach(function (s) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "slot-tab" + (s.id === locker.slot ? " active" : "");
      b.setAttribute("role", "tab");
      b.setAttribute("aria-selected", s.id === locker.slot ? "true" : "false");
      b.innerHTML = '<span aria-hidden="true">' + s.icon + "</span> " + s.name;
      b.addEventListener("click", function () { locker.slot = s.id; locker.tryOn = null; renderLocker(); });
      tabs.appendChild(b);
    });

    var grid = $("item-grid");
    grid.innerHTML = "";
    var slot = AV.SLOTS.filter(function (s) { return s.id === locker.slot; })[0];
    var current = progress.avatar.look[slot.id];
    if (slot.optional) grid.appendChild(itemCard(null, slot, current === null));
    AV.itemsFor(slot.id).forEach(function (it) { grid.appendChild(itemCard(it, slot, current === it.id)); });
  }

  function itemCard(it, slot, wearing) {
    var owned = !it || AV.owns(progress.avatar, it.id);
    var trying = locker.tryOn && it && locker.tryOn.id === it.id;
    var card = document.createElement("div");
    card.className = "item-card" + (wearing ? " wearing" : "") + (trying ? " trying" : "") + (owned ? " owned" : "");

    var pick = document.createElement("button");
    pick.type = "button";
    pick.className = "item-pick";
    pick.innerHTML =
      '<span class="item-preview">' + (it ? AV.itemPreview(it) : '<span class="none-mark">✕</span>') + "</span>" +
      '<span class="item-name">' + (it ? it.name : "None") + "</span>" +
      (it && it.price > 0 ? '<span class="tier tier-' + AV.tierFor(it).id + '">' + AV.tierFor(it).name + "</span>" : "");
    pick.addEventListener("click", function () {
      if (owned) {
        AV.equip(progress.avatar, slot.id, it ? it.id : null);
        locker.tryOn = null;
        saveProgress(progress);
        renderAvatars();
      } else {
        locker.tryOn = trying ? null : { slot: slot.id, id: it.id };
      }
      renderLocker();
    });
    card.appendChild(pick);

    var foot = document.createElement("div");
    foot.className = "item-foot";
    if (wearing) {
      foot.innerHTML = '<span class="tag wearing-tag">✔ Wearing</span>';
    } else if (owned) {
      foot.innerHTML = '<span class="tag">Tap to wear</span>';
    } else {
      var need = it.price - progress.gold;
      var buyBtn = document.createElement("button");
      buyBtn.type = "button";
      buyBtn.className = "buy-btn";
      buyBtn.disabled = need > 0;
      buyBtn.innerHTML = '<span class="mini-coin" aria-hidden="true"></span>' + R.formatNumber(it.price);
      buyBtn.setAttribute("aria-label", "Buy " + it.name + " for " + it.price + " gold");
      buyBtn.addEventListener("click", function () {
        var res = AV.buy(progress, it.id);
        if (!res.ok) return;
        locker.tryOn = null;
        saveProgress(progress);
        renderGold();
        renderAvatars();
        renderLocker();
        showToast('<span class="toast-icon">🛍️</span> New gear: <b>' + it.name + "</b>");
      });
      foot.appendChild(buyBtn);
      if (need > 0) {
        var n = document.createElement("span");
        n.className = "need";
        n.textContent = "Need " + R.formatNumber(need) + " more";
        foot.appendChild(n);
      }
    }
    card.appendChild(foot);
    return card;
  }

  function openLocker() {
    locker.tryOn = null;
    $("name-input").value = progress.name;
    $("name-msg").textContent = "";
    renderLocker();
    show("screen-locker");
  }

  // ---------- Player name ----------
  function saveName(name, message) {
    progress.name = name;
    saveProgress(progress);
    $("name-input").value = name;
    $("name-msg").textContent = message;
    renderAvatars();
  }

  $("name-form").addEventListener("submit", function (e) {
    e.preventDefault();
    var name = N.clean($("name-input").value);
    if (!name) {
      $("name-msg").textContent = "Type a name with at least one letter or number.";
      return;
    }
    saveName(name, "Saved! Nice to meet you, " + name + ".");
  });

  $("btn-random-name").addEventListener("click", function () {
    var name;
    do { name = N.generate(); } while (name === progress.name);
    saveName(name, "How about " + name + "? Roll again or type your own.");
  });

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
  $("btn-trophies").addEventListener("click", openTrophyRoom);
  $("btn-locker").addEventListener("click", openLocker);
  $("btn-avatar").addEventListener("click", openLocker);
  $("btn-locker-back").addEventListener("click", function () { renderLevels(); show("screen-home"); });
  $("btn-result-trophies").addEventListener("click", openTrophyRoom);
  $("btn-trophies-back").addEventListener("click", function () { renderLevels(); show("screen-home"); });
  $("btn-again").addEventListener("click", function () { startLevel(state.level); });
  $("btn-next-level").addEventListener("click", function () { startLevel(R.LEVELS[state.level.id]); });

  renderLevels();
  renderGold();
  renderAvatars();
})();
