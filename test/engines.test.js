// Run: node --test test/
// Checks the engine logic in index.html against fixtures generated from the AI Governance
// suite v3.9.8 workbooks and documents (scripts/generate-fixtures.py; sources and cells are
// named inside test/fixtures/suite-v3.9.8.json).
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.join(__dirname, "..");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const fx = JSON.parse(fs.readFileSync(path.join(__dirname, "fixtures", "suite-v3.9.8.json"), "utf8"));
const lo = JSON.parse(fs.readFileSync(path.join(__dirname, "fixtures", "libreoffice-checked.json"), "utf8"));

function loadEngines() {
  const m = html.match(/<script id="engine-logic">([\s\S]*?)<\/script>/);
  assert.ok(m, "engine-logic script block present");
  const ctx = { module: { exports: {} } };
  vm.createContext(ctx);
  vm.runInContext(m[1], ctx);
  return ctx.module.exports;
}
const E = loadEngines();
// values from the vm realm have foreign prototypes; compare as plain JSON
const plain = (x) => JSON.parse(JSON.stringify(x));
const KEYS = ["resident", "trust", "legal", "visibility", "strategic", "oversight"];
const IMP = ["resident", "legal", "reputational", "operational", "financial"];
const FLAG_KEYS = { "credential access": "credentialAccess", "external communication": "externalCommunication",
  delegation: "delegation", memory: "memory", persistence: "persistence", "tool discovery": "toolDiscovery",
  "goal adaptation": "goalAdaptation", "financial authority": "financialAuthority",
  replication: "replication", "self-modification": "selfModification" };

// ---------- Engine 1: AGPI (AIG-ASS-01) ----------
test("AGPI dimension labels and weights equal AIG-ASS-01 A10:B15", () => {
  assert.deepEqual(plain(E.AGPI_DIMS.map((d) => d.name)), fx.ass01.dimensions);
  assert.deepEqual(plain(E.AGPI_DIMS.map((d) => d.weight)), fx.ass01.weights);
  assert.equal(E.AGPI_DIMS.reduce((a, d) => a + d.weight, 0), 100);
});

test("on-screen AGPI labels and methodology table use the AIG-ASS-01 names", () => {
  for (const n of fx.ass01.dimensions) {
    assert.ok(html.includes(n.replace(/&/g, "&amp;")), `methodology names ${n}`);
  }
});

test("AGPI score and priority (with v3.8 floor) match AIG-ASS-01 B17 for all 15,625 combinations", () => {
  let i = 0, mism = 0;
  const combos = [1, 2, 3, 4, 5];
  for (const a of combos) for (const b of combos) for (const c of combos)
    for (const d of combos) for (const e of combos) for (const f of combos) {
      const s = { resident: a, trust: b, legal: c, visibility: d, strategic: e, oversight: f };
      const p = E.priority(s, false);
      if (Math.round(p.score * 100) !== fx.ass01.score_x100[i] || String(p.n) !== fx.ass01.priority[i]) mism++;
      i++;
    }
  assert.equal(i, 15625);
  assert.equal(mism, 0);
});

test("W-05: AGPI with a §4.4.6 trigger matches AIG-ASS-01 v1.4 B17 (trigger floor) for all 15,625 combinations", () => {
  assert.equal(fx.ass01.trigger_input.label, "Mandatory escalation trigger applies (Playbook §4.4.6)? (Yes / No / Unsure)");
  assert.deepEqual(fx.ass01.trigger_input.list, ["Yes", "No", "Unsure"]);
  let i = 0, mism = 0, raised = 0;
  const combos = [1, 2, 3, 4, 5];
  for (const a of combos) for (const b of combos) for (const c of combos)
    for (const d of combos) for (const e of combos) for (const f of combos) {
      const s = { resident: a, trust: b, legal: c, visibility: d, strategic: e, oversight: f };
      const p = E.priority(s, true);
      if (String(p.n) !== fx.ass01.priority_with_trigger[i]) mism++;
      if (fx.ass01.priority[i] === "5") raised++;
      i++;
    }
  assert.equal(i, 15625);
  assert.equal(mism, 0);
  assert.ok(raised > 0, "the trigger floor is exercised");
});

