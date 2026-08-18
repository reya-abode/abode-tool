import Anthropic from "@anthropic-ai/sdk";
import {
  FIXED_INPUTS,
  METRIC_SPECS,
  PILLARS,
  THROUGH_LINE,
  type MetricKey,
  type PillarId,
} from "./pillars";
import type { ExtractionResult, PillarNarrative } from "./types";

const MODEL = "claude-opus-5";

export function hasCredentials(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);
}

function client(): Anthropic {
  return new Anthropic();
}

const METRIC_KEYS = METRIC_SPECS.map((spec) => spec.key);
const PILLAR_IDS = PILLARS.map((pillar) => pillar.id);

/** Reference block describing the eight pillars, shared by both LLM calls. */
const PILLAR_REFERENCE = PILLARS.map(
  (p) => `${p.rank}. ${p.name.toUpperCase()} (id: ${p.id}): ${p.subtitle} [${p.kind}]
   What it means for ROI: ${p.roiMeaning}
   FORMULA (${p.formulaLabel}): ${p.formulaText || "this pillar has no formula"}
   Required inputs: ${p.required.length ? p.required.join(", ") : "none (supporting scores only)"}
   Optional inputs: ${p.optional.length ? p.optional.join(", ") : "none"}
   Grounded in: ${p.groundedIn}
   If leadership shrugs: ${p.ifLeadershipShrugs}`,
).join("\n\n");

const METRIC_REFERENCE = METRIC_SPECS.map(
  (spec) => `- ${spec.key} (${spec.unit}): ${spec.label}. Recognise as: ${spec.aliases.join("; ")}`,
).join("\n");

const FIXED_REFERENCE = FIXED_INPUTS.map(
  (fixed) =>
    `- ${fixed.label}: ${fixed.display} (${fixed.provenance}${fixed.source ? `, ${fixed.source}` : ""})`,
).join("\n");

const SHARED_CONTEXT = `You are the Value Engine, Abode's ROI analyst. Abode is an early-careers onboarding
and candidate-engagement platform: it runs the post-offer, pre-start journey for intern and
early-career cohorts (communications, tasks, resources, engagement tracking, reneg-risk flagging).

Your job is to translate raw account usage numbers into a renewal-ready ROI story using the
eight ROI pillars below. Pillars are ordered by how much hard evidence the customer interviews
gave us, so the earlier ones are the safest, highest-impact plays.

Consider all eight pillars every time. Every account has multiple pillars where its value is
strongest: you do not use all eight, you pick every one the account has evidence for and build
the story from those.

The through-line on every call: ${THROUGH_LINE}

THE EIGHT PILLARS
${PILLAR_REFERENCE}

METRICS YOU CAN EXTRACT
${METRIC_REFERENCE}

VALUES THE TOOL SUPPLIES, NEVER ASK FOR THESE AND NEVER CHANGE THEM
${FIXED_REFERENCE}

An Estimate is Abode's working assumption. An Abode average comes from platform data over the
stated window. When you refer to one, say which it is.`;

const EXTRACTION_SCHEMA = {
  type: "object",
  properties: {
    accountName: {
      type: ["string", "null"],
      description: "Customer or account name if stated in the input, else null.",
    },
    metrics: {
      type: "object",
      description:
        "Every metric you can read from the input. Percentages as whole numbers (15 for 15%). Money as plain numbers with no symbols or commas. Omit keys you cannot ground in the input, and never guess a value.",
      properties: Object.fromEntries(
        METRIC_KEYS.map((key) => [key, { type: "number" }]),
      ),
      additionalProperties: false,
    },
    selectedPillars: {
      type: "array",
      description:
        "Every pillar this account has evidence for, strongest evidence first. Work through all eight and include each one whose required inputs are present in metrics. IMPRESS needs only a survey score. Do not cap the list at a fixed number.",
      items: { type: "string", enum: PILLAR_IDS },
    },
    setAside: {
      type: "array",
      description:
        "Pillars you could not select, and the specific number that was missing. One entry per unselected pillar.",
      items: {
        type: "object",
        properties: {
          pillarId: { type: "string", enum: PILLAR_IDS },
          reason: {
            type: "string",
            description:
              "One short sentence naming the missing number, phrased as something the user could go and collect.",
          },
        },
        required: ["pillarId", "reason"],
        additionalProperties: false,
      },
    },
    notes: {
      type: "array",
      description:
        "Anything ambiguous about how you read the numbers, such as a unit assumption or a figure you matched by inference. Keep to 3 items or fewer.",
      items: { type: "string" },
    },
  },
  required: ["accountName", "metrics", "selectedPillars", "setAside", "notes"],
  additionalProperties: false,
} as const;

