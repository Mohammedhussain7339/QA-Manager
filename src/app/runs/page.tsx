"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import { fmtDate, summary } from "@/lib/logic";
import { MODE_LABEL, type Mode } from "@/lib/types";
import { Badge, Empty, PageTitle } from "@/components/ui";

export default function Runs() {
  const { runs, deps } = useStore();
  const [q, setQ] = useState(""); const [mode, setMode] = useState(""); const [comp, setComp] = useState(""); const [state, setState] = useState(""); const [from, setFrom] = useState(""); const [to, setTo] = useState(""); const [build, setBuild] = useState(""); const [result, setResult] = useState("");
  const list = useMemo(() => [...runs].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).filter((r) =>
    (!mode || r.mode === mode) && (!comp || r.cases.some((c) => c.component === comp)) &&
    (!state || (state === "Locked") === r.locked) && (!from || r.createdAt.slice(0, 10) >= from) && (!to || r.createdAt.slice(0, 10) <= to) &&
    (!build || r.build.toLowerCase().includes(build.toLowerCase())) &&
    (!result || (result === "failed" ? r.cases.some((c) => c.status === "Failed") : result === "clean" ? r.cases.every((c) => c.status === "Passed") : r.cases.some((c) => c.status === "Not Run"))) &&
    (!q || `${r.id} ${r.build} ${r.purpose}`.toLowerCase().includes(q.toLowerCase()))), [runs, q, mode, comp, state, from, to, build, result]);
  return (
    <>
      <PageTitle actions={<Link href="/runs/new" className="btn btn-primary">New Run</Link>}>Runs</PageTitle>
      <div className="mb-3 flex flex-wrap gap-2">
        <input className="input max-w-xs" placeholder="Search id, build, purpose" value={q} onChange={(e) => setQ(e.target.value)} />
        <select className="input w-auto" value={mode} onChange={(e) => setMode(e.target.value)}><option value="">All modes</option>{(Object.keys(MODE_LABEL) as Mode[]).map((m) => <option key={m} value={m}>{MODE_LABEL[m]}</option>)}</select>
        <select className="input w-auto" value={comp} onChange={(e) => setComp(e.target.value)}><option value="">All components</option>{Object.keys(deps).sort().map((c) => <option key={c}>{c}</option>)}</select>
        <select className="input w-auto" value={state} onChange={(e) => setState(e.target.value)}><option value="">Open + Locked</option><option>Open</option><option>Locked</option></select>
        <input className="input w-36" placeholder="Build" value={build} onChange={(e) => setBuild(e.target.value)} aria-label="Build" />
        <select className="input w-auto" value={result} onChange={(e) => setResult(e.target.value)} aria-label="Result"><option value="">Any result</option><option value="failed">Has failures</option><option value="clean">All passed</option><option value="notrun">Has Not Run</option></select>
        <input type="date" className="input w-auto" value={from} onChange={(e) => setFrom(e.target.value)} aria-label="From date" />
        <input type="date" className="input w-auto" value={to} onChange={(e) => setTo(e.target.value)} aria-label="To date" />
      </div>
      <div className="card overflow-x-auto p-0">
        {!list.length ? <Empty>No runs yet. Create one with “New Run”.</Empty> : (
          <table className="w-full"><thead><tr>{["Run", "Mode", "Build", "Env / Browser", "Created", "Results", "State"].map((h) => <th key={h} className="th">{h}</th>)}</tr></thead>
            <tbody>{list.map((r) => { const s = summary(r.cases); return (
              <tr key={r.id} className="border-t border-zinc-100 dark:border-zinc-800">
                <td className="td"><Link href={`/runs/${r.id}`} className="font-medium text-indigo-600 underline">{r.id}</Link></td>
                <td className="td">{MODE_LABEL[r.mode]}<div className="text-xs text-zinc-500">{r.mode === "complete" ? "All components" : r.components.join(", ")}</div></td>
                <td className="td">{r.build || "-"}</td><td className="td">{r.environment}<div className="text-xs text-zinc-500">{r.browser}</div></td>
                <td className="td whitespace-nowrap">{fmtDate(r.createdAt)}</td>
                <td className="td">{s.counts.Passed}/{s.total} passed ({s.passPct}%){s.counts.Failed ? <span className="text-red-600"> · {s.counts.Failed} failed</span> : null}</td>
                <td className="td"><Badge>{r.locked ? "Locked" : "Open"}</Badge></td>
              </tr>); })}</tbody></table>)}
      </div>
    </>
  );
}
