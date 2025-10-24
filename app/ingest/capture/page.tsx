"use client";

import { useState } from "react";
import Recorder from "@/components/Recorder";
import NotesPad from "@/components/NotesPad";
import AgendaChecklist from "@/components/AgendaChecklist";
import ProjectSelect from "@/components/ProjectSelect";

type Extracted = {
  meetingId: string;
  summary: string;
  tasks: any[];
  markdown?: string;
};

export default function CaptureIngest() {
  const [mode, setMode] = useState<"audio" | "video">("audio");
  const [title, setTitle] = useState("");
  const [projectId, setProjectId] = useState<string | null>(null);

  const [bundle, setBundle] = useState<Extracted | null>(null);
  const [tasks, setTasks] = useState<any[]>([]);
  const [reportMarkdown, setReportMarkdown] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [meetingId, setMeetingId] = useState<string | null>(null);
  const [owner, setOwner] = useState<string>("");

  // založí meeting při prvním fokusu/akci
  async function ensureMeeting() {
    if (meetingId) return meetingId;
    const r = await fetch("/api/meetings/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: title?.trim() || "Untitled meeting",
        mediaType: mode,
        projectId, // ⬅️ uloží se do meetings.project_id (viz backend)
      }),
    });
    if (!r.ok) throw new Error(`meetings/start failed: ${r.status}`);
    const json = await r.json();
    setMeetingId(json.meetingId);
    setOwner(json.owner);
    return json.meetingId as string;
  }

  // AI pipeline pro nahrané/nahrané soubory
  async function processBlob(blob: Blob) {
    try {
      setLoading(true);
      setErrorMsg("");
      setBundle(null);
      setTasks([]);
      setReportMarkdown("");

      const mid = await ensureMeeting();

      // upload
      const fd = new FormData();
      fd.append("file", blob, "recording.webm");
      fd.append("owner", owner);
      const r2 = await fetch("/api/upload", { method: "POST", body: fd });
      if (!r2.ok) throw new Error(`upload failed: ${r2.status}`);
      const { path } = await r2.json();

      // transcribe
      const r3 = await fetch("/api/transcribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ meetingId: mid, mediaPath: path }),
      });
      if (!r3.ok) throw new Error(`transcribe failed: ${r3.status}`);
      const { transcriptId } = await r3.json();

      // generate report
      const r5 = await fetch("/api/report/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcriptId }),
      });

      if (!r5.ok) {
        const err = await r5.json().catch(() => ({}));
        console.error("report/generate failed:", err);
        setBundle({ meetingId: mid, summary: "AI report se nepodařilo vygenerovat.", tasks: [] });
        setTasks([]);
        setErrorMsg(err?.error || "AI report failed.");
        return;
      }

      const rep = await r5.json();
      const safeTasks = Array.isArray(rep.tasks) ? rep.tasks : [];
      setBundle({ meetingId: mid, summary: rep.summary, tasks: safeTasks, markdown: rep.markdown });
      setTasks(safeTasks);
      setReportMarkdown(typeof rep.markdown === "string" ? rep.markdown : "");
    } catch (e: any) {
      console.error(e);
      setErrorMsg(e?.message || "Processing failed.");
    } finally {
      setLoading(false);
    }
  }

  async function apply() {
    if (!bundle) return;
    try {
      const r = await fetch("/api/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ meetingId: bundle.meetingId, tasks, autoDelete: true }),
      });
      if (!r.ok) {
        const e = await r.json().catch(() => ({}));
        throw new Error(e?.error || `apply failed: ${r.status}`);
      }
      alert("Report applied. Media deleted and tasks created.");
    } catch (e: any) {
      console.error(e);
      alert(e?.message || "Apply failed.");
    }
  }

  return (
    <div className="ease-container space-y-6">
      <h1 className="text-lg tracking-wide">Ingest — Meeting</h1>

      {/* Title + Project (z DB) */}
      <div className="ease-card p-4 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <input
            placeholder="Meeting title (např. Týdenní sync – Growth)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onFocus={ensureMeeting}
            className="rounded-[--r] border border-[--border] bg-white px-3 py-2 text-sm"
          />
          <ProjectSelect value={projectId} onChange={(id) => { setProjectId(id); }} />
        </div>
      </div>

      {/* AGENDA – checklist přes celou šířku */}
      <div onFocus={ensureMeeting}>
        {meetingId ? (
          <AgendaChecklist meetingId={meetingId} />
        ) : (
          <div className="ease-card p-4">
            <p className="text-sm text-neutral-500">
              Klikni a začni přidávat body agendy… (meeting se vytvoří automaticky)
            </p>
          </div>
        )}
      </div>

      {/* Dva sloupce: Zápisky + (tvůj blok pro dohody, pokud máš separé komponentu, vlož sem) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6" onFocus={ensureMeeting}>
        {meetingId ? (
          <NotesPad meetingId={meetingId} />
        ) : (
          <div className="ease-card p-4">
            <p className="text-sm text-neutral-500">Klikni a začni psát zápisky…</p>
          </div>
        )}
        {/* Sem případně vlož komponentu pro "Na čem jsme se domluvili" pokud ji máš separátně */}
      </div>

      {/* Nahrávání / upload (volitelné, až dole) */}
      <div className="ease-card p-4 space-y-3">
        <div className="flex items-center gap-2">
          <span className="text-sm text-neutral-500">Recording (optional):</span>
          <button
            className={`ease-outline-btn ${mode === "audio" ? "ring-1 ring-[--accent]" : ""}`}
            onClick={() => setMode("audio")}
            disabled={loading}
          >
            Audio
          </button>
          <button
            className={`ease-outline-btn ${mode === "video" ? "ring-1 ring-[--accent]" : ""}`}
            onClick={() => setMode("video")}
            disabled={loading}
          >
            Video
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <p className="text-sm text-neutral-500">Record directly in the app.</p>
            <Recorder kind={mode} onBlobReady={processBlob} />
          </div>
          <div className="space-y-2">
            <p className="text-sm text-neutral-500">…or upload a file manually.</p>
            <input
              type="file"
              accept={mode === "audio" ? "audio/*" : "video/*"}
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                await processBlob(f);
              }}
              disabled={loading}
            />
          </div>
        </div>
      </div>

      {/* Stav / chyby */}
      {loading && <div className="ease-card p-4 text-sm text-neutral-600">Processing…</div>}
      {errorMsg && <div className="ease-card p-4 text-sm text-red-600">{errorMsg}</div>}

      {/* Výstup AI + Tasks */}
      {bundle && !loading && (
        <>
          <div className="ease-card p-4 space-y-4">
            <h2 className="text-sm text-neutral-500">Meeting summary</h2>
            <p>{bundle.summary}</p>
          </div>
          {reportMarkdown && (
            <div className="ease-card p-4 space-y-3">
              <h2 className="text-sm text-neutral-500">Report Preview (Markdown)</h2>
              <pre className="whitespace-pre-wrap text-sm">{reportMarkdown}</pre>
            </div>
          )}
          <div className="ease-card p-4 space-y-4">
            <h3 className="text-sm text-neutral-500">Tasks (editable)</h3>
            <ul className="divide-y divide-[--border]">
              {(Array.isArray(tasks) ? tasks : []).map((t, i) => (
                <li key={i} className="p-3 grid grid-cols-1 md:grid-cols-[1fr_140px_120px_120px] gap-3">
                  <input
                    className="rounded-[--r] border border-[--border] bg-white px-3 py-2 text-sm"
                    value={t.title ?? ""}
                    onChange={(e) => setTasks((prev) => prev.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)))}
                  />
                  <select
                    className="rounded-[--r] border border-[--border] bg-white px-3 py-2 text-sm"
                    value={t.department || ""}
                    onChange={(e) => setTasks((prev) => prev.map((x, j) => (j === i ? { ...x, department: e.target.value || undefined } : x)))}
                  >
                    <option value="">Dept (AI)</option>
                    {["Product", "Design", "Content", "Marketing", "Engineering", "Data", "Ops", "Sales", "Client"].map((d) => (
                      <option key={d}>{d}</option>
                    ))}
                  </select>
                  <select
                    className="rounded-[--r] border border-[--border] bg-white px-3 py-2 text-sm"
                    value={t.seniority || ""}
                    onChange={(e) => setTasks((prev) => prev.map((x, j) => (j === i ? { ...x, seniority: e.target.value || undefined } : x)))}
                  >
                    <option value="">Seniority (AI)</option>
                    <option>Junior</option>
                    <option>Mid</option>
                    <option>Senior</option>
                  </select>
                  <input
                    className="rounded-[--r] border border-[--border] bg-white px-3 py-2 text-sm"
                    placeholder="Est. hours"
                    value={t.estHours ?? ""}
                    onChange={(e) =>
                      setTasks((prev) =>
                        prev.map((x, j) =>
                          j === i ? { ...x, estHours: e.target.value ? Number(e.target.value) : undefined } : x
                        )
                      )
                    }
                  />
                </li>
              ))}
            </ul>
            <div className="flex justify-end">
              <button className="ease-outline-btn" onClick={apply} disabled={loading}>
                Apply (delete media)
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
