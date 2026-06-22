import { useState } from "react";
import { Layout } from "@/components/layout/Layout";
import { Link, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckCircle2, Sparkles, ClipboardCheck } from "lucide-react";
import {
  assessmentsApi,
  VERSION_LABELS,
  VERSION_BLURBS,
  type AssessmentVersion,
  type AssessmentSummary,
} from "@/lib/assessmentsApi";

const VERSIONS: AssessmentVersion[] = [
  "multiple_choice",
  "written",
  "hybrid",
  "official",
];

function coverageLabel(a: AssessmentSummary): string {
  if (a.placement === "pre_course") return "Whole-course placement";
  if (a.coverageFromWeek === a.coverageToWeek) return `Covers Week ${a.coverageFromWeek}`;
  return `Cumulative · Weeks ${a.coverageFromWeek}–${a.coverageToWeek}`;
}

function AssessmentCard({
  a,
  onStart,
  pendingKey,
}: {
  a: AssessmentSummary;
  onStart: (slug: string, version: AssessmentVersion) => void;
  pendingKey: string | null;
}) {
  return (
    <Card className="flex flex-col">
      <CardHeader>
        <div className="flex items-start justify-between gap-3 mb-1">
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            {coverageLabel(a)}
          </span>
          {a.officialCompleted ? (
            <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-chart-2/15 text-chart-2 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5" /> Credit earned
            </span>
          ) : (
            <span className="text-xs px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground">
              Not yet completed
            </span>
          )}
        </div>
        <CardTitle className="text-lg">{a.title}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 flex-1">
        <p className="text-sm text-muted-foreground">{a.description}</p>
        {(a.attemptsCount > 0 || a.bestScorePercent !== null) && (
          <div className="text-xs text-muted-foreground flex flex-wrap gap-x-4 gap-y-1">
            <span>{a.attemptsCount} attempt{a.attemptsCount === 1 ? "" : "s"}</span>
            {a.bestScorePercent !== null && (
              <span className="font-semibold text-foreground">
                Best: {Math.round(a.bestScorePercent)}%
              </span>
            )}
          </div>
        )}
        <div className="mt-auto flex flex-col gap-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Pick a version
          </p>
          <div className="grid grid-cols-2 gap-2">
            {VERSIONS.map((v) => {
              const isOfficial = v === "official";
              const key = `${a.slug}:${v}`;
              return (
                <Button
                  key={v}
                  size="sm"
                  variant={isOfficial ? "default" : "outline"}
                  disabled={pendingKey !== null}
                  onClick={() => onStart(a.slug, v)}
                  className={isOfficial ? "relative" : ""}
                  title={VERSION_BLURBS[v]}
                  data-testid={`button-start-${a.slug}-${v}`}
                >
                  {pendingKey === key ? "Generating…" : VERSION_LABELS[v]}
                  {isOfficial && (
                    <span className="ml-1 text-[10px] font-bold uppercase opacity-90">
                      ★
                    </span>
                  )}
                </Button>
              );
            })}
          </div>
          <p className="text-[11px] text-muted-foreground leading-snug">
            <span className="font-semibold">Official ★</span> is the required version
            (12 questions, hybrid) — completing it earns full diagnostic credit. All
            versions are ungraded and re-takeable with brand-new questions.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Assessments() {
  const [, setLocation] = useLocation();
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["assessments"],
    queryFn: assessmentsApi.list,
  });

  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [scope, setScope] = useState("");
  const [customVersion, setCustomVersion] =
    useState<AssessmentVersion>("hybrid");

  const startMut = useMutation({
    mutationFn: ({ slug, version }: { slug: string; version: AssessmentVersion }) =>
      assessmentsApi.start(slug, version),
  });
  const customMut = useMutation({
    mutationFn: ({ scope, version }: { scope: string; version: AssessmentVersion }) =>
      assessmentsApi.startCustom(scope, version),
  });

  function handleStart(slug: string, version: AssessmentVersion) {
    setError(null);
    setPendingKey(`${slug}:${version}`);
    startMut.mutate(
      { slug, version },
      {
        onSuccess: (attempt) => setLocation(`/assessments/run/${attempt.id}`),
        onError: (e) => {
          setError((e as Error).message);
          setPendingKey(null);
        },
      },
    );
  }

  function handleCustom() {
    if (scope.trim().length < 3) {
      setError("Describe what you'd like the assessment to focus on.");
      return;
    }
    setError(null);
    setPendingKey("custom");
    customMut.mutate(
      { scope: scope.trim(), version: customVersion },
      {
        onSuccess: (attempt) => setLocation(`/assessments/run/${attempt.id}`),
        onError: (e) => {
          setError((e as Error).message);
          setPendingKey(null);
        },
      },
    );
  }

  const preCourse = data?.assessments.find((a) => a.placement === "pre_course");
  const weekEnds = data?.assessments.filter((a) => a.placement === "week_end") ?? [];

  return (
    <Layout>
      <div className="p-8 max-w-5xl mx-auto w-full flex flex-col gap-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-serif font-bold text-primary mb-2">
              Diagnostic Assessments
            </h1>
            <p className="text-muted-foreground max-w-2xl">
              Self-paced checkpoints that show you where you stand. They're ungraded —
              completing the <strong>Official</strong> version of each earns full credit
              toward your diagnostic grade (20% of the course). Take them in any order,
              as many times as you like.
            </p>
          </div>
          <Link href="/gradebook">
            <Button variant="outline" className="gap-2" data-testid="link-gradebook">
              <ClipboardCheck className="w-4 h-4" /> Gradebook
            </Button>
          </Link>
        </div>

        {error && (
          <div className="p-3 rounded-md border border-destructive/40 bg-destructive/5 text-sm text-destructive">
            {error}
          </div>
        )}

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        ) : (
          <>
            {preCourse && (
              <div className="flex flex-col gap-4">
                <h2 className="text-2xl font-serif font-semibold border-b pb-2">
                  Before you begin
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <AssessmentCard
                    a={preCourse}
                    onStart={handleStart}
                    pendingKey={pendingKey}
                  />
                </div>
              </div>
            )}

            <div className="flex flex-col gap-4">
              <h2 className="text-2xl font-serif font-semibold border-b pb-2">
                Week checkpoints
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {weekEnds.map((a) => (
                  <AssessmentCard
                    key={a.slug}
                    a={a}
                    onStart={handleStart}
                    pendingKey={pendingKey}
                  />
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-4">
              <h2 className="text-2xl font-serif font-semibold border-b pb-2 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" /> Build an assessment for
                your needs
              </h2>
              <Card>
                <CardContent className="pt-6 flex flex-col gap-4">
                  <p className="text-sm text-muted-foreground">
                    Describe exactly what you want to be tested on — a single tricky
                    idea, a mix of topics, or anything across the whole course. We'll
                    generate a fresh assessment tailored to your request.
                  </p>
                  <textarea
                    value={scope}
                    onChange={(e) => setScope(e.target.value)}
                    placeholder="e.g. 'adding and subtracting fractions with unlike denominators, plus converting them to decimals' or 'solving two-step equations and word problems that translate into equations'"
                    className="w-full min-h-[100px] p-4 bg-card border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary text-sm resize-y"
                    maxLength={500}
                    data-testid="input-custom-scope"
                  />
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">Format:</span>
                      <div className="flex gap-1">
                        {VERSIONS.map((v) => (
                          <button
                            key={v}
                            onClick={() => setCustomVersion(v)}
                            className={`text-xs px-2.5 py-1 rounded-md border transition-colors ${
                              customVersion === v
                                ? "bg-primary text-primary-foreground border-primary"
                                : "border-border hover:bg-secondary"
                            }`}
                            data-testid={`button-custom-version-${v}`}
                          >
                            {VERSION_LABELS[v]}
                          </button>
                        ))}
                      </div>
                    </div>
                    <Button
                      onClick={handleCustom}
                      disabled={pendingKey !== null}
                      className="ml-auto gap-2"
                      data-testid="button-start-custom"
                    >
                      <Sparkles className="w-4 h-4" />
                      {pendingKey === "custom"
                        ? "Generating…"
                        : "Build my assessment"}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {data && data.custom.length > 0 && (
                <div className="flex flex-col gap-2">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                    Your custom assessments
                  </h3>
                  <div className="flex flex-col gap-2">
                    {data.custom.map((c) => (
                      <Link key={c.id} href={`/assessments/run/${c.id}`}>
                        <div className="flex items-center justify-between gap-4 p-3 rounded-md border border-border hover:bg-secondary cursor-pointer">
                          <span className="text-sm truncate flex-1" title={c.customScope}>
                            {c.customScope}
                          </span>
                          <span className="text-xs text-muted-foreground whitespace-nowrap">
                            {c.status === "completed"
                              ? `Done · ${Math.round(c.scorePercent ?? 0)}%`
                              : "In progress"}
                          </span>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        <button onClick={() => refetch()} className="sr-only" aria-hidden>
          refresh
        </button>
      </div>
    </Layout>
  );
}
