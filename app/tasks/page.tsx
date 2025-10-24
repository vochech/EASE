"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";


type Task = {
  id: string;
  title: string;
  notes: string | null;
  department: string | null;
  assignee: string | null;
  seniority: "Junior"|"Mid"|"Senior"|null;
  due: string | null;
  est_hours: number | null;
  difficulty: "Low"|"Medium"|"High"|null;
  done: boolean;
  created_at: string;
};

export default function TasksPage() {
  const supa = supabase; // náš klient z "@/lib/supabase"
  const [tasks, setTasks] = useState<Task[]>([]);
  const [title, setTitle] = useState("");

  async function load() {
    const { data } = await supa.from("tasks").select("*").order("created_at", { ascending:false });
    setTasks(data || []);
  }
  useEffect(()=>{ load(); }, []);

  async function add() {
    const t = title.trim(); if (!t) return;
    await supa.from("tasks").insert({ title: t });
    setTitle(""); await load();
  }
  async function toggle(id: string, done:boolean) {
    await supa.from("tasks").update({ done: !done }).eq("id", id);
    await load();
  }
  async function remove(id: string) {
    await supa.from("tasks").delete().eq("id", id);
    await load();
  }

  return (
    <div className="ease-container space-y-8">
      <h1 className="text-lg tracking-wide">Tasks</h1>

      <section className="ease-card p-4">
        <div className="grid grid-cols-[1fr_120px] gap-3">
          <input
            value={title} onChange={e=>setTitle(e.target.value)}
            placeholder="Write a task…"
            className="rounded-[--r] border border-[--border] bg-white px-3 py-2 text-sm"
          />
          <button className="ease-outline-btn" onClick={add}>Add</button>
        </div>
      </section>

      <section className="ease-card p-2">
        {tasks.length===0 ? (
          <div className="p-6 text-sm text-neutral-500">No tasks yet.</div>
        ) : (
          <ul className="divide-y divide-[--border]">
            {tasks.map(t=>(
              <li key={t.id} className="flex items-center gap-3 p-3">
                <input type="checkbox" checked={t.done}
                  onChange={()=>toggle(t.id, t.done)}
                  className="h-4 w-4 rounded border-[--border]"
                />
                <span className={`flex-1 text-sm ${t.done?"line-through text-neutral-400":""}`}>{t.title}</span>
                <button className="ease-outline-btn" onClick={()=>remove(t.id)}>Delete</button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
