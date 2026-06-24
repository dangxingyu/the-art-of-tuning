# The Art of Tuning

This handbook collects practical hyperparameter-tuning moves for optimizer and training-recipe work.

The intended format is a field guide: each chapter names a move, explains when to use it, gives the operating protocol, and records concrete case studies.

## Website

The GitHub Pages site deploys from the static handbook shell at the repository root:

https://dangxingyu.github.io/the-art-of-tuning/

The site has no build step. `index.html` is the handbook landing page, and `chapter.html` renders the chapter markdown files with the same reading layout instead of sending readers to raw `.md` pages.

## Scope

This handbook is mostly about nuisance tuning. It assumes a scientific setting has already been chosen: model family, scale, data, batch size, training horizon, and broad optimizer family. Within that setting, the goal is to tune the recipe so the setting receives a fair measurement.

When the question is whether to change the scientific setting itself, that is a scaling-ladder question, not a coordinate-descent question. Coordinate descent can serve that question as an inner loop: tune each rung well enough that the comparison is not dominated by a bad learning rate, stale weight decay, or mis-set optimizer timescale.

## Chapters

1. [Coordinate Descent: The First Move](01-coordinate-descent.md)
2. [Reading the Run: Perception Before Movement](02-reading-the-run.md)
3. [Tuning Under a Budget: Rationing the Move](03-tuning-under-a-budget.md)
4. [Borrowing a Start Point: Scaling as a Prior, Not an Answer](04-borrowing-a-start-point.md)
5. [Literature Grounding: Reading the Field Before the Run](05-literature-grounding.md)

## Working Principles

- Tune one clear objective at a time.
- Treat scientific coordinates as outer-loop questions; tune nuisance coordinates so each setting gets a fair measurement.
- Record fixed coordinates as caveats, not as conclusions.
- Keep a machine-readable ledger for every sweep.
- Move only one accepted coordinate per round.
- Prefer small, decision-oriented grids over large undifferentiated sweeps.
- Distinguish a sick run from a noisy measurement; they have opposite cures.
- Know the noise scale before trusting a gain, and refresh it when the budget or stakes justify it.
- Separate run noise from search noise: rough calibration gives scale, while thresholds and ledgers discipline the tuning path.
- Spend the next unit of compute where it buys the most information.
- Let the ledger prune the grid: recenter, narrow, expand on boundaries, defer the silent.
- Transfer proposes a start point; coordinate descent disposes of the residual.
- Encode the empirical uncertainty of a scaling rule as the radius of the first grid.
- Read the published record as a prior over coordinates, not as an answer.
- Check that a borrowed default sits inside the regime it was measured in.
- Treat dashboarding and result collection as part of the experiment, not afterthoughts.
- Preserve the exact job recipe: code tarball, resource queue, data/eval recipe, and all optimizer hyperparameters.

## Ledger Template

Each tuning campaign should have a directory like:

```text
results/<experiment_name>/
  README.md
  state.json
  round_00_candidates.csv
  round_01_candidates.csv
  visualizations/
```

`state.json` should include:

- current center recipe
- center score and estimated noise floor
- round status
- grid for each coordinate, with its provenance (new / recenter / narrow / expand)
- best candidate per coordinate
- accepted coordinate and accepted improvement
- coordinate to skip next round
- scientific setting being measured
- nuisance coordinates swept and fixed-coordinate caveats
- prior source and predicted start point, if a transfer seeded the campaign
- stop reason
