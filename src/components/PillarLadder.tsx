"use client";

import { PILLARS } from "@/lib/pillars";
import type { PillarId } from "@/lib/pillars";
import type { RoiDocument } from "@/lib/types";

/** Pulls "Scale: add people running the program." back apart for the hint line. */
function hintFor(name: string, gaps: string[]): string | null {
  const line = gaps.find((gap) => gap.startsWith(`${name}:`));
  return line ? line.slice(name.length + 1).trim().replace(/\.$/, "") : null;
}

/**
 * Chips stay on one line: the leading number, plus a short unit when there is one.
 * "312 hours ≈ 2.0 full-time months" becomes "312 hours", "40.8 retained hires" becomes "40.8".
 */
function shortValue(headline: string): string {
  const match = headline.match(/^\$?[\d.,]+\s*(?:%|:\s*\d+)?(?:\s+[a-z-]{1,7})?/i);
  return (match?.[0] ?? headline).trim();
}

export function PillarLadder({
  matched,
  document,
}: {
  matched: Set<PillarId>;
  document: RoiDocument | null;
}) {
  const values = new Map(
    document?.sections.map((section) => [section.pillarId, section.headline]) ?? [],
  );

  return (
    <div className="card p-5">
      <h2 className="font-display text-base font-semibold text-forest-900">The eight pillars</h2>
      <p className="mt-1 text-[13px] leading-relaxed text-muted">
        We check every one. The strongest evidence sits at the top, so those are your safest
        plays.
      </p>

      <ol className="mt-4">
        {PILLARS.map((pillar, index) => {
          const isMatched = matched.has(pillar.id);
          const value = values.get(pillar.id);
          const hint = document ? hintFor(pillar.name, document.gaps) : null;
          const isLast = index === PILLARS.length - 1;

          const row = (
            <>
              <span className="relative flex flex-col items-center">
                <span
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full font-display text-[12px] font-semibold transition ${
                    isMatched
                      ? "pop bg-forest-700 text-white"
                      : "border border-line bg-white text-muted"
                  }`}
                >
                  {pillar.rank}
                </span>
                {!isLast && (
                  <span
                    className={`mt-1 w-px flex-1 ${isMatched ? "bg-sage-200" : "bg-line"}`}
                    aria-hidden
                  />
                )}
              </span>

              <span className="min-w-0 flex-1 pb-4">
                <span className="flex flex-wrap items-baseline gap-x-2">
                  <span
                    className={`font-display text-[14px] font-semibold ${
                      isMatched ? "text-forest-900" : "text-ink-soft"
                    }`}
                  >
                    {pillar.name}
                  </span>
                  {isMatched && value && (
                    <span className="whitespace-nowrap rounded-full bg-amber-100 px-2 py-0.5 font-mono text-[11.5px] text-amber-700">
                      {shortValue(value)}
                    </span>
                  )}
                </span>
                <span className="mt-0.5 block text-[12.5px] leading-snug text-muted">
                  {isMatched ? pillar.subtitle : (hint ?? pillar.subtitle)}
                </span>
              </span>
            </>
          );

          return (
            <li key={pillar.id}>
              {isMatched ? (
                <a
                  href={`#pillar-${pillar.id}`}
                  className="flex w-full gap-3 rounded-lg text-left transition hover:bg-sage-100/60"
                >
                  {row}
                </a>
              ) : (
                <div className="flex w-full gap-3 opacity-70">{row}</div>
              )}
            </li>
          );
        })}
      </ol>

      {document && (
        <p className="border-t border-line pt-3 text-[12.5px] leading-relaxed text-muted">
          {matched.size === PILLARS.length
            ? "All eight pillars matched. Nothing left to collect."
            : `${matched.size} matched. The rest are waiting on numbers you can collect before the next review.`}
        </p>
      )}
    </div>
  );
}
