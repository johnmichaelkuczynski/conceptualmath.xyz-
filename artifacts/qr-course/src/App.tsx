import {
  Switch,
  Route,
  Redirect,
  Router as WouterRouter,
} from "wouter";
import {
  QueryClient,
  QueryClientProvider,
  QueryCache,
  MutationCache,
} from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import {
  LoginReminderDialog,
  RequireLogin,
  notifyLoginRequired,
  isLoginRequiredError,
} from "@/components/LoginGate";
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
import Assessments from "@/pages/Assessments";
import AssessmentRunner from "@/pages/AssessmentRunner";
import Gradebook from "@/pages/Gradebook";
import TopicPractice from "@/pages/TopicPractice";
import PracticeRun from "@/pages/PracticeRun";

// Whenever any API call comes back with the friendly LOGIN_REQUIRED signal
// (guest hit the free-use limit, or opened a login-only feature), pop the
// sign-in reminder instead of surfacing a raw error.
function handleApiError(error: unknown) {
  const message = isLoginRequiredError(error);
  if (message !== null) notifyLoginRequired(message);
}

const queryClient = new QueryClient({
  queryCache: new QueryCache({ onError: handleApiError }),
  mutationCache: new MutationCache({ onError: handleApiError }),
});

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

function AuthLoading() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-background">
      <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

function HomeRedirect() {
  const { isLoading, isAuthenticated } = useAuth();
  if (isLoading) return <AuthLoading />;
  if (isAuthenticated) return <Redirect to="/dashboard" />;
  return <Landing />;
}

// The course is open to guests: browsing, lectures, and (metered) practice
// all work without an account. Only progress-charting pages are wrapped in
// RequireLogin below.
function Router() {
  return (
    <Switch>
      <Route path="/" component={HomeRedirect} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/curriculum" component={Curriculum} />
      <Route path="/assignments" component={Assignments} />
      <Route path="/assignments/:id" component={AssignmentRunner} />
      <Route path="/analytics">
        <RequireLogin feature="chart your progress">
          <Analytics />
        </RequireLogin>
      </Route>
      <Route path="/assessments">
        <RequireLogin feature="take assessments and track your scores">
          <Assessments />
        </RequireLogin>
      </Route>
      <Route path="/assessments/run/:id">
        <RequireLogin feature="take assessments and track your scores">
          <AssessmentRunner />
        </RequireLogin>
      </Route>
      <Route path="/gradebook">
        <RequireLogin feature="see your gradebook">
          <Gradebook />
        </RequireLogin>
      </Route>
      <Route path="/diagnostics">
        <RequireLogin feature="run diagnostics">
          <Diagnostics />
        </RequireLogin>
      </Route>
      <Route path="/weeks/:weekNumber" component={WeekView} />
      <Route path="/lectures/:lectureId" component={LectureView} />
      <Route path="/practice/topic/:topicId" component={TopicPractice} />
      <Route path="/practice-runs/:id" component={PracticeRun} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <WouterRouter base={basePath}>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Router />
          <LoginReminderDialog />
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </WouterRouter>
  );
}

export default App;
