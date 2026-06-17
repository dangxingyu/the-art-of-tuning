# Literature Grounding: Reading the Field Before the Run

Every other chapter spends compute to learn the local landscape. This one spends none. Before you launch a single job, the published record already holds thousands of runs other people paid for, and many of them say something about where gains and dangers live.

Literature grounding is the act of converting that record into a prior over nuisance coordinates: which knobs are likely sensitive, which defaults are regime-bound, which values should start narrow, which should start wide, and which knobs are not scalars at all but schedules or stability mechanisms.

The discipline is the same humility the scaling chapter already insisted on: a paper reports an optimum found in *its* setting, not yours. The published record is a prior, valid in the regime it was measured, never an answer. Read it to aim the first grid; let coordinate descent dispose of the residual.

## The Principle

For this handbook, literature does three jobs:

```text
sensitivity prior   which nuisance coordinates deserve budget first
                    -> feeds the coordinate ranking
start point         field defaults and transfer rules for x_0
                    -> feeds the borrowed start point
schedule + danger   which knobs want a schedule, and which fail loudly
                    -> feeds grid design and the health gate
```

Each job must come with a regime check. A published value was measured under a parametrization, optimizer, batch size, precision, horizon, model class, and data distribution. If your setting differs, the prior gets weaker and the first grid gets wider.

The useful unit is not a citation by itself. It is a source card:

```text
claim        what the paper says
regime       where it was measured
coordinate   which nuisance knob it informs
confidence   narrow grid | medium grid | wide grid | do not transfer
caveat       what would make the claim stop applying
```

Without the regime and caveat, a borrowed value is indistinguishable from a guess.

## What The Literature Tells You

Three kinds of information are worth mining deliberately.

### Which Coordinates Are Sensitive

Learning rate is the most robustly sensitive coordinate. That is the premise behind several transfer and scaling papers: if a parametrization lets the learning-rate optimum remain stable across width, it saves a large amount of tuning. Yang et al. (2022) make this the central promise of μP / μTransfer, while Everett et al. (2024) sharpen the picture by showing that per-layer learning-rate prescriptions and optimizer details can change what transfers.

Adam's timescale and numerical knobs are more regime-specific:

```text
learning rate     usually first-order sensitive
adam beta2        often a stability / spike-recovery knob at scale
adam beta1        often lower priority, but still a timescale coordinate
adam epsilon      usually invisible until scale, precision, or
                  parameterization makes it visible
optimizer-specific each optimizer paper names its own dangerous knob
```

Two large-language-model examples are useful because they show the default `beta2 = 0.999` is not a law. GPT-3 used Adam with `beta1 = 0.9`, `beta2 = 0.95`, and `epsilon = 1e-8` (Brown et al., 2020). RoBERTa reports that `beta2 = 0.98` improved stability for large-batch pretraining, while also noting sensitivity to Adam epsilon (Liu et al., 2019). The conclusion is not "always lower beta2." The conclusion is narrower: at large batch or long horizon, beta2 is a real stability coordinate and should not be silently inherited from small-run defaults.

Epsilon is the same kind of warning in a different direction. Everett et al. (2024) show that Adam epsilon can underflow relative to gradient scale as models grow, that scaling epsilon correctly matters, and that their Adam-atan2 variant eliminates epsilon entirely. This does not mean epsilon should enter every small grid. It means that when scale, precision, or parametrization changes, treating epsilon as forever negligible can be wrong.

When adopting a new optimizer, its own paper is the highest-value read because it usually tells you which coordinate moves away from AdamW muscle memory. Lion is the clean example: Chen et al. (2023) state that Lion's sign update has larger norm, so a suitable learning rate is typically 3-10x smaller than AdamW, and the decoupled weight decay should be 3-10x larger to keep similar effective strength `lr * lambda`. That is not a universal optimizer theorem; it is a source-specific prior for Lion.

### Which Knobs Want A Schedule, Not A Constant

Some coordinates are schedules or training dynamics in disguise.

```text
learning rate   warmup + decay, not one scalar
adaptive term   early adaptive-LR variance can need warmup or rectification
weight decay    decoupled decay is multiplied by LR, so its effective
                strength changes with the LR schedule
```

Learning-rate warmup is the obvious case, but the useful part is *why*. RAdam (Liu et al., 2020) argues that Adam's adaptive learning rate has undesirably large variance early in training and interprets warmup as variance reduction. That connects warmup to the adaptive timescale, not only to the step size.

