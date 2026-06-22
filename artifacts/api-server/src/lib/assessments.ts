// Static definitions of the diagnostic assessments embedded in the course.
// These are CONFIG, not database rows — taking one snapshots its slug/title/
// coverage onto the attempt, and questions are generated fresh every time.

export type AssessmentVersion =
  | "multiple_choice"
  | "written"
  | "hybrid"
  | "official";

export type QuestionFormat = "mc" | "written";

export type AssessmentDef = {
  slug: string;
  title: string;
  // "pre_course" sits before week 1; "week_end" sits after its weekNumber.
  placement: "pre_course" | "week_end";
  weekNumber: number; // 0 for pre-course; the week it follows otherwise
  coverageFromWeek: number;
  coverageToWeek: number;
  description: string;
};

export const ASSESSMENTS: AssessmentDef[] = [
  {
    slug: "pre-course",
    title: "Pre-Course Placement Diagnostic",
    placement: "pre_course",
    weekNumber: 0,
    coverageFromWeek: 1,
    coverageToWeek: 4,
    description:
      "Before you begin, see where you stand. This accessible placement check samples ideas from across the whole course so you know which weeks will be review and which will be new.",
  },
  {
    slug: "end-week-1",
    title: "End of Week 1 Diagnostic",
    placement: "week_end",
    weekNumber: 1,
    coverageFromWeek: 1,
    coverageToWeek: 1,
    description:
      "Check your grip on whole numbers, integers, and the four operations covered in Week 1.",
  },
  {
    slug: "end-week-2",
    title: "End of Week 2 Diagnostic",
    placement: "week_end",
    weekNumber: 2,
    coverageFromWeek: 2,
    coverageToWeek: 2,
    description:
      "Focused on Week 2: fractions, decimals, percents, and ratios.",
  },
  {
    slug: "cumulative-week-2",
    title: "Weeks 1–2 Cumulative Diagnostic",
    placement: "week_end",
    weekNumber: 2,
    coverageFromWeek: 1,
    coverageToWeek: 2,
    description:
      "A cumulative check that mixes Week 1 and Week 2 so the foundations stay sharp.",
  },
  {
    slug: "end-week-3",
    title: "End of Week 3 Diagnostic",
    placement: "week_end",
    weekNumber: 3,
    coverageFromWeek: 3,
    coverageToWeek: 3,
    description:
      "Focused on Week 3: percents in context, measurement, and the start of algebra.",
  },
  {
    slug: "end-week-4",
    title: "End of Week 4 Diagnostic",
    placement: "week_end",
    weekNumber: 4,
    coverageFromWeek: 4,
    coverageToWeek: 4,
    description:
      "Focused on Week 4: graphing, exponents, polynomials, and geometry.",
  },
  {
    slug: "cumulative-week-4",
    title: "Weeks 1–4 Cumulative Final Diagnostic",
    placement: "week_end",
    weekNumber: 4,
    coverageFromWeek: 1,
    coverageToWeek: 4,
    description:
      "The capstone diagnostic — a cumulative synthesis spanning every week of the course.",
  },
];

export function getAssessment(slug: string): AssessmentDef | undefined {
  return ASSESSMENTS.find((a) => a.slug === slug);
}

export type VersionMeta = {
  label: string;
  blurb: string;
  length: number;
  isOfficial: boolean;
  // How question formats are distributed across the assessment.
  mix: "mc" | "written" | "mixed";
};

const BASE_LENGTH = 6;
const OFFICIAL_LENGTH = 12;

export const VERSION_META: Record<AssessmentVersion, VersionMeta> = {
  multiple_choice: {
    label: "Multiple choice",
    blurb: "Quick pulse-check — pick the right answer.",
    length: BASE_LENGTH,
    isOfficial: false,
    mix: "mc",
  },
  written: {
    label: "Written",
    blurb: "Compose each answer in proper math notation.",
    length: BASE_LENGTH,
    isOfficial: false,
    mix: "written",
  },
  hybrid: {
    label: "Hybrid",
    blurb: "A mix of multiple-choice and written questions.",
    length: BASE_LENGTH,
    isOfficial: false,
    mix: "mixed",
  },
  official: {
    label: "Official",
    blurb: "The required version — double length, hybrid format. Completing it earns full credit.",
    length: OFFICIAL_LENGTH,
    isOfficial: true,
    mix: "mixed",
  },
};

export function isAssessmentVersion(v: string): v is AssessmentVersion {
  return v === "multiple_choice" || v === "written" || v === "hybrid" || v === "official";
}

// Format for the question at a given index, per the version's mix.
export function formatForIndex(
  mix: "mc" | "written" | "mixed",
  index: number,
): QuestionFormat {
  if (mix === "mc") return "mc";
  if (mix === "written") return "written";
  return index % 2 === 0 ? "mc" : "written";
}
