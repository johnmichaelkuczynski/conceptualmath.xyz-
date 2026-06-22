import { Layout } from "@/components/layout/Layout";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckCircle2, Circle } from "lucide-react";
import { assessmentsApi } from "@/lib/assessmentsApi";

function ProgressBar({ percent }: { percent: number }) {
  return (
    <div className="w-full h-2 rounded-full bg-secondary overflow-hidden">
      <div
        className="h-full bg-primary rounded-full transition-all"
        style={{ width: `${Math.max(0, Math.min(100, percent))}%` }}
      />
    </div>
  );
}

export default function Gradebook() {
  const { data, isLoading } = useQuery({
    queryKey: ["gradebook"],
    queryFn: assessmentsApi.gradebook,
  });

  return (
    <Layout>
      <div className="p-8 max-w-4xl mx-auto w-full flex flex-col gap-8">
        <div>
          <h1 className="text-3xl font-serif font-bold text-primary mb-2">
            Gradebook
          </h1>
          <p className="text-muted-foreground max-w-2xl">
            Your overall grade combines graded assignments (80%) with completion of the
            official diagnostic assessments (20%). The course is self-paced — nothing is
            locked, so work through it in whatever order suits you.
          </p>
        </div>

        {isLoading || !data ? (
          <div className="flex flex-col gap-4">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
        ) : (
          <>
            <Card>
              <CardContent className="pt-6 flex items-center justify-between gap-6">
                <div>
                  <p className="text-sm text-muted-foreground uppercase tracking-wide">
                    Overall grade
                  </p>
                  <p className="text-5xl font-serif font-bold text-primary mt-1">
                    {data.letterGrade}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-4xl font-bold">{data.overallPercent}%</p>
                  <p className="text-xs text-muted-foreground">weighted total</p>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {data.categories.map((c) => (
                <Card key={c.key}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">{c.label}</CardTitle>
                      <span className="text-xs font-bold text-muted-foreground">
                        {c.weightPercent}%
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent className="flex flex-col gap-2">
                    <div className="flex items-baseline justify-between">
                      <span className="text-2xl font-bold">{c.scorePercent}%</span>
                      <span className="text-sm text-muted-foreground">
                        {c.completed} / {c.total} completed
                      </span>
                    </div>
                    <ProgressBar percent={c.scorePercent} />
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-serif font-semibold">Assignments</h2>
                <Link href="/assignments">
                  <Button variant="ghost" size="sm">
                    Go to assignments
                  </Button>
                </Link>
              </div>
              <Card>
                <CardContent className="pt-4 divide-y divide-border">
                  {data.assignments.map((a) => (
                    <div
                      key={a.id}
                      className="flex items-center justify-between gap-4 py-3"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{a.title}</p>
                        <p className="text-xs text-muted-foreground uppercase tracking-wide">
                          Week {a.weekNumber} · {a.kind}
                        </p>
                      </div>
                      <span className="text-sm whitespace-nowrap">
                        {a.attempted ? (
                          <span className="font-semibold">{a.bestScore}%</span>
                        ) : (
                          <span className="text-muted-foreground">Not started</span>
                        )}
                      </span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>

            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-serif font-semibold">
                  Diagnostic assessments
                </h2>
                <Link href="/assessments">
                  <Button variant="ghost" size="sm">
                    Go to assessments
                  </Button>
                </Link>
              </div>
              <Card>
                <CardContent className="pt-4 divide-y divide-border">
                  {data.diagnostics.map((d) => (
                    <div
                      key={d.slug}
                      className="flex items-center justify-between gap-4 py-3"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {d.officialCompleted ? (
                          <CheckCircle2 className="w-5 h-5 text-chart-2 shrink-0" />
                        ) : (
                          <Circle className="w-5 h-5 text-muted-foreground shrink-0" />
                        )}
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{d.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {d.attempts} attempt{d.attempts === 1 ? "" : "s"}
                            {d.bestScore !== null && ` · best ${Math.round(d.bestScore)}%`}
                          </p>
                        </div>
                      </div>
                      <span className="text-sm whitespace-nowrap">
                        {d.officialCompleted ? (
                          <span className="font-semibold text-chart-2">Credit</span>
                        ) : (
                          <span className="text-muted-foreground">No credit yet</span>
                        )}
                      </span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}
