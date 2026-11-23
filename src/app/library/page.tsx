"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useStore, type CaseInput } from "@/lib/store";
import { fmtDate } from "@/lib/logic";
import { caseFormSchema, type CaseFormValues } from "@/lib/schemas";
import type { TestCase } from "@/lib/types";
import { Badge, Empty, Field, PageTitle } from "@/components/ui";
import ImportCases from "@/components/ImportCases";

const BLANK: CaseInput = { component: "", subComponent: "", testCase: "", expected: "", priority: "P2", loginState: "Both", tags: [], active: true };

function CaseForm({ initial, onSave, onCancel, comps }: { initial: CaseInput; onSave: (c: CaseInput) => void; onCancel: () => void; comps: string[] }) {
  const { register, handleSubmit, formState: { errors } } = useForm<CaseFormValues>({
    resolver: zodResolver(caseFormSchema),
    defaultValues: { component: initial.component, subComponent: initial.subComponent, testCase: initial.testCase, expected: initial.expected,
      priority: initial.priority, loginState: initial.loginState, tags: initial.tags.join(", ") },
  });
  const submit = handleSubmit((v) => onSave({ ...v, tags: v.tags.split(",").map((t) => t.trim()).filter(Boolean), active: initial.active }));
  const err = (m?: string) => (m ? <span role="alert" className="text-xs text-red-600">{m}</span> : null);
  return (
    <form onSubmit={submit} className="card mb-4 grid gap-3 md:grid-cols-4">
      <Field label="Component"><input list="comps" className="input" {...register("component")} /><datalist id="comps">{comps.map((c) => <option key={c} value={c} />)}</datalist>{err(errors.component?.message)}</Field>
      <Field label="Sub Component"><input className="input" {...register("subComponent")} /></Field>
      <Field label="Priority"><select className="input" {...register("priority")}><option value="P1">P1 (smoke)</option><option>P2</option><option>P3</option></select></Field>
      <Field label="Login state"><select className="input" {...register("loginState")}><option>Login</option><option>Logout</option><option>Both</option></select></Field>
      <Field label="Test Case (one check)" className="md:col-span-2"><input className="input" {...register("testCase")} />{err(errors.testCase?.message)}</Field>
      <Field label="Expected Result" className="md:col-span-2"><input className="input" {...register("expected")} />{err(errors.expected?.message)}</Field>
      <Field label="Tags (comma separated)" className="md:col-span-2"><input className="input" {...register("tags")} /></Field>
      <div className="flex items-end gap-2 md:col-span-2"><button className="btn btn-primary">Save</button><button type="button" className="btn" onClick={onCancel}>Cancel</button></div>
    </form>
  );
}

const FIELDS: (keyof TestCase)[] = ["component", "subComponent", "testCase", "expected", "priority", "loginState", "active", "tags"];
function History({ id, onClose }: { id: string; onClose: () => void }) {
  const { history, runs } = useStore();
  const versions = history.filter((h) => h.id === id).sort((a, b) => b.version - a.version);
  const usage = runs.flatMap((r) => r.cases.filter((c) => c.id === id).map((c) => ({ run: r.id, v: c.masterVersion })));
  return (
    <section className="card mb-4">
      <div className="mb-2 flex items-center justify-between"><h2 className="font-semibold">Version history: {id}</h2><button className="btn" onClick={onClose}>Close</button></div>
      {versions.map((v, i) => {
        const prev = versions[i + 1];
        const changes = prev ? FIELDS.filter((f) => JSON.stringify(v[f]) !== JSON.stringify(prev[f])).map((f) => `${f}: ${JSON.stringify(prev[f])} → ${JSON.stringify(v[f])}`) : ["Initial version"];
        return <div key={v.version} className="border-t border-zinc-100 py-2 text-sm dark:border-zinc-800"><b>v{v.version}</b> <span className="text-zinc-500">{fmtDate(v.lastUpdated)}</span>
          <ul className="ml-4 list-disc text-zinc-600 dark:text-zinc-400">{changes.map((c) => <li key={c}>{c}</li>)}</ul></div>;
      })}
      <p className="mt-2 text-sm text-zinc-500">Runs keep the version they were created with:{" "}
        {usage.length ? usage.map((u, i) => <span key={u.run}>{i > 0 && ", "}<Link className="text-indigo-600 underline" href={`/runs/${u.run}`}>{u.run}</Link> (v{u.v})</span>) : "not used in any run yet."}</p>
    </section>
  );
}

