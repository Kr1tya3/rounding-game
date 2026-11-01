# Rounding Hoops 🏀

A browser game for children aged 7 to 10 to practise rounding to the nearest ten, hundred and thousand.

## Play locally

Play online at https://kr1tya3.github.io/rounding-game/, or open `index.html` in a browser. There is no build step.

## How it works

- Eight levels: tens, hundreds, thousands, then mixed (a number in the thousands rounded to the nearest ten, hundred or thousand). Each has a multiple-choice stage, then a stage where you type the answer.
- Every basket earns gold: 5 per basket on level 1, rising to 40 on level 8. A medal pays a bonus of 2× (bronze), 5× (silver) or 10× (gold) the level's basket rate. Gold shows in the counter at the top right.
- Each round is 10 shots. Score 7 or more to unlock the next level.
- A wrong answer shows a number line explaining which multiple is closer. Halfway numbers round up.
- A Locker Room where players spend gold on gear, in tiers from Rookie (100–250) through Pro, All-Star and Legend (up to 10,000) for their avatar (jerseys, hats, glasses, shoes, extras). The avatar appears on the court as the shooter.
- Medals for each level (bronze 7+, silver 9+, gold 10) and eleven trophies, all shown in the Trophy Room.
- Progress is saved in the browser on that device (no accounts).

## Tests

```
npm test
```

The rounding and question logic lives in `js/rounding.js` and is tested with Node's built-in test runner.

## Deployment

Every push to `main` runs the tests and publishes the game to GitHub Pages at
https://kr1tya3.github.io/rounding-game/ (see `.github/workflows/pages.yml`).
One-time setup: in the repository's **Settings → Pages**, set **Source** to **GitHub Actions**.
