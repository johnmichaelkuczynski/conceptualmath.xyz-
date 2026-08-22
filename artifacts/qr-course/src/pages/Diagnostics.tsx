import { useState } from "react";
import { Activity, CheckCircle2, Loader2, PlayCircle, XCircle } from "lucide-react";
import { Layout } from "@/components/layout/Layout";

type DiagnosticStep = {
  name: string;
  ok: boolean;
  ms: number;
  detail?: string;
  error?: string;
};

type DiagnosticResult = {
  ok: boolean;
  generatedAt: string;
  steps: DiagnosticStep[];
};

type AuditResult = {
  ok: boolean;
  error?: string;
  summary?: {
    lecturesChecked: number;
    problemsChecked: number;
    lecturesWithIssues: number;
    problemsWithIssues: number;
  };
  lectureIssues: Array<{
    lectureId: number;
    title: string;
    ok: boolean;
    issues: Array<{ quote: string; problem: string; fix: string }>;
    error?: string;
  }>;
  problemIssues: Array<{
    problemId: number;
    assignmentTitle: string;
    prompt: string;
    ok: boolean;
    issue?: string;
    betterAnswer?: string;
    error?: string;
  }>;
};

function Results({
  title,
  result,
}: {
  title: string;
  result: DiagnosticResult | null;
}) {
  if (!result) return null;

  const passed = result.steps.filter((step) => step.ok).length;
  return (
    <section className="rounded-lg border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border px-5 py-3">
        <h2 className="font-serif text-lg">{title}</h2>
        <span className={result.ok ? "text-sm font-medium text-green-700" : "text-sm font-medium text-red-700"}>
          {passed}/{result.steps.length} passed
        </span>
      </div>
      <div className="px-5 py-2">
        {result.steps.map((step, index) => (
          <div key={`${step.name}-${index}`} className="flex gap-3 border-b border-border py-3 last:border-0">
            {step.ok ? (
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-green-700" />
            ) : (
              <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-700" />
            )}
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium">{step.name}</div>
              {step.detail && <div className="mt-0.5 text-xs text-muted-foreground">{step.detail}</div>}
              {step.error && <div className="mt-0.5 break-words text-xs text-red-700">{step.error}</div>}
            </div>
            <span className="shrink-0 text-xs tabular-nums text-muted-foreground">{step.ms} ms</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function AuditResults({ result }: { result: AuditResult | null }) {
  if (!result) return null;
  if (!result.summary) {
    return <p className="text-sm text-red-700">{result.error ?? "The content audit did not return results."}</p>;
  }

  return (
    <section className="rounded-lg border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border px-5 py-3">
        <h2 className="font-serif text-lg">Answer-key quality-control results</h2>
        <span className={result.ok ? "text-sm font-medium text-green-700" : "text-sm font-medium text-red-700"}>
          {result.summary.lecturesWithIssues} lecture(s) · {result.summary.problemsWithIssues} problem(s) flagged
        </span>
      </div>
      <div className="space-y-3 px-5 py-4 text-sm">
        <p className="text-muted-foreground">
          Checked {result.summary.lecturesChecked} lectures and {result.summary.problemsChecked} problems.
        </p>
        {result.lectureIssues.map((lecture) => (
          <div key={lecture.lectureId} className="rounded-md border border-border p-3">
            <p className="font-medium">{lecture.title}</p>
            {lecture.error ? (
              <p className="mt-1 text-xs text-red-700">{lecture.error}</p>
            ) : (
              lecture.issues.map((issue, index) => (
                <p key={index} className="mt-1 text-xs text-muted-foreground">
                  {issue.problem} Suggested fix: {issue.fix}
                </p>
              ))
            )}
          </div>
        ))}
        {result.problemIssues.map((problem) => (
          <div key={problem.problemId} className="rounded-md border border-border p-3">
            <p className="font-medium">{problem.assignmentTitle}</p>
            <p className="mt-1 text-xs text-muted-foreground">{problem.prompt}</p>
            {(problem.issue || problem.error) && (
              <p className="mt-1 text-xs text-red-700">{problem.issue ?? problem.error}</p>
            )}
            {problem.betterAnswer && (
              <p className="mt-1 text-xs text-green-700">Suggested answer: {problem.betterAnswer}</p>
            )}
          </div>
        ))}
        {result.lectureIssues.length === 0 && result.problemIssues.length === 0 && (
          <p className="text-green-700">No answer-key issues were flagged.</p>
        )}
      </div>
    </section>
  );
}

export default function Diagnostics() {
  const [systemBusy, setSystemBusy] = useState(false);
  const [syntheticBusy, setSyntheticBusy] = useState(false);
  const [auditBusy, setAuditBusy] = useState(false);
  const [systemResult, setSystemResult] = useState<DiagnosticResult | null>(null);
  const [syntheticResult, setSyntheticResult] = useState<DiagnosticResult | null>(null);
  const [auditResult, setAuditResult] = useState<AuditResult | null>(null);
  const [systemError, setSystemError] = useState<string | null>(null);
  const [syntheticError, setSyntheticError] = useState<string | null>(null);
  const [auditError, setAuditError] = useState<string | null>(null);

  async function runSystem() {
    setSystemBusy(true);
    setSystemError(null);
    setSystemResult(null);
    try {
      const response = await fetch("/api/diagnostics/system");
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      setSystemResult(await response.json());
    } catch (error) {
      setSystemError(error instanceof Error ? error.message : String(error));
    } finally {
      setSystemBusy(false);
    }
  }

  async function runSynthetic() {
    setSyntheticBusy(true);
    setSyntheticError(null);
    setSyntheticResult(null);
    try {
      const response = await fetch("/api/diagnostics/synthetic-run", { method: "POST" });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      setSyntheticResult(await response.json());
    } catch (error) {
      setSyntheticError(error instanceof Error ? error.message : String(error));
    } finally {
      setSyntheticBusy(false);
    }
  }

  async function runAudit() {
    setAuditBusy(true);
    setAuditError(null);
    setAuditResult(null);
    try {
      const response = await fetch("/api/diagnostics/content-audit", { method: "POST" });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      setAuditResult(await response.json());
    } catch (error) {
      setAuditError(error instanceof Error ? error.message : String(error));
    } finally {
      setAuditBusy(false);
    }
  }

  return (
    <Layout>
      <div className="mx-auto max-w-4xl space-y-8 p-8">
        <header>
          <h1 className="font-serif text-3xl">Diagnostics</h1>
          <p className="mt-1 text-muted-foreground">
            Run live checks for the course system and a complete synthetic learner journey.
          </p>
        </header>

        <section className="space-y-3">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="flex items-center gap-2 font-serif text-xl">
                <Activity className="h-5 w-5" /> System Diagnostic
              </h2>
              <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
                Checks the database, seeded content, AI services, answer detection, and grading pipeline.
              </p>
            </div>
            <button
              onClick={runSystem}
              disabled={systemBusy}
              className="inline-flex shrink-0 items-center gap-2 rounded-md bg-primary px-4 py-2 font-medium text-primary-foreground disabled:opacity-60"
            >
              {systemBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlayCircle className="h-4 w-4" />}
              {systemBusy ? "Running…" : "Run system diagnostic"}
            </button>
          </div>
          {systemError && <p className="text-sm text-red-700">{systemError}</p>}
          <Results title="System diagnostic results" result={systemResult} />
        </section>

        <section className="space-y-3">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="flex items-center gap-2 font-serif text-xl">
                <Activity className="h-5 w-5" /> Synthetic User
              </h2>
              <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
                Runs a synthetic student through lectures, assignments, practice, tutoring, grading, and detection.
                This is a full end-to-end check and can take several minutes.
              </p>
            </div>
            <button
              onClick={runSynthetic}
              disabled={syntheticBusy}
              className="inline-flex shrink-0 items-center gap-2 rounded-md bg-primary px-4 py-2 font-medium text-primary-foreground disabled:opacity-60"
            >
              {syntheticBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlayCircle className="h-4 w-4" />}
              {syntheticBusy ? "Running…" : "Run synthetic user"}
            </button>
          </div>
          {syntheticError && <p className="text-sm text-red-700">{syntheticError}</p>}
          <Results title="Synthetic user results" result={syntheticResult} />
        </section>

        <section className="space-y-3">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="flex items-center gap-2 font-serif text-xl">
                <Activity className="h-5 w-5" /> Diagnostic 3 — Answer-key quality control
              </h2>
              <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
                Uses AI to independently verify that seeded course answers are legitimate, correct, and unambiguous
                for their prompts. Any wrong, off-topic, or ambiguous answer is flagged before a student is graded
                against it. This can take several minutes.
              </p>
            </div>
            <button
              onClick={runAudit}
              disabled={auditBusy}
              className="inline-flex shrink-0 items-center gap-2 rounded-md bg-primary px-4 py-2 font-medium text-primary-foreground disabled:opacity-60"
            >
              {auditBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlayCircle className="h-4 w-4" />}
              {auditBusy ? "Running…" : "Run quality control"}
            </button>
          </div>
          {auditError && <p className="text-sm text-red-700">{auditError}</p>}
          <AuditResults result={auditResult} />
        </section>
      </div>
    </Layout>
  );
}