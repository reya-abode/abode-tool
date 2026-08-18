import {
  FIXED_BY_KEY,
  HOURS_PER_FTE_YEAR,
  METRIC_BY_KEY,
  METRIC_SPECS,
  PILLAR_BY_ID,
  type FixedKey,
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
  /** What the company carries without Abode. */
  costOfInaction: string[];
  /** Metrics the pillar needed but did not get. Empty = fully computable. */
  missing: MetricKey[];
  /** Fixed values this calculation leaned on, so provenance can be shown. */
  fixedUsed: FixedKey[];
  /** Raw numeric value where one exists, for sorting / totals. */
  raw?: number;
  /** Slider configuration, present only on Scale. */
  scaleControl?: ScaleControl;
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

function fill(template: string, values: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_match, token: string) => values[token] ?? "[ ]");
}

function fillAll(templates: string[], values: Record<string, string>): string[] {
  return templates.map((template) => fill(template, values));
}

/** How the company is referred to inside the generated copy. */
export function companyLabel(company: string | null | undefined): string {
  const trimmed = (company ?? "").trim();
  return trimmed || "this program";
}

/** Company NPS against the industry benchmark, falling back to the Abode average. */
function npsComparison(metrics: Metrics, fixedUsed: FixedKey[]) {
  const supplied = metrics.companyNpsScore;
  const nps = supplied !== undefined ? supplied : FIXED_BY_KEY.internNpsAverage.value;
  if (supplied === undefined) fixedUsed.push("internNpsAverage");
  const industry = FIXED_BY_KEY.industryNpsAverage.value;
  fixedUsed.push("industryNpsAverage");
  return {
    nps,
    industry,
    supplied: supplied !== undefined,
    delta: nps - industry,
    multiple: nps / industry,
  };
}

export type ScaleControl = {
  programSize: number;
  admins: number;
  adminCost: number;
  target: number;
  min: number;
  max: number;
  step: number;
};

/** Slider bounds for the Scale target, defaulting to twice the current program. */
export function scaleControlFor(programSize: number, admins: number): ScaleControl {
  return {
    programSize,
    admins,
    adminCost: FIXED_BY_KEY.adminAnnualCost.value,
    target: programSize * 2,
    min: programSize,
    max: Math.max(programSize * 5, programSize + 50),
    step: Math.max(1, Math.round(programSize / 20)),
  };
}

/**
 * Scale is recomputed in the browser as the target slider moves, so the maths and the
 * wording both live here rather than only running once on the server.
 */
export function scaleResult(args: {
  programSize: number;
  admins: number;
  target: number;
  company?: string | null;
}) {
  const pillar = PILLAR_BY_ID.scale;
  const org = companyLabel(args.company);
  const adminCost = FIXED_BY_KEY.adminAnnualCost.value;
  const extraParticipants = Math.max(0, args.target - args.programSize);
  // Admins are rounded before pricing, so the figures on screen reconcile with the total.
  const extraAdmins =
    Math.round(((extraParticipants * args.admins) / args.programSize) * 10) / 10;
  const value = extraAdmins * adminCost;

  const tokens = {
    company: org,
    cohort: num(args.programSize),
    target: num(args.target),
    admins: num(args.admins),
    adminPlural: args.admins === 1 ? "" : "s",
    extraAdmins: num(extraAdmins, 1),
    extraAdminPlural: extraAdmins === 1 ? "" : "s",
    adminCost: usd(adminCost),
    value: usd(value),
  };

  return {
    value,
    extraAdmins,
    headline: usd(value),
    workedFormula: `( ( ${num(args.target)} − ${num(args.programSize)} ) × ${num(args.admins)} ÷ ${num(args.programSize)} ) × ${usd(adminCost)} = ${usd(value)}`,
    figures: [
      { label: "Program size today", value: `${num(args.programSize)} Participants` },
      { label: "Target program size", value: `${num(args.target)} Participants` },
      { label: "Extra admins needed the old way", value: num(extraAdmins, 1) },
      { label: "Admin cost avoided", value: usd(value) },
    ] as ComputedFigure[],
    businessCase: fillAll(pillar.businessCase, tokens),
    costOfInaction: fillAll(pillar.costOfInaction, tokens),
  };
}

