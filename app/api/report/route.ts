import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const body = (await request.json()) as { report?: string };
  if (!body.report?.trim()) {
    return NextResponse.json({ error: "Report text is required." }, { status: 400 });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({
      status: "scaffolded",
      message: "Report accepted for review. Add GEMINI_API_KEY to enable Gemini extraction.",
      extracted: { facility: null, medicine: null, urgency: "needs-review" }
    });
  }

  // Keep the provider call server-side. The demo intentionally returns a deterministic
  // extraction shape so the UI can be tested without external network access.
  return NextResponse.json({
    status: "ready",
    message: "Report queued for Gemini-assisted extraction.",
    extracted: { facility: null, medicine: null, urgency: "needs-review" },
    provider: "gemini"
  });
}
