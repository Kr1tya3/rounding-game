# Rounding Hoops 🏀

A browser game for children aged 7 to 10 to practise rounding to the nearest ten, hundred and thousand.

## Play locally

Open `index.html` in a browser. There is no build step, so it can be served as-is from GitHub Pages.

## How it works

- Six levels: tens, hundreds and thousands. Each has a multiple-choice stage, then a stage where you type the answer.
- Each round is 10 shots. Score 7 or more to unlock the next level.
- A wrong answer shows a number line explaining which multiple is closer. Halfway numbers round up.
- Progress is saved in the browser on that device (no accounts).

## Tests

```
npm test
```

The rounding and question logic lives in `js/rounding.js` and is tested with Node's built-in test runner.
