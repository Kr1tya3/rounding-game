// Player rank from the last 10 games. Pure logic, no DOM, so it can be tested in Node.
(function (root) {
  "use strict";

  var GAMES_COUNTED = 10;

  // A game's rank points (0-100) mix accuracy and gold:
  // 60 points for accuracy (right answers / questions answered),
  // 40 points for gold earned in that game, full marks at GOLD_FOR_FULL or more.
  // Accuracy weighs more so careful players always beat button mashers,
  // and gold rewards playing the harder levels (they pay more).
  var ACCURACY_POINTS = 60;
  var GOLD_POINTS = 40;
  var GOLD_FOR_FULL = 800;

  // min = average rank points needed.
  var RANKS = [
    { id: "rookie", name: "Rookie", icon: "👟", min: 0 },
    { id: "team-player", name: "Team Player", icon: "🏀", min: 40 },
    { id: "hoop-hero", name: "Hoop Hero", icon: "🔥", min: 55 },
    { id: "star", name: "Basketball Star", icon: "⭐", min: 70 },
    { id: "legend", name: "Legend", icon: "👑", min: 85 }
  ];

  // game = { right, answered, gold }
  function gamePoints(game) {
    var accuracy = game.answered > 0 ? game.right / game.answered : 0;
    var gold = Math.min(1, Math.max(0, game.gold || 0) / GOLD_FOR_FULL);
    return accuracy * ACCURACY_POINTS + gold * GOLD_POINTS;
  }

  // Add a finished game to progress.games, keeping only the most recent ones.
  function recordGame(progress, game) {
    var games = Array.isArray(progress.games) ? progress.games : [];
    games.push({ right: game.right, answered: game.answered, gold: game.gold });
    progress.games = games.slice(-GAMES_COUNTED);
    return progress.games;
  }

  function rankFor(points) {
    for (var i = RANKS.length - 1; i >= 0; i--) if (points >= RANKS[i].min) return RANKS[i];
    return RANKS[0];
  }

  // Average over the last 10 games (or fewer while a new player warms up).
  function rating(games) {
    games = (Array.isArray(games) ? games : []).slice(-GAMES_COUNTED);
    var n = games.length;
    var points = 0, right = 0, answered = 0, gold = 0;
    games.forEach(function (g) {
      points += gamePoints(g);
      right += g.right;
      answered += g.answered;
      gold += g.gold || 0;
    });
    var avg = n ? points / n : 0;
    var rank = rankFor(avg);
    var idx = RANKS.indexOf(rank);
    return {
      games: n,
      points: Math.round(avg),
      accuracy: answered ? Math.round(100 * right / answered) : 0,
      gold: n ? Math.round(gold / n) : 0,
      rank: rank,
      next: RANKS[idx + 1] || null
    };
  }

  var api = {
    GAMES_COUNTED: GAMES_COUNTED, ACCURACY_POINTS: ACCURACY_POINTS, GOLD_POINTS: GOLD_POINTS,
    GOLD_FOR_FULL: GOLD_FOR_FULL, RANKS: RANKS,
    gamePoints: gamePoints, recordGame: recordGame, rankFor: rankFor, rating: rating
  };

  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.Ranks = api;
})(this);
