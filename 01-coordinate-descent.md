# Coordinate Descent: The First Move

Hyperparameter tuning is not primarily a search problem. It is a resource allocation problem under uncertainty.

We usually care about a small number of coupled knobs: learning rate, momentum, beta timescales, auxiliary optimizer settings, weight decay, batch size, schedule shape. A full grid treats every interaction as equally important and quickly becomes impossible. Pure intuition changes several knobs at once and makes the result hard to interpret. Coordinate descent is the middle path: spend parallel compute to estimate one-dimensional local improvements, then make exactly one move.

That is why coordinate descent is the first move. It is not globally optimal, but it gives a disciplined answer to the practical question:

```text
Given the recipe I have, which single knob should I move next?
```

## The Principle

Let a training recipe be a vector:

```text
x = (x_1, x_2, ..., x_d)
```

where each coordinate is a hyperparameter, and let:

```text
f(x)
```

be the validation loss we want to minimize. We do not know `f` analytically; each evaluation is an expensive training run.

Coordinate descent approximates the local landscape by probing one coordinate at a time. At round `t`, we hold the current center `x_t` fixed. For each coordinate `j`, we evaluate a small candidate set:

```text
G_j(x_t) = {x_t with coordinate j replaced by candidate values}
```

Then we accept the best single-coordinate move:

```text
x_{t+1} = argmin over all candidates in all G_j(x_t) of f(candidate)
```

If no candidate improves on `f(x_t)`, we stop.

The important restriction is that only one coordinate is accepted per round. Even if several coordinates look better independently, we do not apply them all. Their improvements were measured against the old center, not against each other.

## Why It Works Well Enough

Coordinate descent is useful because many tuning landscapes are locally structured. A bad learning rate can hide the effect of beta. A bad beta can make weight decay look wrong. A full interaction model would be better, but is often too expensive. Coordinate descent iteratively recenters the local experiment so that later sweeps become more meaningful.

It also creates interpretable evidence. If changing AdamW beta1 helps, you know it helped while matrix LR, Muon beta, AdamW LR, and weight decay were fixed. The conclusion is not final, but it is legible.

Coordinate descent is therefore a good default when:

- A viable baseline already exists.
- The metric is stable enough to compare single runs.
- There are 4-8 ordered or continuous knobs.
- A full Cartesian grid is too expensive.
- You can run many independent jobs in parallel.

It is a poor default when the initial recipe is broken, the evaluation is too noisy, or you already know a pair of coordinates has a strong interaction that must be swept jointly.

## The Algorithm

Choose:

- center recipe `x_0`
- coordinates `C = {1, ..., d}`
- per-coordinate candidate generator `grid(j, x_t)`
- maximum rounds `T`
- minimum meaningful improvement `epsilon`

Then:

```text
for t in 0 ... T-1:
    candidates = []

    for coordinate j in active_coordinates:
        for value in grid(j, x_t):
            candidates.append(x_t with x_j = value)

    run all candidates

    for each coordinate j:
        b_j = best completed candidate for coordinate j

    b = best b_j across coordinates

    if f(x_t) - f(b) <= epsilon:
        stop

    x_{t+1} = b
    skip the coordinate changed by b in the next round
```

Skipping the just-changed coordinate is a practical heuristic. It prevents the procedure from spending two consecutive rounds over-refining the same knob while the rest of the recipe is stale. If the same coordinate is truly the dominant issue, it can win again in the following round.

## Parallel Execution

Coordinate descent is sequential across rounds but parallel within a round.

If there are `d` coordinates and each coordinate has `k` candidates, round 0 launches:

```text
d * k jobs
```

After the first accepted move, if you skip the coordinate just changed, later rounds launch:

```text
(d - 1) * k jobs
```

This is the right parallelization boundary. Do not wait for one coordinate sweep to finish before launching another coordinate in the same round; they all share the same center and are independent. Do wait before launching the next round; the next center depends on the result.

But this is only the right boundary for a single tuning campaign. If you have abundant parallelism and many recipes to compare — for example different batch sizes, model scales, data mixtures, or optimizer variants — it is often better to run several coordinate-descent campaigns in parallel and give each campaign a thinner within-round sweep. Fully saturating one recipe with every coordinate candidate minimizes wall-clock time for that one recipe, but it can spend more total compute before you learn which recipe family is worth finishing.

