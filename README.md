# Abode ROI Story Builder

Paste your program numbers and get an ROI story you can take into a renewal conversation: the
numbers behind each pillar, how each one creates value explained in plain bullets, and a PDF.

Built on the eight ROI pillars from *The Value Engine ROI Pillar Guide* (Reya Yeddula, Summer 2026).

## How it works

Three stages, kept separate so the AI never does the arithmetic.

1. **Match.** Claude reads what you pasted, pulls out the numbers it can find, and works through
   all eight pillars. It is told not to calculate and not to invent a number to make a pillar fit.
2. **Calculate.** `src/lib/compute.ts` runs each pillar's formula on those numbers. A pillar whose
   required numbers are missing never reaches the document, even if the AI picked it. Every figure
   you see comes from here.
3. **Write.** Claude writes the story around the figures already calculated, quoting them exactly.

Every pillar with enough evidence goes into the story, ordered by strength of evidence, so the
safest plays sit at the top. Pillars that miss a number are listed under "Add these to unlock more
pillars" with the exact number to collect.

If there is no API key, or either AI step fails, the app falls back to keyword matching and
standard wording, and says so above the document. The formulas and the PDF are identical either way.

## Setup

```bash
npm install
echo 'ANTHROPIC_API_KEY=sk-ant-...' > .env.local   # optional, turns on AI writing
npm run dev                                        # http://localhost:3000
```

## Where things live

| Path | What it holds |
| --- | --- |
| `src/lib/pillars.ts` | The eight pillars and the numbers they need, transcribed from the guide: formulas, and the value bullets that explain how Abode produces each result and where the ROI surfaces. |
| `src/lib/compute.ts` | The formula for each pillar, plus the keyword parser used when AI writing is off. |
| `src/lib/llm.ts` | The two Claude passes, both using structured outputs. |
| `src/lib/generate.ts` | Matching, wording, and every fallback path. |
| `src/lib/pdf.ts` | The PDF layout at 1.15 line spacing, paginated, with footers. |
| `src/app/api/generate/route.ts` | `POST { input, company, contractValue }` returns `{ ok, document }`. |
| `src/components/DocumentPreview.tsx` | The document on screen, styled to match the PDF. |
| `src/components/PillarLadder.tsx` | The eight-pillar rail that shows what matched and what is missing. |

## The eight pillars

Ordered by how much hard evidence the customer interviews gave us. Hard-number pillars first,
narrative pillars last.

1. **Protect**, risk and cost avoided
2. **Connect**, belonging and readiness before day one
3. **Save**, capacity freed, framed as work rather than hours
4. **Scale**, growth without adding headcount
5. **See**, visibility and the ability to step in
6. **Improve**, conversion, quality and time to contribution
7. **Compete**, fills a gap an ATS cannot
8. **Impress**, candidate experience and employer brand

Values the tool supplies rather than asking for. Questions per intern (5), minutes per question
(15), minutes per message (1), the fully loaded cost of one FTE ($80,000) and the 100% follow-up
rate on flagged interns are Estimates. Cost per external entry-level hire ($4,700), cost per
intern conversion ($1,500), the benchmark intern to FTE conversion rate (63.1%) and the cost of
one program admin ($80,000) come from NACE.

Scale carries a target slider. Moving it recomputes the pillar in the browser through
`scaleResult` in `src/lib/compute.ts`, and the download uses whatever the slider is set to, so
the PDF always matches the screen. Messages per journey (8.4) and Abode NPS (64) are Abode averages. Typical
intern NPS (32) is an industry benchmark. Every one a calculation touches is listed under "Numbers
Abode supplied" with its provenance.

Connect and Impress appear in every story. Connect compares the Company NPS against the typical
industry 32, falling back to the Abode average of 64 when no figure is given. Impress always uses
the Abode NPS of 64 against the same benchmark.

The total saved sits at the top of the tool and at the top of the document, adding Protect, Save
and Scale. Type a contract value under Company and the total is compared against it, so the
document says what the account gets back for what it pays.

## Design

Colours, type, and layout follow the Abode product UI: forest green band, cream page, white cards,
amber for the main action, and a sage tint on anything customer facing. The guide's own colour
coding carries through, so the formula box is amber and the value statement is green.
