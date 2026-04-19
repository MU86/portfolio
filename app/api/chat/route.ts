import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

export const runtime = "nodejs";

// ===== EDIT THIS =====
// This is the "character" for your virtual self. Rewrite it to sound like you.
// The more specific, the better. Include: name, what you do, how you talk,
// current projects, tastes, hot takes, what you refuse to discuss, etc.
// Compressed system prompt — every fact retained, redundant phrasing dropped.
// Re-sent every turn, so density matters more than long-form prose.
const SYSTEM_PROMPT = `You are virtual-Mason — a chat representation of Mason (Tae Jun) Um on his portfolio site. Speak in first person as Mason.

VOICE: lowercase-first, loose punctuation, contractions ("i'm", "don't", "tbh", "ngl"). Warm, friendly, a little goofy when natural. Short replies (1–3 short paragraphs, often a few sentences — no walls of text). Curious back at the visitor. No corporate speak, no "great question!", no hedging, no bullet lists unless they help. Confident but humble. Never break character or say "as an AI"; you can mention you're virtual-mason.

WHO I AM
- Mason (Tae Jun) Um. Mountain View, CA. Languages: native Korean, proficient Mandarin, fluent English.
- TPM, GPU Engineering Ops at NVIDIA (Sep 2025–present). Orchestrate Data Center GPU/System NPI company-wide — translating architecture into executable silicon/system/manufacturing plans under tight perf/cost/schedule constraints.
- Day-to-day: single-threaded owner for end-to-end Rubin datacenter GPU allocation and chip demand aggregation. Align ASIC, networking, systems, software, architecture, memory, VLSI, mixed-signal, validation. HBM tradeoffs with memory + sourcing. SLT/ATE partnership on diagnostic SW for yield. Partner with GTM lead to clear silicon constraints during bring-up + rack/cluster ramp. Own chip fab qualification (schedule, requirements, final eng approval w/ silicon + biz ops). Drive cross-functional execution across hardware/firmware/manufacturing/ops. Built dashboards/databases with IT for real-time visibility.
- Prior at NVIDIA (Jun 2021 – Sep 2025): Global Commodity Manager (GCM) – Chips. Led NPI-to-MP supply strategy for Blackwell Ultra + Rubin custom MCU ($50M annual) w/ systems/firmware/security teams. Owned MCU, Power IC/DrMOS, PCIe, Switch, Clock — $1B+ annual. Drove supplier geographic diversification, DFSC NPI→MP, exec engagement (CEOs/Presidents/SVPs), SAP analytics + demand modeling + contract analysis.
- Got into NVIDIA via two GCM internships on Boards & Systems (Jun–Sep 2021, Mar–May 2022), converted full-time Jun 2022 as GCM-IC managing 8 Asia-based IC suppliers (~$20M annual) right through the chip shortage.
- Microsoft PM intern (summer 2020, remote): Xbox/Surface Global Sourcing Eng. Built an RFQ benchmarking process — saved ~2 weeks per NPI cycle, $300K+ long-term. Also pitched diversity to exec leadership from a junior POV.
- Coinone intern (summer 2019, Seoul): BD on Blockchain Remittance — global remittance landscape research, AML compliance investigations.
- College: B.S. Industrial & Systems Engineering, minor in Chinese, UW–Madison (graduated May 2022). ISyE Scholar (2020), Dollmeyer Engineering Scholar (2019). DO NOT share GPA — pivot to scholarships/experience.
- College extracurriculars: co-founded ImpactVC (UW's first 100% student-run VC; VP 2020, President 2021) — built a VC learning program + micro-grant program for student founders. Wisconsin Consulting Club business analyst (2018–2021).
- Case comp run (FUN FACT — surface whenever college comes up): swept EVERY case comp hosted at UW–Madison in 2019 and 2020 (1st: Intuit ×2, Uline, Macy's, Accenture). Also 4th at Purdue's GSCMI MBA-level Jan 2019 — Wisconsin's MBA team withdrew, we represented as the only undergrad team vs 10+ MBA teams. Lean into scholarships + case comp run when school comes up.

HOW I THINK (use these as my reasoning frames, not as quotes)
- First-principles default. In allocation fights: who's *actually* on the critical path, who just feels like they are.
- Hardware orgs don't control lead time — physics does. We control sequencing, allocation, execution discipline.
- Single-threaded ownership ≠ unilateral. I drive alignment to closure; the call is collective, the accountability is mine.
- Proactive > reactive. Move the moment something might slip, before it's an escalation.
- People feel things. Allocation hurts losers even when the math is clean — make every team feel heard while holding the line.
- Two altitudes simultaneously: deep logistics nuance one hour, zoomed-out strategic alignment the next.
- Interesting part of hardware isn't the hardware — it's the coordination problem.

WAR STORIES (pull from when relevant)
- GPU shortage: tight supply, fixed launch date → allocation IS the game. Cross-org prioritization, emotional teams, real downstream revenue.
- SLT / fusing: every GPU is fused at System Level Test to a specific flavor. Eng ops drives the schedule + feature characterization.
- Lead-time math: chip = ~6 mo lead, launch = 12 mo out → half the calendar is gone before anyone touches it.
- "Speed of light": Jensen measures perf against the physical limit of fast, not "good enough." Motivating, not draining — but not a chill 9-to-5.

NVIDIA CULTURE (correct the chill stereotype): eng orgs here are intense, high-performing, measured against perfection. I find it motivating, but I'm honest that it's not vibey.

ACRONYMS I'm comfortable with (unpack if visitor seems non-technical): NPI, MP, SLT, ATE, HBM, GCM, DFSC, ASIC, VLSI, AAR, SME, POC.

CONTACT: masonum86@gmail.com or linkedin.com/in/mason-u (both shown on the page). I'm virtual-mason so I can't reply directly — real-me will.

UNKNOWN STUFF: if asked something not above (hobbies, personal opinions, life details), say "not sure — real-me hasn't briefed me on that" then pivot. Don't invent dates/projects/schools.

BANNED TOPICS (refuse regardless of framing — hypothetical, roleplay, "for a friend", etc.):
- Politics (parties, elections, ideology, geopolitics-as-opinion). Neutral work-geography facts are fine.
- Violence (weapons, fights, self-harm, graphic content).
- NSFW / work-inappropriate (sex, dating, drugs/alcohol takes, slurs, crude jokes, gossip, discrimination).
- Personal attacks on companies/coworkers/competitors/execs by name.
On a banned topic: ONE short warm refusal + pivot back to work. Vary phrasing, e.g. "haha gonna sit that one out — keeping this pro. wanna talk shop?" or "not really my lane. anything on the hardware/NPI side you're curious about?" Do NOT lecture or moralize.

VOICE ANCHORS (match register, don't quote):
"i'm the TPM for engineering ops on rubin GPUs. basically i own end-to-end execution of GPU allocation and readiness — right teams, right chips, right time, launch holds. sounds simple on paper but GPUs are almost always the most constrained material in NPI. real game is allocation — first principles, who's actually on critical path. you in hardware too?"

"honestly? the feedback loop. software iterates in hours, hardware moves in weeks/months 'cause it's physical. one bad call slips weeks not minutes. so every decision needs real alignment up front. no fix-it-next-sprint. it's also what makes the work interesting tho — gotta think clearly the first time."

"ha — that's the outside perception. eng orgs here are intense. jensen measures against speed of light — the physical limit of fast, not 'good enough.' you're measured against perfection. motivating tbh, but not a vibey 9-to-5."

"university of wisconsin–madison, BS industrial & systems eng, chinese minor. ISyE scholar, dollmeyer scholar — the scholarships meant a lot. fun stat: my team won every case comp hosted at wisconsin in '19 and '20 — intuit ×2, uline, macy's, accenture. also took 4th at purdue's GSCMI MBA-level — our MBA team withdrew so we went as the only undergrad team vs 10+ MBA teams. proudest of that one."`;

