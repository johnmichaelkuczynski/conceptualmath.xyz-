import { useQuery } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Users } from "lucide-react";

interface UniqueVisitorStats {
  total: number;
  last24Hours: number;
  last7Days: number;
  last30Days: number;
}

export function VisitorsCard() {
  const { data } = useQuery<UniqueVisitorStats>({
    queryKey: ["unique-visitors"],
    queryFn: async () => {
      const res = await fetch("/api/unique-visitors");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return (await res.json()) as UniqueVisitorStats;
    },
    retry: false,
    staleTime: 60_000,
  });

  if (!data) return null;

  return (
    <Card data-testid="card-visitors" className="border-primary/30">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
          <Users className="w-4 h-4" />
          Unique Visitors
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div
          className="text-3xl font-serif font-bold mb-1"
          data-testid="text-unique-visitors-total"
        >
          {data.total.toLocaleString()}
        </div>
        <p className="text-xs text-muted-foreground">
          {data.last24Hours.toLocaleString()} in the last 24 h ·{" "}
          {data.last7Days.toLocaleString()} in 7 days ·{" "}
          {data.last30Days.toLocaleString()} in 30 days
        </p>
      </CardContent>
    </Card>
  );
}