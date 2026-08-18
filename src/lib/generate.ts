import {
  computePillar,
  eligiblePillars,
  parseMetricsHeuristically,
} from "./compute";
import {
  extractAndClassify,
  hasCredentials,
  writeNarrative,
  type NarrativeInputSection,
} from "./llm";
import {
  FIXED_BY_KEY,
  METRIC_BY_KEY,
  PILLAR_BY_ID,
  PILLARS,
  type FixedKey,
  type MetricKey,
  type Metrics,
  type PillarId,
} from "./pillars";
import type { DocumentSection, RoiDocument, SuppliedValue } from "./types";

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

function buildSection(
  pillarId: PillarId,
  metrics: Metrics,
  company: string | null,
): DocumentSection {
  const pillar = PILLAR_BY_ID[pillarId];
  const result = computePillar(pillarId, metrics, company);
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
    costOfInaction: result.costOfInaction,
    ...(result.scaleControl ? { scaleControl: result.scaleControl } : {}),
    ...(result.dollarValue !== undefined ? { dollarValue: result.dollarValue } : {}),
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
  company: string | null;
  title: string;
  subtitle: string;
  sections: DocumentSection[];
  gaps: string[];
  contractValue: number | null;
  metrics: Metrics;
  setAside: { pillarName: string; reason: string }[];
  engine: "claude" | "deterministic";
  engineNote: string;
}): RoiDocument {
  const usedKeys = new Set<FixedKey>(
    args.sections.flatMap(
      (section) => computePillar(section.pillarId, args.metrics, args.company).fixedUsed,
    ),
  );
  const suppliedValues: SuppliedValue[] = [...usedKeys].map((key) => {
    const fixed = FIXED_BY_KEY[key];
    return {
      label: fixed.label,
      value: fixed.display,
      provenance: fixed.provenance,
      source: fixed.source,
    };
  });

  const prose = args.sections.flatMap((s) => s.businessCase).join(" ");

  return {
    accountName: args.accountName,
    company: args.company,
    title: args.title,
    subtitle: args.subtitle,
    sections: args.sections,
    contractValue: args.contractValue,
    gaps: args.gaps,
    suppliedValues,
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
  company: string | null;
  contractValue: number | null;
  accountName?: string | null;
}): RoiDocument {
  const sections = args.pillarIds.map((id) => buildSection(id, args.metrics, args.company));
  const named = (args.company ?? "").trim();

  return assemble({
    accountName: args.accountName ?? named ?? null,
    company: args.company,
    title: named ? `${named} ROI story` : "Your ROI story",
    subtitle: "Built from your program numbers",
    sections,
    gaps: buildGaps(args.pillarIds, args.metrics),
    contractValue: args.contractValue,
    metrics: args.metrics,
    setAside: [],
    engine: "deterministic",
    engineNote: args.engineNote,
  });
}

/** Nothing is shown when the local engine writes the story. */
const AI_OFF_NOTE = "";

export async function generateDocument(
  input: string,
  companyInput?: string,
  contractInput?: number,
): Promise<RoiDocument> {
  const company = (companyInput ?? "").trim() || null;
  const contractValue =
    contractInput !== undefined && Number.isFinite(contractInput) && contractInput > 0
      ? contractInput
      : null;
  if (!hasCredentials()) {
    const metrics = parseMetricsHeuristically(input);
    return plainDocument({
      metrics,
      pillarIds: eligiblePillars(metrics),
      engineNote: AI_OFF_NOTE,
      company,
      contractValue,
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
      company,
      contractValue,
    });
  }

  const metrics = extraction.metrics as Metrics;
  const pillarIds = matchPillars(extraction.selectedPillars, metrics);
  const sections = pillarIds.map((id) => buildSection(id, metrics, company));

  if (sections.length === 0) {
    return plainDocument({
      metrics,
      pillarIds: [],
      company,
      contractValue,
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
      company,
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
      company,
      title: narrative.title,
      subtitle: narrative.subtitle,
      sections: written,
      gaps: buildGaps(pillarIds, metrics),
      contractValue,
      metrics,
      setAside,
      engine: "claude",
      engineNote: "",
    });
  } catch {
    return plainDocument({
      metrics,
      pillarIds,
      company,
      contractValue,
      accountName: extraction.accountName,
      engineNote: AI_OFF_NOTE,
    });
  }
}