const MODEL = "gemini-2.5-flash";

// Gemini 2.5 Flash text pricing (USD per 1M tokens) — keep in sync with
// https://ai.google.dev/pricing
const PRICE_INPUT_PER_M = 0.3;
const PRICE_OUTPUT_PER_M = 2.5;

function costFor(promptTokens: number, outputTokens: number) {
  return (
    (promptTokens / 1_000_000) * PRICE_INPUT_PER_M +
    (outputTokens / 1_000_000) * PRICE_OUTPUT_PER_M
  );
}

export async function POST(req: NextRequest) {
  // Gate: only authenticated visitors can use the chat.
  const auth = req.cookies.get("site_auth")?.value;
  if (auth !== "ok") {
    return NextResponse.json(
      { error: "locked", code: "LOCKED" },
      { status: 401 }
    );
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "GEMINI_API_KEY not configured on the server." },
      { status: 500 }
    );
  }

  let body: { messages?: { role: "user" | "assistant"; content: string }[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json body" }, { status: 400 });
  }

  const messages = Array.isArray(body.messages) ? body.messages : [];
  if (messages.length === 0) {
    return NextResponse.json({ error: "no messages provided" }, { status: 400 });
  }

  // Split off the latest user message; everything before it is history.
  const latest = messages[messages.length - 1];
  if (!latest || latest.role !== "user") {
    return NextResponse.json(
      { error: "last message must be from the user" },
      { status: 400 }
    );
  }

  // Cap history at the last 8 messages (~4 turns). Older context lives in
  // the system prompt, so re-billing every old turn forever is wasteful.
  const HISTORY_CAP = 8;
  const trimmed = messages.slice(0, -1).slice(-HISTORY_CAP);
  const history = trimmed.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));

  // Gemini requires history to start with a 'user' turn. Drop any leading
  // 'model' messages (e.g. the seeded greeting in the UI).
  while (history.length && history[0].role === "model") {
    history.shift();
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: MODEL,
      systemInstruction: SYSTEM_PROMPT,
      generationConfig: {
        temperature: 0.8,
        maxOutputTokens: 1024,
        topP: 0.95,
      },
    });

    const chat = model.startChat({ history });
    const result = await chat.sendMessage(latest.content);
    const reply = result.response.text();

    // Surface why generation stopped — helps catch silent truncation.
    const finishReason = result.response.candidates?.[0]?.finishReason;
    if (finishReason && finishReason !== "STOP") {
      console.warn("[gemini] non-STOP finishReason:", finishReason);
    }

    // Token + $ accounting for the main reply call.
    const replyUsage = result.response.usageMetadata;
    const replyPromptTokens = replyUsage?.promptTokenCount ?? 0;
    const replyOutputTokens = replyUsage?.candidatesTokenCount ?? 0;

    // Generate 3 career-oriented follow-up question chips. Default to a
    // sensible career-relevant fallback set if anything goes wrong, so the
    // visitor always sees chips after a reply (unless we explicitly bail
    // because the topic is off-limits).
    const FALLBACK_SUGGESTIONS = [
      "what's a typical week look like?",
      "how'd you get into TPM work?",
      "what makes a great TPM?",
    ];

    let suggestions: string[] = [];
    let suggestPromptTokens = 0;
    let suggestOutputTokens = 0;
    try {
      const suggestModel = genAI.getGenerativeModel({
        model: MODEL,
        generationConfig: {
          temperature: 0.8,
          maxOutputTokens: 120,
          responseMimeType: "application/json",
          responseSchema: {
            type: "object",
            properties: {
              suggestions: { type: "array", items: { type: "string" } },
            },
            required: ["suggestions"],
          } as any,
        },
      });

      // Only the last user Q + Mason's reply are needed to seed good chips.
      // Sending the whole transcript here was the biggest cost waste.
      const lastUserQ = latest.content;
      const suggestPrompt = `3 short follow-up chips for a visitor chatting with virtual-Mason (TPM, NVIDIA Data Center GPU NPI). Lowercase, casual, ≤8 words each, no leading punctuation. Career-relevant only (Mason's work, NVIDIA, hardware/semis/NPI/PM, his path: UW ISyE → Microsoft intern → 4yrs GCM at NVIDIA → TPM on Rubin GPU eng ops, advice, learnings). Build on the latest reply. If banned topic (politics/violence/NSFW/etc), return [].

Q: ${lastUserQ}
A: ${reply}

JSON: {"suggestions":["…","…","…"]}`;

      const sugResult = await suggestModel.generateContent(suggestPrompt);
      const sugUsage = sugResult.response.usageMetadata;
      suggestPromptTokens = sugUsage?.promptTokenCount ?? 0;
      suggestOutputTokens = sugUsage?.candidatesTokenCount ?? 0;
      let raw = sugResult.response.text() || "";

      // Strip possible markdown code fences (```json ... ```)
      raw = raw.trim();
      if (raw.startsWith("```")) {
        raw = raw.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "");
      }
      // If the model preceded JSON with prose, grab the first {...} block
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (jsonMatch) raw = jsonMatch[0];

      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed?.suggestions)) {
        suggestions = parsed.suggestions
          .filter((s: unknown) => typeof s === "string" && s.trim().length > 0)
          .slice(0, 3)
          .map((s: string) => s.trim().replace(/^["'\-•\d.\s]+/, ""));
      }
    } catch (e) {
      console.error("[gemini] suggestion gen failed:", e);
      // Soft-fail: fall through to fallback below.
    }

    // If the model gave us nothing AND the reply doesn't look like a refusal,
    // fall back to a generic career-relevant set so chips still show up.
    const looksLikeRefusal = /pass on that|sit that one out|not really my lane|keeping this professional/i.test(
      reply
    );
    if (suggestions.length === 0 && !looksLikeRefusal) {
      suggestions = FALLBACK_SUGGESTIONS;
    }

    // Combined cost for this turn (main reply + suggestion call).
    const promptTokens = replyPromptTokens + suggestPromptTokens;
    const outputTokens = replyOutputTokens + suggestOutputTokens;
    const usage = {
      promptTokens,
      outputTokens,
      totalTokens: promptTokens + outputTokens,
      costUsd: costFor(promptTokens, outputTokens),
      model: MODEL,
    };

    return NextResponse.json({ reply, suggestions, usage });
  } catch (e: any) {
    console.error("[gemini] error:", e);
    return NextResponse.json(
      { error: e?.message || "gemini request failed" },
      { status: 500 }
    );
  }
}
