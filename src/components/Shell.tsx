"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { useStore } from "@/lib/store";

const NAV = [["/", "Dashboard"], ["/runs", "Runs"], ["/runs/new", "New Run"], ["/compare", "Compare"], ["/regressions", "Regressions"], ["/library", "Master Library"], ["/dependencies", "Dependency Map"], ["/backup", "Backup"]];

export default function Shell({ children }: { children: ReactNode }) {
  const path = usePathname();
  const { ready } = useStore();
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const d = localStorage.getItem("theme") ? localStorage.getItem("theme") === "dark" : matchMedia("(prefers-color-scheme: dark)").matches;
    setDark(d); document.documentElement.classList.toggle("dark", d);
  }, []);
  const toggle = () => { const d = !dark; setDark(d); localStorage.setItem("theme", d ? "dark" : "light"); document.documentElement.classList.toggle("dark", d); };
  const active = (h: string) => (h === "/" ? path === "/" : h === "/runs" ? path === "/runs" || (path.startsWith("/runs/") && path !== "/runs/new") : path === h);
  return (
    <>
      <header className="sticky top-0 z-10 border-b border-zinc-200 bg-white/90 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/90">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-1 px-4 py-2">
          <span className="font-semibold">QA Run Manager</span>
          <nav className="flex flex-1 flex-wrap gap-1 text-sm">
            {NAV.map(([h, l]) => (
              <Link key={h} href={h} className={`rounded px-2 py-1 ${active(h) ? "bg-indigo-600 text-white" : "hover:bg-zinc-100 dark:hover:bg-zinc-800"}`}>{l}</Link>
            ))}
          </nav>
          <button onClick={toggle} className="btn" aria-label="Toggle theme">{dark ? "Light" : "Dark"}</button>
        </div>
      </header>
      <main className="mx-auto max-w-6xl p-4">{ready ? children : <p className="py-16 text-center text-zinc-500">Loading…</p>}</main>
    </>
  );
}
