// Browser-only helpers: embedding evidence files, restoring them with hash verification, printing.
import { blobUrls, sha256 } from "./logic";
import type { Run } from "./types";

export const blobToDataUrl = (b: Blob) => new Promise<string>((res, rej) => {
  const r = new FileReader(); r.onload = () => res(r.result as string); r.onerror = () => rej(r.error); r.readAsDataURL(b);
});
const dataUrlToBlob = async (u: string) => (await fetch(u)).blob();

/** Evidence files that are still available in this browser session, as data URLs keyed by evidence id. */
export async function collectEvidenceData(runs: Run[]): Promise<Record<string, string>> {
  const out: Record<string, string> = {};
  for (const r of runs) for (const c of r.cases) for (const e of c.evidence) {
    const url = blobUrls.get(e.id);
    if (e.kind === "file" && url) out[e.id] = await blobToDataUrl(await (await fetch(url)).blob());
  }
  return out;
}

/** Re-creates viewable files from a saved export and checks each against its stored SHA-256. */
export async function restoreEvidenceData(data: Record<string, string>, runs: Run[]) {
  const hashes = new Map<string, string>();
  runs.forEach((r) => r.cases.forEach((c) => c.evidence.forEach((e) => hashes.set(e.id, e.sha256))));
  const mismatched: string[] = []; let restored = 0;
  for (const [id, url] of Object.entries(data)) {
    const blob = await dataUrlToBlob(url);
    const expected = hashes.get(id);
    if (expected && expected !== (await sha256(blob))) mismatched.push(id);
    blobUrls.set(id, URL.createObjectURL(blob)); restored++;
  }
  return { restored, mismatched };
}

/** Opens the browser print dialog for an HTML string ("Save as PDF" in the dialog). */
export function printHtml(html: string) {
  const f = document.createElement("iframe");
  f.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0";
  document.body.appendChild(f);
  f.onload = () => { f.contentWindow?.focus(); f.contentWindow?.print(); setTimeout(() => f.remove(), 60000); };
  f.srcdoc = html;
}
export const today = () => new Date().toISOString().slice(0, 10);
