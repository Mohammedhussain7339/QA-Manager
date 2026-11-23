# QA Run Manager: frontend (hardcoded data)

Next.js 15 (App Router) + TypeScript + Tailwind CSS v3 + React Hook Form + Zod + Recharts. Node 18.18+ (works on 20.17).
All data is **hardcoded** (`src/lib/seed.ts`, `src/lib/sampleRuns.ts`) and held in memory, so a page refresh resets it.
Use **Backup** to save and restore your work between sessions.

```bash
npm install
npm run dev        # http://localhost:3000
npm test           # unit tests (vitest)
npx playwright install chromium && npm run test:e2e   # e2e smoke tests
```

## Screens
| Route | What it does |
|---|---|
| `/` Dashboard | Last known good per component, regression history, Recharts pass % trend |
| `/runs`, `/runs/[id]` | Runs list (filters: text, mode, component, state, build, result, date range); execution screen |
| `/runs/new` | 3 modes, Selected/Related preview, per-row overrides, add from master, custom cases |
| `/compare` | Case-by-case status diff of two runs (regressed / fixed / changed / only in A or B) |
| `/regressions` | Detected regressions + Regression Analysis form (last good run, first bad build, changes, root cause) |
| `/library` | Master cases: search/filter, add/edit (RHF + Zod), deactivate, version history, Excel/CSV import |
| `/dependencies` | Editable dependency map |
| `/backup` | Backup / restore everything; import a saved run file |

Run page: status, actual result, Jira bug ID, root cause, evidence (files with SHA-256, paste screenshots, links, image/video preview), keyboard shortcuts (P/F/B/S/N), sign-off checks, lock, audit log, Retest (scope options), Copy Jira comment, exports: **.json (with evidence)**, **.html report**, **PDF**, **CSV**.

## Notes
- PDF = the report opened in the browser print dialog: choose "Save as PDF".
- Evidence file bytes are kept only in the current browser session. Save .json / Backup embeds them (as base64), and importing re-verifies each file against its SHA-256.
- Imported signed-off runs stay locked.

## Swapping to Lambda + DynamoDB later
Pages talk only to `useStore()` in `src/lib/store.tsx`. Replace each function with an API call:

| Store function | Suggested endpoint |
|---|---|
| cases, deps, runs, history, analyses | GET /cases, /dependencies, /runs, /cases/{id}/versions, /analyses |
| addCase / addCases / saveCase | POST /cases, POST /cases/import, PUT /cases/{id} (server bumps version, writes V# item) |
| setDeps / addComponent / removeComponent | PUT /dependencies/{component}, DELETE ... |
| createRun | POST /runs (server assigns Run-00N, snapshots cases) |
| patchRunMeta / patchCase / addRows | PATCH /runs/{id}, PATCH /runs/{id}/cases/{caseId}, POST /runs/{id}/cases |
| addEvidence | POST /runs/{id}/evidence/presign, PUT to S3, POST metadata (server verifies SHA-256) |
| signOff | POST /runs/{id}/signoff (conditional write on locked = false) |
| saveAnalysis | PUT /analyses/{key} |
| importRun / restoreAll | POST /runs/import, POST /restore |

Reusable rules live in `src/lib/logic.ts` (selection, sign-off checks, comparison, regressions, retest, lock guard) and `src/lib/schemas.ts` (Zod).

## Not included (needs the backend)
Login screen (Cognito), server-side timestamps and lock enforcement, S3 storage of evidence.
