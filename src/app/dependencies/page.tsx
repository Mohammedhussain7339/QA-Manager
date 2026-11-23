"use client";
import { useState } from "react";
import { useStore } from "@/lib/store";
import { PageTitle } from "@/components/ui";

export default function Dependencies() {
  const { deps, setDeps, addComponent, removeComponent } = useStore();
  const [name, setName] = useState("");
  const comps = Object.keys(deps).sort();
  const toggle = (c: string, t: string) => setDeps(c, deps[c].includes(t) ? deps[c].filter((x) => x !== t) : [...deps[c], t]);
  return (
    <>
      <PageTitle>Dependency Map</PageTitle>
      <p className="mb-4 text-sm text-zinc-500">Each component lists the components it can affect. “Selected + Related” runs use these links to add Related cases.</p>
      <div className="mb-4 flex gap-2">
        <input className="input max-w-xs" placeholder="New component name" value={name} onChange={(e) => setName(e.target.value)} />
        <button className="btn btn-primary" onClick={() => { addComponent(name.trim()); setName(""); }}>Add component</button>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {comps.map((c) => (
          <div key={c} className="card">
            <div className="mb-2 flex items-center justify-between"><h2 className="font-semibold">{c} <span className="font-normal text-zinc-500">affects</span></h2>
              <button className="btn" onClick={() => confirm(`Remove ${c} and all links to it?`) && removeComponent(c)}>Remove</button></div>
            <div className="flex flex-wrap gap-1.5">
              {comps.filter((t) => t !== c).map((t) => {
                const on = deps[c].includes(t);
                return <button key={t} onClick={() => toggle(c, t)} aria-pressed={on}
                  className={`rounded-full border px-2.5 py-0.5 text-sm ${on ? "border-indigo-600 bg-indigo-600 text-white" : "border-zinc-300 dark:border-zinc-700"}`}>{t}</button>;
              })}
            </div>
          </div>))}
      </div>
    </>
  );
}
