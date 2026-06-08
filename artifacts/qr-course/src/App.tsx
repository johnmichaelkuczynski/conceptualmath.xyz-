import { useEffect, useRef, type ReactNode } from "react";
import {
  ClerkProvider,
  SignIn,
  SignUp,
  Show,
} from "@clerk/react";
import { publishableKeyFromHost } from "@clerk/react/internal";
import { shadcn } from "@clerk/themes";
import {
  Switch,
  Route,
  Redirect,
  useLocation,
  Router as WouterRouter,
} from "wouter";
import {
  QueryClient,
  QueryClientProvider,
  useQueryClient,
} from "@tanstack/react-query";
import { useClerk } from "@clerk/react";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/Landing";

import Dashboard from "@/pages/Dashboard";
import Curriculum from "@/pages/Curriculum";
import Assignments from "@/pages/Assignments";
import Analytics from "@/pages/Analytics";
import WeekView from "@/pages/WeekView";
import LectureView from "@/pages/LectureView";
import AssignmentRunner from "@/pages/AssignmentRunner";
import Diagnostics from "@/pages/Diagnostics";
import TopicPractice from "@/pages/TopicPractice";
import PracticeRun from "@/pages/PracticeRun";

const queryClient = new QueryClient();

// REQUIRED — copy verbatim. Resolves the key from window.location.hostname so the
// same build serves multiple Clerk custom domains.
const clerkPubKey = publishableKeyFromHost(
  window.location.hostname,
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
);

// REQUIRED — copy verbatim. Empty in dev, auto-set in prod. Do NOT gate on PROD.
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

// Clerk passes full paths to routerPush/routerReplace, but wouter's
// setLocation prepends the base — strip it to avoid doubling.
function stripBase(path: string): string {
  return basePath && path.startsWith(basePath)
    ? path.slice(basePath.length) || "/"
    : path;
}

if (!clerkPubKey) {
  throw new Error("Missing VITE_CLERK_PUBLISHABLE_KEY in .env file");
}

const clerkAppearance = {
  theme: shadcn,
  cssLayerName: "clerk",
  options: {
    logoPlacement: "inside" as const,
    logoLinkUrl: basePath || "/",
    logoImageUrl: `${window.location.origin}${basePath}/logo.svg`,
  },
  variables: {
    colorPrimary: "hsl(222, 47%, 20%)",
    colorForeground: "hsl(222, 47%, 11%)",
    colorMutedForeground: "hsl(215, 16%, 47%)",
    colorDanger: "hsl(0, 84%, 60%)",
    colorBackground: "hsl(0, 0%, 100%)",
    colorInput: "hsl(0, 0%, 100%)",
    colorInputForeground: "hsl(222, 47%, 11%)",
    colorNeutral: "hsl(214, 32%, 88%)",
    fontFamily: "'Inter', sans-serif",
    borderRadius: "0.375rem",
  },
  elements: {
    rootBox: "w-full flex justify-center",
    cardBox:
      "bg-white border border-[hsl(214,32%,88%)] rounded-2xl w-[440px] max-w-full overflow-hidden shadow-sm",
    card: "!shadow-none !border-0 !bg-transparent !rounded-none",
    footer: "!shadow-none !border-0 !bg-transparent !rounded-none",
    headerTitle: "font-serif text-[hsl(222,47%,11%)]",
    headerSubtitle: "text-[hsl(215,16%,47%)]",
    socialButtonsBlockButtonText: "text-[hsl(222,47%,11%)] font-medium",
    formFieldLabel: "text-[hsl(222,47%,11%)]",
    footerActionLink: "text-[hsl(222,47%,20%)] font-medium hover:opacity-80",
    footerActionText: "text-[hsl(215,16%,47%)]",
    dividerText: "text-[hsl(215,16%,47%)]",
    identityPreviewEditButton: "text-[hsl(222,47%,20%)]",
    formFieldSuccessText: "text-[hsl(222,47%,20%)]",
    alertText: "text-[hsl(222,47%,11%)]",
    logoBox: "justify-center",
    logoImage: "h-12 w-12",
    socialButtonsBlockButton:
      "border border-[hsl(214,32%,88%)] hover:bg-[hsl(44,20%,96%)]",
    formButtonPrimary:
      "bg-[hsl(222,47%,20%)] hover:bg-[hsl(222,47%,16%)] text-white",
    formFieldInput:
      "bg-white border border-[hsl(214,32%,88%)] text-[hsl(222,47%,11%)]",
    footerAction: "text-[hsl(215,16%,47%)]",
    dividerLine: "bg-[hsl(214,32%,88%)]",
    alert: "border border-[hsl(214,32%,88%)]",
    otpCodeFieldInput:
      "border border-[hsl(214,32%,88%)] text-[hsl(222,47%,11%)]",
    formFieldRow: "gap-2",
    main: "gap-4",
  },
};

