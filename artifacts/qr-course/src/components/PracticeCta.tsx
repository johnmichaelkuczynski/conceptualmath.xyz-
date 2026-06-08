import { useLocation } from "wouter";
import {
  useGetAssignmentReadiness,
  useCreatePracticeRun,
  type AssignmentReadinessReadinessLabel,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Sparkles, Loader2 } from "lucide-react";

const READINESS_STYLES: Record<
  AssignmentReadinessReadinessLabel,
  { label: string; className: string }
> = {
  not_ready: {
    label: "Not ready yet",
    className: "bg-red-100 text-red-800",
  },
  building: {
    label: "Building up",
    className: "bg-amber-100 text-amber-800",
  },
  almost: {
    label: "Almost ready",
    className: "bg-sky-100 text-sky-800",
  },
  ready: {
    label: "Ready",
    className: "bg-emerald-100 text-emerald-800",
  },
};

interface PracticeCtaProps {
  assignmentId: number;
  /** Use the compact layout (icon button + small badge). */
  compact?: boolean;
}

/**
 * Shows a per-assignment readiness signal and a button that spins up a fresh,
 * infinitely-regenerable practice run, then navigates to it.
 */
export function PracticeCta({ assignmentId, compact }: PracticeCtaProps) {
  const [, setLocation] = useLocation();
  const { data: readiness } = useGetAssignmentReadiness(assignmentId, {
    query: {
      queryKey: ["assignment-readiness", assignmentId],
    },
  });
  const createRun = useCreatePracticeRun();

  function startPractice() {
    createRun.mutate(
      { assignmentId },
      { onSuccess: (run) => setLocation(`/practice-runs/${run.id}`) },
    );
  }

  const style = readiness ? READINESS_STYLES[readiness.readinessLabel] : null;

  return (
    <div className={compact ? "flex items-center gap-2" : "flex flex-col gap-2"}>
      {readiness && style && (
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`text-xs font-semibold px-2 py-0.5 rounded-full ${style.className}`}
          >
            {style.label}
          </span>
          {readiness.practiceRunCount > 0 && (
            <span className="text-xs text-muted-foreground">
              {readiness.practiceRunCount} practice run
              {readiness.practiceRunCount === 1 ? "" : "s"}
              {readiness.bestPracticeScore != null
                ? ` · best ${readiness.bestPracticeScore}%`
                : ""}
            </span>
          )}
        </div>
      )}

      {!compact && readiness?.message && (
        <p className="text-xs text-muted-foreground">{readiness.message}</p>
      )}

      <Button
        variant="outline"
        size={compact ? "sm" : "default"}
        className={compact ? "" : "w-full"}
        onClick={startPractice}
        disabled={createRun.isPending}
      >
        {createRun.isPending ? (
          <Loader2 className="w-4 h-4 mr-1 animate-spin" />
        ) : (
          <Sparkles className="w-4 h-4 mr-1" />
        )}
        {createRun.isPending ? "Building practice…" : "Practice this"}
      </Button>
    </div>
  );
}
