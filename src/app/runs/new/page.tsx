"use client";
import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { useStore } from "@/lib/store";
import { buildSelection } from "@/lib/logic";
import { MODE_LABEL, type Mode, type PreviewRow, type RowGroup, type RunMeta } from "@/lib/types";
import { Badge, Field, PageTitle } from "@/components/ui";

const MODE_HELP: Record<Mode, string> = {
  complete: "Every active test case is selected automatically.",
  selected: "Pick components. Only their active cases are selected.",
  related: "Pick components. Their cases are Selected, and cases of related components (Dependency Map) are added as Related.",
};

function NewRun() {
  const { cases, deps, runs, createRun } = useStore();
  const router = useRouter();
  const prevId = useSearchParams().get("retest");
  const prev = runs.find((r) => r.id === prevId);

  const [mode, setMode] = useState<Mode>(prev?.mode ?? "complete");
  const [comps, setComps] = useState<string[]>(prev?.components ?? []);
  const [meta, setMeta] = useState<RunMeta>({ purpose: prev ? `Retest of ${prev.id}` : "", build: prev?.build ?? "", environment: prev?.environment ?? "QA",
    url: prev?.url ?? "", browser: prev?.browser ?? "", bsLink: "", testedBy: prev?.testedBy ?? "" });
  const [over, setOver] = useState<Record<string, RowGroup>>({});
  const [extra, setExtra] = useState<PreviewRow[]>([]);
  const [customs, setCustoms] = useState<PreviewRow[]>([]);
  const [addId, setAddId] = useState(""); const [addGroup, setAddGroup] = useState<RowGroup>("Selected");
  const [cus, setCus] = useState({ component: "", testCase: "", expected: "" });

  const base = useMemo(() => buildSelection(mode, comps, cases, deps), [mode, comps, cases, deps]);
  const rows = useMemo(() => {
    const seen = new Set(base.map((r) => r.id));
    return [...base, ...extra.filter((e) => !seen.has(e.id)), ...customs].map((r) => ({ ...r, group: over[r.id] ?? r.group }));
  }, [base, extra, customs, over]);
  const sel = rows.filter((r) => r.group === "Selected"), rel = rows.filter((r) => r.group === "Related");
  const candidates = cases.filter((c) => c.active && !rows.some((r) => r.id === c.id));
  const needComps = mode !== "complete" && !comps.length;
  const m = (k: keyof RunMeta) => ({ className: "input", value: meta[k], onChange: (e: { target: { value: string } }) => setMeta({ ...meta, [k]: e.target.value }) });

  const addFromMaster = () => {
    const c = cases.find((x) => x.id === addId); if (!c) return;
    setExtra([...extra, { id: c.id, component: c.component, subComponent: c.subComponent, testCase: c.testCase, expected: c.expected, priority: c.priority, group: addGroup, masterVersion: c.version }]); setAddId("");
  };
  const addCustom = () => {
    if (!cus.component.trim() || !cus.testCase.trim() || !cus.expected.trim()) return;
    setCustoms([...customs, { id: `CUS-${String(customs.length + 1).padStart(3, "0")}`, ...cus, subComponent: "Custom", priority: "P2", group: "Selected", masterVersion: 0, custom: true }]);
    setCus({ component: "", testCase: "", expected: "" });
  };
  const create = () => {
    const id = createRun({ mode, components: mode === "complete" ? [] : comps, meta, rows: rows.filter((r) => r.group !== "Exclude"), previousRunId: prev?.id });
    router.push(`/runs/${id}`);
  };
  const toggleComp = (c: string) => setComps((p) => (p.includes(c) ? p.filter((x) => x !== c) : [...p, c]));

  const table = (title: "Selected" | "Related", list: typeof rows) => (
    <div key={title} className="mb-4"><h3 className="mb-1 flex items-center gap-2 font-semibold"><Badge>{title}</Badge> {list.length} cases</h3>
      {!list.length ? <p className="text-sm text-zinc-500">None.</p> : (
        <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800"><table className="w-full"><tbody>{list.map((r) => (
          <tr key={r.id} className="border-t border-zinc-100 first:border-0 dark:border-zinc-800">
            <td className="td font-mono text-xs">{r.id}</td><td className="td">{r.component}</td><td className="td">{r.testCase}</td><td className="td"><Badge>{r.priority}</Badge></td>
            <td className="td"><select aria-label={`Group for ${r.id}`} className="input w-auto" value={r.group} onChange={(e) => setOver({ ...over, [r.id]: e.target.value as RowGroup })}>
              <option>Selected</option><option>Related</option><option>Exclude</option></select></td></tr>))}</tbody></table></div>)}
    </div>
  );
  const excluded = rows.filter((r) => r.group === "Exclude");

  return (
    <>
      <PageTitle>New Run{prev ? ` (retest of ${prev.id})` : ""}</PageTitle>
      <section className="card mb-4"><h2 className="mb-2 font-semibold">1. Mode</h2>
        <div className="grid gap-2 md:grid-cols-3">
          {(Object.keys(MODE_LABEL) as Mode[]).map((k) => (
            <button key={k} onClick={() => setMode(k)} aria-pressed={mode === k}
              className={`rounded-lg border p-3 text-left ${mode === k ? "border-indigo-600 ring-2 ring-indigo-600/30" : "border-zinc-300 dark:border-zinc-700"}`}>
              <div className="font-medium">{MODE_LABEL[k]}</div><div className="text-sm text-zinc-500">{MODE_HELP[k]}</div></button>))}
        </div>
        {mode !== "complete" && (
          <div className="mt-3"><div className="mb-1 text-xs font-medium text-zinc-500">Components</div>
            <div className="flex flex-wrap gap-1.5">{Object.keys(deps).sort().map((c) => (
              <button key={c} onClick={() => toggleComp(c)} aria-pressed={comps.includes(c)}
                className={`rounded-full border px-2.5 py-0.5 text-sm ${comps.includes(c) ? "border-indigo-600 bg-indigo-600 text-white" : "border-zinc-300 dark:border-zinc-700"}`}>{c}</button>))}</div>
          </div>)}
      </section>

      <section className="card mb-4"><h2 className="mb-2 font-semibold">2. Run details</h2>
        <div className="grid gap-3 md:grid-cols-3">
          <Field label="Purpose" className="md:col-span-3"><input {...m("purpose")} /></Field>
          <Field label="Build version / commit SHA"><input {...m("build")} placeholder="v2.14.0 / a1b2c3d" /></Field>
          <Field label="Environment"><select {...m("environment")}><option>QA</option><option>Staging</option><option>UAT</option><option>Production</option></select></Field>
          <Field label="Environment URL"><input {...m("url")} /></Field>
          <Field label="Browser + OS + device"><input {...m("browser")} placeholder="Chrome 131 / Windows 11" /></Field>
          <Field label="BrowserStack session link"><input {...m("bsLink")} /></Field>
          <Field label="Tested by"><input {...m("testedBy")} /></Field>
        </div>
      </section>

      <section className="card mb-4"><h2 className="mb-2 font-semibold">3. Preview: {rows.length - excluded.length} cases <span className="font-normal text-zinc-500">({sel.length} Selected, {rel.length} Related{excluded.length ? `, ${excluded.length} excluded` : ""})</span></h2>
        {needComps ? <p className="text-sm text-zinc-500">Pick at least one component.</p> : <>{table("Selected", sel)}{table("Related", rel)}</>}
        {excluded.length > 0 && <details className="mb-3 text-sm"><summary className="cursor-pointer text-zinc-500">Excluded ({excluded.length})</summary>
          {excluded.map((r) => <div key={r.id} className="flex items-center gap-2 py-1"><span className="font-mono text-xs">{r.id}</span>{r.testCase}<button className="btn" onClick={() => setOver({ ...over, [r.id]: "Selected" })}>Restore</button></div>)}</details>}

        <div className="grid gap-4 border-t border-zinc-200 pt-3 md:grid-cols-2 dark:border-zinc-800">
          <div><h3 className="mb-1 text-sm font-semibold">Add from master</h3><div className="flex gap-2">
            <select className="input" value={addId} onChange={(e) => setAddId(e.target.value)}><option value="">Choose a case…</option>{candidates.map((c) => <option key={c.id} value={c.id}>{c.id} · {c.testCase}</option>)}</select>
            <select className="input w-auto" value={addGroup} onChange={(e) => setAddGroup(e.target.value as RowGroup)}><option>Selected</option><option>Related</option></select>
            <button className="btn" disabled={!addId} onClick={addFromMaster}>Add</button></div></div>
          <div><h3 className="mb-1 text-sm font-semibold">Add custom case (this run only)</h3><div className="grid gap-2">
            <input className="input" placeholder="Component" value={cus.component} onChange={(e) => setCus({ ...cus, component: e.target.value })} />
            <input className="input" placeholder="Test case" value={cus.testCase} onChange={(e) => setCus({ ...cus, testCase: e.target.value })} />
            <input className="input" placeholder="Expected result" value={cus.expected} onChange={(e) => setCus({ ...cus, expected: e.target.value })} />
            <button className="btn w-fit" onClick={addCustom}>Add custom case</button></div></div>
        </div>
      </section>
      <button className="btn btn-primary" disabled={needComps || rows.length === excluded.length} onClick={create}>Create run ({rows.length - excluded.length} cases)</button>
    </>
  );
}
export default function Page() { return <Suspense><NewRun /></Suspense>; }
