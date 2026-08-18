/**
 * The Value Engine ROI Pillars, from "ROI Pillar Guide" (Reya Yeddula, Summer 2026).
 *
 * Pillars are ordered by how much hard evidence the customer interviews gave us, so the
 * earlier ones are the safest, highest-impact plays. Every account has multiple pillars
 * where its value is strongest: you pick every one the account has evidence for.
 *
 * Each pillar carries:
 *   roiMeaning                 = what it means and what data to pull
 *   formulaText                = the formula that produces the number
 *   businessCase               = bullets on how Abode produces the result and surfaces the ROI
 *   costOfInaction             = what the company carries without the platform
 */

/** Where a fixed number came from. Shown next to every value the tool supplies. */
export type Provenance = "Estimate" | "Abode average" | "Industry average";

export type FixedInput = {
  key: FixedKey;
  label: string;
  value: number;
  display: string;
  provenance: Provenance;
  /** Sample or window behind an Abode average. Empty for estimates. */
  source: string;
};

export type FixedKey =
  | "questionsPerIntern"
  | "minutesPerQuestion"
  | "minutesPerMessage"
  | "messagesPerJourney"
  | "internNpsAverage"
  | "industryNpsAverage"
  | "costPerHire"
  | "costPerInternConversion"
  | "benchmarkConversionRate"
  | "fteAnnualCost"
  | "adminAnnualCost"
  | "followUpRate";

/**
 * Values the tool supplies rather than asking for. Estimates are Abode's working
 * assumptions; Abode averages come from platform data across the stated window.
 */
export const FIXED_INPUTS: FixedInput[] = [
  {
    key: "questionsPerIntern",
    label: "Questions per intern",
    value: 5,
    display: "5",
    provenance: "Estimate",
    source: "",
  },
  {
    key: "minutesPerQuestion",
    label: "Minutes per question",
    value: 15,
    display: "15 min",
    provenance: "Estimate",
    source: "",
  },
  {
    key: "minutesPerMessage",
    label: "Minutes per message",
    value: 1,
    display: "1 min",
    provenance: "Estimate",
    source: "",
  },
  {
    key: "messagesPerJourney",
    label: "Messages per journey",
    value: 8.4,
    display: "8.4",
    provenance: "Abode average",
    source: "180 days",
  },
  {
    key: "internNpsAverage",
    label: "Abode NPS",
    value: 64,
    display: "64",
    provenance: "Abode average",
    source: "2,216 responses, 12 months",
  },
  {
    key: "industryNpsAverage",
    label: "Typical intern NPS",
    value: 32,
    display: "32",
    provenance: "Industry average",
    source: "early-careers benchmark",
  },
  {
    key: "costPerHire",
    label: "Cost per external entry-level hire",
    value: 4700,
    display: "$4,700",
    provenance: "Industry average",
    source: "NACE",
  },
  {
    key: "costPerInternConversion",
    label: "Cost per intern conversion",
    value: 1500,
    display: "$1,500",
    provenance: "Industry average",
    source: "NACE",
  },
  {
    key: "benchmarkConversionRate",
    label: "Benchmark intern to FTE conversion rate",
    value: 63.1,
    display: "63.1%",
    provenance: "Industry average",
    source: "NACE",
  },
  {
    key: "fteAnnualCost",
    label: "Fully loaded cost of one FTE",
    value: 80000,
    display: "$80,000",
    provenance: "Estimate",
    source: "",
  },
  {
    key: "adminAnnualCost",
    label: "Cost per program admin",
    value: 80000,
    display: "$80,000",
    provenance: "Industry average",
    source: "NACE",
  },
  {
    key: "followUpRate",
    label: "Flagged interns followed up",
    value: 100,
    display: "100%",
    provenance: "Estimate",
    source: "",
  },
];

export const FIXED_BY_KEY: Record<FixedKey, FixedInput> = Object.fromEntries(
  FIXED_INPUTS.map((input) => [input.key, input]),
) as Record<FixedKey, FixedInput>;

