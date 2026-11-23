"use client";
// Frontend-only data layer: hardcoded data held in memory (resets on refresh).
// Every function maps 1:1 to a future Lambda endpoint (see README).
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import type { Analysis, AuditEntry, Evidence, Mode, PreviewRow, Run, RunCase, RunMeta, TestCase } from "./types";
import { DEFAULT_DEPS, prefixFor, seedCases } from "./seed";
import { guardLocked, toRunCase } from "./logic";
import { sampleRuns } from "./sampleRuns";

export interface DB { cases: TestCase[]; deps: Record<string, string[]>; runs: Run[]; history: TestCase[]; analyses: Analysis[] }
export type CaseInput = Omit<TestCase, "id" | "version" | "lastUpdated">;

interface Store extends DB {
  ready: boolean;
  addCase(i: CaseInput): void;
  addCases(list: CaseInput[]): void;
  saveCase(id: string, patch: Partial<CaseInput>): void;
  setDeps(component: string, affects: string[]): void;
  addComponent(name: string): void;
  removeComponent(name: string): void;
  createRun(input: { mode: Mode; components: string[]; meta: RunMeta; rows: PreviewRow[]; previousRunId?: string }): string;
  patchRunMeta(runId: string, patch: Partial<RunMeta>): void;
  patchCase(runId: string, caseId: string, patch: Partial<Pick<RunCase, "status" | "actual" | "bugId" | "rootCause">>): void;
  addEvidence(runId: string, caseId: string, ev: Evidence): void;
  addRows(runId: string, rows: PreviewRow[]): void;
  signOff(runId: string): void;
  saveAnalysis(a: Omit<Analysis, "updatedAt">): void;
  importRun(run: Run): string;
  restoreAll(db: Pick<DB, "cases" | "deps" | "runs"> & Partial<Pick<DB, "history" | "analyses">>): void;
}
const Ctx = createContext<Store | null>(null);
export const useStore = () => { const s = useContext(Ctx); if (!s) throw new Error("StoreProvider missing"); return s; };

const aud = (a: Omit<AuditEntry, "at" | "by">): AuditEntry => ({ at: new Date().toISOString(), by: "you", ...a });
const diff = (o: object, p: object, extra: Partial<AuditEntry>): AuditEntry[] =>
  Object.entries(p).filter(([k, v]) => (o as Record<string, unknown>)[k] !== v).map(([k, v]) =>
    aud({ ...extra, field: k, oldValue: String((o as Record<string, unknown>)[k] ?? ""), newValue: String(v) } as AuditEntry));
const nextRunId = (runs: Run[]) => `Run-${String(Math.max(0, ...runs.map((r) => parseInt(r.id.slice(4), 10))) + 1).padStart(3, "0")}`;

