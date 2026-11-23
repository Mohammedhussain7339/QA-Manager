"use client";
import Link from "next/link";
import { useMemo } from "react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useStore } from "@/lib/store";
import { componentStatus, detectRegressions, fmtDate, summary } from "@/lib/logic";
import type { Run } from "@/lib/types";
import { Badge, Empty, PageTitle } from "@/components/ui";

export default function Dashboard() {
  const { deps, runs, analyses } = useStore();
  const comps = Object.keys(deps).sort();
  // Only signed-off (locked) runs count as proof.
  const locked = useMemo(() => runs.filter((r) => r.locked).sort((a, b) => a.createdAt.localeCompare(b.createdAt)), [runs]);
  const regressions = useMemo(() => detectRegressions(runs, comps), [runs, comps]);
  const trend = useMemo(() => [...runs].sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    .map((r) => ({ name: r.id, build: r.build, pass: summary(r.cases).passPct })), [runs]);

  const good = comps.map((c) => {
    let lastGood: Run | undefined; let latest: { run: Run; s: NonNullable<ReturnType<typeof componentStatus>> } | undefined;
    for (const r of locked) { const s = componentStatus(r, c); if (!s) continue; latest = { run: r, s }; if (s === "Passed") lastGood = r; }
    return { c, lastGood, latest };
  });

  return (
    <>
      <PageTitle actions={<Link href="/runs/new" className="btn btn-primary">New Run</Link>}>Dashboard</PageTitle>
      <section className="card mb-4">
        <h2 className="mb-2 font-semibold">Last known good, per component</h2>
        {!locked.length ? <Empty>Sign off a run to see proof here.</Empty> : (
          <div className="overflow-x-auto"><table className="w-full"><thead><tr><th className="th">Component</th><th className="th">Last passed run</th><th className="th">Build</th><th className="th">Date</th><th className="th">Latest status</th></tr></thead>
            <tbody>{good.map(({ c, lastGood, latest }) => (
              <tr key={c} className="border-t border-zinc-100 dark:border-zinc-800">
                <td className="td font-medium">{c}</td>
                <td className="td">{lastGood ? <Link className="text-indigo-600 underline" href={`/runs/${lastGood.id}`}>{lastGood.id}</Link> : "Never"}</td>
                <td className="td">{lastGood?.build || "-"}</td><td className="td">{fmtDate(lastGood?.createdAt)}</td>
                <td className="td"><Badge>{latest ? latest.s : "Not Run"}</Badge></td>
              </tr>))}</tbody></table></div>)}
      </section>
      <div className="grid gap-4 md:grid-cols-2">
        <section className="card"><div className="mb-2 flex items-center justify-between"><h2 className="font-semibold">Regression history</h2><Link href="/regressions" className="text-sm text-indigo-600 underline">Analyse</Link></div>
          {!regressions.length ? <Empty>No regressions recorded.</Empty> : regressions.map((r) => {
            const a = analyses.find((x) => x.key === r.key);
            return <p key={r.key} className="border-t border-zinc-100 py-2 text-sm dark:border-zinc-800"><b>{r.component}</b> passed in {r.good.id} ({r.good.build || "n/a"}) and failed in {r.bad.id} ({r.bad.build || "n/a"}), <b>{r.days} day(s)</b> later.
              {a ? <span className="text-zinc-500"> Root cause: {a.rootCause}.</span> : <span className="text-amber-600"> No analysis yet.</span>}</p>; })}
        </section>
        <section className="card"><h2 className="mb-2 font-semibold">Pass % trend by run</h2>
          {!trend.length ? <Empty>No runs yet.</Empty> : (
            <div className="h-60 w-full"><ResponsiveContainer width="100%" height="100%">
              <LineChart data={trend} margin={{ top: 8, right: 16, bottom: 0, left: -16 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#a1a1aa55" /><XAxis dataKey="name" fontSize={12} /><YAxis domain={[0, 100]} unit="%" fontSize={12} />
                <Tooltip content={({ active, payload }) => active && payload?.length ? (
                  <div className="rounded border border-zinc-300 bg-white p-2 text-xs text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100">
                    <b>{payload[0].payload.name}</b> · {payload[0].payload.build || "no build"}<br />Pass: {payload[0].value}%</div>) : null} />
                <Line type="monotone" dataKey="pass" stroke="#6366f1" strokeWidth={2} dot />
              </LineChart></ResponsiveContainer></div>)}
        </section>
      </div>
    </>
  );
}
