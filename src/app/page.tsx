"use client";

import { useMemo, useState } from "react";
import { AbodeMark } from "@/components/AbodeMark";
import { DocumentPreview } from "@/components/DocumentPreview";
import { PillarLadder } from "@/components/PillarLadder";
import { applyScaleTarget, contractComparison, formatMoney, totalSaved } from "@/lib/compute";
import { downloadPdf } from "@/lib/pdf";
import type { GenerateResponse, RoiDocument } from "@/lib/types";

const SAMPLE = `Summer 2026 interns
Program size: 240
Company NPS: 64
Reneg rate: 15% last year, 6% this cycle
People running the program: 2
Program size last year: 140
Low and moderately engaged interns flagged: 34
Employee to FTE conversion rate: 68%
Offer to start: 7 months`;

export default function Home() {
  const [company, setCompany] = useState("");
  const [input, setInput] = useState("");
  const [document, setDocument] = useState<RoiDocument | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scaleTarget, setScaleTarget] = useState<number | null>(null);
  const [contract, setContract] = useState("");

  const contractValue = useMemo(() => {
    const parsed = Number(contract.replace(/[^0-9.]/g, ""));
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  }, [contract]);

  // The slider rewrites the Scale section and the contract box feeds the total, so the
  // preview and the PDF both stay in step with what is on screen.
  const shown = useMemo(() => {
    if (!document) return null;
    const withContract = { ...document, contractValue };
    if (scaleTarget === null) return withContract;
    return applyScaleTarget(withContract, scaleTarget, document.company);
  }, [document, scaleTarget, contractValue]);

  const total = useMemo(() => (shown ? totalSaved(shown.sections) : 0), [shown]);
  const comparison = useMemo(
    () => (total > 0 ? contractComparison(total, contractValue) : null),
    [total, contractValue],
  );

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
        body: JSON.stringify({ input, company, ...(contractValue ? { contractValue } : {}) }),
      });
      const payload = (await response.json()) as GenerateResponse;
      if (!payload.ok) {
        setError(payload.error);
        return;
      }
      setDocument(payload.document);
      setScaleTarget(null);
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
        <div className="rise card mb-5 border-l-[3px] border-forest-500 bg-sage-100 p-5 sm:p-7">
          <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-3">
            <div>
              <p className="eyebrow text-forest-700">Total saved with Abode</p>
              <p className="mt-2 font-display text-[40px] font-semibold leading-none text-forest-900">
                {formatMoney(total)}
              </p>
              <p className="mt-2.5 max-w-xl text-[13.5px] leading-relaxed text-forest-700">
                {total > 0
                  ? "Protect, Save and Scale added together."
                  : "Protect, Save and Scale added together. Build the story below to fill this in."}
              </p>
            </div>
            {comparison && (
              <div className="rounded-xl bg-white/70 px-4 py-3">
                <p className="font-display text-[17px] font-semibold text-forest-900">
                  {comparison.headline}
                </p>
                <p className="mt-1 max-w-xs text-[13px] leading-relaxed text-forest-700">
                  {comparison.detail}
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="rise rise-2 card mb-5 p-5 sm:p-7">
          <label
            htmlFor="company"
            className="block font-display text-base font-semibold text-forest-900"
          >
            Company
          </label>
          <input
            id="company"
            type="text"
            value={company}
            onChange={(event) => setCompany(event.target.value)}
            placeholder="Abode"
            className="mt-3 w-full max-w-md rounded-xl border border-line bg-cream/70 px-4 py-2.5 text-[14px] text-ink outline-none transition focus:border-forest-300 focus:bg-white"
          />

          <label
            htmlFor="contract"
            className="mt-6 block font-display text-base font-semibold text-forest-900"
          >
            Contract value
          </label>
          <p className="mt-1 text-[13.5px] text-muted">
            The annual Abode contract, compared against the total saved above.
          </p>
          <input
            id="contract"
            type="text"
            inputMode="numeric"
            value={contract}
            onChange={(event) => setContract(event.target.value)}
            placeholder="$50,000"
            className="mt-3 w-full max-w-md rounded-xl border border-line bg-cream/70 px-4 py-2.5 text-[14px] text-ink outline-none transition focus:border-forest-300 focus:bg-white"
          />
        </div>

        <div className="rise rise-3 card p-5 sm:p-7">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <label htmlFor="numbers" className="font-display text-base font-semibold text-forest-900">
                Your numbers
              </label>
              <p className="mt-1 text-[13.5px] text-muted">
                One per line works best. Program size, company NPS, reneg rate, admins,
                engagement flags, FTE conversion rate, offer to start.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setCompany("Abode");
                setInput(SAMPLE);
              }}
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
            placeholder={"Program size: 240\nCompany NPS: 64\nReneg rate: 15% last year, 6% now\nPeople running the program: 2"}
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
            <PillarLadder matched={matched} document={shown} />
          </aside>

          <section>
            {shown ? (
              <>
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <p className="text-[13.5px] text-muted">
                    <span className="font-display font-semibold text-ink">
                      {shown.sections.length}
                    </span>{" "}
                    of 8 pillars matched
                    <span className="mx-2 text-line">|</span>
                    <span className="font-display font-semibold text-ink">
                      {shown.wordCount}
                    </span>{" "}
                    words in your preview
                  </p>
                  <button
                    type="button"
                    onClick={() => downloadPdf(shown)}
                    className="rounded-full bg-forest-700 px-5 py-2.5 font-display text-[13.5px] font-semibold text-white transition hover:bg-forest-900"
                  >
                    Download PDF
                  </button>
                </div>

                {shown.engineNote && (
                  <p className="mb-4 rounded-lg bg-cream-200/70 px-3.5 py-2.5 text-[13px] text-ink-soft">
                    {shown.engineNote}
                  </p>
                )}

                <DocumentPreview
                  document={shown}
                  scaleTarget={scaleTarget ?? undefined}
                  onScaleTargetChange={setScaleTarget}
                />
              </>
            ) : (
              <EmptyState pending={pending} />
            )}
          </section>
        </div>
      </main>

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
