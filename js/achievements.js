// Medals and trophies. Pure logic, no DOM, so it can be tested in Node.
(function (root) {
  "use strict";

  var LEVEL_COUNT = 8;

  // Medal for a level from the best score out of 10.
  // bonus = how many baskets' worth of that level's gold the medal pays on top.
  var MEDALS = [
    { id: "gold", min: 10, name: "Gold", icon: "🥇", bonus: 10 },
    { id: "silver", min: 9, name: "Silver", icon: "🥈", bonus: 5 },
    { id: "bronze", min: 7, name: "Bronze", icon: "🥉", bonus: 2 }
  ];

  // Extra gold for winning a medal in a round of the given level.
  function medalBonus(medal, level) {
    return medal ? medal.bonus * level.gold : 0;
  }

  function medalFor(score) {
    if (score == null) return null;
    for (var i = 0; i < MEDALS.length; i++) if (score >= MEDALS[i].min) return MEDALS[i];
    return null;
  }

  function bestOf(p, levelId) { return p.best ? p.best[levelId] : undefined; }
  function passed(p, levelId) { var b = bestOf(p, levelId); return b != null && b >= 7; }

  // Each trophy has a test that looks at saved progress plus the moment's context:
  // ctx.streak (baskets in a row right now) and ctx.roundScore (set at the end of a round).
  var TROPHIES = [
    { id: "first-basket", icon: "🏀", name: "First Basket", desc: "Score your very first basket.",
      test: function (p) { return p.totalBaskets >= 1; } },
    { id: "hot-hand", icon: "🔥", name: "Hot Hand", desc: "Score 5 baskets in a row.",
      test: function (p, c) { return c.streak >= 5; } },
    { id: "unstoppable", icon: "⚡", name: "Unstoppable", desc: "Score 15 baskets in a row.",
      test: function (p, c) { return c.streak >= 15; } },
    { id: "perfect-game", icon: "⭐", name: "Perfect Game", desc: "Score 10 out of 10 in any level.",
      test: function (p, c) { return c.roundScore === 10; } },
    { id: "tens-champ", icon: "🏅", name: "Tens Champion", desc: "Pass both tens levels.",
      test: function (p) { return passed(p, 1) && passed(p, 2); } },
    { id: "hundreds-champ", icon: "🎖️", name: "Hundreds Champion", desc: "Pass both hundreds levels.",
      test: function (p) { return passed(p, 3) && passed(p, 4); } },
    { id: "thousands-champ", icon: "🏆", name: "Thousands Champion", desc: "Pass both thousands levels.",
      test: function (p) { return passed(p, 5) && passed(p, 6); } },
    { id: "mixed-champ", icon: "🌟", name: "Mixed Master", desc: "Pass both mixed levels.",
      test: function (p) { return passed(p, 7) && passed(p, 8); } },
    { id: "treasure-chest", icon: "💰", name: "Treasure Chest", desc: "Earn 1,000 gold in total.",
      test: function (p) { return (p.goldEarned || 0) >= 1000; } },
    { id: "gold-rush", icon: "🏦", name: "Gold Rush", desc: "Earn 10,000 gold in total.",
      test: function (p) { return (p.goldEarned || 0) >= 10000; } },
    { id: "lightning", icon: "⚡", name: "Lightning Hands", desc: "Get a lightning-fast right answer.",
      test: function (p, c) { return !!c.lightning; } },
    { id: "beat-the-clock", icon: "⏱️", name: "Beat the Clock", desc: "Get 10 right in a Time Trial.",
      test: function (p, c) { return (c.trialScore || 0) >= 10; } },
    { id: "speed-demon", icon: "🚀", name: "Speed Demon", desc: "Get 20 right in a Time Trial.",
      test: function (p, c) { return (c.trialScore || 0) >= 20; } },
    { id: "century", icon: "💯", name: "Century", desc: "Score 100 baskets in total.",
      test: function (p) { return p.totalBaskets >= 100; } },
    { id: "hall-of-fame", icon: "👑", name: "Hall of Fame", desc: "Win a gold medal on every level.",
      test: function (p) {
        for (var id = 1; id <= LEVEL_COUNT; id++) if (bestOf(p, id) !== 10) return false;
        return true;
      } }
  ];

  // Returns trophies newly earned, and records them in progress.trophies.
  function awardTrophies(progress, ctx) {
    ctx = ctx || {};
    progress.trophies = progress.trophies || {};
    var earned = [];
    TROPHIES.forEach(function (t) {
      if (!progress.trophies[t.id] && t.test(progress, ctx)) {
        progress.trophies[t.id] = new Date().toISOString().slice(0, 10);
        earned.push(t);
      }
    });
    return earned;
  }

  var api = { medalBonus: medalBonus, MEDALS: MEDALS, TROPHIES: TROPHIES, medalFor: medalFor, awardTrophies: awardTrophies };

  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.Achievements = api;
})(this);
