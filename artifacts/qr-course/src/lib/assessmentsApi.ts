// Client types + fetch helpers for the diagnostic-assessments + gradebook feature.
// The API lives at the global /api path. The same-origin session cookie keeps
// each anonymous visitor's assessment progress separate.

export type AssessmentVersion =
  | "multiple_choice"
  | "written"
  | "hybrid"
  | "official";

export type QuestionFormat = "mc" | "written";

export interface KeystrokeTrace {
  keystrokeCount: number;
  eraseCount: number;
  bulkInsertCount?: number;
  longestBulkInsertChars?: number;
  rewriteSegments?: number;
  durationMs: number;
}

export interface AssessmentSummary {
  slug: string;
  title: string;
  placement: "pre_course" | "week_end";
  weekNumber: number;
  coverageFromWeek: number;
  coverageToWeek: number;
  description: string;
  attemptsCount: number;
  completedCount: number;
  officialCompleted: boolean;
  lastScorePercent: number | null;
  bestScorePercent: number | null;
}

export interface CustomAttemptSummary {
  id: number;
  customScope: string;
  version: string;
  status: string;
  scorePercent: number | null;
  createdAt: string;
  completedAt: string | null;
}

export interface AssessmentListResponse {
  assessments: AssessmentSummary[];
  custom: CustomAttemptSummary[];
}

export interface AttemptQuestion {
  id: number;
  position: number;
  format: QuestionFormat;
  prompt: string;
  choices: string[] | null;
  topicTitle: string | null;
  correctAnswer: string | null;
  explanation: string | null;
}

export interface AttemptAnswer {
  questionId: number;
  answer: string;
  correct: boolean | null;
  feedback: string | null;
  aiFlagged: boolean | null;
  diachronicFlagged: boolean | null;
  detectionRationale: string | null;
}

export interface AttemptDetail {
  id: number;
  assessmentSlug: string;
  assessmentTitle: string;
  version: string;
  isOfficial: boolean;
  isCustom: boolean;
  customScope: string | null;
  coverageFromWeek: number | null;
  coverageToWeek: number | null;
  status: "in_progress" | "completed";
  scorePercent: number | null;
  questions: AttemptQuestion[];
  answers: AttemptAnswer[];
  createdAt: string;
  completedAt: string | null;
}

export interface GradebookCategory {
  key: string;
  label: string;
  weightPercent: number;
  scorePercent: number;
  completed: number;
  total: number;
}

export interface GradebookAssignmentRow {
  id: number;
  title: string;
  kind: string;
  weekNumber: number;
  attempted: boolean;
  bestScore: number | null;
}

export interface GradebookDiagnosticRow {
  slug: string;
  title: string;
  weekNumber: number;
  officialCompleted: boolean;
  attempts: number;
  bestScore: number | null;
}

export interface GradebookResponse {
  overallPercent: number;
  letterGrade: string;
  categories: GradebookCategory[];
  assignments: GradebookAssignmentRow[];
  diagnostics: GradebookDiagnosticRow[];
}

async function jsonFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  if (!res.ok) {
    let data: { error?: string; code?: string; message?: string } | null =
      null;
    try {
      data = await res.json();
    } catch {
      // ignore
    }
    // Preserve the response details for page-level error handling.
    const err = new Error(
      data?.message || data?.error || `HTTP ${res.status}`,
    ) as Error & { status: number; data: unknown };
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return res.json() as Promise<T>;
}

export const assessmentsApi = {
  list: () => jsonFetch<AssessmentListResponse>("/api/assessments"),
  start: (slug: string, version: AssessmentVersion) =>
    jsonFetch<AttemptDetail>(`/api/assessments/${slug}/start`, {
      method: "POST",
      body: JSON.stringify({ version }),
    }),
  startCustom: (scope: string, version: AssessmentVersion) =>
    jsonFetch<AttemptDetail>("/api/assessments/custom/start", {
      method: "POST",
      body: JSON.stringify({ scope, version }),
    }),
  getAttempt: (id: number) =>
    jsonFetch<AttemptDetail>(`/api/assessments/attempts/${id}`),
  saveAnswer: (
    attemptId: number,
    questionId: number,
    answer: string,
    trace?: KeystrokeTrace,
  ) =>
    jsonFetch<{ ok: true }>(`/api/assessments/attempts/${attemptId}/answers`, {
      method: "PUT",
      body: JSON.stringify({ questionId, answer, trace }),
    }),
  submit: (attemptId: number) =>
    jsonFetch<AttemptDetail>(`/api/assessments/attempts/${attemptId}/submit`, {
      method: "POST",
    }),
  gradebook: () => jsonFetch<GradebookResponse>("/api/gradebook"),
};

export const VERSION_LABELS: Record<AssessmentVersion, string> = {
  multiple_choice: "Multiple choice",
  written: "Written",
  hybrid: "Hybrid",
  official: "Official",
};

export const VERSION_BLURBS: Record<AssessmentVersion, string> = {
  multiple_choice: "Quick pulse-check — pick the right answer (6 questions).",
  written: "Compose each answer in proper math notation (6 questions).",
  hybrid: "A mix of multiple-choice and written questions (6 questions).",
  official:
    "The required version — double length (12), hybrid format. Completing it earns full credit.",
};
