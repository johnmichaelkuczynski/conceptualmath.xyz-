import { type ReactNode } from "react";
import {
  Switch,
  Route,
  Redirect,
  Router as WouterRouter,
} from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
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

const queryClient = new QueryClient();

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

function Protected({ children }: { children: ReactNode }) {
  const { isLoading, isAuthenticated } = useAuth();
  if (isLoading) return <AuthLoading />;
  if (!isAuthenticated) return <Redirect to="/" />;
  return <>{children}</>;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={HomeRedirect} />
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
      <Route path="/assessments">
        <Protected>
          <Assessments />
        </Protected>
      </Route>
      <Route path="/assessments/run/:id">
        <Protected>
          <AssessmentRunner />
        </Protected>
      </Route>
      <Route path="/gradebook">
        <Protected>
          <Gradebook />
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

function App() {
  return (
    <WouterRouter base={basePath}>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Router />
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </WouterRouter>
  );
}

export default App;