In that setting, parallelize across campaigns first, then within each campaign as much as the budget allows. Each campaign still keeps its own center, ledger, noise floor, and accepted moves. The only thing you have changed is where the parallel jobs go: fewer simultaneous coordinates per recipe, more recipes explored at once.

Do not weaken the stopping rule when you do this. A campaign has not converged merely because the coordinates you happened to sweep this wave failed to improve. It has converged only after every active coordinate has been checked against the current center and no candidate clears `epsilon`. If you ration the within-round sweep, unswept coordinates remain debt, not evidence of convergence.

The ideal job shape is one independent run per candidate. This gives the lowest latency, makes failures isolated, and simplifies result accounting. If resources are scarce, shard candidates into fewer jobs, but preserve the logical candidate ledger.

## Choosing Candidate Values

Use grids that respect the geometry of the coordinate.

For positive scale parameters such as learning rate, Adam LR multiplier, or weight decay, use multiplicative spacing:

```text
x / r^2, x / r, x, x * r, x * r^2
```

For beta-like parameters near one, search in complement space:

```text
q = 1 - beta
```

Build a multiplicative grid in `q`, then map back:

```text
beta = 1 - q
```

This matches the fact that the effective timescale is controlled by `1 / (1 - beta)`. Linear beta grids waste resolution near high beta values.

Always include the center candidate in early rounds. It is not wasted: it measures run-to-run noise and tells you whether improvements are larger than evaluation variance.

## Selection Rule

For each coordinate, compute:

```text
best_j = best candidate score for coordinate j
gain_j = center_score - best_j
```

Accept the coordinate with the largest positive `gain_j`.

Do not accept multiple coordinates in the same round. Coordinate descent is a conservative optimizer: each accepted move should be justified by an experiment where all other coordinates were fixed.

If the best candidate is at a boundary, do not immediately declare the coordinate solved. Expand that coordinate in a later round or run a focused extension. Boundary wins are often the search telling you that the local grid was too timid.

If all gains are non-positive, stop. The method has converged relative to the current candidate generators and evaluation noise.

## Philosophy

Coordinate descent is a disciplined way to be greedy.

It does not pretend to understand the full loss surface. It asks a smaller question, answers it with parallel evidence, and moves one step. This makes it especially useful for optimizer tuning, where many knobs have intuitive roles but their interactions are hard to predict.

The discipline is more important than the algorithm:

- Keep the center fixed within a round.
- Keep the ledger complete.
- Accept one move.
- Preserve failed and stopped jobs, but score only completed results.
- Prefer interpretable progress to giant unstructured sweeps.
- Use dashboards to inspect the path, not just the final number.

The point is not to prove that a knob is globally optimal. The point is to build a recipe by making locally justified moves that remain reproducible.

## A Small Case Study

In a Qwen3 d12, 64K-batch Muon tuning run, the starting recipe was:

```text
matrix_lr=0.008
muon_momentum=0.95
adam_lr_multiplier=1.0
adam_beta1=0.8
weight_decay=0.20
score=0.862374
```

The coordinates were:

```text
matrix_lr
muon_momentum
adam_lr_multiplier
adam_beta1
weight_decay
```

The accepted path was:

```text
round 0: adam_lr_multiplier 1.0 -> 2.0      score 0.859786
round 1: adam_beta1         0.8 -> 0.683772 score 0.858858
round 2: adam_lr_multiplier 2.0 -> 4.0      score 0.856601
round 3: no improvement; stop
```

Final recipe:

```text
matrix_lr=0.008
muon_momentum=0.95
adam_lr_multiplier=4.0
adam_beta1=0.683772
weight_decay=0.20
score=0.856601
```

The main lesson is not merely that this final recipe won. The lesson is that the coupled assumption “auxiliary AdamW LR should track matrix LR with default Adam beta1” was wrong for this setting. Coordinate descent exposed that cleanly because Adam LR and Adam beta1 were each tested as separate coordinates against the same center.

## Minimal Ledger

A coordinate-descent run should leave behind:

```text
results/<experiment>/
  README.md
  state.json
  round_00_candidates.csv
  round_01_candidates.csv
  visualizations/
```

Each candidate row should record:

```text
round
coordinate
candidate index
full recipe values
job stamp
status
score
result path
```

The state file should record:

```text
center recipe
center score
candidate grids
best candidate per coordinate
accepted coordinate
accepted improvement
current recipe
stop reason
```
