"use client";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState, type ClipboardEvent, type KeyboardEvent } from "react";
import { useStore } from "@/lib/store";
import { blobUrls, download, fmtDate, jiraComment, retestRows, runToCsv, sha256, signOffCheck, summary } from "@/lib/logic";
import { collectEvidenceData, printHtml } from "@/lib/files";
import { buildReportHtml } from "@/lib/exportHtml";
import { MODE_LABEL, STATUSES, type Evidence, type Run, type RunCase, type RunFile, type RunMeta, type Status } from "@/lib/types";
import { Badge, Empty, Field, PageTitle } from "@/components/ui";

const MAX_IMG = 10 * 1024 * 1024, MAX_VID = 200 * 1024 * 1024;
const KEYS: Record<string, Status> = { p: "Passed", f: "Failed", b: "Blocked", s: "Skipped", n: "Not Run" };
const BORDER: Record<Status, string> = { Passed: "border-l-emerald-500", Failed: "border-l-red-500", Blocked: "border-l-amber-500", Skipped: "border-l-zinc-400", "Not Run": "border-l-transparent" };
const CAUSES = ["", "Code change", "Config", "Data", "Environment", "Test gap"];

function EvidenceItem({ e }: { e: Evidence }) {
  const href = e.link ?? blobUrls.get(e.id);
  const img = e.type.startsWith("image/"), vid = e.type.startsWith("video/");
  return (
    <div className="w-40 rounded border border-zinc-300 p-1 text-xs dark:border-zinc-700">
      {href && img && <a href={href} target="_blank" rel="noreferrer"><img src={href} alt={e.name} className="h-24 w-full rounded object-cover" /></a>}
      {href && vid && <video src={href} controls className="h-24 w-full rounded" />}
      {href && !img && !vid && <a href={href} target="_blank" rel="noreferrer" className="block break-all py-2 text-indigo-600 underline">{e.kind === "link" ? "Open link" : e.name}</a>}
      {!href && <div className="py-2 text-amber-600">File not available after reload</div>}
      <div className="truncate" title={e.sha256 ? `SHA-256 ${e.sha256}` : e.link}>{e.kind === "link" ? "Link" : e.name}{e.sha256 && <span className="ml-1 font-mono text-zinc-500">{e.sha256.slice(0, 8)}</span>}</div>
    </div>
  );
}

