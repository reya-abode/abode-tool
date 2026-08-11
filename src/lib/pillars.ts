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
 *   businessCase               = bullets on how Abode creates the value, and where it lands
 */

export type MetricKey =
  | "cohortSize"
  | "baselineRenegRate"
  | "currentRenegRate"
  | "costPerRenegedHire"
  | "belongingPct"
  | "adoptionPct"
  | "npsScore"
  | "csatScore"
  | "avgCommsPerJourney"
  | "minSavedPerComms"
  | "avgFaqDeflections"
  | "minPerQuestion"
  | "adminHeadcount"
  | "priorProgramSize"
  | "priorAdminHeadcount"
  | "lowEngagementFlagged"
  | "followUpRatePct"
  | "conversionEngagedPct"
  | "conversionNonEngagedPct"
  | "daysFasterRamp"
  | "monthsOfferToStart"
  | "loadedHourlyCost";

export type Metrics = Partial<Record<MetricKey, number>>;

export type MetricSpec = {
  key: MetricKey;
  label: string;
  unit: "count" | "percent" | "usd" | "minutes" | "hours" | "days" | "months" | "score";
  /** Aliases the parser and the AI use to recognise this number in what you paste. */
  aliases: string[];
  /** Research value from the guide's {curly braces}. Absent means it has to come from you. */
  benchmark?: number;
  benchmarkNote?: string;
};