/** One working year of capacity, used to express hours as a share of a full-time role. */
export const HOURS_PER_FTE_YEAR = 2080;

export type MetricKey =
  | "cohortSize"
  | "companyNpsScore"
  | "baselineRenegRate"
  | "currentRenegRate"
  | "adminHeadcount"
  | "priorProgramSize"
  | "priorAdminHeadcount"
  | "lowEngagementFlagged"
  | "fteConversionRatePct"
  | "daysFasterRamp"
  | "monthsOfferToStart"
  | "loadedHourlyCost";

export type Metrics = Partial<Record<MetricKey, number>>;

export type MetricSpec = {
  key: MetricKey;
  label: string;
  unit: "count" | "percent" | "usd" | "days" | "months" | "score";
  /** Aliases the parser and the AI use to recognise this number in what you paste. */
  aliases: string[];
};

export const METRIC_SPECS: MetricSpec[] = [
  { key: "cohortSize", label: "Program size", unit: "count", aliases: ["cohort size", "cohort", "interns", "intern count", "candidates", "program size", "class size"] },
  { key: "companyNpsScore", label: "Company NPS", unit: "score", aliases: ["company nps", "program nps", "platform nps", "nps", "net promoter", "nps score", "intern nps"] },
  { key: "baselineRenegRate", label: "Reneg rate before Abode", unit: "percent", aliases: ["baseline reneg rate", "reneg rate before", "previous reneg rate", "historical reneg", "reneg baseline"] },
  { key: "currentRenegRate", label: "Reneg rate now", unit: "percent", aliases: ["current reneg rate", "reneg rate now", "reneg rate", "renege rate", "reneg"] },
  { key: "adminHeadcount", label: "People running the program", unit: "count", aliases: ["admin headcount", "admins", "program admins", "coordinators", "team size", "fte"] },
  { key: "priorProgramSize", label: "Program size last year", unit: "count", aliases: ["prior year program size", "last year cohort", "previous cohort", "grew from", "scaled from", "program size last year"] },
  { key: "priorAdminHeadcount", label: "People running it last year", unit: "count", aliases: ["prior year admin", "previous admin headcount", "admins last year"] },
  { key: "lowEngagementFlagged", label: "Low and moderately engaged interns flagged", unit: "count", aliases: ["low and moderately engaged interns flagged", "low and moderately engaged", "moderately engaged", "low engagement flagged", "at-risk flagged", "at risk candidates", "flagged interns", "disengaged", "low engagement"] },
  { key: "fteConversionRatePct", label: "Employee to FTE conversion rate", unit: "percent", aliases: ["employee to fte conversion rate", "fte conversion rate", "intern conversion rate", "conversion to full time", "conversion rate", "conversion"] },
  { key: "daysFasterRamp", label: "Days faster to contribute", unit: "days", aliases: ["days faster", "time to contribution", "ramp time", "faster ramp"] },
  { key: "monthsOfferToStart", label: "Months between offer and start", unit: "months", aliases: ["offer to start", "months offer to start", "months out", "recruiting timeline", "pre-start gap"] },
  { key: "loadedHourlyCost", label: "Hourly cost of your team", unit: "usd", aliases: ["loaded hourly cost", "hourly cost", "fully loaded rate", "cost per hour"] },
];

export const METRIC_BY_KEY: Record<MetricKey, MetricSpec> = Object.fromEntries(
  METRIC_SPECS.map((spec) => [spec.key, spec]),
) as Record<MetricKey, MetricSpec>;

export type PillarId =
  | "protect"
  | "connect"
  | "save"
  | "scale"
  | "see"
  | "improve"
  | "compete"
  | "impress";

