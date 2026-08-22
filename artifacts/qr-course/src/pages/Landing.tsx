import { BookOpen, Sparkles, PenTool, ArrowRight } from "lucide-react";
import { Link } from "wouter";
import { CourseTopicsList } from "@/components/CourseTopicsList";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

const highlights = [
  {
    icon: BookOpen,
    title: "28 micro-lectures",
    body: "Four weeks rebuilding arithmetic from place value to the start of algebra.",
  },
  {
    icon: Sparkles,
    title: "Section-scoped AI tutor",
    body: "Ask questions grounded in the exact lecture you're reading.",
  },
  {
    icon: PenTool,
    title: "Write the answer",
    body: "Compose fractions, exponents, and equations in proper math notation.",
  },
];

export default function Landing() {
  return (
    <div className="min-h-[100dvh] bg-background text-foreground flex flex-col">
      <header className="flex items-center justify-between px-6 py-5 max-w-6xl mx-auto w-full">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-primary rounded-md flex items-center justify-center text-primary-foreground font-serif font-bold text-xl">
            +
          </div>
          <span className="font-serif font-semibold text-lg tracking-tight">
            DevMath
          </span>
        </div>
      </header>

      <div className="flex-1 flex flex-col lg:flex-row max-w-6xl mx-auto w-full">
        <aside className="px-6 pt-8 lg:w-64 shrink-0">
          <CourseTopicsList />
        </aside>
        <main className="flex-1 flex flex-col items-center justify-center px-6 py-16 max-w-3xl mx-auto w-full text-center">
        <p className="text-sm font-medium uppercase tracking-[0.18em] text-muted-foreground mb-5">
          A four-week foundations course
        </p>
        <h1 className="font-serif font-bold text-4xl sm:text-5xl leading-tight text-primary mb-5">
          Developmental Mathematics
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mb-9">
          Rebuild your arithmetic from the ground up — what numbers really are,
          how the four operations work, and why the rules you half-remember are
          actually true. Read the idea, ground it in an everyday example, then
          write the answer yourself.
        </p>
        <div className="flex items-center">
          <Link href="/dashboard">
            <button
              className="inline-flex items-center gap-3 px-6 py-3 rounded-md text-base font-medium bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
              data-testid="button-explore"
            >
              Start course
              <ArrowRight className="w-5 h-5" />
            </button>
          </Link>
        </div>
        <p className="text-xs text-muted-foreground mt-3">
          Your progress is saved automatically in this browser.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mt-16 w-full text-left">
          {highlights.map((h) => (
            <div
              key={h.title}
              className="rounded-xl border border-border bg-card p-5"
            >
              <h.icon className="w-6 h-6 text-primary mb-3" />
              <h3 className="font-serif font-semibold text-base mb-1.5">
                {h.title}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {h.body}
              </p>
            </div>
          ))}
        </div>
        </main>
      </div>

      <footer className="px-6 py-6 text-center text-xs text-muted-foreground border-t border-border">
        Developmental Mathematics — read the idea, ground the idea,
        write the idea.
      </footer>
    </div>
  );
}

export { basePath };
