import { NextResponse } from "next/server";

const DEFAULT_MODEL = "gemini-1.5-flash";

type ExtractedReport = {
  facility: string | null;
  medicine: string | null;
  urgency: "critical" | "watch" | "stable" | "needs-review";
  summary: string;
};

function parseExtractedReport(value: unknown): ExtractedReport | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Record<string, unknown>;
  const urgency = candidate.urgency;
  if (
    (candidate.facility !== null && typeof candidate.facility !== "string") ||
    (candidate.medicine !== null && typeof candidate.medicine !== "string") ||
    (urgency !== "critical" && urgency !== "watch" && urgency !== "stable" && urgency !== "needs-review") ||
    typeof candidate.summary !== "string"
  ) {
    return null;
  }
  return {
    facility: candidate.facility as string | null,
    medicine: candidate.medicine as string | null,
    urgency,
    summary: candidate.summary
  };
}

function fallbackResponse(message: string, status = "scaffolded") {
  return NextResponse.json({
    status,
    message,
    extracted: {
      facility: null,
      medicine: null,
      urgency: "needs-review",
      summary: "A human review is required before creating an operational decision."
    } satisfies ExtractedReport
  });
}

export async function POST(request: Request) {
  let body: { report?: string };
  try {
    body = (await request.json()) as { report?: string };
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }
  if (!body.report?.trim()) {
    return NextResponse.json({ error: "Report text is required." }, { status: 400 });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return fallbackResponse("Report accepted for review. Add GEMINI_API_KEY to enable Gemini extraction.");
  }

  const model = process.env.GEMINI_MODEL || DEFAULT_MODEL;
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const prompt = `Extract this healthcare operations report into JSON only. Do not infer patient-identifying information.
Schema: {"facility": string|null, "medicine": string|null, "urgency": "critical"|"watch"|"stable"|"needs-review", "summary": string}
Report:
${body.report.trim()}`;

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0, responseMimeType: "application/json" }
      }),
      cache: "no-store"
    });

    if (!response.ok) {
      return fallbackResponse(`Gemini was unavailable (${response.status}). The report is queued for human review.`, "fallback");
    }

    const payload = (await response.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    const text = payload.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      return fallbackResponse("Gemini returned no extraction. The report is queued for human review.", "fallback");
    }

    let extracted: ExtractedReport | null = null;
    try {
      extracted = parseExtractedReport(JSON.parse(text));
    } catch {
      extracted = null;
    }
    if (!extracted) {
      return fallbackResponse("Gemini returned an invalid extraction. The report is queued for human review.", "fallback");
    }

    return NextResponse.json({ status: "ready", message: "Report extracted by Gemini. Review the fields before creating a decision.", extracted, provider: "gemini", model });
  } catch {
    return fallbackResponse("Gemini could not be reached. The report is queued for human review.", "fallback");
  }
}
