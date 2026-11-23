import type { ReactNode } from "react";

const TONE: Record<string, string> = {
  Passed: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
  Failed: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
  Blocked: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  Skipped: "bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
  "Not Run": "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
  Selected: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300",
  Related: "bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-300",
  P1: "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300",
  P2: "bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300",
  P3: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
  Locked: "bg-zinc-800 text-white dark:bg-zinc-200 dark:text-zinc-900",
  Open: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
};
export const Badge = ({ children }: { children: string }) => (
  <span className={`inline-block whitespace-nowrap rounded px-1.5 py-0.5 text-xs font-medium ${TONE[children] ?? TONE.P3}`}>{children}</span>
);
export const Field = ({ label, children, className = "" }: { label: string; children: ReactNode; className?: string }) => (
  <label className={`block text-xs font-medium text-zinc-500 ${className}`}>{label}<div className="mt-1 text-zinc-900 dark:text-zinc-100">{children}</div></label>
);
export const PageTitle = ({ children, actions }: { children: ReactNode; actions?: ReactNode }) => (
  <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
    <h1 className="text-xl font-semibold">{children}</h1><div className="flex flex-wrap gap-2">{actions}</div>
  </div>
);
export const Empty = ({ children }: { children: ReactNode }) => <p className="py-8 text-center text-sm text-zinc-500">{children}</p>;
