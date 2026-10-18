import { NextResponse } from "next/server";
import { facilities, stock, validateReportExtraction, type ReportExtraction } from "@/lib/domain";
import { translate, type Language } from "@/lib/i18n";

const DEFAULT_MODEL = "gemini-2.5-flash";

function fallbackResponse(language: Language, message: string, status = "scaffolded") {
  return NextResponse.json({
    status,
    message,
    extracted: {
      facilityId: null,
      medicineId: null,
      quantity: null,
      urgency: "needs-review",
      summary: translate(language, "apiReviewSummary"),
      confidence: "low"
    } satisfies ReportExtraction
  });
}

export async function POST(request: Request) {
  let body: { report?: string; language?: Language };
  try {
    body = (await request.json()) as { report?: string; language?: Language };
  } catch {
    return NextResponse.json({ error: translate("en", "apiInvalidJson") }, { status: 400 });
  }
  const language: Language = body.language === "hi" ? "hi" : "en";
  if (!body.report?.trim()) {
    return NextResponse.json({ error: translate(language, "apiRequired") }, { status: 400 });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return fallbackResponse(language, translate(language, "apiMissingKey"));
  }

  const model = process.env.GEMINI_MODEL || DEFAULT_MODEL;
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const allowedFacilities = facilities.map((facility) => `${facility.id}: ${facility.name}`).join("\n");
  const allowedMedicines = stock.map((item) => `${item.id}: ${item.medicine} at ${item.facilityId}`).join("\n");
  const prompt = `Extract this healthcare operations report into JSON only. Do not infer patient-identifying information. Write the summary in ${language === "hi" ? "professional Hindi" : "clear English"}.
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
      return fallbackResponse(language, translate(language, "apiProviderUnavailable", { status: response.status }), "fallback");
    }

    const payload = (await response.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    const text = payload.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      return fallbackResponse(language, translate(language, "apiNoExtraction"), "fallback");
    }

    let extracted: ReportExtraction | null = null;
    try {
      extracted = validateReportExtraction(JSON.parse(text));
    } catch {
      extracted = null;
    }
    if (!extracted) {
      return fallbackResponse(language, translate(language, "apiInvalidExtraction"), "fallback");
    }

    return NextResponse.json({ status: "ready", message: translate(language, "apiReady"), extracted, provider: "gemini", model });
  } catch {
    return fallbackResponse(language, translate(language, "apiUnreachable"), "fallback");
  }
}
