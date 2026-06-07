# Borrowing a Start Point: Scaling as a Prior, Not an Answer

Every campaign starts somewhere. The coordinate-descent chapter took the starting recipe `x_0` as given, but where `x_0` comes from is one of the highest-leverage decisions you make — because the cheapest gain is often not a move at all. It is starting closer to the optimum than you would have by default.

Scaling and transfer rules are how you start closer. They predict how good hyperparameters shift as the recipe changes: wider models, deeper models, larger batches, longer training, different data. Used well, they save you rounds of coordinate descent by placing `x_0` near the optimum for the new setting.

But every one of these rules is empirical, fitted on a limited set of observations, and valid only inside the regime where it was measured. So a scaling rule does not give you the answer. It gives you a **start point** and a **confidence**. Coordinate descent removes the residual the rule could not predict. The slogan for the whole chapter: transfer proposes, coordinate descent disposes.

## The Principle

A scaling rule is a function from a known good recipe at one scale to a predicted good recipe at another:

```text
x_0(new) = transfer(x*(old), recipe change)
```

Two things are true of this prediction at once. It is usually much better than a naive guess or a copied-over recipe — that is why you use it. And it is approximate, because it was fit on limited data and the new setting is never exactly the setting the rule was measured in. It lands you near the optimum, not on it.

This is precisely why coordinate descent is still needed after a transfer. The transfer collapses most of the distance; coordinate descent walks the rest. If you trust the transferred recipe as final, you are betting that an empirical rule extrapolated perfectly — a bet that the rule's own fitting error tells you not to make.

## What Transfers, And How Well

A short catalogue, ordered roughly by how much you can trust it, each with its caveat:

```text
width        (muP / muTransfer)   strong if the parametrization is right;
                                  fragile if it is not
batch <-> LR  (linear, then sat)  reliable up to a critical batch size,
                                  then the linear regime breaks
horizon      (token budget)       LR decay and weight decay both depend on
                                  training length; recipes drift with it
depth                             weaker than width, more recipe-dependent
data / arch                       weakest; treat as a hint, verify everything
```

The ordering is the useful part. Width transfer under a correct parametrization is something you can lean on; a recipe carried across a major architecture change is something you can only borrow loosely and must check. Knowing which kind of transfer you are doing tells you how hard to lean — which is the next section.

## Uncertainty Becomes Grid Radius

This is the operational heart of the chapter, and the thing that turns "the rule is empirical" from a disclaimer into a setting you can act on.

The confidence of a transfer sets the **radius of your first grid**. A strong, well-trusted transfer earns a tight grid around the predicted value, because you believe the optimum is close to the prediction and you would rather spend resolution than range. A weak or extrapolated transfer earns a wide grid, because the prediction might be off and you need range to catch the optimum if it moved more than the rule expected.

```text
strong prior (e.g. width via muP)   x_0 +/- small;  narrow grid, fine resolution
weak prior   (e.g. depth, new data) x_0 +/- large;  wide grid, coarse resolution
extrapolated beyond measured regime  treat as no prior; wide grid, verify health
```

This connects the three phases of a campaign into one motion. The scaling rule sets `x_0` and a confidence. The confidence sets the initial grid radius (the grid-design decision from the budget chapter). Coordinate descent then walks from that grid to the optimum. The empirical uncertainty of the rule is not hand-waved away; it is encoded directly as how far the first round looks.

## Composing Priors

When you change more than one recipe axis at once — wider *and* longer, say — the transfers compose, and so do their errors. Two approximate rules stacked give you a less certain start point than either alone, and the honest response is to widen the grids accordingly.

A safer pattern when several axes move together is to transfer along the axis you trust most, then sweep the most uncertain axis first under a deliberately wide grid. Do not let a tower of stacked extrapolations masquerade as a confident `x_0`. The composed prediction is a starting guess; its uncertainty is the sum of the parts, not the minimum.

## When Not To Transfer