function SignInPage() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-background px-4">
      <SignIn
        routing="path"
        path={`${basePath}/sign-in`}
        signUpUrl={`${basePath}/sign-up`}
      />
    </div>
  );
}

function SignUpPage() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-background px-4">
      <SignUp
        routing="path"
        path={`${basePath}/sign-up`}
        signInUrl={`${basePath}/sign-in`}
      />
    </div>
  );
}

function HomeRedirect() {
  return (
    <>
      <Show when="signed-in">
        <Redirect to="/dashboard" />
      </Show>
      <Show when="signed-out">
        <Landing />
      </Show>
    </>
  );
}

function Protected({ children }: { children: ReactNode }) {
  return (
    <>
      <Show when="signed-in">{children}</Show>
      <Show when="signed-out">
        <Redirect to="/" />
      </Show>
    </>
  );
}

// Keeps the cached views fresh when the signed-in user changes.
function ClerkQueryClientCacheInvalidator() {
  const { addListener } = useClerk();
  const qc = useQueryClient();
  const prevUserIdRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    const unsubscribe = addListener(({ user }) => {
      const userId = user?.id ?? null;
      if (
        prevUserIdRef.current !== undefined &&
        prevUserIdRef.current !== userId
      ) {
        qc.clear();
      }
      prevUserIdRef.current = userId;
    });
    return unsubscribe;
  }, [addListener, qc]);

  return null;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={HomeRedirect} />
      <Route path="/sign-in/*?" component={SignInPage} />
      <Route path="/sign-up/*?" component={SignUpPage} />
      <Route path="/dashboard">
        <Protected>
          <Dashboard />
        </Protected>
      </Route>
      <Route path="/curriculum">
        <Protected>
          <Curriculum />
        </Protected>
      </Route>
      <Route path="/assignments">
        <Protected>
          <Assignments />
        </Protected>
      </Route>
      <Route path="/assignments/:id">
        <Protected>
          <AssignmentRunner />
        </Protected>
      </Route>
      <Route path="/analytics">
        <Protected>
          <Analytics />
        </Protected>
      </Route>
      <Route path="/diagnostics">
        <Protected>
          <Diagnostics />
        </Protected>
      </Route>
      <Route path="/weeks/:weekNumber">
        <Protected>
          <WeekView />
        </Protected>
      </Route>
      <Route path="/lectures/:lectureId">
        <Protected>
          <LectureView />
        </Protected>
      </Route>
      <Route path="/practice/topic/:topicId">
        <Protected>
          <TopicPractice />
        </Protected>
      </Route>
      <Route path="/practice-runs/:id">
        <Protected>
          <PracticeRun />
        </Protected>
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function ClerkProviderWithRoutes() {
  const [, setLocation] = useLocation();

  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      proxyUrl={clerkProxyUrl}
      appearance={clerkAppearance}
      signInUrl={`${basePath}/sign-in`}
      signUpUrl={`${basePath}/sign-up`}
      localization={{
        signIn: {
          start: {
            title: "Welcome back",
            subtitle: "Sign in to continue your course",
          },
        },
        signUp: {
          start: {
            title: "Create your account",
            subtitle: "Start teaching yourself developmental math",
          },
        },
      }}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <QueryClientProvider client={queryClient}>
        <ClerkQueryClientCacheInvalidator />
        <TooltipProvider>
          <Router />
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ClerkProvider>
  );
}

function App() {
  return (
    <WouterRouter base={basePath}>
      <ClerkProviderWithRoutes />
    </WouterRouter>
  );
}

export default App;
