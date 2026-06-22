import { useState, useEffect, useRef } from "react";
import { Layout } from "@/components/layout/Layout";
import { useParams, Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AnswerInput } from "@/components/AnswerInput";
import { MarkdownRenderer } from "@/components/MarkdownRenderer";
import { CheckCircle2, XCircle } from "lucide-react";
import {
  assessmentsApi,
  type AttemptDetail,
  type KeystrokeTrace,
} from "@/lib/assessmentsApi";

function ResultsView({ attempt }: { attempt: AttemptDetail }) {
  const answerByQ = new Map(attempt.answers.map((a) => [a.questionId, a]));
  const correctCount = attempt.answers.filter((a) => a.correct).length;
  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-serif font-bold text-primary mb-2">
            {attempt.assessmentTitle} — Results
          </h1>
          <p className="text-muted-foreground">
            You got {correctCount} of {attempt.questions.length} correct (
            {Math.round(attempt.scorePercent ?? 0)}%). This assessment is ungraded —
            {attempt.isOfficial
              ? " completing the official version earned your full diagnostic credit."
              : " take the official version when you're ready to earn credit."}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <Link href="/assessments">
            <Button variant="outline">Back to Assessments</Button>
          </Link>
          <Link href="/gradebook">
            <Button variant="ghost" size="sm">
              View Gradebook
            </Button>
          </Link>
        </div>
      </div>

      <div className="flex flex-col gap-6">
        {attempt.questions.map((q, idx) => {
          const a = answerByQ.get(q.id);
          const correct = a?.correct ?? false;
          return (
            <div
              key={q.id}
              className={`p-6 rounded-lg border ${
                correct
                  ? "border-chart-2/50 bg-chart-2/5"
                  : "border-destructive/50 bg-destructive/5"
              }`}
            >
              <div className="flex items-center gap-2 mb-3">
                {correct ? (
                  <CheckCircle2 className="w-5 h-5 text-chart-2" />
                ) : (
                  <XCircle className="w-5 h-5 text-destructive" />
                )}
                <h3 className="font-medium">
                  Question {idx + 1}
                  <span className="ml-2 text-xs uppercase tracking-wide text-muted-foreground">
                    {q.format === "mc" ? "Multiple choice" : "Written"}
                  </span>
                </h3>
              </div>
              <div className="prose prose-slate dark:prose-invert max-w-none mb-4">
                <MarkdownRenderer content={q.prompt} />
              </div>
              <div className="mb-3">
                <span className="text-sm font-semibold">Your answer:</span>
                <div className="font-mono mt-1">{a?.answer || "No answer"}</div>
              </div>
              {!correct && q.correctAnswer && (
                <div className="mb-3 text-primary">
                  <span className="text-sm font-semibold">Correct answer:</span>
                  <div className="font-mono mt-1">{q.correctAnswer}</div>
                </div>
              )}
              {q.explanation && (
                <div>
                  <span className="text-sm font-semibold">Explanation:</span>
                  <div className="mt-1 text-sm">
                    <MarkdownRenderer content={q.explanation} />
                  </div>
                </div>
              )}
              {a?.aiFlagged && (
                <div className="mt-4 p-3 bg-secondary rounded-md text-sm border border-secondary-border">
                  <strong className="text-chart-4">
                    Flagged content accepted — no penalty (diagnostics are ungraded).
                  </strong>
                  {a.detectionRationale && (
                    <p className="text-muted-foreground mt-1">
                      {a.detectionRationale}
                    </p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function AssessmentRunner() {
  const params = useParams();
  const attemptId = Number(params.id);

  const { data: attempt, isLoading } = useQuery({
    queryKey: ["assessment-attempt", attemptId],
    queryFn: () => assessmentsApi.getAttempt(attemptId),
    enabled: !!attemptId,
  });

  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [idx, setIdx] = useState(0);
  const [result, setResult] = useState<AttemptDetail | null>(null);

  useEffect(() => {
    if (attempt) {
      const initial: Record<number, string> = {};
      attempt.answers.forEach((a) => {
        initial[a.questionId] = a.answer;
      });
      setAnswers(initial);
      if (attempt.status === "completed") setResult(attempt);
    }
  }, [attempt]);

  const submitMut = useMutation({
    mutationFn: () => assessmentsApi.submit(attemptId),
  });
  const [flushing, setFlushing] = useState(false);

  // Per-question serialized save: each question has a promise chain so writes
  // for the same question can never land out of order, and superseded values
  // are coalesced. This prevents an older keystroke save from overwriting a
  // newer one (which would corrupt the answer graded at submit time).
  const chainRef = useRef<Record<number, Promise<void>>>({});
  const lastQueuedRef = useRef<Record<number, string>>({});
  const latestTraceRef = useRef<Record<number, KeystrokeTrace | undefined>>({});

  function enqueueSave(
    questionId: number,
    answer: string,
    trace?: KeystrokeTrace,
  ): Promise<void> {
    lastQueuedRef.current[questionId] = answer;
    if (trace) latestTraceRef.current[questionId] = trace;
    const prev = chainRef.current[questionId] ?? Promise.resolve();
    const next = prev.then(async () => {
      // Coalesce: skip if a newer value has since been queued.
      if (lastQueuedRef.current[questionId] !== answer) return;
      try {
        await assessmentsApi.saveAnswer(
          attemptId,
          questionId,
          answer,
          latestTraceRef.current[questionId],
        );
      } catch {
        // Best-effort; the pre-submit flush will retry the authoritative value.
      }
    });
    chainRef.current[questionId] = next;
    return next;
  }

  function setAnswer(questionId: number, answer: string, trace?: KeystrokeTrace) {
    setAnswers((prev) => ({ ...prev, [questionId]: answer }));
    void enqueueSave(questionId, answer, trace);
  }

  async function handleSubmit() {
    if (flushing || submitMut.isPending) return;
    setFlushing(true);
    try {
      // Flush the authoritative current value for every question, in order,
      // so the server grades exactly what the student sees.
      await Promise.all(
        (attempt?.questions ?? []).map((q) =>
          enqueueSave(q.id, answers[q.id] ?? "", latestTraceRef.current[q.id]),
        ),
      );
    } finally {
      setFlushing(false);
    }
    submitMut.mutate(undefined, {
      onSuccess: (data) => {
        setResult(data);
        window.scrollTo({ top: 0 });
      },
    });
  }

  if (isLoading || !attempt) {
    return (
      <Layout>
        <div className="p-8 max-w-4xl mx-auto w-full flex flex-col gap-8">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-64 w-full" />
        </div>
      </Layout>
    );
  }

  if (result) {
    return (
      <Layout>
        <div className="p-8 max-w-4xl mx-auto w-full flex flex-col gap-8 pb-24">
          <ResultsView attempt={result} />
        </div>
      </Layout>
    );
  }

  const q = attempt.questions[idx];
  const total = attempt.questions.length;

  return (
    <Layout>
      <div className="p-8 max-w-4xl mx-auto w-full flex flex-col gap-6 pb-24">
        <div className="flex justify-between items-center border-b pb-4">
          <div>
            <h1 className="text-2xl font-serif font-bold text-primary">
              {attempt.isCustom ? "Custom diagnostic" : attempt.assessmentTitle}
            </h1>
            <p className="text-sm text-muted-foreground">
              Question {idx + 1} of {total}
              {attempt.isOfficial && (
                <span className="ml-2 text-primary font-semibold">
                  · Official (counts for credit)
                </span>
              )}
            </p>
          </div>
          <Link href="/assessments">
            <Button variant="ghost" size="sm">
              Exit
            </Button>
          </Link>
        </div>

        {q ? (
          <div className="flex flex-col gap-8">
            <div className="prose prose-slate dark:prose-invert max-w-none text-lg">
              <MarkdownRenderer content={q.prompt} />
            </div>

            {q.format === "mc" && q.choices ? (
              <div className="flex flex-col gap-3">
                {q.choices.map((choice, ci) => {
                  const selected = answers[q.id] === choice;
                  return (
                    <button
                      key={ci}
                      onClick={() => setAnswer(q.id, choice)}
                      className={`text-left p-4 rounded-md border transition-colors flex items-center gap-3 ${
                        selected
                          ? "border-primary bg-primary/5 ring-2 ring-primary"
                          : "border-input hover:bg-secondary"
                      }`}
                      data-testid={`choice-${q.id}-${ci}`}
                    >
                      <span
                        className={`w-6 h-6 rounded-full border flex items-center justify-center text-sm font-semibold shrink-0 ${
                          selected
                            ? "bg-primary text-primary-foreground border-primary"
                            : "border-muted-foreground text-muted-foreground"
                        }`}
                      >
                        {String.fromCharCode(65 + ci)}
                      </span>
                      <span className="prose prose-slate dark:prose-invert max-w-none">
                        <MarkdownRenderer content={choice} />
                      </span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <AnswerInput
                value={answers[q.id] || ""}
                onChange={(val, trace) => setAnswer(q.id, val, trace)}
                promptSource={q.prompt}
              />
            )}

            <div className="flex justify-between mt-8 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => setIdx((p) => Math.max(0, p - 1))}
                disabled={idx === 0}
              >
                Previous
              </Button>
              {idx < total - 1 ? (
                <Button onClick={() => setIdx((p) => Math.min(total - 1, p + 1))}>
                  Next
                </Button>
              ) : (
                <Button
                  onClick={handleSubmit}
                  className="bg-chart-2 hover:bg-chart-2/90 text-white"
                  disabled={submitMut.isPending || flushing}
                  data-testid="button-submit-assessment"
                >
                  {submitMut.isPending || flushing
                    ? "Submitting…"
                    : "Submit Assessment"}
                </Button>
              )}
            </div>
          </div>
        ) : (
          <div>Question not found.</div>
        )}
      </div>
    </Layout>
  );
}
