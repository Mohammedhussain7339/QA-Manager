import type { Group, Mode, PreviewRow, Run, RunCase, Status, TestCase } from "./types";

const row = (t: TestCase, group: Group): PreviewRow => ({
  id: t.id, component: t.component, subComponent: t.subComponent, testCase: t.testCase, expected: t.expected,
  priority: t.priority, group, masterVersion: t.version,
});

/** Core of the app: which cases go into a run, and how they are tagged. Pure, easy to unit test. */
export function buildSelection(mode: Mode, selected: string[], cases: TestCase[], deps: Record<string, string[]>): PreviewRow[] {
  const active = cases.filter((c) => c.active);
  if (mode === "complete") return active.map((c) => row(c, "Selected"));
  const sel = new Set(selected);
  const out = active.filter((c) => sel.has(c.component)).map((c) => row(c, "Selected"));
  if (mode === "related") {
    const rel = new Set<string>();
    for (const s of sel) for (const r of deps[s] ?? []) if (!sel.has(r)) rel.add(r); // exclude already-selected
    out.push(...active.filter((c) => rel.has(c.component)).map((c) => row(c, "Related")));
  }
  return out;
}

export const toRunCase = (r: PreviewRow): RunCase => ({
  ...r, group: r.group === "Related" ? "Related" : "Selected", status: "Not Run", actual: "", bugId: "", evidence: [],
});

export function summary(cases: RunCase[]) {
  const c: Record<string, number> = { "Not Run": 0, Passed: 0, Failed: 0, Blocked: 0, Skipped: 0 };
  for (const x of cases) c[x.status]++;
  const executed = cases.length - c["Not Run"] - c.Skipped;
  return { counts: c, total: cases.length, passPct: executed ? Math.round((c.Passed / executed) * 100) : 0 };
}

export function signOffCheck(run: Run) {
  const errors: string[] = [];
  const warnings: string[] = [];
  const bad = run.cases.filter((c) => c.status === "Failed" && !c.evidence.length && !c.actual.trim());
  if (bad.length) errors.push(`Failed cases need evidence or an actual-result note: ${bad.map((c) => c.id).join(", ")}`);
  const p1 = run.cases.filter((c) => c.priority === "P1" && c.status === "Passed" && !c.evidence.length);
  if (p1.length) warnings.push(`${p1.length} P1 Passed case(s) have no evidence: ${p1.map((c) => c.id).join(", ")}`);
  const nr = run.cases.filter((c) => c.status === "Not Run").length;
  if (nr) warnings.push(`${nr} case(s) are still Not Run.`);
  return { errors, warnings };
}

export const fmtDate = (iso?: string) => iso
  ? new Date(iso).toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })
  : "-";

export function jiraComment(run: Run, modeLabel: string) {
  const s = summary(run.cases);
  const nc = run.cases.filter((c) => c.status === "Not Run" || c.status === "Skipped").map((c) => c.id);
  const scope = run.mode === "complete" ? "" : ` (${run.components.join(", ")})`;
  return `${run.id} | ${modeLabel}${scope} | Build ${run.build || "n/a"} | ${run.testedBy || "n/a"} | ${run.browser || "n/a"} | ${fmtDate(run.createdAt)}. ` +
    `${s.counts.Passed}/${s.total} passed. Evidence: ${run.bsLink || "see run"}. Not covered: ${nc.length ? nc.join(", ") : "none"}`;
}

export async function sha256(file: Blob) {
  const h = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
  return [...new Uint8Array(h)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
export const blobUrls = new Map<string, string>(); // session-only object URLs (demo: file bytes are not persisted)

export function download(name: string, text: string, mime: string) {
  const url = URL.createObjectURL(new Blob([text], { type: mime }));
  const a = document.createElement("a"); a.href = url; a.download = name; a.click(); URL.revokeObjectURL(url);
}
export function runToCsv(run: Run) {
  const q = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const head = ["Run", "Group", "ID", "Component", "Priority", "Test Case", "Expected", "Status", "Actual", "Bug", "Executed At", "Evidence"];
  const lines = run.cases.map((c) => [run.id, c.group, c.id, c.component, c.priority, c.testCase, c.expected, c.status, c.actual, c.bugId,
    c.executedAt ?? "", c.evidence.map((e) => `${e.name} sha256:${e.sha256}`).join("; ")].map(q).join(","));
  return "\uFEFF" + [head.map(q).join(","), ...lines].join("\r\n");
}

/** Lock rule, shared by the store and the tests: a locked run is returned untouched. */
export const guardLocked = (r: Run, fn: (r: Run) => Run): Run => (r.locked ? r : fn(r));

// ---------- run comparison ----------
export type Change = "regressed" | "fixed" | "changed" | "same" | "only-a" | "only-b";
export interface DiffRow { id: string; component: string; testCase: string; a?: Status; b?: Status; change: Change }

export function compareRuns(a: Run, b: Run): DiffRow[] {
  const ma = new Map(a.cases.map((c) => [c.id, c])), mb = new Map(b.cases.map((c) => [c.id, c]));
  const ids = [...new Set([...a.cases.map((c) => c.id), ...b.cases.map((c) => c.id)])];
  return ids.map((id) => {
    const x = ma.get(id), y = mb.get(id), meta = (y ?? x)!;
    let change: Change;
    if (!x) change = "only-b"; else if (!y) change = "only-a";
    else if (x.status === y.status) change = "same";
    else if (x.status === "Passed" && y.status === "Failed") change = "regressed";
    else if (x.status === "Failed" && y.status === "Passed") change = "fixed";
    else change = "changed";
    return { id, component: meta.component, testCase: meta.testCase, a: x?.status, b: y?.status, change };
  });
}

// ---------- regressions ----------
export function componentStatus(run: Run, comp: string): Status | null {
  const cs = run.cases.filter((c) => c.component === comp && c.status !== "Not Run" && c.status !== "Skipped");
  if (!cs.length) return null;
  if (cs.some((c) => c.status === "Failed")) return "Failed";
  return cs.every((c) => c.status === "Passed") ? "Passed" : "Blocked";
}
const dayDiff = (a: string, b: string) => Math.max(0, Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000));
export interface Regression { key: string; component: string; good: Run; bad: Run; days: number }

/** A component that passed in one signed-off run and failed in a later signed-off run. */
export function detectRegressions(runs: Run[], comps: string[]): Regression[] {
  const locked = runs.filter((r) => r.locked).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const out: Regression[] = [];
  for (const c of comps) {
    let good: Run | undefined;
    for (const r of locked) {
      const s = componentStatus(r, c);
      if (s === "Passed") good = r;
      else if (s === "Failed" && good) { out.push({ key: `${c}|${r.id}`, component: c, good, bad: r, days: dayDiff(good.createdAt, r.createdAt) }); good = undefined; }
    }
  }
  return out.sort((a, b) => b.bad.createdAt.localeCompare(a.bad.createdAt));
}

// ---------- retest ----------
export function retestRows(run: Run, scope: "problem" | "all", includeRelated: boolean): PreviewRow[] {
  return run.cases
    .filter((c) => scope === "all" || ["Failed", "Blocked", "Not Run"].includes(c.status) || (includeRelated && c.group === "Related"))
    .map(({ id, component, subComponent, testCase, expected, priority, group, masterVersion, custom }) =>
      ({ id, component, subComponent, testCase, expected, priority, group, masterVersion, custom }));
}
