import { AuthGuard } from "@/components/auth-guard";
import { _role } from "@/components/sidebar/links";
import { ErrorFallback } from "@/components/error-fallback";
import { batchPrefetch, trpc } from "@/trpc/server";
import { PageTitle } from "@gnd/ui/custom/page-title";
import { Suspense } from "react";
import { ErrorBoundary } from "next/dist/client/components/error-boundary";
import { TaskEventDetail } from "../_components/task-event-detail";

type Props = {
  params: Promise<{
    eventName: string;
  }>;
};

export default async function Page(props: Props) {
  const params = await props.params;

  batchPrefetch([
    trpc.taskEvents.get.queryOptions({ eventName: params.eventName }),
    trpc.taskEvents.history.queryOptions({ eventName: params.eventName }),
  ]);

  return (
    <AuthGuard rules={[_role.is("Super Admin")]}>
      <div className="flex flex-col gap-6 pt-6">
        <PageTitle>Task Event</PageTitle>
        <ErrorBoundary errorComponent={ErrorFallback}>
          <Suspense fallback={<div>Loading event...</div>}>
            <TaskEventDetail eventName={params.eventName} />
          </Suspense>
        </ErrorBoundary>
      </div>
    </AuthGuard>
  );
}