test("AGPI agrees with the LibreOffice-recalculated AIG-ASS-01 v1.4 sample (row 23 trigger No / Yes / Unsure)", () => {
  assert.ok(lo.ass01.length >= 60);
  for (const r of lo.ass01) {
    const s = Object.fromEntries(KEYS.map((k, j) => [k, r.scores[j]]));
    const p = E.priority(s, r.B23 !== "No");
    assert.ok(Math.abs(p.score - r.D16) < 1e-9, `score ${r.scores}`);
    assert.equal(p.label, r.B17, `priority ${r.scores} ${r.B23}`);
    assert.equal(p.reasons.includes("floor"), r.B21.startsWith("Priority floor applied"), `floor flag ${r.scores}`);
  }
  assert.ok(lo.ass01.some((r) => (r.B24 || "").startsWith("Trigger floor applied")));
});

test("priority floor: Resident or Legal = 5 lifts to Priority 2; score unchanged", () => {
  const s = { resident: 5, trust: 1, legal: 1, visibility: 1, strategic: 1, oversight: 1 };
  const p = E.priority(s, false);
  assert.equal(p.score, 25);
  assert.equal(p.band.n, 4);
  assert.equal(p.n, 2);
  assert.deepEqual(plain(p.reasons), ["floor"]);
});

test("trigger floor: a use with a §4.4.6 trigger cannot be Priority 5", () => {
  const s = { resident: 1, trust: 1, legal: 1, visibility: 1, strategic: 1, oversight: 1 };
  assert.equal(E.priority(s, false).n, 5);
  const p = E.priority(s, true);
  assert.equal(p.n, 4);
  assert.deepEqual(plain(p.reasons), ["trigger"]);
  // both rules: the higher priority results
  assert.equal(E.priority({ ...s, legal: 5 }, true).n, 2);
});

// ---------- Engine 2: risk (AIG-ASS-02) ----------
test("impact labels and order equal AIG-ASS-02 A23:A27", () => {
  assert.deepEqual(plain(E.IMPACTS.map((m) => m.name)), fx.ass02.impact_dimensions);
});

test("T-11: risk tiers match AIG-ASS-02 C38, C41, C42 and C43 over the full grid with all seven triggers (3,000 cases)", () => {
  let mism = 0;
  for (const [I, L, C, ev, trig, inhT, resT, eff] of fx.ass02.cases) {
    const impacts = Object.fromEntries(IMP.map((k, j) => [k, j === 2 ? I : 1]));
    const triggers = trig === "none" ? {} : { [trig]: true };
    const r = E.risk({ impacts, likelihood: L, control: C, evidence: ev, triggers });
    if (r.inherentTier !== inhT || r.residualTier !== resT || r.effectiveTier !== eff) mism++;
  }
  assert.equal(fx.ass02.cases.length, 3000);
  assert.equal(fx.ass02.triggers.length, 7);
  assert.equal(mism, 0);
});

test("risk agrees with the LibreOffice-recalculated AIG-ASS-02 sample", () => {
  assert.ok(lo.ass02.length >= 20);
  for (const r of lo.ass02) {
    const impacts = Object.fromEntries(IMP.map((k, j) => [k, r.impacts[j]]));
    const t = r.triggers_C50_C56;
    const triggers = { special: t[0] === "Yes", vulnerable: t[1] === "Yes", housingCare: t[2] === "Yes", novel: t[3] === "Yes",
      statutory: t[4] === "Yes", materialChange: t[5] === "Yes", agenticNoReview: t[6] === "Yes" || t[6] === "Unsure" };
    const evidence = !r.evidenced ? 0 : r.independent ? 2 : 1;
    const x = E.risk({ impacts, likelihood: r.L, control: r.C, evidence, triggers });
    assert.equal(x.inherent, r.C37);
    assert.ok(Math.abs(x.residual - r.C40) < 1e-9);
    assert.equal(x.inherentTier, r.C38);
    assert.equal(x.residualTier, r.C41);
    assert.equal(x.triggerFloor, r.C42);
    assert.equal(x.effectiveTier, r.C43, JSON.stringify(r));
  }
});