/** Pass 1, reading the raw numbers and deciding which pillars apply. No arithmetic. */
export async function extractAndClassify(input: string): Promise<ExtractionResult> {
  const response = await client().messages.create({
    model: MODEL,
    max_tokens: 8000,
    output_config: {
      effort: "medium",
      format: {
        type: "json_schema",
        schema: EXTRACTION_SCHEMA,
      },
    },
    system: `${SHARED_CONTEXT}

TASK: read the raw input below and return (a) the metrics you can ground in it, and (b) which
pillars apply.

Rules:
- Do NOT do arithmetic. Report only numbers the input states or that follow directly from it
  (e.g. "reneg dropped from 15% to 5%" gives baselineRenegRate 15 and currentRenegRate 5).
  A separate deterministic engine runs every formula.
- Never invent a value to make a pillar eligible. A missing number belongs in setAside.
- Evaluate all eight pillars in order and select every one whose required inputs are present.
  There is no cap: if six pillars have evidence, select six.
- Order by evidence strength, so hard-number pillars (Protect, Connect, Save, Scale, See, Improve)
  come before narrative pillars (Compete, Impress).
- Protect is the universal spine, so select it whenever a real reneg number exists.
- Impress is a supporting narrative under Connect, never a standalone money claim.`,
    messages: [{ role: "user", content: input }],
  });

  const raw = firstJson(response);
  return {
    accountName: (raw.accountName as string | null) ?? null,
    metrics: (raw.metrics ?? {}) as Partial<Record<MetricKey, number>>,
    selectedPillars: (raw.selectedPillars ?? []) as PillarId[],
    setAside: (raw.setAside ?? []) as { pillarId: PillarId; reason: string }[],
    notes: (raw.notes ?? []) as string[],
  };
}

const NARRATIVE_SCHEMA = {
  type: "object",
  properties: {
    title: { type: "string", description: "Document title. Name the account if known." },
    subtitle: {
      type: "string",
      description: "One short line under the title, such as 'Summer 2026 cohort'.",
    },
    sections: {
      type: "array",
      description: "One entry per selected pillar, same order as given.",
      items: {
        type: "object",
        properties: {
          pillarId: { type: "string", enum: PILLAR_IDS },
          businessCase: {
            type: "array",
            description:
              "Exactly three bullets, each a long complete line of 30 to 45 words. Bullet one starts 'How Abode produces this:' and names the Abode features involved, capitalised, such as Journeys, Templates, Tasks, Resources, Reminders, Surveys, Engagement Tracking, Reneg Risk Flags, the Dashboard, Programs, Cohorts and Participants. Bullet two starts 'What the number represents:' and states what the computed figures measure, quoting them exactly as supplied. Bullet three starts 'Where the ROI surfaces:' and explains where the return appears in the business, such as budget, headcount, hires retained or risk carried, and how Abode makes it visible.",
            items: { type: "string" },
          },
        },
        required: ["pillarId", "businessCase"],
        additionalProperties: false,
      },
    },
  },
  required: ["title", "subtitle", "sections"],
  additionalProperties: false,
} as const;

export type NarrativeInputSection = {
  pillarId: PillarId;
  pillarName: string;
  subtitle: string;
  headline: string;
  workedFormula: string;
  figures: { label: string; value: string }[];
  businessCaseTemplate: string[];
  roiMeaning: string;
  groundedIn: string;
};

