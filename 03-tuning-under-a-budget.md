# Tuning Under a Budget: Rationing the Move

The coordinate-descent chapter assumed you could afford to sweep every coordinate every round. Round 0 launched `d * k` jobs and later rounds `(d - 1) * k`, and the only question was which single move to accept.

Real budgets do not grant you that. You have a fixed number of jobs per round, a fixed wall-clock, a queue you share with other people. The question changes from *which move do I accept* to *where do I spend the compute I have so that the move I eventually accept is the best-informed one I could afford*.

This chapter is coordinate descent rationed. The discipline of one accepted move per round does not change. What changes is that you can no longer look everywhere before you move, so you must choose where to look.

## The Principle

Treat each unit of compute as a purchase of information. Some coordinates, some grid points, and some rounds buy more information per job than others. Under a budget, you spend on the highest information-value purchases first.

Concretely, the loop changes in one place. Coordinate descent says: sweep all active coordinates, then accept the best move. Budgeted coordinate descent says: **rank the active coordinates by expected gain density, sweep as many of the top ones as the budget allows, then accept the best move.** Everything downstream — one move per round, the noise floor, the boundary-win rule — is unchanged.

The cost of getting the ranking wrong is not a wrong move. It is a missed one: a coordinate you could not afford to sweep this round that happened to hold the gain. So the ranking is itself a decision worth making well, and worth recording.

## A Prior Over Coordinates

You start each round with a rough belief about where gains live. This belief is empirical, recipe-dependent, and updated by every round you run — but you have to start somewhere, and an explicit prior beats sweeping in arbitrary order.

A typical ordering for optimizer-and-recipe tuning, strongest lever first:

```text
learning-rate family   matrix_lr, adam_lr_multiplier      usually dominant
schedule shape         warmup, decay form                 often large, coupled
timescales             betas, momentum (in 1 - beta)      moderate, local
regularization         weight decay                       smaller, slow-acting
```

Two cautions. First, this is a prior, not a law: a specific recipe can put its biggest gain in a knob this ordering ranks low, and the early rounds are exactly what correct that prior. Second, the ranking interacts with the noise floor — a coordinate whose plausible gains are all near `epsilon` is low information-value regardless of where the prior puts it, because even a "win" there cannot be distinguished from variance.

Update the ranking as you go. A coordinate that produced a clear gain recently is worth revisiting; a coordinate that has shown nothing across several rounds drops down the list (but do not retire it permanently — see the confirmation rule in the coordinate-descent chapter).

## Designing the Grid Under a Budget

A grid has two dimensions you are spending points on: **range** (how far from the center you look) and **resolution** (how finely you look within that range). With a fixed number of candidates `k` per coordinate, you trade one against the other.

```text
wide range, coarse resolution   finds distant optima, risks boundary wins,
                                weak at locating a nearby optimum precisely
narrow range, fine resolution   locates a nearby optimum well,
                                blind to anything outside the range
```

Use the geometry from the coordinate-descent chapter — multiplicative spacing for scale parameters, complement space for betas — and let the budget decide the spread. Early rounds, when you are still locating the optimum, favor range. Later rounds, when you are refining, favor resolution. Always spend one of your `k` points on the center, because that point re-measures the noise floor and anchors every gain you compute.

## Sequential Grid Pruning

The single biggest lever a budget gives you is that rounds are sequential: each round, you know the shape the previous rounds revealed. A static grid throws that knowledge away. A pruned grid spends its limited points where the last round said the optimum probably is.

The operations, all driven by the ledger:

```text
recenter   move the grid to sit around the latest winning value
narrow     shrink the range once a clear interior optimum appears
expand     widen the range on a boundary win (the grid was too timid)
drop       remove candidate regions dominated in earlier rounds
defer      lower a coordinate that has shown no gain across rounds
```

This is where the ledger stops being paperwork and becomes machinery. A grid that recenters, narrows, and expands is reading the history of the campaign to decide its next points — it cannot be a pure function of the current center. The grid generator becomes stateful, and the ledger is the state it reads.

The expand operation deserves emphasis because it ties directly to the boundary-win rule. If your budget forced a timid grid and the winner landed at its edge, you have not solved the coordinate — you have learned that the optimum is further out than you dared to look. The honest response is to spend a later round extending that coordinate, not to declare it done.

## The Joint Sweep

Sometimes the right "coordinate" is a pair. Coordinate descent measures each knob against a fixed center, which is exactly the wrong instrument when two knobs are strongly coupled: moving one changes the optimum of the other, so single-coordinate sweeps give you a moving target.

