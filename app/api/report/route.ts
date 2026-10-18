import { NextResponse } from "next/server";
import { facilities, stock, validateReportExtraction, type ReportExtraction } from "@/lib/domain";

const DEFAULT_MODEL = "gemini-2.5-flash";

function fallbackResponse(message: string, status = "scaffolded") {
  return NextResponse.json({
    status,
    message,
    extracted: {
      facilityId: null,
      medicineId: null,
      quantity: null,
      urgency: "needs-review",
      summary: "A human review is required before creating an operational decision.",
      confidence: "low"
    } satisfies ReportExtraction
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
  const allowedFacilities = facilities.map((facility) => `${facility.id}: ${facility.name}`).join("\n");
  const allowedMedicines = stock.map((item) => `${item.id}: ${item.medicine} at ${item.facilityId}`).join("\n");
  const prompt = `Extract this healthcare operations report into JSON only. Do not infer patient-identifying information.
Schema: {"facilityId": string|null, "medicineId": string|null, "quantity": number|null, "urgency": "critical"|"watch"|"stable"|"needs-review", "summary": string, "confidence": "high"|"medium"|"low"}
Only use IDs from these allowed lists. If the report is ambiguous, use null and "needs-review".
Facilities:
${allowedFacilities}
Medicine stock lines:
${allowedMedicines}
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

    let extracted: ReportExtraction | null = null;
    try {
      extracted = validateReportExtraction(JSON.parse(text));
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
