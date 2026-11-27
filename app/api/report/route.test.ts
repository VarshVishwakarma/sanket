import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

const validExtraction = {
  facilityId: "north-star",
  medicineId: "n-vancomycin",
  quantity: 12,
  urgency: "critical",
  summary: "कम स्टॉक",
  confidence: "medium"
};

function request(body: unknown): Request {
  return new Request("http://localhost/api/report", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body)
  });
}

describe("POST /api/report", () => {
  beforeEach(() => {
    vi.stubEnv("GEMINI_API_KEY", "test-key");
    delete process.env.GEMINI_MODEL;
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it("uses Gemini 3.8 Flash and returns a validated extraction", async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify({
      candidates: [{ content: { parts: [{ text: JSON.stringify(validExtraction) }] } }]
    }), { status: 200 }));

    const response = await POST(request({ language: "hi", report: "नॉर्थ स्टार में दवा कम है" }));
    const body = await response.json();
    const [url, init] = vi.mocked(fetch).mock.calls[0];

    expect(url).toContain("/models/gemini-3.8-flash:generateContent");
    expect(init?.method).toBe("POST");
    expect(body.status).toBe("ready");
    expect(body.message).toContain("Gemini ने");
    expect(body.extracted).toEqual(validExtraction);
    expect(JSON.stringify(body)).not.toContain("test-key");
  });

  it("ignores an obsolete model override and pins Gemini 3.8 Flash", async () => {
    process.env.GEMINI_MODEL = "gemini-custom-test";
    vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify({
      candidates: [{ content: { parts: [{ text: JSON.stringify(validExtraction) }] } }]
    }), { status: 200 }));

    await POST(request({ report: "North Star has low stock" }));
    expect(vi.mocked(fetch).mock.calls[0][0]).toContain("/models/gemini-3.8-flash:generateContent");
  });

  it("falls back honestly when the key is missing", async () => {
    delete process.env.GEMINI_API_KEY;
    const response = await POST(request({ language: "hi", report: "स्टॉक कम है" }));
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.status).toBe("scaffolded");
    expect(body.message).toContain("रिपोर्ट समीक्षा");
    expect(fetch).not.toHaveBeenCalled();
  });

  it("rejects empty and malformed requests", async () => {
    expect((await POST(request({ report: "" }))).status).toBe(400);
    expect((await POST(request({ report: 12 }))).status).toBe(400);
    expect((await POST(request(null))).status).toBe(400);
    expect((await POST(request([]))).status).toBe(400);
    const malformed = new Request("http://localhost/api/report", { method: "POST", body: "not-json" });
    expect((await POST(malformed)).status).toBe(400);
    expect((await POST(request({ report: "x".repeat(12_001) }))).status).toBe(413);
  });

  it.each([
    [400, "अनुरोध कॉन्फ़िगरेशन"],
    [401, "अधिकृत नहीं थी"],
    [403, "अधिकृत नहीं थी"],
    [404, "Gemini model was not found"],
    [429, "दर सीमा"],
    [500, "provider error"]
  ])("returns a safe localized fallback for provider status %s", async (status, expected) => {
    const reportText = "stock report";
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify({ error: { message: `test-key ${reportText} sensitive provider detail` } }), { status }));
    const response = await POST(request({ language: status === 404 ? "en" : "hi", report: reportText }));
    const body = await response.json();
    expect(body.status).toBe("fallback");
    expect(body.message).toContain(expected);
    expect(body.message).not.toContain("sensitive provider detail");
    const logged = JSON.stringify(errorSpy.mock.calls);
    expect(logged).not.toContain("test-key");
    expect(logged).not.toContain(reportText);
  });

  it("falls back for invalid JSON output and unknown IDs", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify({
      candidates: [{ content: { parts: [{ text: "{not-json" }] } }]
    }), { status: 200 }));
    await expect((await POST(request({ report: "stock report" }))).json()).resolves.toMatchObject({ status: "fallback" });

    for (const invalid of [
      { ...validExtraction, facilityId: "unknown" },
      { ...validExtraction, medicineId: "unknown" }
    ]) {
      vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify({
        candidates: [{ content: { parts: [{ text: JSON.stringify(invalid) }] } }]
      }), { status: 200 }));
      await expect((await POST(request({ report: "stock report" }))).json()).resolves.toMatchObject({ status: "fallback" });
    }
  });

  it("falls back when provider response JSON or response shape is malformed", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response("not-json", { status: 200 }));
    await expect((await POST(request({ report: "stock report" }))).json()).resolves.toMatchObject({ status: "fallback" });

    vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify({ candidates: [] }), { status: 200 }));
    await expect((await POST(request({ report: "stock report" }))).json()).resolves.toMatchObject({ status: "fallback" });
  });

  it("falls back for network failures", async () => {
    vi.mocked(fetch).mockRejectedValue(new Error("network failure"));
    const body = await (await POST(request({ report: "stock report" }))).json();
    expect(body.status).toBe("fallback");
    expect(body.message).toContain("could not be reached");
  });

  it("uses the localized timeout fallback for aborted requests", async () => {
    vi.mocked(fetch).mockRejectedValue(new DOMException("aborted", "AbortError"));
    const body = await (await POST(request({ language: "hi", report: "स्टॉक रिपोर्ट" }))).json();
    expect(body.status).toBe("fallback");
    expect(body.message).toContain("समय समाप्त");
  });
});
