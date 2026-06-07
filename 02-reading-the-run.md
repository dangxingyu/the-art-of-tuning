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

This is the load-bearing measurement of the whole handbook.

Re-run the current center recipe two or three times with different seeds. Record the spread of the metric. That spread is your **noise floor**, and it sets the minimum meaningful improvement `epsilon`:

```text
center reruns -> {s_1, s_2, s_3, ...}
noise_floor   = spread of the reruns (e.g. range, or ~2 * std)
epsilon       = noise_floor
```

`epsilon` is not a constant you pick for comfort. It is a number you measure. A gain below the noise floor is not a small win; it is no win at all, and accepting it means you have promoted variance to a recipe change.

Three sources of noise are worth separating, because they have different cures:

- **Seed noise**: initialization and data-order randomness. Cured only by averaging more runs or accepting a wider `epsilon`.
- **Evaluation noise**: variance in the eval set or metric itself. Cured by a larger or more stable eval.
- **Proxy gap**: your validation loss is a stand-in for something you actually care about. Watch for the proxy improving while the target does not — that is a different and more dangerous failure than noise.

Include the center candidate in early rounds, exactly as coordinate descent already recommends. It is never wasted compute: it re-measures the noise floor for free and tells you, every round, whether your gains are still larger than your variance.

## A Small Case Study

Return to the Qwen3 d12, 64K-batch Muon run from the coordinate-descent chapter. The starting center scored `0.862374`. Before trusting any move, re-run that center three times:

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

This is why the noise floor is load-bearing. Without it, round 1 looks like progress. With it, round 1 becomes a question — and answering that question is what separates a tuned recipe from a lucky one.

## Philosophy

Perception is the discipline of not lying to yourself with your own dashboard.

- Distinguish a sick run from a noisy measurement; they have opposite cures.
- Make every anomaly a threshold and every threshold a response.
- Measure the noise floor before you trust a gain, and re-measure it every round.
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
  noise floor            spread of center reruns
  epsilon                derived from the noise floor
  confirmation reruns    for any gain near the floor

per campaign:
  proxy metric           what validation loss stands in for
  target metric          what you actually care about, if different
```

The noise floor in particular is not bookkeeping. It is the number every later "is this real?" decision is measured against, and a campaign that does not record it cannot defend a single one of its moves.
