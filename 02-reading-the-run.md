# Reading the Run: Perception Before Movement

Coordinate descent tells you how to move. It does not tell you whether the number you are about to move on is real. That is a separate skill, and it comes first.

Before you can choose a move, you have to trust your eyes. Two different failures hide here, and they demand opposite responses:

- The run is **sick**: it diverged, spiked, produced NaNs, or its gradients exploded or died. The recipe is broken. This is a repair problem, and no amount of tuning around it will help.
- The run is **healthy**, but the difference you are excited about is **smaller than your evaluation noise**. The recipe is fine; your measurement is not. This is a perception problem, and the fix is to measure variance before chasing gains.

Both failures produce confident nonsense if you skip this chapter. The first makes you tune a corpse. The second makes you accept noise as signal and build a recipe on sand.

## The Principle

Every tuning round rests on a comparison: candidate score against center score. That comparison is only meaningful if two things hold. The runs must be **healthy**, so that the score reflects the recipe and not a failure mode. And the difference must **exceed run-to-run noise**, so that it reflects the change you made and not the seed you drew.

Perception is the cheapest experiment you will run. It costs a dashboard and a handful of repeated center runs, and it protects every expensive comparison that follows. Skipping it does not save compute; it spends compute on conclusions you cannot trust.

## What To Look At

Watch the smallest set of signals that can distinguish the two failures:

```text
train loss            divergence, plateau at init value
validation loss       the objective; proxy vs target
gradient norm         explosion, collapse, sudden steps
update / param ratio  effective step size per layer
actual learning rate  schedule sanity, warmup applied
throughput / MFU      silent slowdowns, stragglers, OOM recovery
```

This is not a monitoring philosophy. It is the minimum needed to answer one question per signal: is this run sick, and if not, is this difference real? Add more only when a specific recipe gives you a specific reason to.

## Detecting an Unhealthy Run

A sick run usually announces itself in one of a few ways. For an agent, each signature must be a threshold, not a glance at a curve:

```text
divergence        val loss rises for n consecutive evals
loss spike        step-over-step increase > k * running_std for m steps
non-finite        any NaN or Inf in loss or gradient
grad explosion    grad norm > c * running_median, sustained
grad collapse     grad norm -> 0 while loss is still high
dead start        loss never leaves its initialization value
```

The exact constants depend on the recipe and should live in the ledger, not in your head. The point is that "I'll know it when I see it" does not survive contact with an agent or with a thousand parallel jobs. Make the signature explicit.

## The Response Rule

Detection without a response is half a loop. Each signature must map to an action, or the dashboard is just decoration:

```text
single transient spike      let it ride; flag and keep watching
sustained spikes            lower LR and resume from last good checkpoint
divergence                  abort; the recipe is broken -> repair, do not tune
non-finite                  abort immediately; check init, LR, mixed precision
grad explosion              lower LR or add/raise clipping; this is repair
grad collapse / dead start  abort; the recipe cannot learn -> repair
healthy but gain < noise    do not accept; this is the next section
```

The dividing line is simple. Anything that means *the recipe cannot produce a trustworthy score* sends you out of the tuning loop and into repair. Coordinate descent assumes a viable baseline; an unhealthy run is the case where that assumption is false, and tuning is the wrong tool until the run is healthy again.

## The Noise Floor

This is the load-bearing scale estimate of the whole handbook.

Before treating a score difference as real, know the noise scale of this run family. The clean way to measure it is to rerun the same recipe with different seeds and record the spread, but that is not a ritual every agent should perform before every move. Often you only need a rough calibration: a few historical reruns, a center candidate repeated in an early round, or prior knowledge from the same benchmark and scale.

```text
same-recipe scores -> {s_1, s_2, s_3, ...}   if available
noise_floor        = rough spread of that run family
epsilon            = at least that scale
```

`epsilon` is not a constant you pick for comfort. It is tied to the noise scale of the setting. A gain below the noise floor is not a small win; it is no win at all, and accepting it means you have promoted variance to a recipe change.

Three sources of noise are worth separating, because they have different cures:

- **Seed noise**: initialization and data-order randomness. Handled by knowing its rough scale, using a wider `epsilon`, and occasionally confirming a close call when it matters.
- **Evaluation noise**: variance in the eval set or metric itself. Reduced by a larger or more stable eval.
- **Proxy gap**: your validation loss is a stand-in for something you actually care about. Watch for the proxy improving while the target does not — that is a different and more dangerous failure than noise.

Include the center candidate in early rounds when the budget allows. It is not wasted compute: it gives a cheap refresh of the noise scale and tells you whether the apparent gains are even in the right order of magnitude.

The important thing is scale awareness. In some small but noisy settings, the noise floor is large enough to dominate many plausible tuning gains. For example, in a nanoGPT speedrun track-3 style run, changing only the seed can move the score on the order of `1e-3`. That is enormous if your candidate gains are also `1e-3`. A different benchmark, model size, horizon, or eval protocol can have a different noise scale, so do not borrow the number blindly; borrow the habit of asking what scale a one-run result can support.