function idMaker(existing: TestCase[]) {
  const counters: Record<string, number> = {};
  return (comp: string) => {
    const p = prefixFor(comp);
    if (!(p in counters)) counters[p] = Math.max(0, ...existing.filter((c) => c.id.startsWith(`TC-${p}-`)).map((c) => parseInt(c.id.slice(-3), 10)));
    counters[p]++;
    return `TC-${p}-${String(counters[p]).padStart(3, "0")}`;
  };
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [db, setDb] = useState<DB>(() => {
    const cases = seedCases();
    return { cases, deps: DEFAULT_DEPS, runs: sampleRuns(cases), history: cases.map((c) => ({ ...c })), analyses: [] };
  });
  const [ready, setReady] = useState(false);
  const ref = useRef(db); ref.current = db;
  useEffect(() => setReady(true), []); // render pages client-side only (avoids timezone hydration mismatch)

  // Locked runs are never touched, whatever the UI does (mirrors the server-side conditional write).
  const mutRun = (runId: string, fn: (r: Run) => Run) =>
    setDb((d) => ({ ...d, runs: d.runs.map((r) => (r.id === runId ? guardLocked(r, fn) : r)) }));

  const s: Store = {
    ...db, ready,
    addCase: (i) => setDb((d) => {
      const tc: TestCase = { ...i, id: idMaker(d.cases)(i.component), version: 1, lastUpdated: new Date().toISOString() };
      return { ...d, cases: [...d.cases, tc], history: [...d.history, tc], deps: d.deps[i.component] ? d.deps : { ...d.deps, [i.component]: [] } };
    }),
    addCases: (list) => setDb((d) => {
      const next = idMaker(d.cases); const now = new Date().toISOString();
      const added: TestCase[] = list.map((i) => ({ ...i, id: next(i.component), version: 1, lastUpdated: now }));
      const deps = { ...d.deps };
      for (const i of list) if (!deps[i.component]) deps[i.component] = [];
      return { ...d, cases: [...d.cases, ...added], history: [...d.history, ...added], deps };
    }),
    saveCase: (id, patch) => setDb((d) => {
      const cur = d.cases.find((c) => c.id === id); if (!cur) return d;
      const next: TestCase = { ...cur, ...patch, version: cur.version + 1, lastUpdated: new Date().toISOString() };
      return { ...d, cases: d.cases.map((c) => (c.id === id ? next : c)), history: [...d.history, next],
        deps: d.deps[next.component] ? d.deps : { ...d.deps, [next.component]: [] } };
    }),
    setDeps: (c, affects) => setDb((d) => ({ ...d, deps: { ...d.deps, [c]: affects } })),
    addComponent: (n) => setDb((d) => (n && !d.deps[n] ? { ...d, deps: { ...d.deps, [n]: [] } } : d)),
    removeComponent: (n) => setDb((d) => ({ ...d, deps: Object.fromEntries(Object.entries(d.deps)
      .filter(([k]) => k !== n).map(([k, v]) => [k, v.filter((x) => x !== n)])) })),
    createRun: ({ mode, components, meta, rows, previousRunId }) => {
      const id = nextRunId(ref.current.runs);
      const run: Run = { ...meta, id, mode, components, createdAt: new Date().toISOString(), locked: false, previousRunId,
        cases: rows.map(toRunCase), audit: [aud({ action: "Run created", newValue: `${rows.length} cases` })] };
      setDb((d) => ({ ...d, runs: [...d.runs, run] }));
      return id;
    },
    patchRunMeta: (runId, patch) => mutRun(runId, (r) => ({ ...r, ...patch, audit: [...r.audit, ...diff(r, patch, { action: "Run detail changed" })] })),
    patchCase: (runId, caseId, patch) => mutRun(runId, (r) => {
      const extra: AuditEntry[] = [];
      const cases = r.cases.map((c) => {
        if (c.id !== caseId) return c;
        extra.push(...diff(c, patch, { action: "Case changed", caseId }));
        const next: RunCase = { ...c, ...patch };
        if (patch.status && patch.status !== c.status) next.executedAt = new Date().toISOString(); // server-set in the real app
        return next;
      });
      return { ...r, cases, audit: [...r.audit, ...extra] };
    }),
    addEvidence: (runId, caseId, ev) => mutRun(runId, (r) => ({ ...r,
      cases: r.cases.map((c) => (c.id === caseId ? { ...c, evidence: [...c.evidence, ev] } : c)),
      audit: [...r.audit, aud({ action: "Evidence added", caseId, newValue: `${ev.name} sha256:${ev.sha256.slice(0, 12)}` })] })),
    addRows: (runId, rows) => mutRun(runId, (r) => {
      const fresh = rows.filter((x) => !r.cases.some((c) => c.id === x.id));
      return { ...r, cases: [...r.cases, ...fresh.map(toRunCase)],
        audit: [...r.audit, ...fresh.map((x) => aud({ action: "Case added to run", caseId: x.id, newValue: x.group }))] };
    }),
    signOff: (runId) => mutRun(runId, (r) => ({ ...r, locked: true, signedOffAt: new Date().toISOString(),
      audit: [...r.audit, aud({ action: "Signed off and locked" })] })),
    saveAnalysis: (a) => setDb((d) => ({ ...d, analyses: [...d.analyses.filter((x) => x.key !== a.key), { ...a, updatedAt: new Date().toISOString() }] })),
    importRun: (run) => {
      const clash = ref.current.runs.some((r) => r.id === run.id);
      const id = clash ? nextRunId(ref.current.runs) : run.id;
      const imported: Run = { ...run, id, audit: [...run.audit, aud({ action: "Imported from file", newValue: clash ? `originally ${run.id}` : run.id })] };
      setDb((d) => ({ ...d, runs: [...d.runs, imported] }));
      return id;
    },
    restoreAll: (b) => setDb({ cases: b.cases, deps: b.deps, runs: b.runs, history: b.history ?? b.cases, analyses: b.analyses ?? [] }),
  };
  return <Ctx.Provider value={s}>{children}</Ctx.Provider>;
}
