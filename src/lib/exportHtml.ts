// Builds a standalone HTML report (no external files). Evidence is embedded as data URLs.
import { fmtDate, summary } from "./logic";
import type { Evidence, Run } from "./types";

const esc = (s: unknown) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const COLOR: Record<string, string> = { Passed: "#047857", Failed: "#b91c1c", Blocked: "#b45309", Skipped: "#52525b", "Not Run": "#71717a" };

export function buildReportHtml(run: Run, modeLabel: string, data: Record<string, string> = {}): string {
  const s = summary(run.cases);
  const ev = (e: Evidence) => {
    if (e.kind === "link") return /^https?:\/\//.test(e.link ?? "") ? `<div><a href="${esc(e.link)}">${esc(e.link)}</a></div>` : `<div>${esc(e.link)}</div>`;
    const src = data[e.id];
    if (!src) return `<div class="miss">${esc(e.name)} (file not embedded)</div>`;
    const cap = `<figcaption>${esc(e.name)} · ${Math.round(e.size / 1024)} KB · SHA-256 ${esc(e.sha256)}</figcaption>`;
    return e.type.startsWith("video/")
      ? `<figure><video controls src="${src}"></video>${cap}</figure>`
      : `<figure><img src="${src}" alt="${esc(e.name)}">${cap}</figure>`;
  };
  const rows = run.cases.map((c) => `<tr>
    <td>${esc(c.group)}</td><td class="mono">${esc(c.id)}</td><td>${esc(c.component)}</td><td>${esc(c.priority)}</td>
    <td>${esc(c.testCase)}<div class="sub">Expected: ${esc(c.expected)}</div></td>
    <td><b style="color:${COLOR[c.status]}">${esc(c.status)}</b><div class="sub">${esc(fmtDate(c.executedAt))}</div></td>
    <td>${esc(c.actual)}${c.bugId ? `<div class="sub">Bug: ${esc(c.bugId)}</div>` : ""}${c.rootCause ? `<div class="sub">Root cause: ${esc(c.rootCause)}</div>` : ""}</td>
    <td>${c.evidence.map(ev).join("")}</td></tr>`).join("");
  const meta: [string, string][] = [["Mode", `${modeLabel}${run.mode !== "complete" ? ` (${run.components.join(", ")})` : ""}`], ["Purpose", run.purpose],
    ["Build", run.build], ["Environment", `${run.environment} ${run.url}`], ["Browser / OS / device", run.browser], ["BrowserStack session", run.bsLink],
    ["Tested by", run.testedBy], ["Created", fmtDate(run.createdAt)], ["Signed off", run.signedOffAt ? fmtDate(run.signedOffAt) : "Not signed off (draft)"],
    ["Previous run", run.previousRunId ?? "-"]];
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(run.id)} QA report</title><style>
body{font:14px/1.45 system-ui,sans-serif;margin:24px;color:#18181b}h1{margin:0 0 4px}.sub{font-size:12px;color:#52525b}.mono{font-family:ui-monospace,monospace;font-size:12px}
table{border-collapse:collapse;width:100%}th,td{border:1px solid #d4d4d8;padding:6px 8px;vertical-align:top;text-align:left}th{background:#f4f4f5}
.meta td:first-child{width:200px;font-weight:600;background:#fafafa}.chips span{display:inline-block;margin:0 8px 8px 0;padding:2px 10px;border-radius:999px;background:#f4f4f5}
figure{margin:4px 0}img,video{max-width:320px;max-height:240px;display:block;border:1px solid #d4d4d8}figcaption{font-size:11px;color:#52525b;word-break:break-all}.miss{color:#b45309}
@media print{video{display:none}tr{break-inside:avoid}}</style></head><body>
<h1>${esc(run.id)} · QA test report</h1><p class="sub">${run.locked ? "Signed off and locked" : "Draft"} · generated ${esc(fmtDate(new Date().toISOString()))}</p>
<table class="meta">${meta.map(([k, v]) => `<tr><td>${esc(k)}</td><td>${esc(v)}</td></tr>`).join("")}</table>
<h2>Summary</h2><div class="chips">${Object.entries(s.counts).map(([k, v]) => `<span>${esc(k)}: <b>${v}</b></span>`).join("")}<span>Pass rate: <b>${s.passPct}%</b></span></div>
<h2>Results</h2><table><thead><tr><th>Group</th><th>ID</th><th>Component</th><th>Pri</th><th>Test case</th><th>Status</th><th>Actual result</th><th>Evidence</th></tr></thead><tbody>${rows}</tbody></table>
</body></html>`;
}
