import {
  METRIC_BY_KEY,
  METRIC_SPECS,
  PILLAR_BY_ID,
  type MetricKey,
  type Metrics,
  type PillarId,
} from "./pillars";

export type ComputedFigure = {
  label: string;
  value: string;
};

export type PillarResult = {
  pillarId: PillarId;
  /** The headline number for this pillar, already formatted. */
  headline: string;
  /** Supporting figures shown under the formula. */
  figures: ComputedFigure[];
  /** The formula with the customer's numbers substituted in. */
  workedFormula: string;
  /** Informational bullets with this account's numbers substituted in. */
  businessCase: string[];
  /** Metrics the pillar needed but did not get. Empty = fully computable. */
  missing: MetricKey[];
  /** Benchmarks the calculation leaned on because the customer number was absent. */
  assumptions: string[];
  /** Raw numeric value where one exists, for sorting / totals. */
  raw?: number;
  rawUnit?: "usd" | "count" | "hours" | "percent" | "ratio" | "candidate-months";
};

const usd = (n: number) =>
  n >= 1000
    ? `$${Math.round(n).toLocaleString("en-US")}`
    : `$${n.toFixed(n % 1 === 0 ? 0 : 2)}`;

/** Formats with `digits` decimals, but drops a trailing `.0`, so "120 : 1" not "120.0 : 1". */
const num = (n: number, digits = 0) => {
  const places = Number.isInteger(n) ? 0 : digits;
  return n.toLocaleString("en-US", {
    minimumFractionDigits: places,
    maximumFractionDigits: places,
  });
};

const pct = (n: number) => `${Number.isInteger(n) ? n : n.toFixed(1)}%`;

/** Accepts 12 or 0.12 for a percentage and normalises to 12. */
function asPercent(value: number): number {
  return value > 0 && value <= 1 ? value * 100 : value;
}

function resolve(
  metrics: Metrics,
  key: MetricKey,
  assumptions: string[],
): number | undefined {
  const provided = metrics[key];
  if (provided !== undefined && Number.isFinite(provided)) return provided;
  const spec = METRIC_BY_KEY[key];
  if (spec.benchmark !== undefined) {
    if (spec.benchmarkNote) assumptions.push(spec.benchmarkNote);
    return spec.benchmark;
  }
  return undefined;
}

function fill(template: string, values: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_match, token: string) => values[token] ?? "[ ]");
}

function fillAll(templates: string[], values: Record<string, string>): string[] {
  return templates.map((template) => fill(template, values));
}

