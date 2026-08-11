import type { MetricKey, PillarId } from "./pillars";

export type DocumentFigure = { label: string; value: string };

export type DocumentSection = {
  pillarId: PillarId;
  pillarName: string;
  subtitle: string;
  rank: number;
  kind: "hard" | "narrative";
  /** The computed headline number for this pillar. */
  headline: string;
  /** The guide's plain-language formula. Empty when the pillar has no formula box. */
  formulaText: string;
  /** The formula with this account's numbers substituted in. */
  workedFormula: string;
  figures: DocumentFigure[];
  /** Informational bullets on how Abode produces this value, using this account's numbers. */
  businessCase: string[];
  groundedIn: string;
  ifLeadershipShrugs: string;
};

export type RoiDocument = {
  accountName: string | null;
  title: string;
  subtitle: string;
  headline: string;
  opening: string;
  sections: DocumentSection[];
  closing: string;
  /** What to collect next, one line per pillar that did not make the story. */
  gaps: string[];
  /** Research averages the maths leaned on. */
  assumptions: string[];
  metricsUsed: DocumentFigure[];
  /** Pillars the AI could not match, with the reason. */
  setAside: { pillarName: string; reason: string }[];
  engine: "claude" | "deterministic";
  engineNote: string;
  wordCount: number;
  generatedAt: string;
};

export type GenerateRequest = { input: string };

export type GenerateResponse =
  | { ok: true; document: RoiDocument }
  | { ok: false; error: string };

/** Shape returned by the narrative LLM pass. */
export type PillarNarrative = {
  title: string;
  subtitle: string;
  headline: string;
  opening: string;
  sections: { pillarId: PillarId; businessCase: string[] }[];
  closing: string;
};

export type ExtractionResult = {
  accountName: string | null;
  metrics: Partial<Record<MetricKey, number>>;
  /** Pillars the model judged the data supports, strongest evidence first. */
  selectedPillars: PillarId[];
  setAside: { pillarId: PillarId; reason: string }[];
  notes: string[];
};