function CaseRow({ run, c }: { run: Run; c: RunCase }) {
  const { patchCase, addEvidence } = useStore();
  const locked = run.locked;
  const needsProof = c.status === "Failed" && !c.evidence.length && !c.actual.trim();

  const addFiles = async (files: File[]) => {
    for (const f of files) {
      const video = f.type.startsWith("video/"), image = f.type.startsWith("image/");
      if (!video && !image) { alert(`${f.name}: only images and videos are allowed.`); continue; }
      if (f.size > (video ? MAX_VID : MAX_IMG)) { alert(`${f.name} is too large (limit ${video ? "200" : "10"} MB).`); continue; }
      const id = crypto.randomUUID();
      const name = f.name === "image.png" ? `screenshot-${Date.now()}.png` : f.name; // pasted screenshots
      blobUrls.set(id, URL.createObjectURL(f));
      addEvidence(run.id, c.id, { id, kind: "file", name, type: f.type, size: f.size, sha256: await sha256(f), addedAt: new Date().toISOString() });
    }
  };
  const onPaste = (e: ClipboardEvent) => { if (locked) return; const fs = [...e.clipboardData.files]; if (fs.length) { e.preventDefault(); addFiles(fs); } };
  const onKey = (e: KeyboardEvent) => {
    if (locked || e.target !== e.currentTarget || e.ctrlKey || e.metaKey) return;
    const s = KEYS[e.key.toLowerCase()]; if (s) { e.preventDefault(); patchCase(run.id, c.id, { status: s }); }
  };
  const addLink = () => {
    const link = prompt("Paste a BrowserStack / Loom link"); if (!link) return;
    addEvidence(run.id, c.id, { id: crypto.randomUUID(), kind: "link", name: link, type: "link", size: 0, sha256: "", addedAt: new Date().toISOString(), link });
  };

  return (
    <div tabIndex={0} onKeyDown={onKey} onPaste={onPaste}
      className={`card mb-2 border-l-4 ${BORDER[c.status]} outline-none focus:ring-2 focus:ring-indigo-500`}>
      <div className="mb-1 flex flex-wrap items-center gap-2">
        <Badge>{c.group}</Badge><span className="font-mono text-xs">{c.id}</span><Badge>{c.priority}</Badge>
        <span className="text-xs text-zinc-500">{c.component} / {c.subComponent}</span>
        {c.custom ? <span className="text-xs text-zinc-500">(custom)</span> : <span className="text-xs text-zinc-500">v{c.masterVersion}</span>}
        <span className="ml-auto text-xs text-zinc-500">Executed: {fmtDate(c.executedAt)}</span>
      </div>
      <div className="font-medium">{c.testCase}</div>
      <div className="mb-2 text-sm text-zinc-600 dark:text-zinc-400">Expected: {c.expected}</div>
      <div className="grid gap-2 md:grid-cols-4">
        <Field label="Status"><select aria-label={`Status for ${c.id}`} className="input" disabled={locked} value={c.status} onChange={(e) => patchCase(run.id, c.id, { status: e.target.value as Status })}>{STATUSES.map((s) => <option key={s}>{s}</option>)}</select></Field>
        <Field label="Bug ID (Jira key)"><input className="input" disabled={locked} defaultValue={c.bugId} placeholder="ABC-123" onBlur={(e) => patchCase(run.id, c.id, { bugId: e.target.value.trim() })} /></Field>
        {c.status === "Failed" && <Field label="Root cause"><select className="input" disabled={locked} value={c.rootCause ?? ""} onChange={(e) => patchCase(run.id, c.id, { rootCause: e.target.value })}>{CAUSES.map((x) => <option key={x}>{x}</option>)}</select></Field>}
        <Field label="Actual result" className="md:col-span-4"><textarea rows={2} className="input" disabled={locked} defaultValue={c.actual} onBlur={(e) => patchCase(run.id, c.id, { actual: e.target.value })} /></Field>
      </div>
      {needsProof && <p role="alert" className="mt-1 text-sm text-red-600">Failed: add evidence or an actual-result note before sign-off.</p>}
      <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
        {c.evidence.map((e) => <EvidenceItem key={e.id} e={e} />)}
        {!locked && <>
          <label className="btn cursor-pointer">Add files<input type="file" multiple accept="image/*,video/*" className="sr-only" onChange={(e) => { addFiles([...(e.target.files ?? [])]); e.target.value = ""; }} /></label>
          <button className="btn" onClick={addLink}>Add link</button>
          <span className="text-xs text-zinc-500">Focus this card and paste a screenshot, or press P / F / B / S / N to set status.</span></>}
      </div>
    </div>
  );
}