export function computePillar(pillarId: PillarId, metrics: Metrics): PillarResult {
  const pillar = PILLAR_BY_ID[pillarId];
  const assumptions: string[] = [];
  const missing = pillar.required.filter(
    (key) => metrics[key] === undefined || !Number.isFinite(metrics[key] as number),
  );

  const base: PillarResult = {
    pillarId,
    headline: "Need more numbers",
    figures: [],
    workedFormula: pillar.formulaText,
    businessCase: pillar.businessCase.map((line) => line.replace(/\{[^}]+\}/g, "[ ]")),
    missing,
    assumptions,
  };

  if (missing.length > 0) return base;

  switch (pillarId) {
    case "protect": {
      const baseline = asPercent(metrics.baselineRenegRate!);
      const current = asPercent(metrics.currentRenegRate!);
      const cohort = metrics.cohortSize!;
      const cost = metrics.costPerRenegedHire!;
      const delta = (baseline - current) / 100;
      const renegsAvoided = delta * cohort;
      const dollars = renegsAvoided * cost;
      return {
        ...base,
        headline: usd(dollars),
        raw: dollars,
        rawUnit: "usd",
        workedFormula: `( ${pct(baseline)} − ${pct(current)} ) × ${num(cohort)} × ${usd(cost)} = ${usd(dollars)}`,
        figures: [
          { label: "Reneg rate", value: `${pct(baseline)} down to ${pct(current)}` },
          { label: "Renegs avoided", value: `${num(renegsAvoided, 1)} hires` },
          { label: "Hiring cost avoided", value: usd(dollars) },
        ],
        businessCase: fillAll(pillar.businessCase, {
          baseline: String(baseline),
          current: String(current),
          cohort: num(cohort),
          cost: usd(cost),
          dollars: usd(dollars),
          renegsAvoided: num(renegsAvoided, 1),
        }),
      };
    }

    case "connect": {
      const belonging = asPercent(metrics.belongingPct!);
      const adoption = metrics.adoptionPct !== undefined ? asPercent(metrics.adoptionPct) : undefined;
      const figures: ComputedFigure[] = [{ label: "Belonging before day one", value: pct(belonging) }];
      if (adoption !== undefined) figures.push({ label: "Platform adoption", value: pct(adoption) });
      if (metrics.npsScore !== undefined) figures.push({ label: "Intern NPS", value: num(metrics.npsScore) });
      return {
        ...base,
        headline: pct(belonging),
        raw: belonging,
        rawUnit: "percent",
        workedFormula: `average belonging = ${pct(belonging)}${adoption !== undefined ? ` at ${pct(adoption)} adoption` : ""}`,
        figures,
        businessCase: fillAll(pillar.businessCase, {
          belonging: String(belonging),
          adoption: adoption !== undefined ? String(adoption) : "[ ]",
        }),
      };
    }

    case "save": {
      const cohort = metrics.cohortSize!;
      const comms = resolve(metrics, "avgCommsPerJourney", assumptions)!;
      const minPerComms = resolve(metrics, "minSavedPerComms", assumptions)!;
      const faqs = resolve(metrics, "avgFaqDeflections", assumptions)!;
      const minPerQ = resolve(metrics, "minPerQuestion", assumptions)!;
      const commsHours = (cohort * comms * minPerComms) / 60;
      const faqHours = (cohort * faqs * minPerQ) / 60;
      const hours = commsHours + faqHours;
      // One working month is about 160 hours. Expressed as work, not hours.
      const fteMonths = hours / 160;
      const fteShown = num(fteMonths, 1);
      const fteLabel =
        fteMonths >= 1
          ? `${fteShown} full-time month${fteShown === "1" ? "" : "s"}`
          : `${Math.round(fteMonths * 100)}% of a full-time month`;
      const figures: ComputedFigure[] = [
        { label: "Message work absorbed", value: `${num(commsHours, 1)} hours` },
        { label: "Questions answered for you", value: `${num(faqHours, 1)} hours` },
        { label: "Capacity freed per cycle", value: `${num(hours, 1)} hours (${fteLabel})` },
      ];
      if (metrics.loadedHourlyCost !== undefined) {
        figures.push({
          label: "That capacity in dollars",
          value: usd(hours * metrics.loadedHourlyCost),
        });
      }
      if (metrics.adminHeadcount !== undefined) {
        figures.push({
          label: "Headcount avoided",
          value: `${fteShown} more admin month${fteShown === "1" ? "" : "s"} to do this by hand at your volume`,
        });
      }
      return {
        ...base,
        headline: `${num(hours, 0)} hours ≈ ${fteLabel}`,
        raw: hours,
        rawUnit: "hours",
        workedFormula: `${num(cohort)} × ${num(comms)} × ${num(minPerComms)} min + ${num(cohort)} × ${num(faqs)} × ${num(minPerQ)} min = ${num(hours, 1)} hours`,
        figures,
        assumptions,
        businessCase: fillAll(pillar.businessCase, {
          hours: num(hours, 0),
          fte: fteLabel,
          cohort: num(cohort),
        }),
      };
    }

    case "scale": {
      const cohort = metrics.cohortSize!;
      const admins = metrics.adminHeadcount!;
      const ratio = cohort / admins;
      const priorSize = metrics.priorProgramSize;
      const priorAdmins = metrics.priorAdminHeadcount ?? admins;
      const priorRatio = priorSize !== undefined ? priorSize / priorAdmins : undefined;
      const figures: ComputedFigure[] = [
        { label: "Interns per admin", value: `${num(ratio, 1)} : 1` },
      ];
      if (priorRatio !== undefined) {
        figures.push({ label: "Last year", value: `${num(priorRatio, 1)} : 1` });
        figures.push({
          label: "Improvement",
          value: `${num(ratio / priorRatio, 1)}× more candidates per admin`,
        });
      }
      const priorClause =
        priorSize !== undefined
          ? `, up from ${num(priorSize)} on ${num(priorAdmins)} last year`
          : "";
      return {
        ...base,
        headline: `${num(ratio, 1)} : 1`,
        raw: ratio,
        rawUnit: "ratio",
        workedFormula: `${num(cohort)} ÷ ${num(admins)} = ${num(ratio, 1)} interns per admin${priorRatio !== undefined ? ` (prior year: ${num(priorRatio, 1)})` : ""}`,
        figures,
        businessCase: fillAll(pillar.businessCase, {
          cohort: num(cohort),
          admins: num(admins),
          adminPlural: admins === 1 ? "" : "s",
          ratio: num(ratio, 1),
          priorClause,
        }),
      };
    }

    case "see": {
      const flagged = metrics.lowEngagementFlagged!;
      const followUp = metrics.followUpRatePct !== undefined ? asPercent(metrics.followUpRatePct) : 100;
      if (metrics.followUpRatePct === undefined) {
        assumptions.push(
          "You did not give a follow-up rate, so every flag is counted as actioned. Treat the intervention count as a best case.",
        );
      }
      const interventions = (flagged * followUp) / 100;
      return {
        ...base,
        headline: `${num(interventions, 1)} interventions`,
        raw: interventions,
        rawUnit: "count",
        workedFormula: `${num(flagged)} flagged × ${pct(followUp)} routed = ${num(interventions, interventions % 1 === 0 ? 0 : 1)} early interventions`,
        figures: [
          { label: "At-risk interns flagged", value: `${num(flagged)} this cycle` },
          { label: "Followed up on", value: pct(followUp) },
          { label: "Early interventions", value: num(interventions, interventions % 1 === 0 ? 0 : 1) },
        ],
        assumptions,
        businessCase: fillAll(pillar.businessCase, {
          flagged: num(flagged),
          interventions: num(interventions, 1),
          coverage:
            metrics.followUpRatePct === undefined
              ? `${num(flagged)} at-risk candidates surfaced this cycle and routed to a follow-up`
              : `${num(flagged)} at-risk candidates surfaced this cycle, of which ${num(interventions, 1)} were routed to a follow-up`,
        }),
      };
    }

    case "improve": {
      const engaged = asPercent(metrics.conversionEngagedPct!);
      const nonEngaged = asPercent(metrics.conversionNonEngagedPct!);
      const cohort = metrics.cohortSize!;
      const extra = ((engaged - nonEngaged) / 100) * cohort;
      const figures: ComputedFigure[] = [
        { label: "Conversion, Abode-engaged", value: pct(engaged) },
        { label: "Conversion, not engaged", value: pct(nonEngaged) },
        {
          label: "Extra retained hires",
          value: `${num(extra, extra % 1 === 0 ? 0 : 1)} across the cohort`,
        },
      ];
      if (metrics.costPerRenegedHire !== undefined) {
        figures.push({
          label: "Re-hiring cost avoided",
          value: usd(extra * metrics.costPerRenegedHire),
        });
      }
      if (metrics.daysFasterRamp !== undefined) {
        figures.push({ label: "Ready to contribute", value: `${num(metrics.daysFasterRamp)} days sooner` });
      }
      const rampClause =
        metrics.daysFasterRamp !== undefined
          ? `, and those who engaged reached full contribution ${num(metrics.daysFasterRamp)} days sooner`
          : "";
      return {
        ...base,
        headline: `${num(extra, 1)} retained hires`,
        raw: extra,
        rawUnit: "count",
        workedFormula: `( ${pct(engaged)} − ${pct(nonEngaged)} ) × ${num(cohort)} = ${num(extra, extra % 1 === 0 ? 0 : 1)} extra retained hires`,
        figures,
        businessCase: fillAll(pillar.businessCase, {
          engaged: String(engaged),
          nonEngaged: String(nonEngaged),
          extra: num(extra, 1),
          rampClause,
        }),
      };
    }

    case "compete": {
      const months = metrics.monthsOfferToStart!;
      const cohort = metrics.cohortSize!;
      const exposure = months * cohort;
      return {
        ...base,
        headline: `${num(exposure)} candidate-months`,
        raw: exposure,
        rawUnit: "candidate-months",
        workedFormula: `${num(months)} months × ${num(cohort)} candidates = ${num(exposure)} candidate-months of exposure covered`,
        figures: [
          { label: "Offer to start", value: `${num(months)} months` },
          { label: "Poaching exposure covered", value: `${num(exposure)} candidate-months` },
        ],
        businessCase: fillAll(pillar.businessCase, {
          months: num(months),
          exposure: num(exposure),
          cohort: num(cohort),
        }),
      };
    }

    case "impress": {
      const figures: ComputedFigure[] = [];
      const parts: string[] = [];
      if (metrics.npsScore !== undefined) {
        figures.push({ label: "Intern NPS", value: num(metrics.npsScore) });
        parts.push(`an intern NPS of ${num(metrics.npsScore)}`);
      }
      if (metrics.csatScore !== undefined) {
        figures.push({ label: "Onboarding CSAT", value: num(metrics.csatScore) });
        parts.push(`onboarding CSAT of ${num(metrics.csatScore)}`);
      }
      if (metrics.belongingPct !== undefined) {
        figures.push({ label: "Belonging", value: pct(asPercent(metrics.belongingPct)) });
      }
      if (figures.length === 0) {
        return { ...base, headline: "No survey scores yet" };
      }
      return {
        ...base,
        headline: figures[0].value,
        raw: metrics.npsScore ?? metrics.csatScore,
        rawUnit: "count",
        workedFormula: "",
        figures,
        businessCase: fillAll(pillar.businessCase, {
          scores: parts.length ? parts.join(" and ") : "the belonging figure shown above",
        }),
      };
    }
  }
}

