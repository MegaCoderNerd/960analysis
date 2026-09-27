# AAR for 960analysis

This is the [Automated Alignment Researcher](https://github.com/YuehHanChen/automated_alignment_researcher)
task contract (`generic_aar`) pointed at Chess960 review quality. The official loop trains language
models and needs a GPU. Here the thing being optimized is this repo, and the evaluator is
`npm run aar`. No API key and no GPU.

The score is the same shape as the harness:

- hill-climbing benchmarks (`role: safety`) — `band_edges`, `opening_book`
- one held-out benchmark, written only to `aar/out/heldout/scores.json`
- a capability gate, `core_rules`, that must stay at 1

`headline_pct` is the geometric mean of closed fractions on the hill-climbing legs. At the current
code it is **+0%**: that is the baseline, not a failure. Raising both legs moves the headline.
The research-readable result is `aar/out/scores.json` (held-out removed).

```bash
npm run aar
```

Agents optimizing this repo should start from `aar/briefing.md` and leave `aar/secret/` unread.
The entry point under test is `classifyEngineMove` in `src/utils/reviewClassification.ts`.
