"use client";
import { useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import { buildRows, caseKey, readTable, TEMPLATE_CSV } from "@/lib/importSheet";
import { download } from "@/lib/logic";
import type { Priority } from "@/lib/types";

const TONE = {
  new: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
  duplicate: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  invalid: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
};

export default function ImportCases({ onClose }: { onClose: () => void }) {
  const { cases, deps, addCases } = useStore();
  const [table, setTable] = useState<string[][] | null>(null);
  const [fileName, setFileName] = useState("");
  const [fill, setFill] = useState(true);
  const [prio, setPrio] = useState<Priority>("P2");
  const [picked, setPicked] = useState<Record<number, boolean>>({});
  const [err, setErr] = useState(""); const [done, setDone] = useState("");

  const existing = useMemo(() => new Set(cases.map((c) => caseKey(c.component, c.subComponent, c.testCase))), [cases]);
  const result = useMemo(() => (table ? buildRows(table, fill, existing, Object.keys(deps)) : null), [table, fill, existing, deps]);
  const rows = result?.rows ?? [];
  const checked = (line: number, status: string) => (status === "invalid" ? false : picked[line] ?? status === "new");
  const chosen = rows.filter((r) => checked(r.line, r.status));
  const newComps = [...new Set(chosen.map((r) => r.component))].filter((c) => !deps[c]);
  const count = (s: string) => rows.filter((r) => r.status === s).length;

  const onFile = async (f: File) => {
    setErr(""); setDone("");
    if (f.size > 5 * 1024 * 1024) return setErr("File is larger than 5 MB.");
    try { setTable(await readTable(f)); setFileName(f.name); setPicked({}); }
    catch { setErr("Could not read this file. Use .csv, .xlsx or .xls."); }
  };
  const doImport = () => {
    addCases(chosen.map((r) => ({ component: r.component, subComponent: r.subComponent, testCase: r.testCase, expected: r.expected,
      priority: prio, loginState: r.loginState, tags: r.caseNo ? [`case-no:${r.caseNo}`] : [], active: true })));
    setDone(`Imported ${chosen.length} test case(s).`); setTable(null); setFileName(""); setPicked({});
  };

  return (
    <section className="card mb-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-semibold">Import from Excel / CSV</h2>
        <div className="flex gap-2">
          <button className="btn" onClick={() => download("test-cases-template.csv", TEMPLATE_CSV, "text/csv;charset=utf-8")}>Download template</button>
          <button className="btn" onClick={onClose}>Close</button>
        </div>
      </div>
      <p className="mb-3 text-sm text-zinc-500">Columns: Component, Sub Component, Test Case, Login/Logout, Behaviour (= Expected), Case No., Status. The Status column is ignored, because status only lives inside runs.</p>
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <label className="btn cursor-pointer">Choose file<input type="file" accept=".csv,.txt,.xlsx,.xls" className="sr-only"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = ""; }} /></label>
        {fileName && <span>{fileName}</span>}
        <label className="flex items-center gap-1"><input type="checkbox" checked={fill} onChange={(e) => setFill(e.target.checked)} />Fill down blank Component / Sub Component</label>
        <label className="flex items-center gap-1">Default priority
          <select className="input w-auto" value={prio} onChange={(e) => setPrio(e.target.value as Priority)}><option>P1</option><option>P2</option><option>P3</option></select></label>
      </div>
      {err && <p role="alert" className="mt-2 text-sm text-red-600">{err}</p>}
      {done && <p role="status" className="mt-2 text-sm text-emerald-600">{done}</p>}
      {result && result.missing.length > 0 && <p role="alert" className="mt-2 text-sm text-red-600">Could not find required column(s): {result.missing.join(", ")}. Check the header row or use the template.</p>}

      {rows.length > 0 && (
        <>
          <p className="mt-3 text-sm"><b>{rows.length}</b> rows: <span className="text-emerald-600">{count("new")} new</span>, <span className="text-amber-600">{count("duplicate")} duplicate</span>, <span className="text-red-600">{count("invalid")} invalid</span>.
            {newComps.length > 0 && <> New component(s) will be added to the Dependency Map: <b>{newComps.join(", ")}</b>.</>}</p>
          <div className="mt-2 max-h-96 overflow-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
            <table className="w-full"><thead className="sticky top-0 bg-white dark:bg-zinc-900"><tr>{["", "Line", "Component / Sub", "Test case", "Expected", "Login", "Case No.", "Result"].map((h) => <th key={h} className="th">{h}</th>)}</tr></thead>
              <tbody>{rows.map((r) => (
                <tr key={r.line} className="border-t border-zinc-100 dark:border-zinc-800">
                  <td className="td"><input type="checkbox" aria-label={`Import line ${r.line}`} disabled={r.status === "invalid"} checked={checked(r.line, r.status)} onChange={(e) => setPicked({ ...picked, [r.line]: e.target.checked })} /></td>
                  <td className="td">{r.line}</td><td className="td">{r.component}<div className="text-xs text-zinc-500">{r.subComponent}</div></td>
                  <td className="td">{r.testCase}</td><td className="td text-zinc-600 dark:text-zinc-400">{r.expected}</td><td className="td">{r.loginState}</td><td className="td">{r.caseNo}</td>
                  <td className="td"><span className={`rounded px-1.5 py-0.5 text-xs font-medium ${TONE[r.status]}`}>{r.status === "new" ? "New" : r.status === "duplicate" ? "Duplicate" : "Invalid"}</span>
                    {r.note && <div className="text-xs text-zinc-500">{r.note}</div>}</td>
                </tr>))}</tbody></table>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <button className="btn btn-primary" disabled={!chosen.length} onClick={doImport}>Import {chosen.length} case(s)</button>
            <span className="text-xs text-zinc-500">Duplicates and invalid rows are unchecked by default. New IDs like TC-NAV-024 are assigned automatically.</span>
          </div>
        </>)}
    </section>
  );
}
