"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Props = {
  value: string | null;
  onChange: (id: string | null) => void;
};

export default function ProjectSelect({ value, onChange }: Props) {
  const [items, setItems] = useState<{id:string; name:string}[]>([]);
  const [input, setInput] = useState("");

  async function load() {
    const { data } = await supabase.from("projects").select("id, name").order("name");
    setItems(data || []);
  }
  useEffect(() => { load(); }, []);

  async function createProject() {
    const name = input.trim();
    if (!name) return;
    const { data, error } = await supabase
      .from("projects")
      .insert({ name })
      .select("id, name")
      .single();
    if (!error && data) {
      setItems(prev => [...prev, data].sort((a,b)=>a.name.localeCompare(b.name)));
      onChange(data.id);
      setInput("");
    }
  }

  return (
    <div className="grid grid-cols-[1fr_auto] gap-2">
      <select
        className="rounded-[--r] border border-[--border] bg-white px-3 py-2 text-sm"
        value={value || ""}
        onChange={(e)=>onChange(e.target.value || null)}
      >
        <option value="">— vyber projekt —</option>
        {items.map(p=> <option key={p.id} value={p.id}>{p.name}</option>)}
      </select>
      <div className="grid grid-cols-[1fr_auto] gap-2 col-span-2 md:col-span-1">
        <input
          placeholder="Nový projekt…"
          value={input}
          onChange={(e)=>setInput(e.target.value)}
          className="rounded-[--r] border border-[--border] bg-white px-3 py-2 text-sm"
        />
        <button className="ease-outline-btn" onClick={createProject}>Přidat</button>
      </div>
    </div>
  );
}
