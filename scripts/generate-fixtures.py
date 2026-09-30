#!/usr/bin/env python3
"""Generate test/fixtures/suite-v3.9.json from the AI Governance suite v3.9 sources.

Usage:  python3 scripts/generate-fixtures.py <folder holding the v3.9 .xlsx/.docx sources>

Reads (read-only):
  AIG-ASS-01_AGPI_Triage_Tool_Proposed.xlsx          sheet "AGPI Triage" A10:B15 (dimensions, weights), B17 thresholds
  AIG-ASS-02_AI_Risk_Assessment_Worksheet_Proposed.xlsx sheet "Risk Assessment" A23:A27 (impact dimensions), C37:C43
  AIG-AGT-02_Agentic_Classification_Reference.docx   Table A (per-dimension floors), Table B (rules), Table C (examples)
  AIG-AGT-03_Agentic_Triage_Function_Spec.docx       §6 agency tier -> minimum risk-tier pathway table

The expected grids are computed with a direct transcription of the workbook formulas
(ASS-01 D10:D16 and B17; ASS-02 C28, C37-C43 and E41). The transcription was checked
against LibreOffice recalculation of the real v3.9 workbooks on 54 sampled cases
(boundary scores, priority-floor cases, all evidence states, trigger and impact floors)
with 0 mismatches; those cases are stored in test/fixtures/libreoffice-checked.json.
"""
import itertools, json, os, re, sys

import docx
import openpyxl

SRC = sys.argv[1] if len(sys.argv) > 1 else "."
OUT = os.path.join(os.path.dirname(__file__), "..", "test", "fixtures", "suite-v3.9.json")
TIERS = ["Low", "Medium", "High", "Critical"]
F01 = "AIG-ASS-01_AGPI_Triage_Tool_Proposed.xlsx"
F02 = "AIG-ASS-02_AI_Risk_Assessment_Worksheet_Proposed.xlsx"
F_AGT02 = "AIG-AGT-02_Agentic_Classification_Reference.docx"
F_AGT03 = "AIG-AGT-03_Agentic_Triage_Function_Spec.docx"


def ass01():
    wb = openpyxl.load_workbook(os.path.join(SRC, F01))
    ws = wb["AGPI Triage"]
    dims = [ws[f"A{r}"].value for r in range(10, 16)]
    weights = [round(ws[f"B{r}"].value * 100) for r in range(10, 16)]
    b17 = ws["B17"].value
    version = wb["Document Control"]["B7"].value
    assert 'IF(D16>=80,"Priority 1 – Critical",IF(OR(D16>=60,C10=5,C12=5),"Priority 2 – High"' in b17, "B17 changed"
    scores, prios = [], []
    for sc in itertools.product(range(1, 6), repeat=6):
        d16 = sum((c - 1) / 4 * w for c, w in zip(sc, weights))
        if d16 >= 80: p = 1
        elif d16 >= 60 or sc[0] == 5 or sc[2] == 5: p = 2
        elif d16 >= 40: p = 3
        elif d16 >= 20: p = 4
        else: p = 5
        scores.append(round(d16 * 100))
        prios.append(str(p))
    return {"source": f"{F01} (version {version}), sheet 'AGPI Triage', A10:B15, D10:D16, B17",
            "dimensions": dims, "weights": weights,
            "grid_order": "itertools.product(1..5, repeat=6) over the six dimensions in workbook order",
            "score_x100": scores, "priority": "".join(prios)}


def ass02_tier(I, L, C, evidence, trig):
    inh = L * I
    inh_t = "Critical" if inh >= 16 else "High" if inh >= 11 else "Medium" if inh >= 6 else "Low"
    res = inh * (C / 5)
    res_t = "Critical" if res > 15 else "High" if res > 10 else "Medium" if res > 5 else "Low"
    elig = evidence == 2 or (evidence == 1 and inh_t not in ("High", "Critical"))
    floor = {"none": "Low", "special": "High", "statutory": "Critical", "agenticNoReview": "Critical"}[trig]
    basis = res_t if elig else inh_t
    r = max(TIERS.index(basis), TIERS.index(floor), 1 if I == 5 else 0)
    return inh_t, res_t, TIERS[r]


