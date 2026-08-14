import { generateDocument } from "@/lib/generate";
import type { GenerateResponse } from "@/lib/types";

export const maxDuration = 300;

export async function POST(request: Request): Promise<Response> {
  let input: string;
  let company: string;
  try {
    const body = (await request.json()) as { input?: unknown; company?: unknown };
    input = typeof body.input === "string" ? body.input.trim() : "";
    company = typeof body.company === "string" ? body.company.trim().slice(0, 120) : "";
  } catch {
    return json({ ok: false, error: "We could not read that request." }, 400);
  }

  if (!input) {
    return json({ ok: false, error: "Paste your program numbers first." }, 400);
  }
  if (input.length > 20_000) {
    return json({ ok: false, error: "That is a lot of text. Keep it under 20,000 characters." }, 400);
  }

  try {
    const document = await generateDocument(input, company);
    return json({ ok: true, document });
  } catch (error) {
    return json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "We could not build the document. Try again.",
      },
      500,
    );
  }
}

function json(payload: GenerateResponse, status = 200): Response {
  return Response.json(payload, { status });
}
