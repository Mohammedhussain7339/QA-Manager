"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useStore } from "@/lib/store";
import { detectRegressions, fmtDate, type Regression } from "@/lib/logic";
import { analysisSchema, type AnalysisValues } from "@/lib/schemas";
import { ROOT_CAUSES, type Analysis } from "@/lib/types";
import { Empty, Field, PageTitle } from "@/components/ui";

function AnalysisForm({ reg, existing }: { reg: Regression; existing?: Analysis }) {
  const { runs, saveAnalysis } = useStore();
  const [saved, setSaved] = useState(false);
  const before = runs.filter((r) => r.locked && r.createdAt < reg.bad.createdAt && r.cases.some((c) => c.component === reg.component));
  const { register, handleSubmit, formState: { errors } } = useForm<AnalysisValues>({
    resolver: zodResolver(analysisSchema),
    defaultValues: { lastGoodRunId: existing?.lastGoodRunId ?? reg.good.id, firstBadBuild: existing?.firstBadBuild ?? reg.bad.build,
      changes: existing?.changes ?? "", rootCause: (existing?.rootCause ?? "") as AnalysisValues["rootCause"], notes: existing?.notes ?? "" },
  });
  const submit = handleSubmit((v) => { saveAnalysis({ key: reg.key, component: reg.component, badRunId: reg.bad.id, ...v }); setSaved(true); });
  const err = (m?: string) => (m ? <span role="alert" className="text-xs text-red-600">{m}</span> : null);
  return (
    <form onSubmit={submit} className="mt-3 grid gap-3 md:grid-cols-3" onChange={() => setSaved(false)}>
      <Field label="Last good run"><select className="input" {...register("lastGoodRunId")}>{before.map((r) => <option key={r.id} value={r.id}>{r.id} ({r.build || "no build"})</option>)}</select>{err(errors.lastGoodRunId?.message)}</Field>
      <Field label="First bad build"><input className="input" {...register("firstBadBuild")} />{err(errors.firstBadBuild?.message)}</Field>
      <Field label="Root cause"><select className="input" {...register("rootCause")}><option value="">Choose…</option>{ROOT_CAUSES.map((c) => <option key={c}>{c}</option>)}</select>{err(errors.rootCause?.message)}</Field>
      <Field label="Changes between the two builds (commits, PRs, config, data)" className="md:col-span-3"><textarea rows={3} className="input" {...register("changes")} /></Field>
      <Field label="Notes" className="md:col-span-3"><textarea rows={2} className="input" {...register("notes")} /></Field>
      <div className="flex items-center gap-3 md:col-span-3"><button className="btn btn-primary">Save analysis</button>{saved && <span role="status" className="text-sm text-emerald-600">Saved</span>}</div>
    </form>
  );
}

export default function Regressions() {
  const { deps, runs, analyses } = useStore();
  const list = useMemo(() => detectRegressions(runs, Object.keys(deps)), [runs, deps]);
  return (
    <>
      <PageTitle>Regression analysis</PageTitle>
      <p className="mb-4 text-sm text-zinc-500">A regression is a component that passed in one signed-off run and failed in a later signed-off run. Record what changed in between and why it broke.</p>
      {!list.length ? <Empty>No regressions found in signed-off runs.</Empty> : list.map((r) => {
        const a = analyses.find((x) => x.key === r.key);
        return (
          <section key={r.key} className="card mb-3">
            <h2 className="font-semibold">{r.component} <span className="font-normal text-zinc-500">· {r.days} day(s) between runs</span></h2>
            <p className="text-sm">Passed in <Link className="text-indigo-600 underline" href={`/runs/${r.good.id}`}>{r.good.id}</Link> ({r.good.build || "n/a"}, {fmtDate(r.good.createdAt)}) and failed in <Link className="text-indigo-600 underline" href={`/runs/${r.bad.id}`}>{r.bad.id}</Link> ({r.bad.build || "n/a"}, {fmtDate(r.bad.createdAt)}).{" "}
              <Link className="text-indigo-600 underline" href={`/compare?a=${r.good.id}&b=${r.bad.id}`}>Compare</Link></p>
            <details open={!a}><summary className="mt-2 cursor-pointer text-sm font-medium">{a ? `Analysis saved (${a.rootCause})` : "Add analysis"}</summary><AnalysisForm reg={r} existing={a} /></details>
          </section>);
      })}
    </>
  );
}