export default function RunPage() {
  const { id } = useParams<{ id: string }>();
  const { runs, cases, createRun, patchRunMeta, addRows, signOff } = useStore();
  const router = useRouter();
  const run = runs.find((r) => r.id === id);
  const [fStatus, setFStatus] = useState(""); const [fGroup, setFGroup] = useState("");
  const [addId, setAddId] = useState(""); const [addGroup, setAddGroup] = useState<"Selected" | "Related">("Selected");
  const [copied, setCopied] = useState(false);
  const [showRetest, setShowRetest] = useState(false); const [scope, setScope] = useState<"problem" | "all">("problem"); const [inclRel, setInclRel] = useState(true);
  const [busy, setBusy] = useState(false);
  if (!run) return <Empty>Run not found. <Link href="/runs" className="underline">Back to runs</Link></Empty>;

  const s = summary(run.cases);
  const locked = run.locked;
  const shown = run.cases.filter((c) => (!fStatus || c.status === fStatus) && (!fGroup || c.group === fGroup));
  const candidates = cases.filter((c) => c.active && !run.cases.some((x) => x.id === c.id));
  const meta = (k: keyof RunMeta, label: string, span = "") => (
    <Field label={label} className={span}><input className="input" disabled={locked} defaultValue={run[k]} onBlur={(e) => patchRunMeta(run.id, { [k]: e.target.value } as Partial<RunMeta>)} /></Field>);

  const doSignOff = () => {
    const { errors, warnings } = signOffCheck(run);
    if (errors.length) return alert(errors.join("\n"));
    if (confirm(`${warnings.length ? warnings.join("\n") + "\n\n" : ""}Sign off and lock ${run.id}? This cannot be undone.`)) signOff(run.id);
  };
  const retest = () => {
    const rows = retestRows(run, scope, inclRel);
    if (!rows.length) return alert("Nothing to retest: no Failed, Blocked or Not Run cases.");
    const { build, environment, url, browser, testedBy } = run;
    const nid = createRun({ mode: run.mode, components: run.components, previousRunId: run.id, rows, meta: { purpose: `Retest of ${run.id}`, build, environment, url, browser, bsLink: "", testedBy } });
    router.push(`/runs/${nid}`);
  };
  const withFiles = async (fn: (data: Record<string, string>) => void) => { setBusy(true); try { fn(await collectEvidenceData([run])); } finally { setBusy(false); } };
  const saveJson = () => withFiles((evidenceData) => {
    const f: RunFile = { app: "qa-run-manager-run", version: 1, exportedAt: new Date().toISOString(), run, evidenceData };
    download(`${run.id}.json`, JSON.stringify(f), "application/json");
  });
  const saveHtml = () => withFiles((d) => download(`${run.id}-report.html`, buildReportHtml(run, MODE_LABEL[run.mode], d), "text/html;charset=utf-8"));
  const savePdf = () => withFiles((d) => printHtml(buildReportHtml(run, MODE_LABEL[run.mode], d)));
  const copyJira = async () => { await navigator.clipboard.writeText(jiraComment(run, MODE_LABEL[run.mode])); setCopied(true); setTimeout(() => setCopied(false), 1500); };

  return (
    <>
      <PageTitle actions={<>
        <button className="btn" onClick={copyJira}>{copied ? "Copied" : "Copy Jira comment"}</button>
        <button className="btn" disabled={busy} onClick={saveJson}>Save .json</button>
        <button className="btn" disabled={busy} onClick={saveHtml}>Report (.html)</button>
        <button className="btn" disabled={busy} onClick={savePdf}>PDF</button>
        <button className="btn" onClick={() => download(`${run.id}.csv`, runToCsv(run), "text/csv;charset=utf-8")}>CSV</button>
        {locked && <button className="btn" onClick={() => setShowRetest(!showRetest)}>Retest…</button>}
        {!locked && <button className="btn btn-primary" onClick={doSignOff}>Sign-off + Lock</button>}
      </>}>{run.id} <Badge>{locked ? "Locked" : "Open"}</Badge></PageTitle>
      <p className="mb-3 text-sm text-zinc-500">{MODE_LABEL[run.mode]}{run.mode !== "complete" && ` (${run.components.join(", ")})`} · created {fmtDate(run.createdAt)}
        {run.signedOffAt && ` · signed off ${fmtDate(run.signedOffAt)}`}{run.previousRunId && <> · retest of <Link className="underline" href={`/runs/${run.previousRunId}`}>{run.previousRunId}</Link></>}</p>
      {showRetest && (
        <div className="card mb-3 text-sm"><h3 className="mb-2 font-semibold">Create a retest of {run.id}</h3>
          <label className="mr-4"><input type="radio" checked={scope === "problem"} onChange={() => setScope("problem")} /> Only Failed / Blocked / Not Run</label>
          <label><input type="radio" checked={scope === "all"} onChange={() => setScope("all")} /> All cases</label>
          <label className="mt-2 block"><input type="checkbox" disabled={scope === "all"} checked={inclRel || scope === "all"} onChange={(e) => setInclRel(e.target.checked)} /> Also include the Related cases</label>
          <p className="mt-2 text-zinc-500">{retestRows(run, scope, inclRel).length} case(s) will be copied with status reset to Not Run.</p>
          <button className="btn btn-primary mt-2" onClick={retest}>Create retest run</button></div>)}
      {locked && <p className="mb-3 rounded-md bg-zinc-100 p-2 text-sm dark:bg-zinc-800">This run is locked. It is read-only; use Retest to test again.</p>}

      <div className="card mb-3 flex flex-wrap items-center gap-3 text-sm" aria-live="polite">
        {Object.entries(s.counts).map(([k, v]) => <span key={k} className="flex items-center gap-1"><Badge>{k}</Badge>{v}</span>)}
        <span className="ml-auto font-semibold">{s.passPct}% pass</span>
      </div>

      <details className="card mb-3"><summary className="cursor-pointer font-semibold">Run details</summary>
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          {meta("purpose", "Purpose", "md:col-span-3")}{meta("build", "Build / commit SHA")}{meta("environment", "Environment")}{meta("url", "Environment URL")}
          {meta("browser", "Browser + OS + device")}{meta("bsLink", "BrowserStack session link")}{meta("testedBy", "Tested by")}
        </div></details>

      <div className="mb-2 flex gap-2">
        <select aria-label="Filter status" className="input w-auto" value={fStatus} onChange={(e) => setFStatus(e.target.value)}><option value="">All statuses</option>{STATUSES.map((x) => <option key={x}>{x}</option>)}</select>
        <select aria-label="Filter group" className="input w-auto" value={fGroup} onChange={(e) => setFGroup(e.target.value)}><option value="">Selected + Related</option><option>Selected</option><option>Related</option></select>
      </div>
      {shown.length ? shown.map((c) => <CaseRow key={c.id} run={run} c={c} />) : <Empty>No cases match the filter.</Empty>}

      {!locked && (
        <div className="card mt-3"><h3 className="mb-2 font-semibold">Add more cases from master</h3>
          <div className="flex flex-wrap gap-2">
            <select className="input max-w-md" value={addId} onChange={(e) => setAddId(e.target.value)}><option value="">Choose a case…</option>{candidates.map((c) => <option key={c.id} value={c.id}>{c.id} · {c.testCase}</option>)}</select>
            <select className="input w-auto" value={addGroup} onChange={(e) => setAddGroup(e.target.value as "Selected" | "Related")}><option>Selected</option><option>Related</option></select>
            <button className="btn" disabled={!addId} onClick={() => { const c = cases.find((x) => x.id === addId); if (c) addRows(run.id, [{ id: c.id, component: c.component, subComponent: c.subComponent, testCase: c.testCase, expected: c.expected, priority: c.priority, group: addGroup, masterVersion: c.version }]); setAddId(""); }}>Add to run</button>
          </div></div>)}

      <details className="card mt-3"><summary className="cursor-pointer font-semibold">Audit log ({run.audit.length})</summary>
        <div className="mt-2 overflow-x-auto"><table className="w-full"><thead><tr>{["When", "Who", "What", "Case", "Old", "New"].map((h) => <th key={h} className="th">{h}</th>)}</tr></thead>
          <tbody>{[...run.audit].reverse().map((a, i) => (
            <tr key={i} className="border-t border-zinc-100 dark:border-zinc-800"><td className="td whitespace-nowrap">{fmtDate(a.at)}</td><td className="td">{a.by}</td><td className="td">{a.action}{a.field ? ` (${a.field})` : ""}</td><td className="td">{a.caseId}</td><td className="td">{a.oldValue}</td><td className="td">{a.newValue}</td></tr>))}</tbody></table></div></details>
    </>
  );
}