/** Which pillars have every required number present. This is the eligibility gate. */
export function eligiblePillars(metrics: Metrics): PillarId[] {
  return Object.keys(PILLAR_BY_ID)
    .map((id) => id as PillarId)
    .filter((id) => {
      const pillar = PILLAR_BY_ID[id];
      if (id === "impress") {
        return (
          metrics.npsScore !== undefined ||
          metrics.csatScore !== undefined ||
          metrics.belongingPct !== undefined
        );
      }
      return pillar.required.every(
        (key) => metrics[key] !== undefined && Number.isFinite(metrics[key] as number),
      );
    })
    .sort((a, b) => PILLAR_BY_ID[a].rank - PILLAR_BY_ID[b].rank);
}

/** Normalises punctuation so "Prior-year", "prior_year" and "prior year" all match. */
function normalise(text: string): string {
  return text
    .toLowerCase()
    .replace(/[‐-―]/g, "-")
    .replace(/[-_/]+/g, " ")
    .replace(/\s+/g, " ");
}

function readNumber(raw: string): number | undefined {
  const cleaned = raw.replace(/[$,\s%]/g, "");
  const multiplier = /k$/.test(cleaned) ? 1000 : /m$/.test(cleaned) ? 1_000_000 : 1;
  const value = parseFloat(cleaned.replace(/[km]$/, ""));
  return Number.isFinite(value) ? value * multiplier : undefined;
}

