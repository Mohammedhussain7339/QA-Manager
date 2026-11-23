// Hardcoded sample runs so the Dashboard, Runs list and Compare flows have data. Replace with API data later.
import { buildSelection, toRunCase } from "./logic";
import { DEFAULT_DEPS } from "./seed";
import type { Evidence, Mode, Run, RunCase, TestCase } from "./types";

const link = (at: string): Evidence => ({
  id: `ev-${at}`, kind: "link", name: "BrowserStack session", type: "link", size: 0, sha256: "", addedAt: at,
  link: "https://live.browserstack.com/",
});

interface Spec {
  id: string; at: string; mode: Mode; comps: string[]; build: string; browser: string; purpose: string; locked: boolean;
  fn: (c: RunCase, i: number) => Partial<RunCase>;
}

function make(o: Spec, cases: TestCase[]): Run {
  const t0 = new Date(o.at).getTime();
  const rc: RunCase[] = buildSelection(o.mode, o.comps, cases, DEFAULT_DEPS).map(toRunCase).map((c, i) => {
    const p = o.fn(c, i); const st = p.status ?? c.status;
    return { ...c, ...p, executedAt: st === "Not Run" ? undefined : new Date(t0 + (i + 1) * 60000).toISOString(),
      evidence: st !== "Not Run" && c.priority === "P1" ? [link(o.at)] : [] };
  });
  const signed = new Date(t0 + 3600000).toISOString();
  return {
    id: o.id, mode: o.mode, components: o.comps, purpose: o.purpose, build: o.build, environment: "QA",
    url: "https://qa.loomerang.example", browser: o.browser, bsLink: "https://live.browserstack.com/", testedBy: "QA-02",
    createdAt: o.at, locked: o.locked, signedOffAt: o.locked ? signed : undefined, cases: rc,
    audit: [{ at: o.at, by: "you", action: "Run created", newValue: `${rc.length} cases` },
      ...(o.locked ? [{ at: signed, by: "you", action: "Signed off and locked" }] : [])],
  };
}

export const sampleRuns = (cases: TestCase[]): Run[] => [
  make({ id: "Run-001", at: "2026-11-10T09:30:00.000Z", mode: "selected", comps: ["Navbar"], build: "v2.13.0 / 9f3c1ab",
    browser: "Chrome 131 / Windows 11", purpose: "Navbar smoke after header refactor", locked: true, fn: () => ({ status: "Passed" }) }, cases),
  make({ id: "Run-002", at: "2026-11-13T10:15:00.000Z", mode: "related", comps: ["Navbar"], build: "v2.14.0 / a1b2c3d",
    browser: "Chrome 131 / Windows 11", purpose: "Navbar + related regression", locked: true,
    fn: (c) => c.id === "TC-NAV-020"
      ? { status: "Failed", actual: "Profile page opened after pressing Back", rootCause: "Code change", bugId: "LOOM-412" }
      : { status: "Passed" } }, cases),
  make({ id: "Run-003", at: "2026-11-21T08:00:00.000Z", mode: "complete", comps: [], build: "v2.15.0 / d4e5f6a",
    browser: "Safari 18 / iPhone 15", purpose: "Full website pass (in progress)", locked: false,
    fn: (_c, i) => (i < 10 ? { status: "Passed" } : {}) }, cases),
];
