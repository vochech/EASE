import { NextResponse } from "next/server";
import OpenAI from "openai";
import { supabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";

type AiReport = {
  summary: string;
  key_decisions: string[];
  risks: string[];
  next_steps: string[];
  action_items: Array<{
    title: string;
    department?: string;
    seniority?: "Junior" | "Mid" | "Senior";
    estHours?: number;
  }>;
  markdown: string;
};

// --- Preferuj OpenRouter (bez placení), když není -> zkus OpenAI, když není -> fallback ---
const useOpenRouter = !!process.env.OPENROUTER_API_KEY;
const useOpenAI = !!process.env.OPENAI_API_KEY;

// Vyber model (pro OpenRouter)
const OR_MODEL = process.env.OPENROUTER_MODEL || "mistralai/mistral-7b-instruct"; // levný/spolehlivý
// Pro OpenAI (když bys chtěl)
const OA_MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";

// Inicializace klienta podle dostupného klíče
const client = useOpenRouter
  ? new OpenAI({ apiKey: process.env.OPENROUTER_API_KEY, baseURL: "https://openrouter.ai/api/v1" })
  : useOpenAI
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

export async function POST(req: Request) {
  try {
    const { transcriptId } = await req.json();
    if (!transcriptId) {
      return NextResponse.json({ error: "Missing transcriptId" }, { status: 400 });
    }

    const sb = supabaseAdmin();

    // 1) Načti transcript
    const { data: t, error: terr } = await sb
      .from("transcripts")
      .select("id, meeting_id, text")
      .eq("id", transcriptId)
      .single();

    if (terr || !t) return NextResponse.json({ error: terr?.message || "Transcript not found" }, { status: 404 });
    if (!t.text || !t.text.trim()) return NextResponse.json({ error: "Transcript is empty" }, { status: 400 });

    // 2) Připrav prompty + ořízni text (šetří tokeny vždy, i do budoucna)
    const MAX_CHARS = 6000;
    const transcriptText = t.text.slice(0, MAX_CHARS);

    const systemPrompt =
      "You generate concise, structured meeting reports from transcripts. " +
      "Return STRICT JSON with keys: " +
      "summary (string), key_decisions (string[]), risks (string[]), next_steps (string[]), " +
      "action_items (array of {title, department?, seniority?, estHours?}), " +
      "markdown (string full report in Markdown). " +
      "No extra keys. Business-grade, clear and actionable.";

    const userPrompt = `Transcript (truncated to ${MAX_CHARS} chars if needed):
"""
${transcriptText}
"""`;

    // 3) Zavolej model, když je k dispozici
    let ai: AiReport | null = null;

    if (client) {
      try {
        const completion = await client.chat.completions.create({
          model: useOpenRouter ? OR_MODEL : OA_MODEL,
          response_format: { type: "json_object" },
          temperature: 0.2,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
        });

        const raw = completion.choices?.[0]?.message?.content || "{}";
        ai = JSON.parse(raw) as AiReport;
      } catch (e: any) {
        // Typicky 429 (limit/quota) nebo dočasná chyba provideru
        console.error("AI provider error:", e?.status || e?.code, e?.message);
      }
    }

    // 4) Když AI neprošla -> lokální fallback (appka jede dál)
    if (!ai) {
      const first = transcriptText.split(/\n+/).slice(0, 5).join(" ").slice(0, 300);
      ai = {
        summary: first ? `Shrnutí (fallback): ${first}…` : "Shrnutí (fallback): transcript nebyl k dispozici.",
        key_decisions: ["(fallback) Rozhodnutí doplníme po aktivaci AI/billingu."],
        risks: ["(fallback) Rizika doplníme po aktivaci AI/billingu."],
        next_steps: ["(fallback) Další kroky doplníme po aktivaci AI/billingu."],
        action_items: [
          { title: "Zrevidovat zápis z meetingu a doplnit úkoly", department: "Product", seniority: "Mid", estHours: 1 },
        ],
        markdown: `# Meeting report (fallback)
**Summary:** ${first || "—"}

> ⚠️ AI výstup nebyl dostupný (quota nebo chybí API klíč). Toto je dočasný fallback.

## Next steps
- Aktivovat API klíč (OpenRouter nebo OpenAI) a spustit generování znovu.
- Zrevidovat úkoly v aplikaci.
`,
      };
    }

    // 5) Ulož do DB
    const { data: rep, error: rerr } = await sb
      .from("reports")
      .insert({
        meeting_id: t.meeting_id,
        status: "ready",
        summary: ai.summary,
        key_decisions: (ai.key_decisions || []).join("\n"),
        risks: (ai.risks || []).join("\n"),
        next_steps: (ai.next_steps || []).join("\n"),
        action_items: ai.action_items as any,
        full_markdown: ai.markdown,
      })
      .select("id, meeting_id, summary, action_items, full_markdown")
      .single();

    if (rerr) return NextResponse.json({ error: rerr.message }, { status: 500 });

    // 6) Návrat pro UI
    return NextResponse.json({
      reportId: rep.id,
      meetingId: rep.meeting_id,
      summary: rep.summary,
      tasks: Array.isArray(ai.action_items) ? ai.action_items : [],
      markdown: rep.full_markdown,
      provider: useOpenRouter ? "openrouter" : useOpenAI ? "openai" : "fallback",
    });
  } catch (e: any) {
    console.error("report/generate fatal:", e);
    return NextResponse.json({ error: e?.message || "Unknown error" }, { status: 500 });
  }
}