/**
 * `([km])\b` keeps "9.5k" as 9,500 while refusing to read the "m" of "months"
 * as a million multiplier.
 */
const NUMBER_PATTERN = /\$?\s?(\d[\d,]*(?:\.\d+)?)(?:\s?([km])\b)?\s?%?/gi;

function numbersIn(text: string): number[] {
  const found: number[] = [];
  for (const match of text.matchAll(NUMBER_PATTERN)) {
    const value = readNumber(`${match[1]}${match[2] ?? ""}`);
    if (value !== undefined) found.push(value);
  }
  return found;
}

/**
 * Filler words are dropped from both sides of the match so "flags we followed up on"
 * still lines up with "flags you followed up".
 */
const STOP_WORDS = new Set([
  "the", "a", "an", "of", "on", "in", "for", "per", "to", "at", "is", "are", "was", "were",
  "we", "our", "you", "your", "my", "i", "it", "its", "this", "that", "and", "with", "by",
  "total", "avg", "average", "about", "roughly", "around",
]);

/** Meaningful words in a phrase, punctuation and filler removed. */
function tokens(phrase: string): string[] {
  return phrase
    .replace(/[^a-z0-9 ]+/g, " ")
    .split(" ")
    .filter((word) => word && !STOP_WORDS.has(word));
}

