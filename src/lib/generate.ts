import { computePillar, eligiblePillars, parseMetricsHeuristically } from "./compute";
import {
  extractAndClassify,
  hasCredentials,
  writeNarrative,
  type NarrativeInputSection,
} from "./llm";
import {
  METRIC_BY_KEY,
  PILLAR_BY_ID,
  PILLARS,
  type MetricKey,
  type Metrics,
  type PillarId,
} from "./pillars";
import type { DocumentSection, RoiDocument } from "./types";

export function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function formatMetricValue(key: MetricKey, value: number): string {
  const spec = METRIC_BY_KEY[key];
  switch (spec.unit) {
    case "usd":
      return `$${Math.round(value).toLocaleString("en-US")}`;
    case "percent":
      return `${value <= 1 && value > 0 ? value * 100 : value}%`;
    case "minutes":
      return `${value} min`;
    case "hours":
      return `${value} hrs`;
    case "days":
      return `${value} days`;
    case "months":
      return `${value} months`;
    default:
      return value.toLocaleString("en-US");
  }
}

/**
 * All eight pillars are always considered. Every pillar whose formula can actually run on
 * these numbers goes into the story, ordered by the guide's evidence strength. The AI's
 * picks are honoured, but they can neither add a pillar the maths cannot support nor drop
 * one the account clearly has evidence for.
 */
function matchPillars(selected: PillarId[], metrics: Metrics): PillarId[] {
  const computable = eligiblePillars(metrics);
  const chosen = new Set<PillarId>(computable);
  for (const id of selected) {
    if (computable.includes(id)) chosen.add(id);
  }
  return [...chosen].sort((a, b) => PILLAR_BY_ID[a].rank - PILLAR_BY_ID[b].rank);
}

function buildSection(pillarId: PillarId, metrics: Metrics): DocumentSection {
  const pillar = PILLAR_BY_ID[pillarId];
  const result = computePillar(pillarId, metrics);
  return {
    pillarId,
    pillarName: pillar.name,
    subtitle: pillar.subtitle,
    rank: pillar.rank,
    kind: pillar.kind,
    headline: result.headline,
    formulaText: pillar.formulaText,
    workedFormula: result.workedFormula,
    figures: result.figures,
    businessCase: result.businessCase,
  };
}

/** What to collect next, for every pillar that did not make the story. */
function buildGaps(pillarIds: PillarId[], metrics: Metrics): string[] {
  return PILLARS.filter((pillar) => !pillarIds.includes(pillar.id)).map((pillar) => {
    const missing = computePillar(pillar.id, metrics).missing.map(
      (key) => METRIC_BY_KEY[key].label.toLowerCase(),
    );
    if (missing.length) {
      return `${pillar.name}: add ${missing.join(", ")}.`;
    }
    return `${pillar.name}: add a survey score such as intern NPS or onboarding CSAT.`;
  });
}

function assemble(args: {
  accountName: string | null;
  title: string;
  subtitle: string;
  headline: string;
  opening: string;
  sections: DocumentSection[];
  gaps: string[];
  metrics: Metrics;
  setAside: { pillarName: string; reason: string }[];
  engine: "claude" | "deterministic";
  engineNote: string;
}): RoiDocument {
  const assumptions = Array.from(
    new Set(
      args.sections.flatMap((section) =>
        computePillar(section.pillarId, args.metrics).assumptions,
      ),
    ),
  );

  const prose = [args.opening, ...args.sections.flatMap((s) => s.businessCase)].join(" ");

  return {
    accountName: args.accountName,
    title: args.title,
    subtitle: args.subtitle,
    headline: args.headline,
    opening: args.opening,
    sections: args.sections,
    gaps: args.gaps,
    assumptions,
    metricsUsed: (Object.keys(args.metrics) as MetricKey[])
      .filter((key) => args.metrics[key] !== undefined)
      .sort((a, b) => METRIC_BY_KEY[a].label.localeCompare(METRIC_BY_KEY[b].label))
      .map((key) => ({
        label: METRIC_BY_KEY[key].label,
        value: formatMetricValue(key, args.metrics[key] as number),
      })),
    setAside: args.setAside,
    engine: args.engine,
    engineNote: args.engineNote,
    wordCount: countWords(prose),
    generatedAt: new Date().toISOString(),
  };
}

