import { BookOpen, Sparkles, PenTool, ArrowRight } from "lucide-react";
import { Link } from "wouter";
import { loginWithGoogle } from "@/hooks/useAuth";
import { CourseTopicsList } from "@/components/CourseTopicsList";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47a5.57 5.57 0 0 1-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09A11.99 11.99 0 0 0 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.27 14.29a7.19 7.19 0 0 1 0-4.58V6.62H1.29a12.04 12.04 0 0 0 0 10.76l3.98-3.09z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.69 1.29 6.62l3.98 3.09C6.22 6.86 8.87 4.75 12 4.75z"
      />
    </svg>
  );
}

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
        <div className="flex items-center gap-3">
          <button
            onClick={loginWithGoogle}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium border border-border hover:bg-secondary transition-colors"
            data-testid="button-login-header"
          >
            <GoogleIcon className="w-4 h-4" />
            Sign in with Google
          </button>
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
        {new URLSearchParams(window.location.search).get("error") ===
          "auth_failed" && (
          <div
            className="mb-6 px-4 py-3 rounded-md border border-destructive/40 bg-destructive/10 text-sm text-destructive"
            data-testid="text-auth-error"
          >
            Google sign-in didn't complete. Please try again.
          </div>
        )}
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <Link href="/dashboard">
            <button
              className="inline-flex items-center gap-3 px-6 py-3 rounded-md text-base font-medium bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
              data-testid="button-explore"
            >
              Start exploring — no sign-in needed
              <ArrowRight className="w-5 h-5" />
            </button>
          </Link>
          <button
            onClick={loginWithGoogle}
            className="inline-flex items-center gap-3 px-6 py-3 rounded-md text-base font-medium border border-border hover:bg-secondary transition-colors"
            data-testid="button-login-hero"
          >
            <GoogleIcon className="w-5 h-5" />
            Continue with Google
          </button>
        </div>
        <p className="text-xs text-muted-foreground mt-3">
          Browse the lectures and try problems free. Sign in with Google when
          you want your progress saved and charted.
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