export default function Library() {
  const { cases, deps, addCase, saveCase } = useStore();
  const [q, setQ] = useState(""); const [comp, setComp] = useState(""); const [prio, setPrio] = useState(""); const [inactive, setInactive] = useState(false);
  const [importing, setImporting] = useState(false);
  const [editing, setEditing] = useState<TestCase | "new" | null>(null);
  const [historyId, setHistoryId] = useState<string | null>(null);
  const comps = Object.keys(deps).sort();
  const list = useMemo(() => cases.filter((c) =>
    (inactive || c.active) && (!comp || c.component === comp) && (!prio || c.priority === prio) &&
    (!q || `${c.id} ${c.subComponent} ${c.testCase} ${c.expected} ${c.tags.join(" ")}`.toLowerCase().includes(q.toLowerCase())))
    .sort((a, b) => a.id.localeCompare(b.id)), [cases, q, comp, prio, inactive]);

  return (
    <>
      <PageTitle actions={<><button className="btn" onClick={() => setImporting(true)}>Import Excel / CSV</button><button className="btn btn-primary" onClick={() => setEditing("new")}>Add test case</button></>}>Master Library</PageTitle>
      {importing && <ImportCases onClose={() => setImporting(false)} />}
      {historyId && <History id={historyId} onClose={() => setHistoryId(null)} />}
      {editing && <CaseForm key={editing === "new" ? "new" : editing.id} comps={comps} initial={editing === "new" ? BLANK : editing} onCancel={() => setEditing(null)}
        onSave={(c) => { editing === "new" ? addCase(c) : saveCase(editing.id, c); setEditing(null); }} />}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <input className="input max-w-xs" placeholder="Search…" value={q} onChange={(e) => setQ(e.target.value)} />
        <select className="input w-auto" value={comp} onChange={(e) => setComp(e.target.value)}><option value="">All components</option>{comps.map((c) => <option key={c}>{c}</option>)}</select>
        <select className="input w-auto" value={prio} onChange={(e) => setPrio(e.target.value)}><option value="">All priorities</option><option>P1</option><option>P2</option><option>P3</option></select>
        <label className="flex items-center gap-1 text-sm"><input type="checkbox" checked={inactive} onChange={(e) => setInactive(e.target.checked)} />Show inactive</label>
        <span className="text-sm text-zinc-500">{list.length} cases</span>
      </div>
      <div className="card overflow-x-auto p-0">
        {!list.length ? <Empty>No test cases match.</Empty> : (
          <table className="w-full"><thead><tr>{["ID", "Component / Sub", "Test case", "Expected", "Pri", "Login", "Ver", "Updated", ""].map((h) => <th key={h} className="th">{h}</th>)}</tr></thead>
            <tbody>{list.map((c) => (
              <tr key={c.id} className={`border-t border-zinc-100 dark:border-zinc-800 ${c.active ? "" : "opacity-50"}`}>
                <td className="td font-mono text-xs">{c.id}</td><td className="td">{c.component}<div className="text-xs text-zinc-500">{c.subComponent}</div></td>
                <td className="td">{c.testCase}</td><td className="td text-zinc-600 dark:text-zinc-400">{c.expected}</td>
                <td className="td"><Badge>{c.priority}</Badge></td><td className="td">{c.loginState}</td><td className="td">v{c.version}</td><td className="td whitespace-nowrap text-xs">{fmtDate(c.lastUpdated)}</td>
                <td className="td whitespace-nowrap"><button className="btn" onClick={() => setEditing(c)}>Edit</button>{" "}<button className="btn" onClick={() => setHistoryId(c.id)}>History</button>{" "}
                  <button className="btn" onClick={() => saveCase(c.id, { active: !c.active })}>{c.active ? "Deactivate" : "Activate"}</button></td>
              </tr>))}</tbody></table>)}
      </div>
    </>
  );
}
