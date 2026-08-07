import { useEffect, useState, type ReactNode } from "react";
import { loginWithGoogle, useAuth } from "@/hooks/useAuth";

// ---------------------------------------------------------------------------
// Friendly "please sign in" surfaces for guest mode.
//
// The API answers 401 with { code: "LOGIN_REQUIRED" } when a guest either
// exhausts the free-interaction allowance or opens a login-only feature
// (progress charting). A global QueryClient error handler calls
// notifyLoginRequired(message) and the dialog below appears.
// ---------------------------------------------------------------------------

const EVENT_NAME = "devmath:login-required";

export function notifyLoginRequired(message?: string) {
  window.dispatchEvent(
    new CustomEvent(EVENT_NAME, { detail: { message: message || null } }),
  );
}

/** Returns true when an API error is the friendly login-required signal. */
export function isLoginRequiredError(error: unknown): string | null {
  const e = error as {
    status?: number;
    data?: { code?: string; message?: string } | null;
  };
  if (e && e.status === 401 && e.data?.code === "LOGIN_REQUIRED") {
    return e.data.message || "";
  }
  return null;
}

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

export function GoogleSignInButton({
  label = "Continue with Google",
  className = "",
}: {
  label?: string;
  className?: string;
}) {
  return (
    <button
      onClick={loginWithGoogle}
      className={`inline-flex items-center justify-center gap-3 px-5 py-2.5 rounded-md text-sm font-medium bg-primary text-primary-foreground hover:opacity-90 transition-opacity ${className}`}
      data-testid="button-login-google"
    >
      <GoogleIcon className="w-4 h-4" />
      {label}
    </button>
  );
}

/**
 * Mounted once in App. Listens for the login-required event and shows a
 * friendly, non-scary reminder dialog with a Google sign-in button.
 */
export function LoginReminderDialog() {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const handler = (e: Event) => {
      setMessage((e as CustomEvent).detail?.message || null);
      setOpen(true);
    };
    window.addEventListener(EVENT_NAME, handler);
    return () => window.removeEventListener(EVENT_NAME, handler);
  }, []);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      data-testid="dialog-login-reminder"
    >
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-xl text-center">
        <div className="mx-auto mb-4 w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-2xl font-serif font-bold text-primary">
          +
        </div>
        <h2 className="font-serif font-semibold text-xl mb-2">
          Glad you're enjoying the course!
        </h2>
        <p className="text-sm text-muted-foreground mb-5">
          {message ||
            "You've reached the free preview limit. You can absolutely keep going — just sign in with Google (it's free) so the course can save your work and chart your progress."}
        </p>
        <div className="flex flex-col items-center gap-3">
          <GoogleSignInButton label="Sign in with Google to continue" />
          <button
            onClick={() => setOpen(false)}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            data-testid="button-dismiss-login-reminder"
          >
            Not now — keep browsing
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Wraps login-only pages (progress charting: analytics, assessments,
 * gradebook, diagnostics). Guests see a friendly inline sign-in card
 * instead of the page.
 */
export function RequireLogin({
  children,
  feature = "chart your progress",
}: {
  children: ReactNode;
  feature?: string;
}) {
  const { isLoading, isAuthenticated } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  if (isAuthenticated) return <>{children}</>;

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-6">
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-8 text-center">
        <div className="mx-auto mb-4 w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-2xl font-serif font-bold text-primary">
          +
        </div>
        <h2 className="font-serif font-semibold text-xl mb-2">
          Sign in to {feature}
        </h2>
        <p className="text-sm text-muted-foreground mb-6">
          You can explore the lectures and try problems without an account.
          To {feature} and keep your work saved, sign in with Google — it's
          free and takes a few seconds.
        </p>
        <GoogleSignInButton />
      </div>
    </div>
  );
}
