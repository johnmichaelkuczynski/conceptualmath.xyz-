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
export function loginWithGoogle() {
  window.location.href = "/api/auth/google";
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