export type Pillar = {
  id: PillarId;
  /** 1 to 8, the guide's evidence-strength order. */
  rank: number;
  name: string;
  subtitle: string;
  /** The guide's fuller "what it means for ROI" text. Context for the AI. */
  roiMeaning: string;
  formulaLabel: string;
  /** Plain-language formula. Empty when the pillar shows no formula box. */
  formulaText: string;
  /** Numbers the formula cannot run without. */
  required: MetricKey[];
  /** Numbers that sharpen the result but are optional. */
  optional: MetricKey[];
  /**
   * Informational bullets explaining how Abode produces the result, what the number
   * represents, and where the ROI surfaces. Tokens in {braces} are filled with this
   * account's computed figures.
   */
  businessCase: string[];
  /** One or two lines on what the company carries without Abode. */
  costOfInaction: string[];
  groundedIn: string;
  ifLeadershipShrugs: string;
  /** hard = a dollar or count number. narrative = a story pillar. */
  kind: "hard" | "narrative";
};

export const PILLARS: Pillar[] = [
  {
    id: "protect",
    rank: 1,
    name: "Protect",
    subtitle: "Risk and cost avoided",
    roiMeaning:
      "Every dollar of hiring cost saved when a reneg is caught early or a bad-fit hire is flagged before day one. This is the one pillar every single account tracks, and the clearest money story.",
    formulaLabel: "Renegs avoided in dollars",
    formulaText:
      "( [reneg rate before] − [reneg rate now] ) × [program size] × [cost per hire]",
    required: ["baselineRenegRate", "currentRenegRate", "cohortSize"],
    optional: ["lowEngagementFlagged"],
    businessCase: [
      "How Abode produces this: Engagement Tracking scores every Participant across the post-offer window, and Reneg Risk Flags surface the ones going quiet while the offer is still live, so a recruiter can step in rather than finding out on the start date.",
      "What the number represents: a reneg rate of {baseline}% falling to {current}% across {cohort} Participants at {company} is about {renegsAvoided} hires retained, valued at the {cost} it costs to replace one.",
      "Where the ROI surfaces: {dollars} of hiring spend at {company} is not re-run through sourcing, screening, interviewing and offer approval, and the Dashboard reports that figure during the cycle rather than only after the class starts.",
      "Beyond the re-hiring cost: when a reneg is caught early enough to backfill the seat, {company} does not just avoid spending the {cost} again. The role still gets filled and still produces a full summer of output, where a reneg found on the start date leaves that seat empty for the entire program.",
    ],
    costOfInaction: [
      "Without Abode, a reneg is discovered on the start date, when the only option left is to re-run the hire from scratch.",
      "At {cost} per replacement, every candidate who goes quiet unnoticed is a full sourcing, interviewing and closing cycle repeated.",
    ],
    groundedIn:
      "ABB 15% to 5%. Spectrum Abode Early award plus roughly 70% engagement correlating with fewer renegs. Amazon calling renegs costing loads of money. MongoDB weekly reneg-risk flagging. GE Aero GPA screen.",
    ifLeadershipShrugs:
      "This one never gets shrugged off, because it is money rather than effort. Lead here whenever you have a real reneg number.",
    kind: "hard",
  },
  {
    id: "connect",
    rank: 2,
    name: "Connect",
    subtitle: "Preparedness before day one",
    roiMeaning:
      "The pre-day-one experience that makes interns show up ready and connected, measured as the Abode intern NPS average against the typical early-careers benchmark.",
    formulaLabel: "Intern sentiment",
    formulaText: "Intern sentiment = [company NPS] vs 32 typical industry average",
    required: [],
    optional: ["companyNpsScore"],
    businessCase: [
      "How Abode produces this: the pre-day-one Journey delivers Templates, Tasks and Resources on a schedule, and the Journey Survey captures how the Cohort rates the experience while it is still running.",
      "What the number represents: a Company NPS of {abodeNps} against a typical early-careers benchmark of {industryNps} means candidates rate the stretch between offer and start roughly {multiple}× higher than the market norm.",
      "Where the ROI surfaces: a Cohort that arrives already connected to the Program is the leading edge of the conversion story, and the Survey is what turns that from a belief into a number leadership can be shown.",
    ],
    costOfInaction: [
      "Without a structured pre-start Journey, candidates go quiet between offer and start and arrive cold, with no shared context and no relationships in place.",
      "Programs without it sit closer to the industry NPS of {industryNps} than to what Abode programs return, with no sentiment figure to report either way.",
    ],
    groundedIn:
      "Amazon: 99% belonging as a kingpin goal, 97% adoption against an 80% target, and community named the single biggest impact. Spectrum: structured prep calls and office hours. Mondelez, Whitley Penn, Energy Transfer and UHY all raised this without being asked.",
    ifLeadershipShrugs:
      "This is the pillar leadership cannot call just the admin's job. Wherever you have an intern NPS, put it up front against the Abode average.",
    kind: "hard",
  },
  {
    id: "save",
    rank: 3,
    name: "Save",
    subtitle: "Capacity freed, framed as work rather than hours",
    roiMeaning:
      "The manual work the platform absorbs, but the ROI lands only when you express it as capacity redeployed to strategic work or headcount avoided, not as raw hours saved.",
    formulaLabel: "Capacity freed in dollars",
    formulaText:
      "Hours saved = [program size] × 5 questions × 15 min ÷ 60\n            + [program size] × 8.4 messages × 1 min ÷ 60\nDollar value = hours ÷ 2,080 × $80,000",
    required: ["cohortSize"],
    optional: ["loadedHourlyCost", "adminHeadcount"],
    businessCase: [
      "How Abode produces this: a Journey is built once from a Template and then sends, staggers and chases its own communications, while Tasks, Reminders and the Resource Hub answer repeat Participant questions without a coordinator in the loop.",
      "What the number represents: {hours} hours absorbed per cycle across {cohort} Participants at {company}, which is {fte} of a full-time role, or {dollars} at a fully loaded cost of {fteCost} a year.",
      "Where the ROI surfaces: that capacity returns to the work Abode does not automate, such as program design, mentor matching and escalations, and it is the same {dollars} a team would otherwise have to add as headcount to run this volume by hand.",
      "Additional time saved: the figure above counts only the sends and questions themselves. It does not count chasing Participants who never reply, which is the slowest part of running a Program by hand, so the real capacity returned to {company} is larger than {hours} hours.",
    ],
    costOfInaction: [
      "Without Abode, those {hours} hours a cycle stay on the team's calendar as manual sends, chases and the same questions answered one Participant at a time, plus the unanswered Participants someone has to keep chasing.",
      "Program design, mentor matching and escalations then get whatever time is left over, which is usually the work that gets cut first.",
    ],
    groundedIn:
      "Mondelez: 80% of my day was meetings and emails, I now get to be a leader. Amazon runs 27,000 candidates on a tiny team and saved hours and hours. Spectrum went from pulling my hair out staggering emails to set it and forget it. UHY: do more with less, build once and reuse.",
    ifLeadershipShrugs:
      "If a VP says that is their job, turn the same number into headcount avoided: you would need more staff to do this by hand at your volume. That reframe is what makes it stick.",
    kind: "hard",
  },
  {
    id: "scale",
    rank: 4,
    name: "Scale",
    subtitle: "Growth without adding headcount",
    roiMeaning:
      "The program can grow, or already runs at a size, that would collapse the old manual way. We grew Nx and added no staff is a leadership-grade sentence, especially for enterprise accounts.",
    formulaLabel: "Admin cost avoided by scaling",
    formulaText:
      "scaleValue = ( ( [target participants] − [program size] ) × [people running the program] ÷ [program size] ) × $80,000",
    required: ["cohortSize", "adminHeadcount"],
    optional: ["priorProgramSize", "priorAdminHeadcount"],
    businessCase: [
      "How Abode produces this: a Journey built for one Cohort applies to every Cohort after it, so growth adds delivery volume inside the Program rather than coordination work for the team running it.",
      "What the number represents: growing from {cohort} to {target} Participants the old way would take {extraAdmins} more admin{extraAdminPlural} at {adminCost} each, which is {value} of headcount {company} does not have to add.",
      "Where the ROI surfaces: Program growth stops being tied to headcount growth, so the operating cost of each additional Participant falls as the Cohort gets larger.",
    ],
    costOfInaction: [
      "Without Abode, growth means more coordinators, because an email and spreadsheet process starts dropping communications well before {cohort} Participants.",
      "Reaching {target} Participants by hand would mean carrying {value} of extra admin cost for every year the Program runs at that size.",
    ],
    groundedIn:
      "Amazon: 27,000 candidates at roughly 97% adoption, run by two people, after Outlook capped them at 10k emails a day. Energy Transfer scaled 11 interns to 95. GE Aero: a team of one at 700 to 800. Nicole at ABB ran a global rollout.",
    ifLeadershipShrugs:
      "A ratio is concrete and hard to argue with. Best for enterprise and fast-growing programs.",
    kind: "hard",
  },
  {
    id: "see",
    rank: 5,
    name: "See",
    subtitle: "Visibility and the ability to step in",
    roiMeaning:
      "The account can now see engagement and act on it, spotting disengaged interns before they reneg. This is the connective tissue that powers Protect.",
    formulaLabel: "Early interventions",
    formulaText:
      "[low and moderately engaged interns flagged] × 100% followed up = [early interventions]",
    required: ["lowEngagementFlagged"],
    optional: [],
    businessCase: [
      "How Abode produces this: Task completion and message engagement are recorded per Participant, so low and moderately engaged candidates show up as a visible signal on the Dashboard rather than as silence, and the weekly review routes each one to the right recruiter.",
      "What the number represents: {coverage}, each one a Participant at {company} who would otherwise have gone quiet without anyone noticing.",
      "Where the ROI surfaces: every early intervention is a chance to keep a hire the business has already paid to source and interview, and this visibility is the mechanism that produces the Protect number for {company}.",
    ],
    costOfInaction: [
      "Without Engagement Tracking, a low or moderately engaged candidate looks exactly like a quiet one, so the first real signal is the candidate who never starts.",
      "There is no list to work from and no way to prioritise who to call while the offer is still live.",
    ],
    groundedIn:
      "MongoDB built a weekly engagement review that routes low-engagement interns to recruiters. Amazon and Spectrum both lead with dashboard data when they talk to leadership. Energy Transfer can clearly see task completion.",
    ifLeadershipShrugs:
      "Frame it as we can see and act, not guess. Strongest when paired with a Protect number showing a flag became a save.",
    kind: "hard",
  },
  {
    id: "improve",
    rank: 6,
    name: "Improve",
    subtitle: "Conversion, quality and time to contribution",
    roiMeaning:
      "Intern to full-time conversion is what TA leadership is actually measured on, and every account named it as the number one success metric. Often aspired to rather than measured yet, so flag which one you have.",
    formulaLabel: "Value of roles filled from the intern pool",
    formulaText:
      "Extra roles = [program size] × ( [intern to FTE conversion rate] − [benchmark conversion rate] )\nValue ($) = extra roles × [saving per role]",
    required: ["cohortSize", "fteConversionRatePct"],
    optional: ["daysFasterRamp"],
    businessCase: [
      "How Abode produces this: Participants who work through the Journey arrive with context, expectations and internal connections already established, which shapes how quickly they contribute and whether they accept a return offer.",
      "What the number represents: converting at {rate}% against the NACE benchmark of {benchmark}% across {cohort} Participants is {roles} roles {direction} the market, each worth the {saving} gap between an external hire at {externalCost} and an intern conversion at {internCost}{rampClause}.",
      "Where the ROI surfaces: {roiClause}",
    ],
    costOfInaction: [
      "Without Abode, conversion gets measured after the fact with nothing to attribute it to, so the program cannot show which candidates it actually influenced.",
      "Every role not filled from the intern pool becomes an external entry-level hire at {externalCost} rather than a {internCost} conversion, spending again on a pipeline the program already built.",
    ],
    groundedIn:
      "Every account calls conversion the ultimate metric. Amazon is about to run the Abode versus non-Abode conversion study at off-boarding, which is the strongest proof point coming. Koch wants time to contribution measured.",
    ifLeadershipShrugs:
      "Strongest when measured rather than modelled. If you only have the aspiration, say so, and point to Amazon's upcoming study as the proof it is coming.",
    kind: "hard",
  },
  {
    id: "compete",
    rank: 7,
    name: "Compete",
    subtitle: "Fills a gap an ATS cannot",
    roiMeaning:
      "The platform fills the post-offer, pre-start engagement gap that an ATS or HRIS structurally cannot, exactly where candidates go cold and get poached.",
    formulaLabel: "",
    /** Pillar 7 shows no formula box, only the value bullets. */
    formulaText: "",
    required: ["monthsOfferToStart", "cohortSize"],
    optional: [],
    businessCase: [
      "How Abode produces this: Abode runs the post-offer, pre-start window that an ATS or HRIS does not cover, since the applicant record closes at offer acceptance and reopens at onboarding, and the Journey keeps Participants in contact across that entire gap.",
      "What the number represents: {months} months between offer and start across {cohort} Participants at {company}, which is the window competitors use to recruit the same people.",
      "Where the ROI surfaces: continuous contact protects a pipeline {company} has already paid to source and interview, across the exact period when accepted offers are most often lost.",
      "Why candidates stay: Participants who feel connected to a Program are less likely to keep interviewing elsewhere, so by the time they start there are fewer competing offers on the table for {company} to lose them to.",
    ],
    costOfInaction: [
      "Without coverage of the offer-to-start window, candidates hear more from competitors than from the employer that already hired them.",
      "An ATS closes at acceptance, so those {months} months go unmanaged and the pipeline quietly erodes before anyone starts.",
    ],
    groundedIn:
      "Amazon: keeping talent from being poached in a really competitive market. Spectrum: seniors poached by IBM at career fairs. Whitley Penn and UHY recruit 16 to 18 months out against the Big Four, and their ATS is not built for post-offer engagement.",
    ifLeadershipShrugs:
      "Framed as competitive risk, this lands at VP level. Best for industries with long recruiting timelines such as accounting and enterprise.",
    kind: "narrative",
  },
  {
    id: "impress",
    rank: 8,
    name: "Impress",
    subtitle: "Candidate experience and employer brand",
    roiMeaning:
      "The experience shapes CSAT and NPS and employer reputation, and the early-career cohort is vocal, so it feeds next year's applicant quality and volume. Usually a supporting narrative under Connect.",
    formulaLabel: "Intern sentiment",
    formulaText: "Intern sentiment = Abode NPS 64 vs 32 typical industry average",
    required: [],
    optional: [],
    businessCase: [
      "How Abode produces this: between offer and start the Journey is the main point of contact with the employer, so the Templates, Resources and Tasks a Participant sees carry most of the impression they form before they arrive.",
      "What the number represents: an Abode NPS of {abodeNps} against a typical early-careers benchmark of {industryNps} is the clearest read on how Participants describe the experience to peers, mentors and campus contacts.",
      "Where the ROI surfaces: early-career candidates discuss their experience publicly on LinkedIn, Handshake and campus, so it reaches applicant quality and volume in the following hiring cycle rather than this one.",
    ],
    costOfInaction: [
      "Without a measured experience, the employer brand story rests on anecdote and there is nothing to compare against.",
      "A weak pre-start stretch travels through the same campus and LinkedIn networks {company} recruits the next Cohort from.",
    ],
    groundedIn:
      "Amazon: corporate onboarding CSAT at an all-time high. MongoDB tracks intern and mentor NPS in Qualtrics. UHY talks about community feel. Whitley Penn says part of the culture.",
    ifLeadershipShrugs:
      "Hardest to turn into dollars, so keep it as a supporting score and a quote under Connect rather than a standalone money claim.",
    kind: "narrative",
  },
];

export const PILLAR_BY_ID: Record<PillarId, Pillar> = Object.fromEntries(
  PILLARS.map((p) => [p.id, p]),
) as Record<PillarId, Pillar>;

export const THROUGH_LINE =
  "What do you show, to whom, and what is missing when you cannot show it.";
