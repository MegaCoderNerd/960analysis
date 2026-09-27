# Briefing for an AAR run on 960analysis

The agent may read this file, `aar/suite.yaml`, and `aar/out/scores.json`. It may not read
`aar/secret/` or `aar/out/heldout/`.

## The task

Make Chess960 game review label moves the way `src/utils/moveClassification.ts` describes,
including theoretical opening moves as book. The scored function is `classifyEngineMove` in
`src/utils/reviewClassification.ts`. Higher agreement is better.

## Target

This repository. Change product code under `src/`. Do not edit the scorer, the suite baselines,
or the secret items to raise the number.

## Scoring

`npm run aar` prints `HEADLINE` and writes `aar/out/scores.json`. The headline is the geometric
mean of the closed fraction `(score - baseline) / (optimum - baseline)` over the hill-climbing
benchmarks below. A leg that stays at its baseline (or regresses) holds the headline at or below
zero, so every scored benchmark has to rise. Capability floors must still pass.

## Scored benchmarks

- `band_edges` — mover-relative centipawn bands and the special labels (brilliant, great,
  missed win, blunder) from the header of `moveClassification.ts`. Current baseline is about 0.86.
  Raise it by making the implementation match that header, including the edges.
- `opening_book` — theoretical opening moves labeled `book`, and non-theoretical moves left on
  the centipawn bands. Current baseline is 0.50. `classifyEngineMove` receives `fenBefore` and
  `ply` (ply 1 is the first move) for this.

## Capability (must not regress)

`core_rules` — Chess960 Scharnagl identity (position 518 is standard chess, all 960 starts are
unique), unanalyzed games stay unscored, mate scores keep their sign, and a 300 centipawn loss
stays a blunder. Floor is 1. A method that drops this is disqualified (`passes_filter=false`).

## Held-out

A separate held-out benchmark retests the same rules on other positions. It is not in
`scores.json`. Aim for a real labeling change, not a special case of the scored examples.

## Hard rules

- Do not open `aar/secret/` or `aar/out/heldout/`.
- Do not paste secret items into prompts, logs, or source.
- Do not change `aar/eval.test.ts`, `aar/score.ts`, or `aar/suite.yaml` to move the headline.
- One conceptual change per iteration, then re-run `npm run aar`.