function plainDocument(args: {
  metrics: Metrics;
  pillarIds: PillarId[];
  engineNote: string;
  accountName?: string | null;
}): RoiDocument {
  const sections = args.pillarIds.map((id) => buildSection(id, args.metrics));
  const lead = sections[0];

  const opening = sections.length
    ? `This program's value shows up strongest in ${listNames(sections.map((s) => s.pillarName))}. Every number below runs through the formula for its pillar, using only the numbers provided, and each pillar sets out how Abode produces the result and where the ROI surfaces.`
    : `We could not build a number from these inputs yet. Cohort size, your reneg rate before and after Abode, and the cost of one reneged hire will get you Protect, which is the pillar every account tracks.`;

  return assemble({
    accountName: args.accountName ?? null,
    title: args.accountName ? `${args.accountName} ROI story` : "Your ROI story",
    subtitle: "Built from your program numbers",
    headline: lead
      ? `${lead.pillarName}: ${lead.headline}.`
      : "Add a few numbers to build your first pillar.",
    opening,
    sections,
    gaps: buildGaps(args.pillarIds, args.metrics),
    metrics: args.metrics,
    setAside: [],
    engine: "deterministic",
    engineNote: args.engineNote,
  });
}

function listNames(names: string[]): string {
  if (names.length <= 1) return names[0] ?? "";
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

/** Nothing is shown when the local engine writes the story. */
const AI_OFF_NOTE = "";

export async function generateDocument(input: string): Promise<RoiDocument> {
  if (!hasCredentials()) {
    const metrics = parseMetricsHeuristically(input);
    return plainDocument({
      metrics,
      pillarIds: eligiblePillars(metrics),
      engineNote: AI_OFF_NOTE,
    });
  }

  let extraction;
  try {
    extraction = await extractAndClassify(input);
  } catch {
    const metrics = parseMetricsHeuristically(input);
    return plainDocument({
      metrics,
      pillarIds: eligiblePillars(metrics),
      engineNote: AI_OFF_NOTE,
    });
  }

  const metrics = extraction.metrics as Metrics;
  const pillarIds = matchPillars(extraction.selectedPillars, metrics);
  const sections = pillarIds.map((id) => buildSection(id, metrics));

  if (sections.length === 0) {
    return plainDocument({
      metrics,
      pillarIds: [],
      accountName: extraction.accountName,
      engineNote:
        "We read your notes but could not complete a formula yet. Add one hard number to get started.",
    });
  }

  const setAside = extraction.setAside
    .filter((entry) => PILLAR_BY_ID[entry.pillarId] && !pillarIds.includes(entry.pillarId))
    .map((entry) => ({ pillarName: PILLAR_BY_ID[entry.pillarId].name, reason: entry.reason }));

  const narrativeSections: NarrativeInputSection[] = sections.map((section) => ({
    pillarId: section.pillarId,
    pillarName: section.pillarName,
    subtitle: section.subtitle,
    headline: section.headline,
    workedFormula: section.workedFormula,
    figures: section.figures,
    businessCaseTemplate: section.businessCase,
    roiMeaning: PILLAR_BY_ID[section.pillarId].roiMeaning,
    groundedIn: PILLAR_BY_ID[section.pillarId].groundedIn,
  }));

  try {
    const narrative = await writeNarrative({
      input,
      accountName: extraction.accountName,
      metrics: metrics as Record<string, number>,
      sections: narrativeSections,
    });

    const byId = new Map(narrative.sections.map((s) => [s.pillarId, s]));
    const written = sections.map((section) => {
      const match = byId.get(section.pillarId);
      return match?.businessCase?.length
        ? { ...section, businessCase: match.businessCase }
        : section;
    });

    return assemble({
      accountName: extraction.accountName,
      title: narrative.title,
      subtitle: narrative.subtitle,
      headline: narrative.headline,
      opening: narrative.opening,
      sections: written,
      gaps: buildGaps(pillarIds, metrics),
      metrics,
      setAside,
      engine: "claude",
      engineNote: "",
    });
  } catch {
    return plainDocument({
      metrics,
      pillarIds,
      accountName: extraction.accountName,
      engineNote: AI_OFF_NOTE,
    });
  }
}