test("impact floor: Impact 5 x Likelihood 1 = 5 is governed as Medium (Playbook §4.4.4 example)", () => {
  const impacts = { resident: 5, legal: 1, reputational: 1, operational: 1, financial: 1 };
  const r = E.risk({ impacts, likelihood: 1, control: 5, evidence: 0, triggers: {} });
  assert.equal(r.inherent, 5);
  assert.equal(r.basisTier, "Low");
  assert.equal(r.effectiveTier, "Medium");
  assert.equal(r.floorReason, "impact");
});

test("residual between bands is classified at the higher band (Playbook §4.4.9 worked example 5.4 -> Medium)", () => {
  const impacts = { resident: 3, legal: 3, reputational: 2, operational: 2, financial: 1 };
  const r = E.risk({ impacts, likelihood: 3, control: 3, evidence: 1, triggers: {} });
  assert.ok(Math.abs(r.residual - 5.4) < 1e-9);
  assert.equal(r.effectiveTier, "Medium");
});

// ---------- Engine 3: agency (AIG-AGT-02 Tables A and B) ----------
test("Table A in the engine equals AIG-AGT-02 Table A", () => {
  assert.deepEqual(plain(E.TABLE_A), fx.agt02.table_a);
});

test("Table B floors in the engine equal AIG-AGT-02 Table B", () => {
  const base = { consequence: 0, autonomy: 0, authority: 0, reach: 0, controllability: 0, flags: {} };
  const tierOf = (a) => E.agency({ ...base, ...a }).tier;
  const B = fx.agt02.table_b;
  assert.equal(tierOf({ autonomy: 4, reach: 4 }), Math.max(B.B1.floor, 3));
  assert.ok(E.agency({ ...base, autonomy: 4, reach: 4 }).floors.some((f) => f.rule === "B1" && f.tier === B.B1.floor));
  assert.ok(E.agency({ ...base, consequence: 4, controllability: 4 }).floors.some((f) => f.rule === "B2" && f.tier === B.B2.floor));
  assert.equal(tierOf({ flags: { memory: true } }), B.C1.floor);
  assert.equal(tierOf({ flags: { externalCommunication: true } }), B.C1.floor);
  for (const f of ["persistence", "delegation", "toolDiscovery", "credentialAccess", "goalAdaptation"])
    assert.equal(tierOf({ flags: { [f]: true } }), B.C2.floor, f);
  assert.equal(tierOf({ flags: { financialAuthority: true } }), B.C3.floor);
  assert.equal(tierOf({ flags: { persistence: true }, autonomy: 3 }), B.C4.floor);
  assert.equal(tierOf({ flags: { delegation: true }, authority: 3 }), B.C4.floor);
  assert.equal(tierOf({ flags: { replication: true } }), B.C5.floor);
  assert.equal(tierOf({ flags: { selfModification: true } }), B.C5.floor);
  assert.equal(tierOf({ createsAgents: true }), B.C5.floor);
  assert.equal(tierOf({ escalationTrigger: true }), B.D1.floor);
  assert.equal(E.FLAGS.length, 10);
});