/**
 * Every metric whose alias words all appear in the label, most specific first. The metric's
 * own label counts as an alias, so the wording shown in the app always matches.
 */
function matchAliases(label: string): { key: MetricKey; specificity: number }[] {
  const labelWords = new Set(tokens(label));
  const hits: { key: MetricKey; specificity: number }[] = [];
  for (const spec of METRIC_SPECS) {
    let best = 0;
    for (const alias of [spec.label, ...spec.aliases]) {
      const aliasWords = tokens(normalise(alias));
      if (aliasWords.length && aliasWords.every((word) => labelWords.has(word))) {
        best = Math.max(best, aliasWords.length);
      }
    }
    if (best > 0) hits.push({ key: spec.key, specificity: best });
  }
  return hits.sort((a, b) => b.specificity - a.specificity);
}

/**
 * Heuristic extraction for when AI writing is off. Reads the numbers line by line,
 * treating the words before a number as its label, then applies a few paired patterns
 * ("15% last year, 6% now", "68% engaged vs 51% non-engaged") that span one line.
 */
export function parseMetricsHeuristically(input: string): Metrics {
  const metrics: Metrics = {};
  const set = (key: MetricKey, value: number | undefined) => {
    if (value !== undefined && Number.isFinite(value) && metrics[key] === undefined) {
      metrics[key] = value;
    }
  };

  const text = normalise(input);

  // Paired shapes first, because they carry two numbers in one clause and would otherwise
  // be read as a single value.
  const renegPair =
    /reneg[^\n]*?(\d[\d.]*)\s?%[^\n]*?(?:→|->|to|down to|,|then|now|vs|versus)[^\n]*?(\d[\d.]*)\s?%/.exec(
      text,
    );
  if (renegPair) {
    const first = parseFloat(renegPair[1]);
    const second = parseFloat(renegPair[2]);
    // The improvement runs downward: the larger figure is the baseline.
    set("baselineRenegRate", Math.max(first, second));
    set("currentRenegRate", Math.min(first, second));
  }

  const conversionPair =
    /conversion[^\n]*?(\d[\d.]*)\s?%[^\n]*?(?:vs|versus|against|compared to)[^\n]*?(\d[\d.]*)\s?%/.exec(
      text,
    );
  if (conversionPair) {
    set("conversionEngagedPct", parseFloat(conversionPair[1]));
    set("conversionNonEngagedPct", parseFloat(conversionPair[2]));
  }

  const scalePair = /(?:grew|scaled|up) from (\d[\d,]*)[^\n]*?to (\d[\d,]*)/.exec(text);
  if (scalePair) {
    set("priorProgramSize", readNumber(scalePair[1]));
    set("cohortSize", readNumber(scalePair[2]));
  }

  for (const rawLine of input.split(/[\n;]+/)) {
    const line = normalise(rawLine);
    if (!line.trim()) continue;

    // Split at the first number: what precedes it is the label.
    const numberStart = line.search(/\d/);
    if (numberStart <= 0) continue;
    const label = line.slice(0, numberStart);
    const values = numbersIn(line.slice(numberStart));
    if (values.length === 0) continue;

    const candidates = matchAliases(label);
    for (const candidate of candidates) {
      if (metrics[candidate.key] !== undefined) continue;
      set(candidate.key, values[0]);
      break;
    }
  }

  return metrics;
}