/** Re-runs Scale for a new slider target and returns an updated copy of the document. */
export function applyScaleTarget<
  T extends {
    sections: {
      pillarId: PillarId;
      headline: string;
      workedFormula: string;
      figures: ComputedFigure[];
      businessCase: string[];
      costOfInaction: string[];
      scaleControl?: ScaleControl;
    }[];
  },
>(document: T, target: number, company?: string | null): T {
  return {
    ...document,
    sections: document.sections.map((section) => {
      if (section.pillarId !== "scale" || !section.scaleControl) return section;
      const result = scaleResult({
        programSize: section.scaleControl.programSize,
        admins: section.scaleControl.admins,
        target,
        company,
      });
      return {
        ...section,
        headline: result.headline,
        workedFormula: result.workedFormula,
        figures: result.figures,
        businessCase: result.businessCase,
        costOfInaction: result.costOfInaction,
        scaleControl: { ...section.scaleControl, target },
      };
    }),
  };
}

export function computePillar(
  pillarId: PillarId,
  metrics: Metrics,
  company?: string | null,
): PillarResult {
  const pillar = PILLAR_BY_ID[pillarId];
  const fixedUsed: FixedKey[] = [];
  const missing = pillar.required.filter(
    (key) => metrics[key] === undefined || !Number.isFinite(metrics[key] as number),
  );
  const org = companyLabel(company);

  const base: PillarResult = {
    pillarId,
    headline: "Need more numbers",
    figures: [],
    workedFormula: pillar.formulaText,
    businessCase: pillar.businessCase.map((line) =>
      fill(line, { company: org }).replace(/\{[^}]+\}/g, "[ ]"),
    ),
    costOfInaction: pillar.costOfInaction.map((line) =>
      fill(line, { company: org }).replace(/\{[^}]+\}/g, "[ ]"),
    ),
    missing,
    fixedUsed,
  };

  if (missing.length > 0) return base;

  switch (pillarId) {
    case "protect": {
      const baseline = asPercent(metrics.baselineRenegRate!);
      const current = asPercent(metrics.currentRenegRate!);
      const cohort = metrics.cohortSize!;
      const cost = FIXED_BY_KEY.costPerHire.value;
      fixedUsed.push("costPerHire");
      const renegsAvoided = ((baseline - current) / 100) * cohort;
      const dollars = renegsAvoided * cost;
      const tokens = {
        company: org,
        baseline: String(baseline),
        current: String(current),
        cohort: num(cohort),
        cost: usd(cost),
        dollars: usd(dollars),
        renegsAvoided: num(renegsAvoided, 1),
      };
      return {
        ...base,
        headline: usd(dollars),
        raw: dollars,
        workedFormula: `( ${pct(baseline)} − ${pct(current)} ) × ${num(cohort)} × ${usd(cost)} = ${usd(dollars)}`,
        figures: [
          { label: "Reneg rate", value: `${pct(baseline)} down to ${pct(current)}` },
          { label: "Renegs avoided", value: `${num(renegsAvoided, 1)} hires` },
          { label: "Hiring cost avoided", value: usd(dollars) },
        ],
        businessCase: fillAll(pillar.businessCase, tokens),
        costOfInaction: fillAll(pillar.costOfInaction, tokens),
        fixedUsed,
      };
    }

    case "connect": {
      const c = npsComparison(metrics, fixedUsed);
      const tokens = {
        company: org,
        abodeNps: num(c.nps, 1),
        industryNps: num(c.industry),
        delta: num(c.delta, 1),
        multiple: num(c.multiple, 1),
      };
      return {
        ...base,
        headline: `NPS ${num(c.nps, 1)} vs ${num(c.industry)}`,
        raw: c.nps,
        workedFormula: `${num(c.nps, 1)} Company NPS vs ${num(c.industry)} typical industry average = ${num(c.delta, 1)} points higher`,
        figures: [
          {
            label: c.supplied ? "Company NPS" : "Company NPS, Abode average shown",
            value: num(c.nps, 1),
          },
          { label: "Intern NPS, typical industry", value: num(c.industry) },
          {
            label: "Difference",
            value: `${num(c.delta, 1)} points higher, ${num(c.multiple, 1)}× the industry benchmark`,
          },
        ],
        businessCase: fillAll(pillar.businessCase, tokens),
        costOfInaction: fillAll(pillar.costOfInaction, tokens),
        fixedUsed,
      };
    }

    case "save": {
      const cohort = metrics.cohortSize!;
      const questions = FIXED_BY_KEY.questionsPerIntern.value;
      const minsPerQuestion = FIXED_BY_KEY.minutesPerQuestion.value;
      const messages = FIXED_BY_KEY.messagesPerJourney.value;
      const minsPerMessage = FIXED_BY_KEY.minutesPerMessage.value;
      fixedUsed.push(
        "questionsPerIntern",
        "minutesPerQuestion",
        "messagesPerJourney",
        "minutesPerMessage",
      );

      // Each term is rounded to whole hours first, so the figures on screen add up to the total.
      const questionHours = Math.round((cohort * questions * minsPerQuestion) / 60);
      const messageHours = Math.round((cohort * messages * minsPerMessage) / 60);
      const hours = questionHours + messageHours;
      // The FTE share is rounded before pricing, so FTE x annual cost matches the dollar shown.
      const fte = Math.round((hours / HOURS_PER_FTE_YEAR) * 100) / 100;
      const fteLabel = `${num(fte, 2)} FTE`;
      const fteCost = FIXED_BY_KEY.fteAnnualCost.value;
      fixedUsed.push("fteAnnualCost");
      const dollars = fte * fteCost;

      const figures: ComputedFigure[] = [
        { label: "Questions answered for you", value: `${num(questionHours, 0)} hours` },
        { label: "Message work absorbed", value: `${num(messageHours, 0)} hours` },
        { label: "Capacity freed per cycle", value: `${num(hours, 0)} hours (${fteLabel})` },
        { label: "Capacity freed in dollars", value: usd(dollars) },
      ];
      if (metrics.loadedHourlyCost !== undefined) {
        figures.push({
          label: "That capacity in dollars",
          value: usd(hours * metrics.loadedHourlyCost),
        });
      }

      const tokens = {
        company: org,
        hours: num(hours, 0),
        fte: fteLabel,
        cohort: num(cohort),
        dollars: usd(dollars),
        fteCost: usd(fteCost),
      };
      return {
        ...base,
        headline: usd(dollars),
        raw: dollars,
        workedFormula: `${num(cohort)} × ${questions} × ${minsPerQuestion} min ÷ 60 + ${num(cohort)} × ${messages} × ${minsPerMessage} min ÷ 60 = ${num(hours, 0)} hours\n${num(hours, 0)} ÷ ${num(HOURS_PER_FTE_YEAR)} = ${fteLabel} × ${usd(fteCost)} = ${usd(dollars)}`,
        figures,
        businessCase: fillAll(pillar.businessCase, tokens),
        costOfInaction: fillAll(pillar.costOfInaction, tokens),
        fixedUsed,
      };
    }

    case "scale": {
      const cohort = metrics.cohortSize!;
      const admins = metrics.adminHeadcount!;
      fixedUsed.push("adminAnnualCost");
      const control = scaleControlFor(cohort, admins);
      const result = scaleResult({
        programSize: cohort,
        admins,
        target: control.target,
        company,
      });
      return {
        ...base,
        headline: result.headline,
        raw: result.value,
        workedFormula: result.workedFormula,
        figures: result.figures,
        businessCase: result.businessCase,
        costOfInaction: result.costOfInaction,
        scaleControl: control,
        fixedUsed,
      };
    }

    case "see": {
      const flagged = metrics.lowEngagementFlagged!;
      const followUp = FIXED_BY_KEY.followUpRate.value;
      fixedUsed.push("followUpRate");
      const interventions = (flagged * followUp) / 100;
      const tokens = {
        company: org,
        flagged: num(flagged),
        interventions: num(interventions, 1),
        coverage: `${num(flagged)} low and moderately engaged Participants surfaced this cycle and routed to a follow-up`,
      };
      return {
        ...base,
        headline: `${num(interventions, 1)} interventions`,
        raw: interventions,
        workedFormula: `${num(flagged)} flagged × ${pct(followUp)} followed up = ${num(interventions, 1)} early interventions`,
        figures: [
          { label: "Low and moderately engaged interns flagged", value: `${num(flagged)} this cycle` },
          { label: "Followed up on", value: pct(followUp) },
          { label: "Early interventions", value: num(interventions, 1) },
        ],
        businessCase: fillAll(pillar.businessCase, tokens),
        costOfInaction: fillAll(pillar.costOfInaction, tokens),
        fixedUsed,
      };
    }

    case "improve": {
      const cohort = metrics.cohortSize!;
      const rate = asPercent(metrics.fteConversionRatePct!);
      const externalCost = FIXED_BY_KEY.costPerHire.value;
      const internCost = FIXED_BY_KEY.costPerInternConversion.value;
      fixedUsed.push("costPerHire", "costPerInternConversion");

      // Roles are rounded before pricing, so roles x saving matches the dollar shown.
      const roles = Math.round(((cohort * rate) / 100) * 10) / 10;
      const savingPerRole = externalCost - internCost;
      const value = roles * savingPerRole;

      const figures: ComputedFigure[] = [
        { label: "Employee to FTE conversion rate", value: pct(rate) },
        { label: "Roles filled from the intern pool", value: num(roles, 1) },
        { label: "Saving per role", value: `${usd(externalCost)} − ${usd(internCost)} = ${usd(savingPerRole)}` },
        { label: "Value of roles filled", value: usd(value) },
      ];
      if (metrics.daysFasterRamp !== undefined) {
        figures.push({
          label: "Ready to contribute",
          value: `${num(metrics.daysFasterRamp)} days sooner`,
        });
      }
      const rampClause =
        metrics.daysFasterRamp !== undefined
          ? `, and those who engaged reached full contribution ${num(metrics.daysFasterRamp)} days sooner`
          : "";

      const tokens = {
        company: org,
        cohort: num(cohort),
        rate: num(rate, 1),
        roles: num(roles, 1),
        value: usd(value),
        externalCost: usd(externalCost),
        internCost: usd(internCost),
        saving: usd(savingPerRole),
        rampClause,
      };
      return {
        ...base,
        headline: usd(value),
        raw: value,
        workedFormula: `${num(cohort)} × ${pct(rate)} = ${num(roles, 1)} roles\n${num(roles, 1)} × ( ${usd(externalCost)} − ${usd(internCost)} ) = ${usd(value)}`,
        figures,
        businessCase: fillAll(pillar.businessCase, tokens),
        costOfInaction: fillAll(pillar.costOfInaction, tokens),
        fixedUsed,
      };
    }

    case "compete": {
      // Pillar 7 shows no formula and no figures, only the value and cost bullets.
      const months = metrics.monthsOfferToStart!;
      const cohort = metrics.cohortSize!;
      const tokens = { company: org, months: num(months), cohort: num(cohort) };
      return {
        ...base,
        headline: `${num(months)} month gap`,
        raw: months,
        workedFormula: "",
        figures: [],
        businessCase: fillAll(pillar.businessCase, tokens),
        costOfInaction: fillAll(pillar.costOfInaction, tokens),
      };
    }

    case "impress": {
      // Pillar 8 always uses Abode's own NPS, never the company's figure.
      const abodeNps = FIXED_BY_KEY.internNpsAverage.value;
      const industryNps = FIXED_BY_KEY.industryNpsAverage.value;
      fixedUsed.push("internNpsAverage", "industryNpsAverage");
      const delta = abodeNps - industryNps;
      const multiple = abodeNps / industryNps;
      const tokens = {
        company: org,
        abodeNps: num(abodeNps),
        industryNps: num(industryNps),
        delta: num(delta),
        multiple: num(multiple, 1),
      };
      return {
        ...base,
        headline: `NPS ${num(abodeNps)} vs ${num(industryNps)}`,
        raw: abodeNps,
        workedFormula: `${num(abodeNps)} Abode NPS vs ${num(industryNps)} typical industry average = ${num(delta)} points higher`,
        figures: [
          { label: "Abode NPS", value: num(abodeNps) },
          { label: "Intern NPS, typical industry", value: num(industryNps) },
        ],
        businessCase: fillAll(pillar.businessCase, tokens),
        costOfInaction: fillAll(pillar.costOfInaction, tokens),
        fixedUsed,
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
      // Connect and Impress carry no account inputs, so they always appear.
      if (id === "connect" || id === "impress") return true;
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
    set("baselineRenegRate", Math.max(first, second));
    set("currentRenegRate", Math.min(first, second));
  }

  const scalePair = /(?:grew|scaled|up) from (\d[\d,]*)[^\n]*?to (\d[\d,]*)/.exec(text);
  if (scalePair) {
    set("priorProgramSize", readNumber(scalePair[1]));
    set("cohortSize", readNumber(scalePair[2]));
  }

  for (const rawLine of input.split(/[\n;]+/)) {
    const line = normalise(rawLine);
    if (!line.trim()) continue;

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

export { METRIC_BY_KEY };
