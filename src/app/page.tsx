"use client";

import { useMemo, useState } from "react";
import { AbodeMark } from "@/components/AbodeMark";
import { DocumentPreview } from "@/components/DocumentPreview";
import { PillarLadder } from "@/components/PillarLadder";
import { downloadPdf } from "@/lib/pdf";
import type { GenerateResponse, RoiDocument } from "@/lib/types";

const SAMPLE = `Summer 2026 interns
Cohort size: 240
Reneg rate: 15% last year, 6% this cycle
Cost per reneged hire: $9,500
Belonging survey: 92%
Adoption: 88%
Intern NPS: 71
People running the program: 2
Program size last year: 140
At-risk interns flagged: 34
Flags we followed up on: 75%
Conversion: 68% for engaged interns vs 51% for the rest
Offer to start: 7 months`;

export default function Home() {
  const [input, setInput] = useState("");
  const [document, setDocument] = useState<RoiDocument | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const matched = useMemo(
    () => new Set(document?.sections.map((section) => section.pillarId) ?? []),
    [document],
  );

  async function build() {
    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ input }),
      });
      const payload = (await response.json()) as GenerateResponse;
      if (!payload.ok) {
        setError(payload.error);
        return;
      }
      setDocument(payload.document);
      setError(null);
    } catch {
      setError("Something went wrong on our side. Try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-1 flex-col">
      <header className="sticky top-0 z-20 border-b border-line bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-[1240px] items-center gap-3 px-5 py-3.5 sm:px-8">
          <span className="text-forest-900">
            <AbodeMark />
          </span>
          <span className="font-display text-[15px] font-semibold text-forest-900">Abode</span>
          <span className="h-4 w-px bg-line" />
          <span className="font-display text-[15px] font-medium text-ink-soft">
            ROI Story Builder
          </span>
        </div>
      </header>

      <section className="bg-gradient-to-r from-forest-700 to-forest-500">
        <div className="mx-auto max-w-[1240px] px-5 pt-12 pb-28 sm:px-8">
          <p className="eyebrow text-sage-200">The Value Engine</p>
          <h1 className="rise mt-3 max-w-2xl font-display text-3xl font-semibold leading-tight text-white sm:text-[38px]">
            Turn your program numbers into an ROI story
          </h1>
          <p className="rise rise-2 mt-3 max-w-xl text-[15px] leading-relaxed text-sage-100/90">
            Paste what you have. We check all eight ROI pillars, keep the ones your numbers
            support, and write the story you can take into a renewal conversation.
          </p>
        </div>
      </section>

      <main className="mx-auto -mt-20 w-full max-w-[1240px] flex-1 px-5 pb-16 sm:px-8">
        <div className="rise rise-2 card p-5 sm:p-7">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <label htmlFor="numbers" className="font-display text-base font-semibold text-forest-900">
                Your numbers
              </label>
              <p className="mt-1 text-[13.5px] text-muted">
                One per line works best. Cohort size, reneg rate, belonging, NPS, admins,
                conversion, offer to start.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setInput(SAMPLE)}
              className="rounded-full border border-line px-3.5 py-1.5 font-display text-[13px] font-medium text-forest-700 transition hover:border-forest-300 hover:bg-sage-100"
            >
              Use sample numbers
            </button>
          </div>

          <textarea
            id="numbers"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            rows={7}
            spellCheck={false}
            placeholder={"Cohort size: 240\nReneg rate: 15% last year, 6% now\nCost per reneged hire: $9,500\nBelonging: 92%"}
            className="mt-4 w-full resize-y rounded-xl border border-line bg-cream/70 px-4 py-3.5 font-mono text-[13px] leading-relaxed text-ink outline-none transition focus:border-forest-300 focus:bg-white"
          />

          <div className="mt-4 flex flex-wrap items-center gap-4">
            <button
              type="button"
              onClick={build}
              disabled={pending || input.trim().length === 0}
              className="rounded-full bg-amber-500 px-6 py-3 font-display text-[14.5px] font-semibold text-forest-900 shadow-sm transition hover:bg-amber-600 disabled:cursor-not-allowed disabled:bg-cream-200 disabled:text-muted disabled:shadow-none"
            >
              {pending ? "Building your story" : document ? "Rebuild my story" : "Build my ROI story"}
            </button>
            {pending && (
              <span className="pulsing text-[13.5px] text-muted">
                Checking all eight pillars against your numbers
              </span>
            )}
            {error && (
              <span className="rounded-lg bg-clay-100 px-3 py-2 text-[13.5px] text-clay-600">
                {error}
              </span>
            )}
          </div>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-7 lg:grid-cols-[286px_minmax(0,1fr)] lg:gap-9">
          <aside className="lg:sticky lg:top-[76px] lg:self-start">
            <PillarLadder matched={matched} document={document} />
          </aside>

          <section>
            {document ? (
              <>
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <p className="text-[13.5px] text-muted">
                    <span className="font-display font-semibold text-ink">
                      {document.sections.length}
                    </span>{" "}
                    of 8 pillars matched
                    <span className="mx-2 text-line">|</span>
                    <span className="font-display font-semibold text-ink">
                      {document.wordCount}
                    </span>{" "}
                    words in your preview
                  </p>
                  <button
                    type="button"
                    onClick={() => downloadPdf(document)}
                    className="rounded-full bg-forest-700 px-5 py-2.5 font-display text-[13.5px] font-semibold text-white transition hover:bg-forest-900"
                  >
                    Download PDF
                  </button>
                </div>

                {document.engineNote && (
                  <p className="mb-4 rounded-lg bg-cream-200/70 px-3.5 py-2.5 text-[13px] text-ink-soft">
                    {document.engineNote}
                  </p>
                )}

                <DocumentPreview document={document} />
              </>
            ) : (
              <EmptyState pending={pending} />
            )}
          </section>
        </div>
      </main>

      <footer className="border-t border-line bg-white">
        <div className="mx-auto max-w-[1240px] px-5 py-5 text-[12.5px] text-muted sm:px-8">
          What do you show, to whom, and what is missing when you cannot show it. Time saved is the
          entry point, never the whole argument.
        </div>
      </footer>
    </div>
  );
}

function EmptyState({ pending }: { pending: boolean }) {
  return (
    <div className="card flex min-h-[380px] flex-col justify-center border border-dashed border-line bg-white/60 px-8 py-14 shadow-none sm:px-12">
      {pending ? (
        <div className="space-y-3">
          <div className="pulsing h-3 w-40 rounded-full bg-cream-200" />
          <div className="pulsing h-8 w-3/4 rounded-lg bg-cream-200" />
          <div className="pulsing h-3 w-full rounded-full bg-cream-200" />
          <div className="pulsing h-3 w-5/6 rounded-full bg-cream-200" />
        </div>
      ) : (
        <>
          <h2 className="max-w-md font-display text-2xl font-semibold leading-snug text-forest-900">
            Your story appears here
          </h2>
          <p className="mt-3 max-w-md text-[15px] leading-relaxed text-ink-soft">
            The numbers behind each pillar, and how each one creates value, explained point by
            point. Download it as a PDF when you are happy with it.
          </p>
          <p className="mt-5 text-[13.5px] text-muted">
            No numbers yet? Select <span className="font-semibold text-ink-soft">Use sample numbers</span> to
            see a finished example.
          </p>
        </>
      )}
    </div>
  );
}
