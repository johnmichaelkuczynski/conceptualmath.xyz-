import { useQuery } from "@tanstack/react-query";

// Session-based auth against the Google OAuth backend. The session cookie is
// same-origin, so a plain fetch authenticates automatically.

export interface AuthUser {
  id: number;
  username: string;
  email: string | null;
  displayName: string | null;
}

interface AuthResponse {
  authenticated: boolean;
  user: AuthUser | null;
}

export function useAuth() {
  const { data, isLoading } = useQuery<AuthResponse>({
    queryKey: ["auth", "user"],
    queryFn: async () => {
      const res = await fetch("/api/auth/user", { credentials: "include" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return (await res.json()) as AuthResponse;
    },
    staleTime: 60_000,
    retry: 1,
  });

  return {
    isLoading,
    isAuthenticated: !!data?.authenticated,
    user: data?.user ?? null,
  };
}

// Click 1 of Google sign-in: full-page redirect to the server route, which
// 302s straight to Google's account chooser.
//
// Google refuses to render its sign-in page inside an iframe (403). The Replit
// workspace preview embeds this app in an iframe, so the redirect must happen
// in the top-level window. Assigning to window.top.location is permitted even
// cross-origin; if the browser blocks it anyway, fall back to a new tab.
export function loginWithGoogle() {
  const url = new URL("/api/auth/google", window.location.origin).href;
  if (window.top && window.top !== window.self) {
    try {
      window.top.location.href = url;
      return;
    } catch {
      window.open(url, "_blank", "noopener");
      return;
    }
  }
  window.location.href = url;
}

// Destroys the server session, then reloads at the landing page.
export async function logout() {
  try {
    await fetch("/api/auth/logout", {
      method: "POST",
      credentials: "include",
    });
  } finally {
    window.location.href = "/";
  }
}