Weight decay is also more than a static regularization coefficient. For decoupled weight decay, the shrinkage is applied through the optimizer step, so the effective strength is tied to `lr * lambda`; Lion's tuning notes make this explicit when explaining why Lion's smaller LR wants a larger weight-decay coefficient (Chen et al., 2023). D'Angelo, Andriushchenko et al. (2024) go further: in modern deep learning, weight decay often changes optimization dynamics rather than acting as a classical capacity penalty. In their LLM experiments, it modulates an effective learning-rate / bias-variance tradeoff and can prevent bfloat16 loss divergence. That makes weight decay a dynamics and stability coordinate, not merely a regularizer slider.

The operational lesson is simple: if the literature treats a knob as a schedule or stability mechanism, do not flatten it into a single scalar too early. Adopt the known shape when the regime matches, or tune the parameters of the shape: warmup length, decay form, end LR, weight-decay schedule, or which parameter groups receive decay.

### Which Transfer Rules Exist And Their Regimes

Transfer rules are literature distilled into a start point. The most useful part is not just the predicted value, but the regime in which the prediction is credible.

```text
width via μP       strong prior only if the parameterization is implemented
                   correctly (Yang et al., 2022)
batch -> LR        linear scaling + warmup below the useful-batch regime;
                   critical batch size is problem dependent
                   (Goyal et al., 2017; McCandlish et al., 2018)
horizon            short-run optimizer conclusions may transfer loosely;
                   LR schedules transfer weakly and need confirmation
optimizer branch   hybrid optimizers may need deliberate update-scale matching
```

The batch rule is a good example of regime discipline. Goyal et al. (2017) show that large-minibatch ImageNet training can use a linear learning-rate scaling rule plus gradual warmup up to very large batches. McCandlish et al. (2018) explain why that cannot extend forever: the gradient noise scale predicts the largest useful batch size at the order-of-magnitude level, after which more batch buys little speedup. So "scale LR with batch" is not a magic formula; it is a prior inside a useful-batch regime.

Recent parameterization work also warns against memorizing a single transfer story. Yang et al. (2022) show that μP enables zero-shot hyperparameter transfer across width when the parameterization is right. Everett et al. (2024) show that per-layer learning-rate prescriptions, alignment assumptions, optimizer choice, and Adam epsilon can all affect whether transfer actually works. The correct takeaway is not "μP is obsolete" or "any parameterization works." It is that transfer is an implementation-sensitive prior whose confidence depends on the full recipe, including optimizer numerics.

Muon gives a concrete optimizer-branch example. Jordan (2024) defines Muon as an optimizer for 2D hidden-layer parameters and recommends standard optimizers such as AdamW for scalar/vector parameters, embeddings, and heads. Liu et al. (2025) then identify two large-scale fixes: adding weight decay and matching Muon's update RMS to AdamW's typical update RMS, roughly `0.2-0.4`, so that learning rate and weight decay can be shared more sensibly across the Muon and AdamW branches. That literature would not give the final `adam_lr_multiplier`; it would tell you that branch update scale is a high-priority coordinate, not a detail to assume away.

## From Literature To Grid

Grounding is only useful if it changes what you launch. Convert each source card into a grid decision:

```text
sensitive coordinate
  high priority, enough range to expose a real optimum

field default in matching regime
  center on it, narrow first grid

field default outside regime
  use as a hint, wide first grid, verify health

schedule knob
  adopt the known schedule shape or tune schedule parameters

stability knob
  include health thresholds and infeasible-run handling
```

This is the same radius-from-confidence rule used in the scaling chapter. A value the field has strong, in-regime agreement on earns a narrow grid. A value borrowed from a paper whose setting differs from yours earns a wide grid. A value tied to a failed assumption earns no special privilege at all.

## The Trap: Cargo-Culting Defaults

The danger of literature grounding is copying a number out of its regime and treating it as law. Every default is conditional.

`beta2 = 0.999` is a reasonable Adam default in many settings, but GPT-3 and RoBERTa are reminders that large-scale recipes often choose lower beta2 values. A learning rate from a μP paper assumes the μP implementation and the associated parameter multipliers. Lion's learning-rate scale is not AdamW's. Muon's matrix branch is not the AdamW branch. Adam epsilon can be invisible in one regime and load-bearing in another.

The most expensive version of cargo-culting is importing a coupled assumption: believing two knobs move together because a paper set them together. That is precisely the "auxiliary AdamW LR tracks the matrix LR with default Adam beta1" assumption the coordinate-descent case study had to break. The literature can plant that assumption as easily as it can correct it; grounding is reading it critically enough to tell which it is doing.

## A Small Case Study

Return one last time to the Qwen3 d12, 64K-batch Muon run. The earlier chapters launched it and discovered its shape by coordinate descent. Ask instead: before round 0, what does the literature already say about this recipe?

