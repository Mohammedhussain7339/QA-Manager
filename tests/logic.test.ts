import { describe, it, expect } from "vitest";
import { buildSelection, compareRuns, detectRegressions, guardLocked, retestRows, signOffCheck, summary, toRunCase } from "../src/lib/logic";
import { DEFAULT_DEPS, seedCases } from "../src/lib/seed";
import { sampleRuns } from "../src/lib/sampleRuns";

const cases = seedCases();
const runs = sampleRuns(cases);
const run = (id: string) => runs.find((r) => r.id === id)!;

describe("mode selection", () => {
  it("Complete Website selects every active case with no component choice", () => {
    expect(buildSelection("complete", [], cases, DEFAULT_DEPS)).toHaveLength(40);
  });
  it("ignores inactive cases", () => {
    const off = cases.map((c, i) => (i === 0 ? { ...c, active: false } : c));
    expect(buildSelection("complete", [], off, DEFAULT_DEPS)).toHaveLength(39);
  });
  it("Selected Component returns only that component", () => {
    const rows = buildSelection("selected", ["Cart"], cases, DEFAULT_DEPS);
    expect(rows).toHaveLength(3);
    expect(rows.every((r) => r.component === "Cart" && r.group === "Selected")).toBe(true);
  });
  it("Selected + Related splits groups with correct counts", () => {
    const rows = buildSelection("related", ["Navbar"], cases, DEFAULT_DEPS);
    expect(rows.filter((r) => r.group === "Selected")).toHaveLength(23);
    expect(rows.filter((r) => r.group === "Related")).toHaveLength(14);
  });
  it("Related excludes components that are already selected", () => {
    const rows = buildSelection("related", ["Navbar", "Cart"], cases, DEFAULT_DEPS);
    expect(rows.filter((r) => r.group === "Related" && (r.component === "Navbar" || r.component === "Cart"))).toHaveLength(0);
    expect(rows.some((r) => r.group === "Related" && r.component === "Checkout")).toBe(true);
  });
});

describe("summary and sign-off rules", () => {
  it("computes pass percentage over executed cases", () => {
    const s = summary(run("Run-002").cases);
    expect(s.counts.Failed).toBe(1);
    expect(s.passPct).toBe(Math.round((s.counts.Passed / (s.total)) * 100));
  });
  it("blocks sign-off for Failed cases without evidence or note", () => {
    const r = { ...run("Run-003"), cases: [{ ...toRunCase(buildSelection("complete", [], cases, DEFAULT_DEPS)[0]), status: "Failed" as const }] };
    expect(signOffCheck(r).errors).toHaveLength(1);
  });
  it("warns about P1 Passed without evidence and about Not Run", () => {
    const base = toRunCase(buildSelection("complete", [], cases, DEFAULT_DEPS).find((x) => x.priority === "P1")!);
    const r = { ...run("Run-003"), cases: [{ ...base, status: "Passed" as const }, { ...base, id: "X", status: "Not Run" as const }] };
    expect(signOffCheck(r).warnings).toHaveLength(2);
    expect(signOffCheck(r).errors).toHaveLength(0);
  });
});

describe("lock rule", () => {
  it("returns a locked run untouched", () => {
    const locked = run("Run-001");
    expect(guardLocked(locked, (r) => ({ ...r, purpose: "hacked" }))).toBe(locked);
  });
  it("applies changes to an open run", () => {
    expect(guardLocked(run("Run-003"), (r) => ({ ...r, purpose: "ok" })).purpose).toBe("ok");
  });
});

describe("comparison, regressions, retest", () => {
  it("flags Passed to Failed as regressed", () => {
    const d = compareRuns(run("Run-001"), run("Run-002"));
    expect(d.find((x) => x.id === "TC-NAV-020")!.change).toBe("regressed");
    expect(d.filter((x) => x.change === "only-b")).toHaveLength(14);
  });
  it("detects the Navbar regression 3 days after the last good run", () => {
    const r = detectRegressions(runs, Object.keys(DEFAULT_DEPS));
    expect(r).toHaveLength(1);
    expect(r[0].component).toBe("Navbar");
    expect(r[0].good.id).toBe("Run-001");
    expect(r[0].bad.id).toBe("Run-002");
    expect(r[0].days).toBe(3);
  });
  it("retest preloads only problem cases, optionally plus Related", () => {
    expect(retestRows(run("Run-002"), "problem", false).map((x) => x.id)).toEqual(["TC-NAV-020"]);
    expect(retestRows(run("Run-002"), "problem", true)).toHaveLength(15);
    expect(retestRows(run("Run-002"), "all", false)).toHaveLength(37);
  });
});