A transferred start point is only worth using if it is at least as trustworthy as the baseline you would otherwise start from. Two cases where it is not:

- **Regime change beyond the rule's measurements.** Every scaling rule has a range it was fit in. Past that range, the prediction is an extrapolation with unknown error, and a bad extrapolated `x_0` can be worse than a known-okay baseline. When you are outside the measured regime, treat the rule as a hint and the grid as if you had no prior.
- **Assumption breakage.** Width transfer assumes a parametrization; batch-LR scaling assumes you are below the critical batch size. When the assumption that the rule rests on no longer holds, the rule does not degrade gracefully — it is simply wrong.

In both cases, before you build on a transferred `x_0`, run it through the health gate from the perception chapter. A transferred recipe is still just a recipe, and it can be sick. Confirm it is healthy and measure its noise floor before you start spending rounds around it.

## A Small Case Study

Take the tuned Qwen3 d12 Muon recipe from the earlier chapters as the known-good point at the old scale:

```text
x*(d12):  matrix_lr=0.008  adam_lr_multiplier=4.0  adam_beta1=0.683772
          muon_momentum=0.95  weight_decay=0.20
```

Now move to a wider model, d24, keeping the optimizer and data fixed. Transfer each coordinate according to how much you trust the rule for it:

```text
matrix_lr            width rule under muP-style parametrization -> strong prior
                     predicted x_0; narrow grid around it
adam_lr_multiplier   no clean width rule for the AdamW branch here -> weak prior
                     keep predicted value as center; wide grid
adam_beta1           timescale, not obviously width-dependent -> moderate prior
                     center on old value; medium grid
muon_momentum        carry over; medium grid
weight_decay         interacts with horizon, unchanged here -> carry over; narrow
```

The transfer gives a complete `x_0(d24)` and, more importantly, a per-coordinate grid radius that reflects how much each prediction can be trusted. Coordinate descent then starts from that seeded grid. The strong-prior coordinates are likely to confirm quickly and cheaply; the weak-prior coordinates — here, the AdamW LR multiplier — are where the residual lives, and the wide grid is what lets the first round catch it if it moved.

The lesson mirrors the earlier case study's lesson. There, coordinate descent decoupled a wrongly assumed coupling between the matrix LR and the AdamW branch. Here, the transfer makes the same humility structural: it leans hard on the coordinate it can predict (matrix LR via width) and admits up front that it cannot predict the AdamW branch, encoding that admission as a wide grid rather than a confident guess. The transfer does not pretend to know what it does not know. It hands the unknown part to coordinate descent.

## Philosophy

Scaling buys you a better starting point, cheaply, and that is its entire job. The discipline is in not asking it for more.

- A scaling rule predicts `x_0`, never `x*`. Coordinate descent removes the residual.
- Know which kind of transfer you are doing; it tells you how hard to lean.
- Encode the rule's empirical uncertainty as the radius of your first grid.
- Compose priors with their errors; stacked extrapolations are less certain, not more.
- Outside the measured regime, a transfer is a hint; verify health before building on it.

The empirical humility is not a weakness of the method. It is the method. A transfer that honestly reports its uncertainty, and a coordinate descent that cleans up what the transfer could not predict, is a stronger pair than either a blind sweep from defaults or a confident extrapolation believed too far.

## Minimal Ledger

Borrowing a start point adds the fields that make the campaign's opening assumptions auditable:

```text
per campaign:
  prior source           which scaling / transfer rule, fit in what regime
  predicted x_0          the transferred recipe, per coordinate
  confidence per coord   how much each prediction is trusted
  grid radius rationale  how confidence set each coordinate's initial range
  regime check           is the new setting inside the rule's measured range
```

Recording the prior is what lets a later reader — or a later you — tell the difference between a coordinate that coordinate descent confirmed and one it had to discover. A campaign that logs only the moves loses the reason its start point was where it was, and with it the ability to tell which of its assumptions held.
