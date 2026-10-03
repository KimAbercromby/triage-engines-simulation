# Triage Engines: How the answer is reached

An interactive simulation showing how an AI governance triage result is produced.
Two independent engines run side by side for every system: one calculates a
**priority band**, the other a **risk tier**. A third engine, further
down, scores the **agency tier** for systems that can act. Move any input and the
arithmetic updates live, so you can see exactly how each number is reached and
why blending them into a single score would throw away what a governance team
needs to see.

**Live tool:** https://kimabercromby.github.io/triage-engines-simulation/

## What it shows

- **Engine 1: Priority (AGPI).** A weighted linear value model (AIG-ASS-01). Six dimensions
  scored 1 to 5, normalised, weighted 25/20/20/15/10/10, and summed to an index on 0 to 100, then
  banded into five priority levels. The three outward-facing dimensions carry 65 of the 100 points by
  design. A Resident Impact or Legal & Regulatory Exposure score of 5 lifts the priority to at least
  Priority 2, and a use with an escalation trigger cannot be Priority 5: the trigger floor makes it at
  least Priority 4 (AIG-ASS-01 v1.4 rows 23 and 24). The priority sets **urgency
  only**: how soon and in what order governance looks at the use. It never sets the route.
- **Engine 2: Risk.** A likelihood-by-impact model (AIG-ASS-02) that takes the worst of five
  impact categories rather than the average, then discounts for control effectiveness to give a
  residual figure. The tier follows the inherent score until the controls are implemented and evidenced
  (independently verified if the inherent tier is High or Critical), then the residual score, and is
  never below any mandatory escalation trigger floor (Playbook §4.4.6) or the impact floor (any
  confirmed impact of 5 sets at least Medium, Playbook §4.4.4).
- **Engine 3: Agency tier (for systems that can act).** Runs when the answer to "can it act?" is yes
  (Unsure is treated as yes). It scores five dimensions (consequence, autonomy, authority, reach and
  controllability, the last reversed so that 5 is effectively irreversible) and ten multiplier flags.
  Every score and flag sets a floor from the tier-assignment table (AIG-AGT-02 Tables A and B) and the
  highest floor is the agency tier, T0 to T5. The tier sets a minimum pathway (T0/T1 none, T2 Medium,
  T3 High, T4 High or Critical without evidenced per-action review, T5 Critical; AIG-AGT-03 §6).
- **Governing tier.** The route follows the highest of the risk tier (with its trigger and impact
  floors) and, for systems that can act, the agency minimum. The priority is not an input.
- **Escalation triggers.** All seven Playbook §4.4.6 triggers can be set (special category data,
  vulnerable residents, housing, care or homelessness decisions, novel deployment, statutory decisions,
  significant supplier, model, data or scope change, and action without evidenced per-action review).
  Any single one floors the risk tier (High, or Critical for statutory decisions or action without
  evidenced per-action review) and requires comprehensive assurance.
- **Full methodology.** A companion write-up explaining the maths, the
  sum-versus-maximum aggregation choice, the profile-not-sum logic of the agency
  engine, why the axes are kept separate, the honest limits of the method, and
  the references behind it.

The scoring logic follows the AI Governance suite v3.9.7 sources: AIG-ASS-01 v1.4,
AIG-ASS-02 v1.10, AIG-AGT-02 v1.6, AIG-AGT-03 v1.5, AIG-DEC-01 v1.10 and Playbook
AIG-GOV-02 v19.9.16. Rules marked Proposed in the suite are for Council confirmation.
This tool is the explainer that sits alongside the Triage Calculator.

## The tool suite

This is one of three companion tools:

- **[Triage Calculator and Router](https://kimabercromby.github.io/AIGovernanceTriage-MultiBoard/)**:
  produces the actual priority, risk and agency result for a system, with
  register and artefact-handoff exports.
- **[Lifecycle Walkthrough](https://kimabercromby.github.io/AIGovernanceWalkthrough-MultiBoard/)**:
  walks a system through the governance lifecycle from intake to retirement.
- **Triage Engines Simulation** (this repo): shows how the three engines reach
  their answer.

## How it runs

A single self-contained HTML file. It runs entirely in the browser, stores no
data, and has no dependencies. Decision support only: it structures human
judgement, it does not replace it.

## Using it locally

Download `index.html` and open it in any web browser. Nothing else needed.

## Tests

`node --test` checks the engine logic in `index.html` against fixtures generated from the v3.9.7
workbooks and documents (`python3 scripts/generate-fixtures.py <sources folder>`): all 15,625 AGPI
score combinations with and without a §4.4.6 trigger (AIG-ASS-01 v1.4 trigger floor), a 3,000-case
risk grid covering all seven triggers, the agency tier-assignment table over all 7,776 profiles,
and the AIG-AGT-02 calibration examples. `test/fixtures/libreoffice-checked.json` holds sample cases
recalculated in the real workbooks with LibreOffice: AIG-ASS-01 v1.4 score sets with the row 23
trigger answer No, Yes and Unsure, and a 504-case agentic grid that checks the governing tier against
AIG-ASS-02 v1.10 (C43, and the C82 agentic floor read by exact tier token), plus the T4 case with the
AIG-DEC-01 controlled pathway wording.