## Run Noise And Search Noise

Multiple runs can estimate one kind of randomness: the score of a fixed recipe. If the same recipe lands at different losses under different seeds, data orders, dropout masks, or nondeterministic kernels, reruns reveal the spread. But the point is not to turn every tuning decision into an averaging protocol. The point is to know whether a claimed gain is bigger than the noise a single run can plausibly produce.

There is a second kind of randomness that coordinate descent does not fully solve: the randomness of the tuning path itself. A different candidate grid, a different order of coordinates, a different short-run proxy, or a lucky first-round boundary win can send the campaign through a different sequence of accepted moves. This is not only seed noise; it is search noise. It belongs to the hyperparameter procedure, not just to the training run.

This handbook mostly treats search noise as a scope boundary. Coordinate descent is a disciplined local procedure, not a guarantee that one campaign found the unique best recipe. The practical response is narrower:

- Use literature and earlier rounds to identify which coordinates are sensitive enough to deserve budget.
- Use the acceptance threshold `epsilon` so a coordinate move must beat the estimated run-noise scale before it changes the recipe.
- Confirm gains near the threshold only when the move matters enough to justify the extra compute.
- Record unswept coordinates, fixed coordinates, boundary wins, and search-space changes as caveats in the ledger.

In other words, repeated runs are a calibration tool, not the default operating mode. They do not, by themselves, make the whole tuning path unique. The aim here is to make each accepted local move defensible and to leave enough evidence that a later campaign can see which coordinates mattered and which uncertainties remain.

## A Small Case Study

Return to the Qwen3 d12, 64K-batch Muon run from the coordinate-descent chapter. The starting center scored `0.862374`. In a careful calibration pass, we might re-run that center three times:

```text
center reruns: 0.862374, 0.863102, 0.861855
spread:        ~0.00125
epsilon:       ~0.0012
```

Now look back at the accepted path with the noise floor in hand:

```text
round 0: adam_lr_multiplier 1.0 -> 2.0      gain 0.002588   clears epsilon
round 1: adam_beta1         0.8 -> 0.683772 gain 0.000928   below epsilon
round 2: adam_lr_multiplier 2.0 -> 4.0      gain 0.002257   clears epsilon
```

Rounds 0 and 2 are comfortable: their gains are roughly twice the noise floor. Round 1 is exactly the case this chapter exists to catch. A gain of `0.000928` against a noise floor of `0.0012` is not, on its own, a defensible move — it is inside the variance.

The correct response is not to discard round 1, and not to accept it blindly. It is to run a confirmation: re-run that candidate two or three times and check whether it sits consistently below the center. If it does, the move is real and you accept it. If it straddles the center, it was noise wearing the costume of signal, and you let it go. The single number could not tell you which; the noise floor told you that you had to ask.

Here the confirmation came back clean:

```text
round-1 center   (adam_beta1 = 0.8):        0.859786
candidate reruns (adam_beta1 = 0.683772):   0.858858, 0.858940, 0.858705
```

No single rerun beats the center by more than the noise floor, yet all three land below it. That consistency is the signal one run could not give: the move is small but real, so we accept `adam_beta1 = 0.683772` and carry it into the final recipe the later chapters build on. Had the reruns straddled `0.859786`, it would have been noise, and we would have kept `adam_beta1 = 0.8`.

This is why the noise floor is load-bearing. Without it, round 1 looks like progress. With it, round 1 becomes a question — and answering that question is what separates a tuned recipe from a lucky one.

## Philosophy

Perception is the discipline of not lying to yourself with your own dashboard.

- Distinguish a sick run from a noisy measurement; they have opposite cures.
- Make every anomaly a threshold and every threshold a response.
- Know the noise scale before you trust a gain, and refresh it when the budget or stakes justify it.
- Separate run noise from search noise; rough calibration gives scale, not a unique tuning path.
- When a gain sits inside the noise, do not accept it — confirm it or drop it.
- Treat the proxy gap as more dangerous than noise, because it survives averaging.

Coordinate descent is greedy on a number. This chapter is what makes the number worth being greedy about.

## Minimal Ledger

Reading the run adds a few fields to the ledger that coordinate descent did not need:

```text
per run:
  health status          healthy | spiked | diverged | non-finite | ...
  response taken         none | resumed | aborted | reseeded | ...

per round:
  noise floor            estimated spread from same-family evidence
  epsilon                derived from the noise floor
  confirmation reruns    optional, for important gains near the floor
  search caveats         unswept coordinates, boundary wins, changed grids

per campaign:
  proxy metric           what validation loss stands in for
  target metric          what you actually care about, if different
  sensitive coordinates  coordinates believed important enough to budget for
```

The noise floor in particular is not bookkeeping. It is the scale every later "is this real?" decision is measured against, and a campaign that does not record or estimate it cannot defend a single one of its moves.