```text
muon_momentum       Muon implementations commonly use momentum around 0.95;
                    Liu et al. (2025) report no consistent gain from tuning it
                    and choose 0.95 -> strong prior, narrow grid

weight_decay        original Muon omitted weight decay, but Liu et al. (2025)
                    find it crucial for large-scale Muon -> real coordinate

adam_lr_multiplier  Muon applies to matrix parameters while AdamW handles
                    embeddings, heads, and scalar/vector parameters; Liu et al.
                    (2025) match update RMS so branch scales are deliberate
                    -> high-priority, high-uncertainty coordinate

adam_beta1 / beta2  LLM recipes and RAdam-style analyses make timescales
                    stability-sensitive; beta2 is especially worth watching
                    for spikes and long-horizon behavior
```

The coordinate-descent chapter discovered by sweeping that the AdamW LR multiplier wanted to be much higher than the naive "track the matrix LR" coupling implied: `1.0 -> 2.0 -> 4.0`. Literature grounding would not have replaced that sweep, but it would have changed the prior. It would have ranked `adam_lr_multiplier` as a high-uncertainty, high-priority coordinate before round 0, because the two optimizer branches do not have identical update semantics. Meanwhile, the small `adam_beta1` move is consistent with beta1 being a lower-priority timescale coordinate in this particular campaign, not proof that beta1 never matters.

The lesson mirrors every earlier case study. Literature proposes the ranking and defaults; coordinate descent disposes of the residual. Reading the field first does not replace the runs. It aims them.

## Philosophy

Literature grounding is the cheapest evidence you will ever use, and the easiest to misuse.

- Convert literature into a prior over nuisance coordinates, not a set of answers.
- Attach every borrowed value to its source, regime, and caveat.
- Let source confidence set grid radius: narrow for in-regime agreement, wide for extrapolation.
- Some knobs are schedules or stability mechanisms, not plain scalar coordinates.
- When you adopt an optimizer, its own paper usually names the sensitive knob; believe it as a prior, verify it as a measurement.
- Cargo-culting a default out of its regime plants the coupled assumptions that coordinate descent then has to pay to break.

## Minimal Ledger

Grounding adds the fields that make a campaign's opening prior auditable:

```text
per campaign:
  source cards          claim, regime, coordinate, confidence, caveat
  sensitivity prior     which coordinates the literature flags as sensitive
  established defaults  field-converged values used as centers, each with
                        source and measured regime
  schedule notes        knobs the literature schedules and the shape adopted
                        or tuned
  transfer rules used   which scaling rules seed the start point, with regime
  regime check          whether our setting is inside each cited regime
```

The field to insist on is the regime and source for every borrowed number. A default without its regime is indistinguishable from a guess, and the ledger is what lets a later reader tell a grounded prior from a cargo-culted one.

## Key References

- Loshchilov & Hutter, *Decoupled Weight Decay Regularization* (AdamW), ICLR 2019 — [arXiv:1711.05101](https://arxiv.org/abs/1711.05101)
- Brown et al., *Language Models are Few-Shot Learners* (GPT-3), NeurIPS 2020 — [arXiv:2005.14165](https://arxiv.org/abs/2005.14165)
- Liu et al., *RoBERTa: A Robustly Optimized BERT Pretraining Approach*, 2019 — [arXiv:1907.11692](https://arxiv.org/abs/1907.11692)
- Liu et al., *On the Variance of the Adaptive Learning Rate and Beyond* (RAdam), ICLR 2020 — [arXiv:1908.03265](https://arxiv.org/abs/1908.03265)
- Yang et al., *Tensor Programs V: Tuning Large Neural Networks via Zero-Shot Hyperparameter Transfer* (μP / μTransfer), 2022 — [arXiv:2203.03466](https://arxiv.org/abs/2203.03466)
- Goyal et al., *Accurate, Large Minibatch SGD: Training ImageNet in 1 Hour*, 2017 — [arXiv:1706.02677](https://arxiv.org/abs/1706.02677)
- McCandlish et al., *An Empirical Model of Large-Batch Training*, 2018 — [arXiv:1812.06162](https://arxiv.org/abs/1812.06162)
- Chen et al., *Symbolic Discovery of Optimization Algorithms* (Lion), 2023 — [arXiv:2302.06675](https://arxiv.org/abs/2302.06675)
- D'Angelo, Andriushchenko et al., *Why Do We Need Weight Decay in Modern Deep Learning?*, NeurIPS 2024 — [arXiv:2310.04415](https://arxiv.org/abs/2310.04415)
- Everett et al., *Scaling Exponents Across Parameterizations and Optimizers*, ICML 2024 — [arXiv:2407.05872](https://arxiv.org/abs/2407.05872)
- Jordan, *Muon: An optimizer for hidden layers in neural networks*, 2024 — [blog](https://kellerjordan.github.io/posts/muon/)
- Liu et al., *Muon is Scalable for LLM Training*, 2025 — [arXiv:2502.16982](https://arxiv.org/abs/2502.16982)
