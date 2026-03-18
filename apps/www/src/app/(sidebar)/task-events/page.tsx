import { AuthGuard } from "@/components/auth-guard";
import { _role } from "@/components/sidebar/links";
import { ErrorFallback } from "@/components/error-fallback";
import { PageTitle } from "@gnd/ui/custom/page-title";
import { Suspense } from "react";
import { ErrorBoundary } from "next/dist/client/components/error-boundary";
import { TaskEventsDashboard } from "@/app-deps/(sidebar)/task-events/_components/task-events-dashboard";

export default async function Page() {
  return (
    <AuthGuard rules={[_role.is("Super Admin")]}>
      <div className="flex flex-col gap-6 pt-6">
        <PageTitle>Task Events</PageTitle>
        <ErrorBoundary errorComponent={ErrorFallback}>
          <Suspense fallback={<div>Loading task events...</div>}>
            <TaskEventsDashboard />
          </Suspense>
        </ErrorBoundary>
      </div>
    </AuthGuard>
  );
}
