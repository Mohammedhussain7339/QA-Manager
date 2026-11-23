"use client";
import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useStore } from "@/lib/store";
import { compareRuns, type Change } from "@/lib/logic";
import { Badge, Empty, PageTitle } from "@/components/ui";

const LABEL: Record<Change, string> = { regressed: "Regressed", fixed: "Fixed", changed: "Changed", same: "Same", "only-a": "Only in A", "only-b": "Only in B" };
const TONE: Record<Change, string> = {
  regressed: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300", fixed: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
  changed: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300", same: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
  "only-a": "bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300", "only-b": "bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-300",
};
const ORDER: Change[] = ["regressed", "fixed", "changed", "only-a", "only-b", "same"];

function Compare() {
  const { runs } = useStore();
  const sp = useSearchParams();
  const sorted = [...runs].sort((x, y) => x.createdAt.localeCompare(y.createdAt));
  const [aId, setA] = useState(sp.get("a") ?? sorted[0]?.id ?? "");
  const [bId, setB] = useState(sp.get("b") ?? sorted[1]?.id ?? sorted[0]?.id ?? "");
  const [onlyDiff, setOnlyDiff] = useState(true);
  const a = runs.find((r) => r.id === aId), b = runs.find((r) => r.id === bId);
  const rows = useMemo(() => (a && b ? compareRuns(a, b).sort((x, y) => ORDER.indexOf(x.change) - ORDER.indexOf(y.change) || x.id.localeCompare(y.id)) : []), [a, b]);
  const counts = ORDER.map((c) => [c, rows.filter((r) => r.change === c).length] as const);
  const shown = onlyDiff ? rows.filter((r) => r.change !== "same") : rows;
  const sel = (v: string, set: (s: string) => void, label: string) => (
    <label className="text-xs font-medium text-zinc-500">{label}
      <select className="input mt-1" value={v} onChange={(e) => set(e.target.value)}>{sorted.map((r) => <option key={r.id} value={r.id}>{r.id} · {r.build || "no build"}</option>)}</select></label>);
  return (
    <>
      <PageTitle>Compare runs</PageTitle>
      {runs.length < 1 ? <Empty>Create at least one run to compare.</Empty> : (
        <>
          <div className="mb-3 grid max-w-xl grid-cols-2 gap-3">{sel(aId, setA, "Run A (earlier)")}{sel(bId, setB, "Run B (later)")}</div>
          <div className="mb-3 flex flex-wrap items-center gap-2 text-sm">
            {counts.map(([c, n]) => <span key={c} className={`rounded px-2 py-0.5 ${TONE[c]}`}>{LABEL[c]}: {n}</span>)}
            <label className="ml-auto flex items-center gap-1"><input type="checkbox" checked={onlyDiff} onChange={(e) => setOnlyDiff(e.target.checked)} />Only differences</label>
          </div>
          <div className="card overflow-x-auto p-0">
            {!shown.length ? <Empty>No differences.</Empty> : (
              <table className="w-full"><thead><tr>{["Case", "Component", "Test case", "Run A", "Run B", "Change"].map((h) => <th key={h} className="th">{h}</th>)}</tr></thead>
                <tbody>{shown.map((r) => (
                  <tr key={r.id} className="border-t border-zinc-100 dark:border-zinc-800"><td className="td font-mono text-xs">{r.id}</td><td className="td">{r.component}</td><td className="td">{r.testCase}</td>
                    <td className="td">{r.a ? <Badge>{r.a}</Badge> : "-"}</td><td className="td">{r.b ? <Badge>{r.b}</Badge> : "-"}</td>
                    <td className="td"><span className={`rounded px-1.5 py-0.5 text-xs font-medium ${TONE[r.change]}`}>{LABEL[r.change]}</span></td></tr>))}</tbody></table>)}
          </div>
        </>)}
    </>
  );
}
export default function Page() { return <Suspense><Compare /></Suspense>; }
