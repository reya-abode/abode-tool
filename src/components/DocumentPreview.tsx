"use client";

import { contractComparison, formatMoney, totalSaved } from "@/lib/compute";
import type { RoiDocument } from "@/lib/types";

export function DocumentPreview({
  document,
  scaleTarget,
  onScaleTargetChange,
}: {
  document: RoiDocument;
  scaleTarget?: number;
  onScaleTargetChange?: (target: number) => void;
}) {
  const stamp = new Date(document.generatedAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const total = totalSaved(document.sections);
  const comparison = contractComparison(total, document.contractValue);

  return (
    <article className="card overflow-hidden">
      <div className="border-b border-line bg-white px-7 py-7 sm:px-10 sm:py-9">
        <p className="eyebrow text-forest-500">Abode ROI story</p>
        <h1 className="mt-2.5 font-display text-[27px] font-semibold leading-tight text-forest-900">
          {document.title}
        </h1>
        <p className="mt-1.5 text-[14px] text-muted">
          {document.subtitle} · {stamp}
        </p>

        <div className="mt-6 rounded-xl bg-sage-100 px-5 py-5">
          <div className="flex flex-wrap items-end gap-x-8 gap-y-4">
            <div>
              <p className="eyebrow text-forest-700">Total saved with Abode</p>
              <p className="mt-1.5 font-display text-[32px] font-semibold leading-none text-forest-900">
                {formatMoney(total)}
              </p>
            </div>
            {comparison && (
              <>
                <div>
                  <p className="eyebrow text-forest-700">Contract value</p>
                  <p className="mt-1.5 font-display text-[22px] font-semibold leading-none text-forest-900">
                    {comparison.contract}
                  </p>
                </div>
                <div>
                  <p className="eyebrow text-forest-700">Return on the contract</p>
                  <p className="mt-1.5 font-display text-[32px] font-semibold leading-none text-forest-900">
                    {comparison.multiple}
                  </p>
                </div>
              </>
            )}
          </div>
          <p className="mt-3 text-[13.5px] leading-relaxed text-forest-700">
            Protect, Save and Scale added together.
            {comparison ? ` ${comparison.detail}` : ""}
          </p>
        </div>
      </div>

      <div className="px-7 sm:px-10">
        {document.sections.map((section) => (
          <section
            key={section.pillarId}
            id={`pillar-${section.pillarId}`}
            className="scroll-mt-24 border-b border-line py-8 last:border-b-0"
          >
            <div className="flex items-center gap-2.5">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-forest-700 font-display text-[11px] font-semibold text-white">
                {section.rank}
              </span>
              <h2 className="font-display text-[17px] font-semibold text-forest-900">
                {section.pillarName}
              </h2>
              <span className="text-[13px] text-muted">{section.subtitle}</span>
            </div>

            {section.headline && (
              <p
                className={`mt-3 font-display font-semibold leading-tight text-forest-900 ${
                  section.kind === "hard" ? "text-[30px]" : "text-[23px]"
                }`}
              >
                {section.headline}
              </p>
            )}

            {section.scaleControl && onScaleTargetChange && (
              <div className="mt-5 rounded-xl border border-line bg-white px-4 py-4">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <label
                    htmlFor="scale-target"
                    className="font-display text-[13.5px] font-semibold text-forest-900"
                  >
                    Scale to how many Participants?
                  </label>
                  <span className="font-mono text-[13px] text-forest-700">
                    {(scaleTarget ?? section.scaleControl.target).toLocaleString("en-US")}
                  </span>
                </div>
                <input
                  id="scale-target"
                  type="range"
                  min={section.scaleControl.min}
                  max={section.scaleControl.max}
                  step={section.scaleControl.step}
                  value={scaleTarget ?? section.scaleControl.target}
                  onChange={(event) => onScaleTargetChange(Number(event.target.value))}
                  className="mt-3 w-full accent-[var(--forest-700)]"
                />
                <div className="mt-1 flex justify-between text-[11.5px] text-muted">
                  <span>{section.scaleControl.min.toLocaleString("en-US")} today</span>
                  <span>{section.scaleControl.max.toLocaleString("en-US")}</span>
                </div>
                <p className="mt-2 text-[12.5px] leading-relaxed text-muted">
                  Move the slider if you do not know the exact target. Everything below updates
                  as it changes.
                </p>
              </div>
            )}

            {section.formulaText && (
              <div className="mt-5 rounded-xl border-l-[3px] border-amber-200 bg-amber-100 px-4 py-3.5">
                <p className="eyebrow text-amber-700">How we got there</p>
                <p className="mt-1.5 whitespace-pre-line text-[13px] leading-relaxed text-ink-soft">
                  {section.formulaText}
                </p>
                {section.workedFormula && (
                  <p className="mt-2 font-mono text-[13px] font-medium text-forest-900">
                    {section.workedFormula}
                  </p>
                )}
              </div>
            )}

            {section.figures.length > 0 && (
              <dl className="mt-4 overflow-hidden rounded-xl border border-line">
                {section.figures.map((figure, index) => (
                  <div
                    key={figure.label}
                    className={`flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 px-4 py-2.5 ${
                      index % 2 === 1 ? "bg-cream/50" : "bg-white"
                    }`}
                  >
                    <dt className="text-[13.5px] text-ink-soft">{figure.label}</dt>
                    <dd className="font-display text-[13.5px] font-semibold text-forest-900">
                      {figure.value}
                    </dd>
                  </div>
                ))}
              </dl>
            )}

            <div className="mt-4 rounded-xl border-l-[3px] border-forest-500 bg-sage-100 px-4 py-4">
              <p className="eyebrow text-forest-700">How this creates value</p>
              <ul className="mt-2.5 space-y-2.5">
                {section.businessCase.map((point, index) => {
                  const [label, ...rest] = point.split(": ");
                  const body = rest.join(": ");
                  return (
                    <li key={index} className="flex gap-2.5">
                      <span
                        aria-hidden
                        className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-forest-500"
                      />
                      <span className="doc-prose text-[14.5px] text-forest-900">
                        {body ? (
                          <>
                            <span className="font-semibold">{label}:</span> {body}
                          </>
                        ) : (
                          point
                        )}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>

            {section.costOfInaction.length > 0 && (
              <div className="mt-4 rounded-xl border-l-[3px] border-clay-600 bg-clay-100 px-4 py-4">
                <p className="eyebrow text-clay-600">Cost of not using Abode</p>
                <ul className="mt-2.5 space-y-2">
                  {section.costOfInaction.map((point, index) => (
                    <li key={index} className="flex gap-2.5">
                      <span
                        aria-hidden
                        className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-clay-600"
                      />
                      <span className="doc-prose text-[14.5px] text-clay-700">{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        ))}
      </div>

      <div className="bg-cream/60 px-7 py-8 sm:px-10">
        <div className="grid gap-6 sm:grid-cols-2">
          {document.gaps.length > 0 && (
            <ListBlock title="Add these to unlock more pillars" items={document.gaps} />
          )}
          {document.metricsUsed.length > 0 && (
            <ListBlock
              title="Numbers you gave us"
              items={document.metricsUsed.map((metric) => `${metric.label}: ${metric.value}`)}
            />
          )}
          {document.suppliedValues.length > 0 && (
            <div>
              <p className="eyebrow text-forest-500">Numbers Abode supplied</p>
              <ul className="mt-2.5 space-y-1.5">
                {document.suppliedValues.map((supplied) => (
                  <li
                    key={supplied.label}
                    className="flex flex-wrap items-baseline gap-x-2 text-[13.5px] leading-relaxed text-ink-soft"
                  >
                    <span>
                      {supplied.label}: <span className="font-semibold">{supplied.value}</span>
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                        supplied.provenance === "Estimate"
                          ? "bg-amber-100 text-amber-700"
                          : "bg-sage-100 text-forest-700"
                      }`}
                    >
                      {supplied.provenance}
                    </span>
                    {supplied.source && (
                      <span className="text-[12px] text-muted">({supplied.source})</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {document.setAside.length > 0 && (
            <ListBlock
              title="Pillars we could not match"
              items={document.setAside.map((entry) => `${entry.pillarName}: ${entry.reason}`)}
            />
          )}
        </div>
      </div>
    </article>
  );
}

function ListBlock({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <p className="eyebrow text-forest-500">{title}</p>
      <ul className="mt-2.5 space-y-1.5">
        {items.map((item, index) => (
          <li key={index} className="flex gap-2 text-[13.5px] leading-relaxed text-ink-soft">
            <span aria-hidden className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-forest-300" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
