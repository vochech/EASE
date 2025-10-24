"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function AgendaChecklist({ meetingId }: { meetingId: string }) {
  const [items, setItems] = useState<{id:string; text:string; done:boolean; sort:number}[]>([]);
  const [text, setText] = useState("");

  async function load() {
    const { data } = await supabase
      .from("agenda_items")
      .select("id, text, done, sort")
      .eq("meeting_id", meetingId)
      .order("done", { ascending: true })
      .order("sort", { ascending: true })
      .order("created_at", { ascending: true });
    setItems(data || []);
  }
  useEffect(()=>{ load(); }, [meetingId]);

  async function add() {
    const t = text.trim(); if (!t) return;
    const { data, error } = await supabase
      .from("agenda_items")
      .insert({ meeting_id: meetingId, text: t })
      .select("id, text, done, sort")
      .single();
    if (!error && data) {
      setItems(prev => [...prev, data]);
      setText("");
    }
  }
  async function toggle(id:string, done:boolean) {
    const { error } = await supabase.from("agenda_items").update({ done: !done }).eq("id", id);
    if (!error) setItems(prev => prev.map(i => i.id===id ? { ...i, done: !done } : i));
  }
  async function remove(id:string) {
    const { error } = await supabase.from("agenda_items").delete().eq("id", id);
    if (!error) setItems(prev => prev.filter(i => i.id !== id));
  }

  return (
    <div className="ease-card p-4 space-y-3">
      <h3 className="text-sm text-neutral-500">Agenda (checklist)</h3>
      <div className="grid grid-cols-[1fr_120px] gap-3">
        <input
          value={text}
          onChange={(e)=>setText(e.target.value)}
          placeholder="Přidat bod agendy…"
          className="rounded-[--r] border border-[--border] bg-white px-3 py-2 text-sm"
        />
        <button className="ease-outline-btn" onClick={add}>Přidat</button>
      </div>
      <ul className="divide-y divide-[--border]">
        {items.length === 0 && <li className="p-2 text-sm text-neutral-500">Zatím prázdná agenda.</li>}
        {items.map(i=>(
          <li key={i.id} className="p-2 flex items-center gap-3">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-[--border]"
              checked={!!i.done}
              onChange={()=>toggle(i.id, i.done)}
            />
            <span className={`flex-1 text-sm ${i.done ? "line-through text-neutral-400" : ""}`}>{i.text}</span>
            <button className="ease-outline-btn text-xs" onClick={()=>remove(i.id)}>Smazat</button>
          </li>
        ))}
      </ul>
    </div>
  );
}
