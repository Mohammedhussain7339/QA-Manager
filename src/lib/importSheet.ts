// Pure helpers for importing the tester's existing Excel/CSV sheet. No React, easy to unit test.
import type { LoginState } from "./types";

export interface ImportRow {
  line: number;                       // 1-based line in the sheet
  component: string; subComponent: string; testCase: string; expected: string;
  loginState: LoginState; caseNo: string;
  status: "new" | "duplicate" | "invalid"; note?: string;
}

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
const ALIASES: Record<string, string[]> = {
  component: ["component"],
  subComponent: ["subcomponent", "sub"],
  testCase: ["testcase", "testcases", "test", "case"],
  loginState: ["loginlogout", "loginstate", "loginstatus", "login"],
  expected: ["behaviour", "behavior", "expected", "expectedresult", "expectedbehaviour", "expectedbehavior"],
  caseNo: ["caseno", "casenumber", "caseid", "no"],
  status: ["status"], // recognised but ignored: runs hold status, never the master
};
const LABEL: Record<string, string> = { component: "Component", testCase: "Test Case", expected: "Behaviour (Expected)" };

export const caseKey = (component: string, sub: string, testCase: string) =>
  [component, sub, testCase].map((s) => s.toLowerCase().replace(/\s+/g, " ").trim()).join("|");

export function parseCsv(text: string): string[][] {
  text = text.replace(/^\uFEFF/, "");
  const head = text.split(/\r?\n/).slice(0, 10).join("\n"); // count over several lines so a title row can't mislead us
  const total = (d: string) => head.split(d).length - 1;
  const delim = [",", ";", "\t"].sort((a, b) => total(b) - total(a))[0];
  const rows: string[][] = []; let row: string[] = []; let cell = ""; let q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) { if (ch === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += ch; }
    else if (ch === '"') q = true;
    else if (ch === delim) { row.push(cell); cell = ""; }
    else if (ch === "\n" || ch === "\r") { if (ch === "\r" && text[i + 1] === "\n") i++; row.push(cell); cell = ""; rows.push(row); row = []; }
    else cell += ch;
  }
  if (cell !== "" || row.length) { row.push(cell); rows.push(row); }
  return rows;
}

/** Reads .csv/.txt natively; .xlsx/.xls via SheetJS (first sheet), loaded only when needed. */
export async function readTable(file: File): Promise<string[][]> {
  if (/\.(csv|txt)$/i.test(file.name)) return parseCsv(await file.text());
  const XLSX = await import("xlsx");
  const wb = XLSX.read(await file.arrayBuffer(), { type: "array" });
  const ws = wb.Sheets[wb.SheetNames[0]];
  return XLSX.utils.sheet_to_json<string[]>(ws, { header: 1, raw: false, defval: "" }) as string[][];
}

function findColumns(table: string[][]) {
  for (let r = 0; r < Math.min(10, table.length); r++) {       // tolerate title rows above the header
    const map: Record<string, number> = {};
    (table[r] ?? []).forEach((h, i) => {
      const n = norm(String(h));
      for (const [f, al] of Object.entries(ALIASES)) if (!(f in map) && al.includes(n)) { map[f] = i; break; }
    });
    if (Object.keys(map).length >= 2) return { headerRow: r, map };
  }
  return null;
}

const loginOf = (v: string): LoginState => {
  const s = v.toLowerCase();
  const li = /login|logged in|signed in/.test(s), lo = /logout|logged out|guest/.test(s);
  return li && !lo ? "Login" : lo && !li ? "Logout" : "Both";
};

export function buildRows(table: string[][], fillDown: boolean, existing: Set<string>, components: string[]) {
  const found = findColumns(table);
  if (!found) return { rows: [] as ImportRow[], missing: ["Component", "Test Case", "Behaviour (Expected)"] };
  const { headerRow, map } = found;
  const missing = ["component", "testCase", "expected"].filter((f) => !(f in map)).map((f) => LABEL[f]);
  if (missing.length) return { rows: [] as ImportRow[], missing };

  const get = (r: string[], f: string) => (f in map ? String(r[map[f]] ?? "").trim() : "");
  const canon = new Map(components.map((c) => [c.toLowerCase(), c]));
  const seen = new Set<string>(); const rows: ImportRow[] = [];
  let lastC = "", lastS = "";

  for (let i = headerRow + 1; i < table.length; i++) {
    const r = table[i];
    if (!r || r.every((c) => String(c).trim() === "")) continue;
    let component = get(r, "component"), sub = get(r, "subComponent");
    if (!component && fillDown) component = lastC;                  // merged cells in Excel come through blank
    if (component && component !== lastC) { lastC = component; lastS = ""; }
    if (sub) lastS = sub; else if (fillDown) sub = lastS;
    component = canon.get(component.toLowerCase()) ?? component;

    const testCase = get(r, "testCase"), expected = get(r, "expected");
    const row: ImportRow = { line: i + 1, component, subComponent: sub, testCase, expected,
      loginState: loginOf(get(r, "loginState")), caseNo: get(r, "caseNo"), status: "new" };
    const lacking = [!component && "Component", !testCase && "Test Case", !expected && "Behaviour"].filter(Boolean);
    if (lacking.length) { row.status = "invalid"; row.note = `Missing ${lacking.join(", ")}`; }
    else {
      const k = caseKey(component, sub, testCase);
      if (existing.has(k)) { row.status = "duplicate"; row.note = "Already in master"; }
      else if (seen.has(k)) { row.status = "duplicate"; row.note = "Repeated in this file"; }
      seen.add(k);
    }
    rows.push(row);
  }
  return { rows, missing: [] as string[] };
}

export const TEMPLATE_CSV =
  "\uFEFFComponent,Sub Component,Test Case,Login/Logout,Behaviour,Case No.,Status\r\n" +
  'Navbar,Logo,Click logo,Both,Navigates to Home page,1,Passed\r\n' +
  'Navbar,Search,"Type a keyword, then press Enter",Both,Matching products are shown,2,\r\n';
