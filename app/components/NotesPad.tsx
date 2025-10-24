"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";

type Props = { meetingId: string };

export default function NotesPad({ meetingId }: Props) {
  const [noteId, setNoteId] = useState<string | null>(null);
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState<"idle"|"saving"|"saved"|"error">("idle");
  const [decisions, setDecisions] = useState<{id:string; text:string; done:boolean}[]>([]);
  const [newDecision, setNewDecision] = useState("");
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 1) načti / založ prázdnou poznámku pro meeting
  useEffect(() => {
    let mounted = true;
    async function boot() {
      const { data: existing } = await supabase
        .from("notes").select("id, content").eq("meeting_id", meetingId).maybeSingle();

      if (!mounted) return;

      if (existing) {
        setNoteId(existing.id);
        setContent(existing.content || "");
      } else {
        const { data: created, error } = await supabase
          .from("notes")
          .insert({ meeting_id: meetingId, content: "" })
          .select("id, content")
          .single();
        if (!error && created) {
          setNoteId(created.id);
          setContent(created.content || "");
        }
      }

      // Decisions
      const { data: decs } = await supabase
        .from("decisions")
        .select("id, text, done")
        .eq("meeting_id", meetingId)
        .order("created_at", { ascending: false });
      setDecisions(decs || []);
    }
    boot();
    return () => { mounted = false; };
  }, [meetingId]);

  // 2) autosave s debounce
  useEffect(() => {
    if (!noteId) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      setSaving("saving");
      const { error } = await supabase
        .from("notes")
        .update({ content, updated_at: new Date().toISOString() })
        .eq("id", noteId);
      setSaving(error ? "error" : "saved");
      if (!error) setTimeout(() => setSaving("idle"), 800);
    }, 600);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content, noteId]);

  // 3) práce s "domluvili jsme se"
  async function addDecision() {
    const txt = newDecision.trim();
    if (!txt) return;
    const { data, error } = await supabase
      .from("decisions")
      .insert({ meeting_id: meetingId, text: txt })
      .select("id, text, done")
      .single();
    if (!error && data) {
      setDecisions((d) => [data, ...d]);
      setNewDecision("");
    }
  }

  async function toggleDecision(id: string, done: boolean) {
    const { error } = await supabase
      .from("decisions")
      .update({ done: !done })
      .eq("id", id);
    if (!error) setDecisions(d => d.map(x => x.id === id ? { ...x, done: !done } : x));
  }

  async function removeDecision(id: string) {
    const { error } = await supabase.from("decisions").delete().eq("id", id);
    if (!error) setDecisions(d => d.filter(x => x.id !== id));
  }

  const badge = useMemo(() => (
    saving === "saving" ? "Saving…" :
    saving === "saved" ? "Saved" :
    saving === "error" ? "Error" : " "
  ), [saving]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* levý sloupec – volné poznámky */}
      <div className="ease-card p-4 space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm text-neutral-500">Zápisky (autosave)</h3>
          <span className="text-xs text-neutral-500">{badge}</span>
        </div>
        <textarea
          value={content}
          onChange={(e)=>setContent(e.target.value)}
          rows={12}
          placeholder="Volné poznámky z meetingu… cokoliv, klidně chaoticky."
          className="w-full rounded-[--r] border border-[--border] bg-white px-3 py-2 text-sm resize-y min-h-[220px]"
        />
      </div>

      {/* pravý sloupec – na čem jsme se domluvili */}
      <div className="ease-card p-4 space-y-3">
        <h3 className="text-sm text-neutral-500">Na čem jsme se domluvili</h3>
        <div className="grid grid-cols-[1fr_120px] gap-3">
          <input
            value={newDecision}
            onChange={(e)=>setNewDecision(e.target.value)}
            placeholder="Přidat bod dohody…"
            className="rounded-[--r] border border-[--border] bg-white px-3 py-2 text-sm"
          />
          <button className="ease-outline-btn" onClick={addDecision}>Přidat</button>
        </div>

        <ul className="divide-y divide-[--border]">
          {decisions.map(d=>(
            <li key={d.id} className="p-2 flex items-center gap-3">
              <input
                type="checkbox"
                checked={!!d.done}
                onChange={()=>toggleDecision(d.id, d.done)}
                className="h-4 w-4 rounded border-[--border]"
              />
              <span className={`flex-1 text-sm ${d.done ? "line-through text-neutral-400" : ""}`}>
                {d.text}
              </span>
              <button className="ease-outline-btn text-xs" onClick={()=>removeDecision(d.id)}>Smazat</button>
            </li>
          ))}
          {decisions.length === 0 && (
            <li className="p-2 text-sm text-neutral-500">Zatím nic.</li>
          )}
        </ul>
      </div>
    </div>
  );
}
