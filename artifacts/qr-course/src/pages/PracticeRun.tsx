import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, Link } from "wouter";
import {
  useGetPracticeRun,
  useSavePracticeRunAnswer,
  useSubmitPracticeRun,
  useSendPracticeRunMessage,
  type KeystrokeTrace,
  type PracticeRunDetail,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { MarkdownRenderer } from "@/components/MarkdownRenderer";
import { AnswerInput } from "@/components/AnswerInput";
import { TutorPanel } from "@/components/TutorPanel";
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Send,
  Target,
  RefreshCw,
} from "lucide-react";

const EMPTY_TRACE: KeystrokeTrace = {
  keystrokeCount: 0,
  eraseCount: 0,
  durationMs: 0,
};

export default function PracticeRun() {
  const params = useParams<{ id: string }>();
  const runId = parseInt(params.id ?? "", 10);
  const qc = useQueryClient();

  const { data: run, isLoading } = useGetPracticeRun(runId, {
    query: { enabled: Number.isFinite(runId), queryKey: ["practice-run", runId] },
  });

  const saveAnswer = useSavePracticeRunAnswer();
  const submitRun = useSubmitPracticeRun();
  const sendMessage = useSendPracticeRunMessage();

  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [traces, setTraces] = useState<Record<number, KeystrokeTrace>>({});
  const [hydrated, setHydrated] = useState(false);
  const [dialogueDraft, setDialogueDraft] = useState("");
  const dialogueRef = useRef<HTMLDivElement | null>(null);

  const submitted = run?.status === "submitted";

  // Hydrate local answer state once from any saved answers.
  useEffect(() => {
    if (!run || hydrated) return;
    const a: Record<number, string> = {};
    for (const ans of run.answers) a[ans.problemId] = ans.answer;
    setAnswers(a);
    setHydrated(true);
  }, [run, hydrated]);

  useEffect(() => {
    dialogueRef.current?.scrollTo({ top: dialogueRef.current.scrollHeight });
  }, [run?.messages.length, sendMessage.isPending]);

  const answerByProblem = useMemo(() => {
    const map = new Map<number, PracticeRunDetail["answers"][number]>();
    run?.answers.forEach((a) => map.set(a.problemId, a));
    return map;
  }, [run]);

  function invalidate() {
    qc.invalidateQueries({ queryKey: ["practice-run", runId] });
  }

  function handleChange(problemId: number, val: string, trace: KeystrokeTrace) {
    setAnswers((p) => ({ ...p, [problemId]: val }));
    setTraces((p) => ({ ...p, [problemId]: trace }));
    saveAnswer.mutate({ runId, data: { problemId, answer: val } });
  }

  function handleSubmit() {
    submitRun.mutate({ runId }, { onSuccess: () => invalidate() });
  }

  function handleSendDialogue() {
    const content = dialogueDraft.trim();
    if (!content || sendMessage.isPending) return;
    setDialogueDraft("");
    sendMessage.mutate(
      { runId, data: { content } },
      { onSuccess: () => invalidate() },
    );
  }

  if (!Number.isFinite(runId)) {
    return (
      <Layout>
        <div className="p-8 max-w-3xl mx-auto">
          <div className="text-red-700">Invalid practice run.</div>
          <Link href="/assignments" className="text-primary underline">
            Back to assignments
          </Link>
        </div>
      </Layout>
    );
  }

  if (isLoading || !run) {
    return (
      <Layout>
        <div className="p-8 max-w-5xl mx-auto w-full flex flex-col gap-6">
          <Skeleton className="h-10 w-72" />
          <Skeleton className="h-64 w-full" />
        </div>
      </Layout>
    );
  }

  const answeredCount = run.problems.filter(
    (p) => (answers[p.id] ?? "").trim().length > 0,
  ).length;
  const allAnswered = answeredCount === run.problems.length;

  return (
    <Layout>
      <div className="p-6 md:p-8 max-w-6xl mx-auto w-full grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6 items-start">
        <div className="flex flex-col gap-5 min-w-0">
          <div>
            <Link
              href="/assignments"
              className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to assignments
            </Link>
          </div>

          <div className="flex flex-col gap-1">
            <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
              Practice · {run.assignmentKind}
              {run.weekNumber != null ? ` · Week ${run.weekNumber}` : ""}
            </div>
            <h1 className="font-serif text-3xl">{run.assignmentTitle}</h1>
            <p className="text-sm text-muted-foreground">
              Fresh, never-repeating problems that mirror this graded assignment.
              Nothing here is scored on your record — practice as many times as you
              want.
            </p>
          </div>

          {submitted ? (
            <SubmittedView run={run} />
          ) : (
            <div className="text-sm bg-secondary/60 border rounded-md p-3">
              {answeredCount}/{run.problems.length} answered. Take your time — the AI
              tutor on the right is always available.
            </div>
          )}

          <div className="flex flex-col gap-6">
            {run.problems.map((problem, idx) => {
              const view = answerByProblem.get(problem.id);
              return (
                <div key={problem.id} className="bg-card border rounded-lg p-4 flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Problem {idx + 1}
                      {problem.topicTitle ? ` · ${problem.topicTitle}` : ""}
                    </div>
                    {submitted && view && (
                      <div
                        className={`flex items-center gap-1 text-xs font-semibold ${
                          view.correct ? "text-emerald-700" : "text-red-700"
                        }`}
                      >
                        {view.correct ? (
                          <CheckCircle2 className="w-4 h-4" />
                        ) : (
                          <XCircle className="w-4 h-4" />
                        )}
                        {view.correct ? "Correct" : "Not quite"}
                      </div>
                    )}
                  </div>

                  <div className="prose prose-sm max-w-none">
                    <MarkdownRenderer content={problem.prompt} />
                  </div>

                  <AnswerInput
                    value={answers[problem.id] ?? ""}
                    onChange={(val, t) => handleChange(problem.id, val, t)}
                    disabled={submitted}
                    promptSource={problem.prompt}
                  />

                  {submitted && view && (
                    <div
                      className={`rounded-md border p-3 text-sm ${
                        view.correct
                          ? "bg-emerald-50 border-emerald-300"
                          : "bg-red-50 border-red-300"
                      }`}
                    >
                      {!view.correct && view.correctAnswer && (
                        <div className="mb-2">
                          <span className="font-semibold">Correct answer: </span>
                          <span className="font-mono">{view.correctAnswer}</span>
                        </div>
                      )}
                      {view.feedback && (
                        <div className="prose prose-sm max-w-none">
                          <MarkdownRenderer content={view.feedback} />
                        </div>
                      )}
                      {!view.feedback && view.explanation && (
                        <div className="prose prose-sm max-w-none">
                          <MarkdownRenderer content={view.explanation} />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {!submitted && (
            <div className="flex items-center justify-between border-t pt-4">
              <div className="text-xs text-muted-foreground">
                {saveAnswer.isPending ? "Saving…" : "Answers auto-save as you type."}
              </div>
              <Button
                onClick={handleSubmit}
                disabled={!allAnswered || submitRun.isPending}
              >
                {submitRun.isPending ? "Grading…" : "Submit practice for feedback"}
              </Button>
            </div>
          )}

          {submitted && (
            <DialogueSection
              run={run}
              draft={dialogueDraft}
              setDraft={setDialogueDraft}
              onSend={handleSendDialogue}
              sending={sendMessage.isPending}
              scrollRef={dialogueRef}
            />
          )}
        </div>

        <div className="lg:sticky lg:top-6 h-[70vh] lg:h-[calc(100vh-3rem)]">
          <TutorPanel
            contextText={buildTutorContext(run)}
            subtitle={`Practice for ${run.assignmentTitle}`}
          />
        </div>
      </div>
    </Layout>
  );
}

function buildTutorContext(run: PracticeRunDetail): string {
  const lines = [
    `This is practice for the graded assignment "${run.assignmentTitle}" (${run.assignmentKind}).`,
    "Help the student understand the methods. Do not simply hand over final answers to the graded assignment.",
    "Current practice problems:",
    ...run.problems.map((p, i) => `${i + 1}. ${p.prompt}`),
  ];
  return lines.join("\n");
}

function SubmittedView({ run }: { run: PracticeRunDetail }) {
  const score = run.scorePercent ?? 0;
  const tone =
    score >= 85
      ? "bg-emerald-50 border-emerald-300 text-emerald-900"
      : score >= 60
      ? "bg-amber-50 border-amber-300 text-amber-900"
      : "bg-red-50 border-red-300 text-red-900";
  return (
    <div className="flex flex-col gap-4">
      <div className={`rounded-lg border p-4 ${tone}`}>
        <div className="text-sm font-semibold uppercase tracking-wider">
          Practice score
        </div>
        <div className="text-3xl font-serif">
          {score}%
          {run.score != null && run.total != null && (
            <span className="text-base font-sans text-muted-foreground ml-2">
              ({run.score}/{run.total})
            </span>
          )}
        </div>
        {run.feedbackNarrative && (
          <div className="mt-3 prose prose-sm max-w-none">
            <MarkdownRenderer content={run.feedbackNarrative} />
          </div>
        )}
      </div>

      {run.focusPointers && run.focusPointers.length > 0 && (
        <div className="rounded-lg border p-4 bg-card">
          <div className="flex items-center gap-2 text-sm font-semibold mb-2">
            <Target className="w-4 h-4 text-primary" />
            What to focus on before the graded {run.assignmentKind}
          </div>
          <ul className="flex flex-col gap-2">
            {run.focusPointers.map((fp, i) => (
              <li key={i} className="text-sm">
                <span className="font-semibold">{fp.topicTitle}: </span>
                {fp.pointer}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <Link href={`/assignments/${run.assignmentId}`}>
          <Button variant="outline">
            <RefreshCw className="w-4 h-4 mr-1" />
            New practice round
          </Button>
        </Link>
        <Link href={`/assignments/${run.assignmentId}`}>
          <Button>Go to graded assignment</Button>
        </Link>
      </div>
    </div>
  );
}

function DialogueSection({
  run,
  draft,
  setDraft,
  onSend,
  sending,
  scrollRef,
}: {
  run: PracticeRunDetail;
  draft: string;
  setDraft: (v: string) => void;
  onSend: () => void;
  sending: boolean;
  scrollRef: React.RefObject<HTMLDivElement | null>;
}) {
  return (
    <div className="rounded-lg border bg-card flex flex-col">
      <div className="px-4 py-3 border-b">
        <div className="font-serif font-semibold">Discuss your feedback</div>
        <div className="text-xs text-muted-foreground">
          Ask follow-up questions about how you did and how to improve.
        </div>
      </div>
      <div ref={scrollRef} className="max-h-[320px] overflow-y-auto p-4 flex flex-col gap-3">
        {run.messages.length === 0 && !sending && (
          <div className="text-sm text-muted-foreground">
            No messages yet. Ask something like "Why was problem 2 wrong?" or "How
            can I get faster at these?"
          </div>
        )}
        {run.messages.map((m) => (
          <div
            key={m.id}
            className={
              m.role === "user"
                ? "self-end max-w-[85%] rounded-lg bg-primary text-primary-foreground px-3 py-2 text-sm"
                : "self-start max-w-[90%] rounded-lg bg-secondary px-3 py-2 text-sm"
            }
          >
            {m.role === "assistant" ? (
              <div className="prose prose-sm max-w-none">
                <MarkdownRenderer content={m.content} />
              </div>
            ) : (
              m.content
            )}
          </div>
        ))}
        {sending && (
          <div className="self-start max-w-[90%] rounded-lg bg-secondary px-3 py-2 text-sm text-muted-foreground italic">
            Thinking…
          </div>
        )}
      </div>
      <div className="border-t p-3 flex flex-col gap-2">
        <Textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              onSend();
            }
          }}
          placeholder="Ask about your results…"
          className="min-h-[60px] resize-none"
        />
        <div className="flex justify-end">
          <Button size="sm" onClick={onSend} disabled={!draft.trim() || sending}>
            <Send className="w-4 h-4 mr-1" />
            Send
          </Button>
        </div>
      </div>
    </div>
  );
}
