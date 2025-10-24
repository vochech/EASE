"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function AgendaPad({ meetingId }: { meetingId: string }) {
  const [noteId, setNoteId] = useState<string | null>(null);
  const [agenda, setAgenda] = useState("");
  const [saving, setSaving] = useState<"idle"|"saving"|"saved"|"error">("idle");
  const tmr = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let mounted = true;
    async function boot() {
      // vezmi/ založ notes řádek pro meeting
      const { data: ex } = await supabase
        .from("notes").select("id, agenda").eq("meeting_id", meetingId).maybeSingle();
      if (!mounted) return;

      if (ex) {
        setNoteId(ex.id);
        setAgenda(ex.agenda || "");
      } else {
        const { data: created } = await supabase
          .from("notes").insert({ meeting_id: meetingId, agenda: "" })
          .select("id, agenda").single();
        if (created) {
          setNoteId(created.id);
          setAgenda(created.agenda || "");
        }
      }
    }
    boot();
    return () => { mounted = false; };
  }, [meetingId]);

  // autosave
  useEffect(() => {
    if (!noteId) return;
    if (tmr.current) clearTimeout(tmr.current);
    tmr.current = setTimeout(async () => {
      setSaving("saving");
      const { error } = await supabase.from("notes")
        .update({ agenda, updated_at: new Date().toISOString() })
        .eq("id", noteId);
      setSaving(error ? "error" : "saved");
      if (!error) setTimeout(()=>setSaving("idle"), 800);
    }, 600);
  }, [agenda, noteId]);

  return (
    <div className="ease-card p-4 space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm text-neutral-500">Agenda (autosave)</h3>
        <span className="text-xs text-neutral-500">
          {saving==="saving"?"Saving…":saving==="saved"?"Saved":saving==="error"?"Error":""}
        </span>
      </div>
      <textarea
        rows={8}
        value={agenda}
        onChange={(e)=>setAgenda(e.target.value)}
        placeholder="Co je dnes na programu? Cíle, body, časová osa…"
        className="w-full rounded-[--r] border border-[--border] bg-white px-3 py-2 text-sm resize-y"
      />
    </div>
  );
}