export const METRIC_SPECS: MetricSpec[] = [
  { key: "cohortSize", label: "Cohort size", unit: "count", aliases: ["cohort size", "cohort", "interns", "intern count", "candidates", "program size", "class size"] },
  { key: "baselineRenegRate", label: "Reneg rate before Abode", unit: "percent", aliases: ["baseline reneg rate", "reneg rate before", "previous reneg rate", "historical reneg", "reneg baseline"] },
  { key: "currentRenegRate", label: "Reneg rate now", unit: "percent", aliases: ["current reneg rate", "reneg rate now", "reneg rate", "renege rate", "reneg"] },
  { key: "costPerRenegedHire", label: "Cost per reneged hire", unit: "usd", aliases: ["cost per reneged hire", "cost per reneg", "cost per hire", "replacement cost", "cost to rehire"] },
  { key: "belongingPct", label: "Belonging or readiness", unit: "percent", aliases: ["belonging", "sense of belonging", "belonging score", "readiness", "prepared"] },
  { key: "adoptionPct", label: "Adoption", unit: "percent", aliases: ["adoption", "adoption rate", "engagement rate", "platform engagement", "engaged"] },
  { key: "npsScore", label: "Intern NPS", unit: "score", aliases: ["nps", "net promoter", "nps score", "intern nps", "mentor nps"] },
  { key: "csatScore", label: "Onboarding CSAT", unit: "score", aliases: ["csat", "satisfaction score", "onboarding csat"] },
  { key: "avgCommsPerJourney", label: "Messages per journey", unit: "count", aliases: ["comms per journey", "communications per intern", "emails per intern", "touchpoints", "messages per journey"], benchmark: 12, benchmarkNote: "We used the Abode average of 12 messages per candidate journey." },
  { key: "minSavedPerComms", label: "Minutes saved per message", unit: "minutes", aliases: ["minutes saved per comms", "minutes per email", "time per send", "minutes per message"], benchmark: 4, benchmarkNote: "We used the Abode average of 4 minutes of manual work per message, covering drafting, personalising and chasing." },
  { key: "avgFaqDeflections", label: "Questions answered for you", unit: "count", aliases: ["faq deflections", "questions deflected", "faqs per intern", "questions per intern"], benchmark: 6, benchmarkNote: "We used the Abode average of 6 repeat questions per candidate answered by the resource hub." },
  { key: "minPerQuestion", label: "Minutes per question", unit: "minutes", aliases: ["minutes per question", "time per question", "minutes per faq"], benchmark: 5, benchmarkNote: "We used the Abode average of 5 minutes to field and answer one repeat question." },
  { key: "adminHeadcount", label: "People running the program", unit: "count", aliases: ["admin headcount", "admins", "program admins", "coordinators", "team size", "fte"] },
  { key: "priorProgramSize", label: "Program size last year", unit: "count", aliases: ["prior year program size", "last year cohort", "previous cohort", "grew from", "scaled from", "program size last year"] },
  { key: "priorAdminHeadcount", label: "People running it last year", unit: "count", aliases: ["prior year admin", "previous admin headcount", "admins last year"] },
  { key: "lowEngagementFlagged", label: "At-risk interns flagged", unit: "count", aliases: ["low engagement flagged", "at-risk flagged", "at risk candidates", "flagged interns", "disengaged", "low engagement"] },
  { key: "followUpRatePct", label: "Flags you followed up on", unit: "percent", aliases: ["converted to a follow-up", "follow up rate", "flags routed", "flags actioned", "routed", "intervention rate", "follow up"] },
  { key: "conversionEngagedPct", label: "Conversion, Abode-engaged", unit: "percent", aliases: ["conversion rate abode engaged", "conversion engaged", "conversion rate engaged", "engaged conversion"] },
  { key: "conversionNonEngagedPct", label: "Conversion, not engaged", unit: "percent", aliases: ["conversion rate non engaged", "conversion non engaged", "conversion rate unengaged", "baseline conversion"] },
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
  /** Plain-language formula from the guide. Empty when the pillar has no formula box. */
  formulaText: string;
  /** Numbers the formula cannot run without. */
  required: MetricKey[];
  /** Numbers that sharpen the result but have research defaults or are optional. */
  optional: MetricKey[];
  /**
   * Informational bullets explaining how Abode produces the result, what the number
   * represents, and where the value lands. Tokens in {braces} are filled with this
   * account's computed figures.
   */
  businessCase: string[];
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
      "( [reneg rate before] − [reneg rate now] ) × [cohort size] × [cost per reneged hire]",
    required: ["baselineRenegRate", "currentRenegRate", "cohortSize", "costPerRenegedHire"],
    optional: ["lowEngagementFlagged"],
    businessCase: [
      "How Abode produces this: engagement across the pre-start window is tracked per candidate, so people who go quiet surface while the offer is still live instead of being discovered missing on the start date.",
      "What the number represents: a reneg rate of {baseline}% falling to {current}% across {cohort} candidates is about {renegsAvoided} hires retained, valued at the {cost} it costs to replace one.",
      "Where the value lands: {dollars} of hiring spend is not re-run through sourcing, screening, interviewing and offer approval, so it stays available to the program for the rest of the cycle.",
    ],
    groundedIn:
      "ABB 15% to 5%. Spectrum Abode Early award plus roughly 70% engagement correlating with fewer renegs. Amazon calling renegs “costing loads of money”. MongoDB weekly reneg-risk flagging. GE Aero GPA screen.",
    ifLeadershipShrugs:
      "This one never gets shrugged off, because it is money rather than effort. Lead here whenever you have a real reneg number.",
    kind: "hard",
  },
  {
    id: "connect",
    rank: 2,
    name: "Connect",
    subtitle: "Belonging and readiness before day one",
    roiMeaning:
      "The pre-day-one experience that makes interns feel they belong and show up ready. Customers believe this drives conversion and retention, and Amazon now measures it directly, making this the strongest soft pillar with a hard number behind it. Needs the survey in the template.",
    formulaLabel: "Belonging and readiness",
    formulaText: "{average belonging %} (pull from your NPS average)",
    required: ["belongingPct"],
    optional: ["adoptionPct", "npsScore"],
    businessCase: [
      "How Abode produces this: the pre-day-one journey delivers structured communications, tasks and resources, so candidates arrive already knowing their team, their tools and what their first week involves.",
      "What the number represents: {belonging}% of the cohort reporting a stronger sense of belonging, at {adoption}% adoption, is a measured survey outcome rather than an assumption about how onboarding felt.",
      "Where the value lands: belonging and readiness are the leading indicators underneath offer acceptance, conversion and first-year retention, and this is the pillar that makes them reportable to leadership.",
    ],
    groundedIn:
      "Amazon: 99% belonging as a kingpin goal, 97% adoption against an 80% target, and community named the single biggest impact. Spectrum: structured prep calls and office hours. Mondelēz, Whitley Penn, Energy Transfer and UHY all raised belonging without being asked.",
    ifLeadershipShrugs:
      "This is the pillar leadership cannot call just the admin's job. Wherever you have a belonging or readiness number, put it up front.",
    kind: "hard",
  },
  {
    id: "save",
    rank: 3,
    name: "Save",
    subtitle: "Capacity freed, framed as work rather than hours",
    roiMeaning:
      "The manual work the platform absorbs, but the ROI lands only when you express it as capacity redeployed to strategic work or headcount avoided, not as raw hours saved. Same hours, completely different framing. Before Abode everything is manual; now it is tasks, resources and reminders.",
    formulaLabel: "Capacity freed",
    formulaText:
      "[cohort size] × {messages per journey} × {minutes saved per message} + [cohort size] × {questions per intern} × {minutes per question}",
    required: ["cohortSize"],
    optional: [
      "avgCommsPerJourney",
      "minSavedPerComms",
      "avgFaqDeflections",
      "minPerQuestion",
      "loadedHourlyCost",
      "adminHeadcount",
    ],
    businessCase: [
      "How Abode produces this: journeys are built once and then send, stagger and chase communications automatically, while the resource hub answers repeat candidate questions without a coordinator in the loop.",
      "What the number represents: {hours} hours absorbed per cycle across {cohort} candidates, which is {fte} of one person's working time at standard messaging and question volumes.",
      "Where the value lands: that capacity returns to work that cannot be automated, such as program design, mentor matching and escalations, and it is the same capacity that would otherwise be added as headcount to run this volume by hand.",
    ],
    groundedIn:
      "Mondelēz: “80% of my day was meetings and emails, I now get to be a leader”. Amazon runs 27,000 candidates on a tiny team and “saved hours and hours”. Spectrum went from “pulling my hair out” staggering emails to “set it and forget it”. UHY: do more with less, build once and reuse.",
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
    formulaLabel: "Interns per admin",
    formulaText:
      "[program size now] ÷ [people running it] = interns per admin, compared with [last year's ratio]",
    required: ["cohortSize", "adminHeadcount"],
    optional: ["priorProgramSize", "priorAdminHeadcount"],
    businessCase: [
      "How Abode produces this: a journey built for one cohort applies to every cohort after it, so adding candidates adds delivery volume rather than coordination work.",
      "What the number represents: {cohort} candidates supported by {admins} admin{adminPlural}, or {ratio} candidates per admin{priorClause}.",
      "Where the value lands: program growth is no longer tied to headcount growth, so the operating cost of each additional candidate falls as the cohort gets larger.",
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
      "The account can now see engagement and act on it, spotting disengaged interns before they reneg, and answering what is happening with our program with data instead of a shrug. This is the connective tissue that powers Protect.",
    formulaLabel: "Early interventions",
    formulaText:
      "[at-risk interns flagged] × [% you followed up on] = [early interventions]. Pairs with Protect to show flags became saves.",
    required: ["lowEngagementFlagged"],
    optional: ["followUpRatePct"],
    businessCase: [
      "How Abode produces this: task completion and message engagement are recorded per candidate, so disengagement appears as a visible signal in the dashboard rather than as silence.",
      "What the number represents: {coverage}, each one a candidate who would otherwise have gone quiet without anyone noticing.",
      "Where the value lands: each early intervention is an opportunity to keep a hire after the sourcing and interviewing cost has already been spent, which is the mechanism the Protect number depends on.",
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
      "Intern to full-time conversion is what TA leadership is actually measured on, and every account named it as the number one success metric. Also includes faster ramp and time to contribution. Often aspired to rather than measured yet, so flag which one you have.",
    formulaLabel: "Extra retained hires",
    formulaText:
      "( [conversion, Abode-engaged] − [conversion, not engaged] ) × [cohort size] = [extra retained hires]",
    required: ["conversionEngagedPct", "conversionNonEngagedPct", "cohortSize"],
    optional: ["daysFasterRamp", "costPerRenegedHire"],
    businessCase: [
      "How Abode produces this: candidates who engage before day one arrive with context, expectations and internal connections already established, which affects how quickly they contribute and whether they accept a return offer.",
      "What the number represents: {engaged}% conversion among engaged candidates against {nonEngaged}% among the rest, applied across {cohort}, is about {extra} additional hires retained{rampClause}.",
      "Where the value lands: converting an intern is the lowest-cost hiring route available, because sourcing, screening and interviewing have already been paid for and the person is a known quantity.",
    ],
    groundedIn:
      "Every account calls conversion the ultimate metric. Amazon is about to run the Abode versus non-Abode conversion study at off-boarding, which is the strongest proof point coming. Koch wants time to contribution measured. Amazon interns upskill before day one.",
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
      "The platform fills the post-offer, pre-start engagement gap that an ATS or HRIS structurally cannot, exactly where candidates go cold and get poached. A we would lose talent to competitors without this argument, which is hard for leadership to dismiss.",
    formulaLabel: "Poaching exposure covered",
    formulaText: "[months between offer and start] × [cohort size]",
    required: ["monthsOfferToStart", "cohortSize"],
    optional: [],
    businessCase: [
      "How Abode produces this: the platform operates in the post-offer, pre-start window, which an ATS or HRIS structurally does not cover, since the applicant record closes at offer acceptance and reopens at onboarding.",
      "What the number represents: {months} months between offer and start across {cohort} candidates is {exposure} candidate-months during which competitors are actively recruiting the same people.",
      "Where the value lands: continuous contact through that window protects a pipeline that has already absorbed full sourcing and interviewing cost, and it is the period when accepted offers are most often lost.",
    ],
    groundedIn:
      "Amazon: keeping talent from being poached in a really competitive market. Spectrum: seniors poached by IBM at career fairs, so keeping candidates warm is a competitive necessity. Whitley Penn and UHY recruit 16 to 18 months out against the Big Four, and their ATS is not built for post-offer engagement.",
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
      "The experience shapes CSAT and NPS and employer reputation, and the early-career cohort is vocal on LinkedIn, Handshake and campus, so it feeds next year's applicant quality and volume. Usually a supporting narrative under Connect, quantified where survey data exists.",
    formulaLabel: "Supporting scores",
    /** The guide gives Impress no formula box, so there is none here. */
    formulaText: "",
    required: [],
    optional: ["npsScore", "csatScore", "belongingPct"],
    businessCase: [
      "How Abode produces this: between offer and start the candidate experience is the main point of contact with the employer, so it carries most of the impression a candidate forms before they arrive.",
      "What the number represents: the cohort survey records {scores}, indicating how the experience was rated and how likely candidates are to recommend the employer to others.",
      "Where the value lands: early-career candidates discuss their experience publicly on LinkedIn, Handshake and campus, so the effect appears in applicant quality and volume in the following hiring cycle rather than this one.",
    ],
    groundedIn:
      "Amazon: corporate onboarding CSAT at an all-time high. MongoDB tracks intern and mentor NPS in Qualtrics, covering likelihood to recommend and to mentor again. UHY talks about community feel. Whitley Penn says part of the culture.",
    ifLeadershipShrugs:
      "Hardest to turn into dollars, so keep it as a supporting score and a quote under Connect rather than a standalone money claim.",
    kind: "narrative",
  },
];

export const PILLAR_BY_ID: Record<PillarId, Pillar> = Object.fromEntries(
  PILLARS.map((p) => [p.id, p]),
) as Record<PillarId, Pillar>;

/** The through-line to remember on every call, from the guide's opening page. */
export const THROUGH_LINE =
  "What do you show, to whom, and what is missing when you cannot show it. Time saved is the entry point, never the whole argument.";
