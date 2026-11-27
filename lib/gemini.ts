import type { Language } from "./i18n";

export const GEMINI_MODEL = "gemini-3.8-flash";
export const GEMINI_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models";
export const GEMINI_TIMEOUT_MS = 15_000;

export function getGeminiModel(): string {
  const configuredModel = process.env.GEMINI_MODEL?.trim();
  if (configuredModel && configuredModel !== GEMINI_MODEL) {
    console.warn("[report] Unsupported GEMINI_MODEL override; using pinned model", {
      expected: GEMINI_MODEL
    });
  }
  return GEMINI_MODEL;
}

export function buildReportPrompt(
  language: Language,
  facilities: string,
  medicines: string,
  report: string
): string {
  return `Extract this healthcare operations report into JSON only. Do not infer patient-identifying information. Write the summary in ${language === "hi" ? "professional Hindi" : "clear English"}.
Schema: {"facilityId": string|null, "medicineId": string|null, "quantity": number|null, "urgency": "critical"|"watch"|"stable"|"needs-review", "summary": string, "confidence": "high"|"medium"|"low"}
Only use IDs from these allowed lists. If the report is ambiguous, use null and "needs-review".
Facilities:
${facilities}
Medicine stock lines:
${medicines}
Report:
${report}`;
}

export function providerStatusKey(status: number): "apiBadRequest" | "apiModelNotFound" | "apiAuthError" | "apiRateLimited" | "apiProviderError" {
  if (status === 400) return "apiBadRequest";
  if (status === 404) return "apiModelNotFound";
  if (status === 401 || status === 403) return "apiAuthError";
  if (status === 429) return "apiRateLimited";
  return "apiProviderError";
}