def ass02():
    wb = openpyxl.load_workbook(os.path.join(SRC, F02))
    ws = wb["Risk Assessment"]
    dims = [ws[f"A{r}"].value for r in range(23, 28)]
    c43 = ws["C43"].value
    assert "IF(C28=5,2,1)" in c43 and 'IF(E41="Yes",C41,C38)' in c43, "C43 changed"
    assert ws["C41"].value.startswith('=IF(C40="","",IF(C40>15,"Critical",IF(C40>10,"High",IF(C40>5,"Medium","Low"))))')
    assert ws["C38"].value.startswith('=IF(C37="","",IF(C37>=16,"Critical",IF(C37>=11,"High",IF(C37>=6,"Medium","Low"))))')
    version = re.search(r"AIG-ASS-02 (v[\d.]+)", ws["A2"].value).group(1)
    cases = []
    for I, L, C, ev, trig in itertools.product(range(1, 6), range(1, 6), range(1, 6), (0, 1, 2),
                                               ("none", "special", "statutory", "agenticNoReview")):
        inh_t, res_t, eff = ass02_tier(I, L, C, ev, trig)
        cases.append([I, L, C, ev, trig, inh_t, res_t, eff])
    return {"source": f"{F02} ({version}), sheet 'Risk Assessment', A23:A27, C28, C37:C43, E41",
            "impact_dimensions": dims,
            "evidence_codes": {"0": "E37 No", "1": "E37 Yes + ref, E39 No (no independent check)",
                               "2": "E37 Yes + ref, E39 Yes + ref (independently verified)"},
            "columns": ["maxImpact", "likelihood", "control", "evidence", "trigger",
                        "inherentTier", "residualTier", "effectiveTier"],
            "cases": cases}


def cell_rows(t):
    return [[c.text.strip() for c in r.cells] for r in t.rows]


def agt02():
    d = docx.Document(os.path.join(SRC, F_AGT02))
    ta = next(t for t in d.tables if [c.text for c in t.rows[0].cells][:2] == ["Score", "Consequence"])
    rows = cell_rows(ta)
    head = [h.lower() for h in rows[0][1:]]
    table_a = {h: [int(rows[i][j + 1][1]) for i in range(1, 7)] for j, h in enumerate(head)}
    tb = next(t for t in d.tables if [c.text for c in t.rows[0].cells] == ["Rule", "Condition", "Tier floor"])
    table_b = {r[0]: {"condition": r[1], "floor": int(r[2][1])} for r in cell_rows(tb)[1:]}
    tc = next(t for t in d.tables if t.rows[0].cells[0].text == "Example")
    examples = []
    for r in cell_rows(tc)[1:]:
        m = re.match(r"(\d) / (\d) / (\d) / (\d) / (\d); flags: (.*)", r[1])
        flags = [] if m.group(6).strip() == "none" else [f.strip() for f in m.group(6).split(",")]
        tier = int(re.search(r"→ T(\d)", r[2]).group(1))
        examples.append({"example": r[0], "scores": [int(m.group(i)) for i in range(1, 6)], "flags": flags,
                         "rules_listed": re.findall(r"rules? ([A-D]\d(?:, [A-D]\d)*)", r[2]),
                         "agency_tier": tier, "agency_minimum": r[3], "assumed_risk": r[4], "governing_tier": r[5]})
    return {"source": f"{F_AGT02}, Tables A, B and C", "table_a": table_a, "table_b": table_b,
            "calibration_examples": examples}


def agt03():
    d = docx.Document(os.path.join(SRC, F_AGT03))
    t = next(t for t in d.tables if t.rows[0].cells[0].text == "Agency tier")
    rows = cell_rows(t)[1:]
    return {"source": f"{F_AGT03}, §6 pathway table",
            "minimum_pathway": {r[0].split()[0]: r[1] for r in rows},
            "agentic_requirement": {r[0].split()[0]: r[2] for r in rows}}


if __name__ == "__main__":
    out = {"suite": "v3.9 (30 September 2026)", "ass01": ass01(), "ass02": ass02(), "agt02": agt02(), "agt03": agt03()}
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, "w") as f:
        json.dump(out, f, ensure_ascii=False, separators=(",", ":"))
    print("wrote", os.path.normpath(OUT))
