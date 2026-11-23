"use client";
import Link from "next/link";
import { useState } from "react";
import { useStore } from "@/lib/store";
import { download } from "@/lib/logic";
import { collectEvidenceData, restoreEvidenceData, today } from "@/lib/files";
import { backupSchema, runFileSchema } from "@/lib/schemas";
import type { Backup } from "@/lib/types";
import { PageTitle } from "@/components/ui";

type Msg = { ok: boolean; text: string; runId?: string } | null;
const firstIssue = (e: { issues: { path: (string | number)[]; message: string }[] }) => `${e.issues[0].path.join(".") || "file"}: ${e.issues[0].message}`;

export default function BackupPage() {
  const { cases, deps, runs, history, analyses, restoreAll, importRun } = useStore();
  const [busy, setBusy] = useState(false);
  const [m1, setM1] = useState<Msg>(null); const [m2, setM2] = useState<Msg>(null);

  const backup = async () => {
    setBusy(true);
    const b: Backup = { app: "qa-run-manager-backup", version: 1, exportedAt: new Date().toISOString(), cases, deps, runs, history, analyses, evidenceData: await collectEvidenceData(runs) };
    download(`qa-backup-${today()}.json`, JSON.stringify(b), "application/json"); setBusy(false);
    setM1({ ok: true, text: `Backup saved: ${cases.length} cases, ${runs.length} runs, ${Object.keys(b.evidenceData ?? {}).length} evidence file(s).` });
  };
  const restore = async (f: File) => {
    setM1(null);
    try {
      const p = backupSchema.safeParse(JSON.parse(await f.text()));
      if (!p.success) return setM1({ ok: false, text: `Not a valid backup. ${firstIssue(p.error)}` });
      if (!confirm(`Replace ALL current data with this backup (${p.data.cases.length} cases, ${p.data.runs.length} runs)?`)) return;
      restoreAll(p.data);
      const r = await restoreEvidenceData(p.data.evidenceData ?? {}, p.data.runs);
      setM1({ ok: !r.mismatched.length, text: `Restored. ${r.restored} evidence file(s) re-linked.${r.mismatched.length ? ` WARNING: ${r.mismatched.length} file(s) do not match their stored SHA-256 hash.` : ""}` });
    } catch { setM1({ ok: false, text: "Could not read this file (invalid JSON)." }); }
  };
  const importOne = async (f: File) => {
    setM2(null);
    try {
      const p = runFileSchema.safeParse(JSON.parse(await f.text()));
      if (!p.success) return setM2({ ok: false, text: `Not a saved run file. ${firstIssue(p.error)}` });
      const id = importRun(p.data.run);
      const r = await restoreEvidenceData(p.data.evidenceData ?? {}, [p.data.run]);
      setM2({ ok: !r.mismatched.length, runId: id, text: `Imported as ${id}${id !== p.data.run.id ? ` (the id ${p.data.run.id} was already in use)` : ""}. ${r.restored} evidence file(s) restored.${r.mismatched.length ? ` WARNING: ${r.mismatched.length} file(s) do not match their stored SHA-256 hash.` : " All hashes verified."}` });
    } catch { setM2({ ok: false, text: "Could not read this file (invalid JSON)." }); }
  };
  const note = (m: Msg) => m && <p role={m.ok ? "status" : "alert"} className={`mt-2 text-sm ${m.ok ? "text-emerald-600" : "text-red-600"}`}>{m.text} {m.runId && <Link className="underline" href={`/runs/${m.runId}`}>Open run</Link>}</p>;
  const pick = (label: string, fn: (f: File) => void) => (
    <label className="btn cursor-pointer">{label}<input type="file" accept="application/json,.json" className="sr-only" onChange={(e) => { const f = e.target.files?.[0]; if (f) fn(f); e.target.value = ""; }} /></label>);

  return (
    <>
      <PageTitle>Backup &amp; import</PageTitle>
      <section className="card mb-4"><h2 className="font-semibold">Backup / restore everything</h2>
        <p className="mb-3 text-sm text-zinc-500">Master library, dependency map, runs, audit logs, analyses and evidence files that are still available in this browser session.</p>
        <div className="flex flex-wrap gap-2"><button className="btn btn-primary" disabled={busy} onClick={backup}>{busy ? "Preparing…" : "Download backup (.json)"}</button>{pick("Restore from backup…", restore)}</div>{note(m1)}</section>
      <section className="card"><h2 className="font-semibold">Import a saved run</h2>
        <p className="mb-3 text-sm text-zinc-500">Load a run file saved with “Save .json” on a run page. Evidence files are re-attached and verified against their SHA-256 hashes. A signed-off run stays locked.</p>
        {pick("Choose run file…", importOne)}{note(m2)}</section>
    </>
  );
}