test("agency tier: all 7,776 profiles give max of Table A floors (no flags) and are monotonic", () => {
  const dims = E.AGENCY_DIMS;
  const R = [0, 1, 2, 3, 4, 5];
  let n = 0;
  for (const c of R) for (const au of R) for (const ah of R) for (const re of R) for (const ct of R) {
    const a = { consequence: c, autonomy: au, authority: ah, reach: re, controllability: ct, flags: {} };
    let exp = Math.max(...dims.map((k) => fx.agt02.table_a[k][a[k]]));
    if ([au, ah, re].filter((v) => v >= 4).length >= 2) exp = Math.max(exp, 4);
    if (c >= 4 && ct >= 4) exp = Math.max(exp, 5);
    const t = E.agency(a).tier;
    assert.equal(t, exp);
    for (const k of dims) if (a[k] < 5) assert.ok(E.agency({ ...a, [k]: a[k] + 1 }).tier >= t);
    n++;
  }
  assert.equal(n, 7776);
});

test("AIG-AGT-02 Table C calibration examples reproduce (agency tier, minimum, governing tier)", () => {
  const riskTier = { "1 Email-drafting copilot": "Low" };
  for (const ex of fx.agt02.calibration_examples) {
    const [consequence, autonomy, authority, reach, controllability] = ex.scores;
    const flags = Object.fromEntries(ex.flags.map((f) => [FLAG_KEYS[f], true]));
    const d1 = ex.rules_listed.join(",").includes("D1");
    const a = E.agency({ consequence, autonomy, authority, reach, controllability, flags, escalationTrigger: d1 });
    assert.equal(a.tier, ex.agency_tier, ex.example);
    const noReview = /R3/.test(ex.assumed_risk);
    const assumed = ex.assumed_risk.match(/^(Low|Medium|High|Critical)/)[1];
    const trig = /Critical/.test(ex.assumed_risk.split(";").slice(1).join(";")) ? "Critical" : /High \(/.test(ex.assumed_risk) ? "High" : "Low";
    const eff = E.TIERS[Math.max(E.rankOf(assumed), E.rankOf(trig)) - 1];
    const g = E.governing({ effectiveTier: eff }, "Yes", a.tier, noReview);
    const minExp = ex.agency_minimum;
    assert.equal(g.agencyMinimum === "None" ? "None" : g.agencyMinimum, minExp, ex.example + " minimum");
    assert.equal(g.tier, ex.governing_tier, ex.example + " governing");
  }
});

test("agency minimum pathway equals AIG-AGT-03 §6 (T0/T1 none, T2 Medium, T3 High, T4 High or Critical, T5 Critical)", () => {
  const mp = fx.agt03.minimum_pathway;
  const lab = (r) => (r === 0 ? "None" : E.TIERS[r - 1]);
  assert.ok(mp.T0.startsWith("None") && lab(E.agencyMinimum(0, false)) === "None");
  assert.equal(lab(E.agencyMinimum(1, false)), mp.T1);
  assert.equal(lab(E.agencyMinimum(2, false)), mp.T2);
  assert.equal(lab(E.agencyMinimum(3, false)), mp.T3);
  assert.ok(mp.T4.startsWith("High (Critical where actions run without evidenced per-action human review"));
  assert.equal(lab(E.agencyMinimum(4, false)), "High");
  assert.equal(lab(E.agencyMinimum(4, true)), "Critical");
  assert.equal(lab(E.agencyMinimum(5, false)), mp.T5);
  for (let t = 0; t <= 5; t++) assert.equal(E.AGENTIC_REQUIREMENT[t], fx.agt03.agentic_requirement["T" + t]);
});

test("W-09: agency minimum equals the AIG-ASS-02 v1.10 C82 agentic floor read by exact tier token, for every tier", () => {
  const lab = (r) => (r === 0 ? "None" : E.TIERS[r - 1]);
  const c82 = fx.ass02.agentic_floor_c82;
  for (let t = 0; t <= 5; t++) assert.equal(lab(E.agencyMinimum(t, false)), c82["T" + t], "T" + t);
  assert.equal(c82.T2, "Medium");
});

test("W-09: governing tier equals AIG-ASS-02 v1.10 C43 on the LibreOffice agentic grid (every tier, review Yes/No/Unsure, impact and trigger floors)", () => {
  const cols = lo.ass02_agentic.columns;
  let n = 0, conflicts = 0;
  for (const row of lo.ass02_agentic.cases) {
    const c = Object.fromEntries(cols.map((k, i) => [k, row[i]]));
    // A T5 (Critical) pathway entered with C56 = No is a workbook data-entry conflict (C82 "AGENTIC TRIGGER
    // CONFLICT", tier held at Incomplete); the simulation has no such entry state, so those rows are not compared.
    if (c.C82 === "AGENTIC TRIGGER CONFLICT") { assert.equal(c.agency, "T5"); conflicts++; continue; }
    const noReview = c.perActionReview !== "Yes";   // Unsure is treated as No (C56 Unsure -> Critical floor)
    const impacts = { resident: c.maxImpact, legal: 1, reputational: 1, operational: 1, financial: 1 };
    const triggers = { special: c.trigger.startsWith("C53"), statutory: c.trigger.startsWith("C54"), agenticNoReview: noReview };
    const r = E.risk({ impacts, likelihood: c.L, control: c.C, evidence: 0, triggers });
    const acting = c.agency !== "not action-capable";
    const g = E.governing(r, acting ? "Yes" : "No", acting ? Number(c.agency.slice(1)) : 0, noReview);
    assert.equal(g.tier, c.C43, JSON.stringify(c));
    if (acting && !noReview) assert.equal(g.agencyMinimum, c.C82, JSON.stringify(c));
    n++;
  }
  assert.equal(n + conflicts, 504);
  assert.equal(conflicts, 24);
});

test("W-09: the controlled T4 pathway wording no longer reads as Critical in AIG-ASS-02 v1.10 (S19)", () => {
  const w = lo.ass02_w09;
  assert.match(w["T4 wording used"], /^High \(Critical where actions run without evidenced per-action human review/);
  const reviewed = w["S19 T4, per-action review evidenced, DEC-01 controlled wording [new]"];
  assert.equal(reviewed.C82, "High");
  assert.equal(reviewed.C43, "High");
  const low = { effectiveTier: "Low" };
  assert.equal(E.governing(low, "Yes", 4, false).tier, reviewed.C43, "T4 with evidenced per-action review");
  const unreviewed = w["S19 T4, DEC-01 wording, NO per-action review (B40=Yes) [new]"];
  assert.equal(unreviewed.C43, "Critical");
  assert.equal(E.governing(low, "Yes", 4, true).tier, unreviewed.C43, "T4 without per-action review (C56 floor)");
});

test("T-11: all seven §4.4.6 triggers can be set; S07 (novel) gives High and Priority 4, S08 (vulnerable + housing) floors High", () => {
  const ids = [...html.matchAll(/class="trig-in" id="(t\d)"/g)].map((m) => m[1]);
  assert.deepEqual(ids.sort(), ["t1", "t2", "t3", "t4", "t5", "t6", "t7"]);
  assert.match(html, /var TRIGGER_KEYS = \{t1:"special", t4:"vulnerable", t5:"housingCare", t6:"novel", t2:"statutory", t7:"materialChange", t3:"agenticNoReview"\}/);
  const low = { resident: 1, legal: 1, reputational: 1, operational: 1, financial: 1 };
  for (const [key, floor] of [["special", "High"], ["vulnerable", "High"], ["housingCare", "High"], ["novel", "High"],
    ["statutory", "Critical"], ["materialChange", "High"], ["agenticNoReview", "Critical"]]) {
    const r = E.risk({ impacts: low, likelihood: 1, control: 1, evidence: 2, triggers: { [key]: true } });
    assert.equal(r.triggerFloor, floor, key);
    assert.equal(r.effectiveTier, floor, key);
  }
  // S07: pothole detection pilot, novel deployment, AGPI 2/2/2/2/3/2 (Priority 5 band), L3 I3 C3 not evidenced.
  const s07 = E.risk({ impacts: { resident: 2, legal: 2, reputational: 3, operational: 3, financial: 2 }, likelihood: 3, control: 3, evidence: 0, triggers: { novel: true } });
  assert.equal(s07.effectiveTier, "High");
  const p07 = E.priority({ resident: 2, trust: 2, legal: 2, visibility: 1, strategic: 2, oversight: 1 }, true);
  assert.equal(p07.band.n, 5);
  assert.equal(p07.n, 4);
  const s08 = E.risk({ impacts: low, likelihood: 1, control: 1, evidence: 2, triggers: { vulnerable: true, housingCare: true } });
  assert.equal(s08.effectiveTier, "High");
});

// ---------- Governing tier and priority/route separation ----------
test("governing tier = highest of risk tier (with floors) and agency minimum; Unsure = Yes; No = no minimum", () => {
  const low = { effectiveTier: "Low" };
  assert.equal(E.governing(low, "Yes", 3, false).tier, "High");
  assert.equal(E.governing(low, "Unsure", 3, false).tier, "High");
  assert.equal(E.governing(low, "No", 5, false).tier, "Low");
  assert.equal(E.governing(low, "Yes", 1, false).tier, "Low");
  assert.equal(E.governing(low, "Yes", 0, false).actionCapable, true);
  assert.equal(E.governing({ effectiveTier: "Critical" }, "Yes", 2, false).tier, "Critical");
  // T4 without evidenced per-action review -> Critical
  assert.equal(E.governing(low, "Yes", 4, true).tier, "Critical");
  // per-action review Unsure is treated as No -> the risk engine's agentic trigger floors Critical
  const r = E.risk({ impacts: { resident: 1, legal: 1, reputational: 1, operational: 1, financial: 1 },
    likelihood: 1, control: 1, evidence: 2, triggers: { agenticNoReview: true } });
  assert.equal(r.effectiveTier, "Critical");
});

test("the priority never enters the governing tier", () => {
  const src = html.match(/function governing\(([^)]*)\)/)[1];
  assert.doesNotMatch(src, /priority/i);
  assert.equal(E.priorityTierGap(1, "Medium"), true);
  assert.equal(E.priorityTierGap(1, "High"), false);
  assert.equal(E.priorityTierGap(2, "Low"), true);
  assert.equal(E.priorityTierGap(2, "Medium"), false);
});

test("no 'higher of priority route and risk-tier route' wording and no stale Playbook cites", () => {
  assert.doesNotMatch(html, /priority route/i);
  assert.doesNotMatch(html, /higher of (the )?priority/i);
  assert.doesNotMatch(html, /floor \(Playbook §4\.4\.8\)/);
  assert.doesNotMatch(html, /max\( ?autonomy, ?authority ?\)/);
  assert.doesNotMatch(html, /approval by the relevant forum under delegated authority/);
});

test("suite version line names v3.9.8 and the GOV-03 artefact versions", () => {
  assert.doesNotMatch(html, /suite v3\.9(?![.\d])/);
  assert.doesNotMatch(html, /v3\.9\.1/);
  for (const v of ["suite v3.9.8", "AIG-GOV-02 v19.9.17", "AIG-ASS-01 v1.4", "AIG-ASS-02 v1.10", "AIG-AGT-02 v1.6", "AIG-AGT-03 v1.5", "AIG-DEC-01 v1.12"]) {
    assert.ok(html.replace(/\s+/g, " ").includes(v.replace(/\s+/g, " ")), v);
  }
});

test("the page offers no downloads or exports (nothing to align to a workbook header)", () => {
  assert.doesNotMatch(html, /createObjectURL|download=|new Blob|navigator\.clipboard|\.csv|window\.print/);
});
