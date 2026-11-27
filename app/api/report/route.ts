import { NextResponse } from "next/server";
import { facilities, stock, validateReportExtraction, type ReportExtraction } from "@/lib/domain";
import { translate, type Language } from "@/lib/i18n";
import {
  buildReportPrompt,
  GEMINI_ENDPOINT,
  GEMINI_TIMEOUT_MS,
  getGeminiModel,
  providerStatusKey
} from "@/lib/gemini";

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
  let input: unknown;
  try {
    input = await request.json();
  } catch {
    return NextResponse.json({ error: translate("en", "apiInvalidJson") }, { status: 400 });
  }
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return NextResponse.json({ error: translate("en", "apiInvalidJson") }, { status: 400 });
  }
  const body = input as { report?: unknown; language?: unknown };
  const language: Language = body.language === "hi" ? "hi" : "en";
  if (typeof body.report !== "string" || !body.report.trim()) {
    return NextResponse.json({ error: translate(language, "apiRequired") }, { status: 400 });
  }
  if (body.report.length > 12_000) {
    return NextResponse.json({ error: translate(language, "apiTooLong") }, { status: 413 });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return fallbackResponse(language, translate(language, "apiMissingKey"));
  }

  const model = getGeminiModel();
  const endpoint = `${GEMINI_ENDPOINT}/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const allowedFacilities = facilities.map((facility) => `${facility.id}: ${facility.name}`).join("\n");
  const allowedMedicines = stock.map((item) => `${item.id}: ${item.medicine} at ${item.facilityId}`).join("\n");
  const prompt = buildReportPrompt(language, allowedFacilities, allowedMedicines, body.report.trim());

  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    const controller = new AbortController();
    timeout = setTimeout(() => controller.abort(), GEMINI_TIMEOUT_MS);
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0, responseMimeType: "application/json" }
      }),
      cache: "no-store",
      signal: controller.signal
    });
    if (!response.ok) {
      const providerError = await readProviderError(response, apiKey, body.report);
      console.error("[report] Gemini provider error", {
        status: response.status,
        model,
        message: providerError
      });
      const key = providerStatusKey(response.status);
      return fallbackResponse(language, translate(language, key, { status: response.status }), "fallback");
    }

    let payload: {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    try {
      payload = (await response.json()) as typeof payload;
    } catch {
      console.error("[report] Gemini returned malformed JSON", { model });
      return fallbackResponse(language, translate(language, "apiInvalidExtraction"), "fallback");
    }
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
  } catch (error) {
    const isTimeout = error instanceof DOMException && error.name === "AbortError";
    console.error("[report] Gemini request failed", {
      model,
      reason: isTimeout ? "timeout" : "network-error"
    });
    return fallbackResponse(language, translate(language, isTimeout ? "apiTimeout" : "apiUnreachable"), "fallback");
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

async function readProviderError(response: Response, apiKey: string, report: string): Promise<string> {
  try {
    const payload = (await response.clone().json()) as { error?: { message?: unknown } };
    const message = payload.error?.message;
    if (typeof message !== "string") return "provider-error";
    return message
      .replaceAll(apiKey, "[redacted]")
      .replaceAll(report, "[report redacted]")
      .replace(/key=[^&\s]+/gi, "key=[redacted]")
      .replace(/\s+/g, " ")
      .slice(0, 200);
  } catch {
    return "provider-error";
  }
}