/** Pass 2, writing the narrative around numbers that have already been computed. */
export async function writeNarrative(args: {
  input: string;
  company: string | null;
  accountName: string | null;
  metrics: Record<string, number>;
  sections: NarrativeInputSection[];
}): Promise<PillarNarrative> {
  const brief = args.sections
    .map(
      (s) => `PILLAR: ${s.pillarName}, ${s.subtitle} (id: ${s.pillarId})
Computed headline: ${s.headline}
Worked formula: ${s.workedFormula || "(this pillar has no formula)"}
Figures: ${s.figures.map((f) => `${f.label} = ${f.value}`).join("; ") || "(none)"}
Business case bullets (already filled in with the real numbers, so improve the wording but keep every figure and the three labels):
${s.businessCaseTemplate.map((b) => `  - ${b}`).join("\n")}
What this pillar means for ROI: ${s.roiMeaning}
Interview evidence: ${s.groundedIn}`,
    )
    .join("\n\n");

  // 300 words total across opening, every section, and the closing.

  const response = await client().messages.create({
    model: MODEL,
    max_tokens: 8000,
    output_config: {
      effort: "medium",
      format: {
        type: "json_schema",
        schema: NARRATIVE_SCHEMA,
      },
    },
    system: `${SHARED_CONTEXT}

TASK: write the words for a one-page ROI document. The numbers are already computed, so your job
is explanation and context, never arithmetic.

Hard rules:
- Every number you write must appear exactly as supplied in the computed figures. Do not
  recompute, re-round, extrapolate, or introduce a number that is not there.
- Word budget: each of the ${args.sections.length} pillar sections is three bullets of 30 to 45 words each.
- Capitalise Abode feature names (Journey, Template, Task, Resource Hub, Reminder, Survey,
  Engagement Tracking, Reneg Risk Flag, Dashboard, Program, Cohort, Participant) so readers can
  tell the product apart from ordinary nouns.
- Readers are Abode customer success managers and Abode customers, so assume familiarity with the
  product and explain the ROI rather than the basics.
- Refer to the company by the name given at the top of the user message, at least once in each
  pillar's bullets. If no name is given, say "this program" instead.
- Never restate or recompute the supplied Estimates and Abode averages. Quote them as given and
  name which kind they are when you mention one.
- The register is informational, not persuasive. You are explaining how the product works and
  where the return comes from, the way a reference document would. Do not sell, do not congratulate
  the reader, and do not use second-person pitch phrasing such as "you get" or "this means you can".
- State mechanisms and consequences as facts. Explain what Abode does, what the measurement shows,
  and where the value appears in the business. Never state a figure without explaining what it measures.
- Never claim a result the data does not support and never soften a gap. If a pillar is estimated
  rather than measured, say so plainly in that section.
- Plain language only. No jargon, no internal shorthand, no marketing adjectives such as
  "game-changing", "seamless" or "powerful", no emoji, no exclamation marks.
- Never use em dashes. Use commas, colons, or separate sentences instead.`,
    messages: [
      {
        role: "user",
        content: `COMPANY: ${args.company ?? args.accountName ?? "(not named)"}

WHAT THE USER PASTED IN:
${args.input}

NUMBERS ON FILE: ${Object.entries(args.metrics)
          .map(([k, v]) => `${k}=${v}`)
          .join(", ") || "(none)"}

MATCHED PILLARS AND COMPUTED NUMBERS:
${brief}`,
      },
    ],
  });

  return firstJson(response) as PillarNarrative;
}

function firstJson(response: Anthropic.Message): Record<string, unknown> {
  for (const block of response.content) {
    if (block.type === "text") {
      try {
        return JSON.parse(block.text) as Record<string, unknown>;
      } catch {
        const match = block.text.match(/\{[\s\S]*\}/);
        if (match) return JSON.parse(match[0]) as Record<string, unknown>;
      }
    }
  }
  throw new Error("Claude returned no parseable JSON payload.");
}
