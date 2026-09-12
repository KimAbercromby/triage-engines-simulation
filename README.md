
# Triage Engines — How the answer is reached

An interactive simulation showing how an AI governance triage result is produced. Two independent engines run side by side: one calculates a **priority band**, the other a **residual risk tier**. Move any input and the arithmetic updates live, so you can see exactly how each number is reached and why blending the two into a single score would throw away what a governance team needs to see.

**Live tool:** https://kimabercromby.github.io/triage-engines-simulation/

## What it shows

- **Engine 1 — Priority (AGPI).** A weighted linear value model. Six dimensions scored 1–5, normalised, weighted, and summed to an index on 0–100, then banded into five priority levels. The three outward-facing dimensions carry 65 of the 100 points by design, so external consequences drive priority and internal factors only modulate it.
- **Engine 2 — Risk.** A likelihood-by-impact model that takes the worst of five impact categories rather than the average, then discounts for control effectiveness to give a residual figure. The governance tier is the residual tier — strong controls genuinely lower it — floored by any mandatory escalation trigger, so a known hazard (a statutory decision, unreviewed agentic action, special-category data and the rest) still forces a High or Critical pathway regardless of how low the residual score is.
- **Escalation triggers.** Seven hard gates sitting on top of both engines. Any single one floors the risk tier to at least High — to Critical for statutory decisions or unreviewed agentic action — and forces Board approval and comprehensive assurance regardless of the calculated scores, so specific known hazards can never be quietly scored into invisibility.
- **Full methodology.** A companion write-up explaining the maths, the sum-versus-maximum aggregation choice, why the two axes are kept separate, the honest limits of the method, and the references behind it.

The scoring logic mirrors the Multi-Board Triage Calculator. This tool is the explainer that sits alongside it.

## The tool suite

This is one of three companion tools:

- **[Triage Calculator](https://kimabercromby.github.io/AIGovernanceTriage-MultiBoard/)** — produces the actual priority and risk result for a system, with register and artefact-handoff exports.
- **[Lifecycle Walkthrough](https://kimabercromby.github.io/AIGovernanceWalkthrough-MultiBoard/)** — walks a system through the nine-stage governance lifecycle from intake to retirement.
- **Triage Engines Simulation** (this repo) — shows how the triage engines reach their answer.

## How it runs

A single self-contained HTML file. It runs entirely in the browser, stores no data, and has no dependencies. Decision support only: it structures human judgement, it does not replace it.

## Using it locally

Download `index.html` and open it in any web browser. Nothing else needed.