The signature is oscillation across rounds. You move A and it helps; the next round B now looks different and helps; the round after, A looks wrong again. The campaign ping-pongs between two coordinates without settling. That is not noise — it is the search telling you that A and B share a ridge that no one-dimensional cut can follow.

The response is to sweep the pair jointly for one round:

```text
single coordinate:  k jobs
joint pair:         k * k jobs
```

The cost is quadratic, which is exactly why you do not do it by default and exactly why budget matters. Sweep the 2-D grid, read the heatmap for the ridge direction, take the joint optimum as a single accepted move, and then return to one-dimensional coordinate descent around the new center. The joint sweep is not a new method; it is the one round where coordinate descent's core assumption is false and you pay the quadratic cost to repair it.

## Stopping the Campaign

The coordinate-descent chapter has a per-round stop: if the best gain is below `epsilon`, you stop. Under a budget you also need a campaign-level stop, because the question is no longer only "did this round improve" but "is the next round worth its cost".

Track the gain per round against the compute spent:

```text
round 0: gain 0.0026   (cleared epsilon by ~2x)
round 1: gain 0.0009   (near epsilon; confirmed)
round 2: gain 0.0023   (cleared epsilon)
round 3: gain ~0        (no move clears epsilon)
```

Stop when one of these holds: round gains have hovered near `epsilon` for a couple of rounds, so further moves are indistinguishable from noise; or the expected gain of the next round, given the trend, is smaller than the cost you would pay for it; or you have hit the objective's actual stakes — the recipe is good enough for what it is for, and squeezing further is not worth the queue time.

"How good is good enough" is a budget question, not a mathematical one. Coordinate descent will happily keep proposing rounds; the budget is what makes you ask whether the next one earns its keep.

## A Small Case Study

Take the same Qwen3 d12 Muon run, now under a real constraint: 12 jobs per round, not the 25 a full `5 * 5` sweep would need.

With five coordinates you cannot sweep them all at `k = 5`. Rank by the prior — the learning-rate family leads — and spend the budget there:

```text
round 0 budget = 12 jobs:
  adam_lr_multiplier   5 candidates (multiplicative, range 0.5x .. 2x)
  matrix_lr            5 candidates
  center reruns        2 (noise floor)
```

The winner is `adam_lr_multiplier 1.0 -> 2.0`, and `2.0` sits at the top edge of its grid. That is a boundary win: the timid, budget-limited range could not see past `2.0`. The pruning rule says expand, not declare done. So a later round spends its budget extending that one coordinate upward:

```text
round 2 budget on adam_lr_multiplier: 2.0, 3.0, 4.0, 6.0
  winner: 4.0
```

This is the path the coordinate-descent chapter reported as `1.0 -> 2.0 -> 4.0`. Under a budget, that path is not two independent discoveries — it is one boundary win followed by a deliberate expansion, and recording the grid each round is what lets a reader see that `4.0` was reached by extending a boundary, not by a lucky wide guess. The campaign stops when a full round produces no move that clears the measured noise floor.

## Philosophy

A budget does not weaken coordinate descent. It sharpens the part that was always the point: deciding where the next unit of evidence should come from.

- Rank coordinates by information per job, not by habit, and update the ranking.
- Spend grid points on range early and resolution late.
- Let the ledger prune the grid: recenter, narrow, expand on boundaries, defer the silent.
- Pay the quadratic cost of a joint sweep only when oscillation reveals a coupled pair.
- Stop the campaign when the next round's expected gain is smaller than its cost.

Coordinate descent under infinite compute is a search. Coordinate descent under a budget is a series of decisions about what is worth knowing next — which is what tuning actually is.

## Minimal Ledger

Budgeted tuning adds the bookkeeping that makes its decisions auditable:

```text
per round:
  coordinate ranking     the prior and any updates to it
  budget                 jobs available this round
  coordinates swept      which made the cut, and why
  grid provenance        range and resolution per coordinate, and the
                         pruning operation that produced them (recenter /
                         narrow / expand / new) -- this is what makes an
                         interior win distinguishable from a boundary win

per campaign:
  gain-per-round curve   for the diminishing-returns stop
  joint sweeps           which pairs, triggered by what oscillation
  stop reason            noise floor reached | cost exceeds expected gain |
                         objective satisfied
```

The grid provenance field is the one to insist on. A boundary win and an interior win can have identical scores; only the recorded range tells them apart, and only that distinction tells you whether a coordinate is solved or merely under-explored.
