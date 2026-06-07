# The Art of Tuning

This handbook collects practical hyperparameter-tuning moves for optimizer and training-recipe work.

The intended format is a field guide: each chapter names a move, explains when to use it, gives the operating protocol, and records concrete case studies.

The moves are arranged around a single loop. You start from a recipe (borrowed from a scaling prior, or given), you read the run to see whether you can trust it, you decide under a budget where the next evidence should come from, and you make exactly one move. Coordinate descent is the move at the center; the other chapters are the phases that surround it.

## Chapters

1. [Coordinate Descent: The First Move](01-coordinate-descent.md)
2. [Reading the Run: Perception Before Movement](02-reading-the-run.md)
3. [Tuning Under a Budget: Rationing the Move](03-tuning-under-a-budget.md)
4. [Borrowing a Start Point: Scaling as a Prior, Not an Answer](04-borrowing-a-start-point.md)

## Working Principles

- Tune one clear objective at a time.
- Keep a machine-readable ledger for every sweep.
- Move only one accepted coordinate per round.
- Prefer small, decision-oriented grids over large undifferentiated sweeps.
- Distinguish a sick run from a noisy measurement; they have opposite cures.
- Measure the noise floor before trusting a gain, and re-measure it every round.
- Spend the next unit of compute where it buys the most information.
- Let the ledger prune the grid: recenter, narrow, expand on boundaries, defer the silent.
- Transfer proposes a start point; coordinate descent disposes of the residual.
- Encode the empirical uncertainty of a scaling rule as the radius of the first grid.
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
- center score and measured noise floor
- round status
- grid for each coordinate, with its provenance (new / recenter / narrow / expand)
- best candidate per coordinate
- accepted coordinate and accepted improvement
- coordinate to skip next round
- prior source and predicted start point, if a transfer seeded the campaign
- stop reason
