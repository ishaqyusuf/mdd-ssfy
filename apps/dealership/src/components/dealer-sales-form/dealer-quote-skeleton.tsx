"use client";

function SkeletonBlock({ className }: { className: string }) {
  return <div className={`animate-pulse rounded bg-muted ${className}`} />;
}

function SkeletonIcon() {
  return <div className="size-8 animate-pulse rounded-full bg-muted" />;
}

function WorkflowPanelSkeleton() {
  return (
    <div className="divide-y divide-border/40">
      {[0, 1, 2].map((itemIndex) => (
        <div
          key={`dealer-workflow-skeleton-${itemIndex}`}
          className="bg-background p-4"
        >
          <div className="grid gap-4 md:grid-cols-12">
            <div className="md:col-span-10">
              <SkeletonBlock className="h-10 w-full" />
            </div>
            <div className="flex items-center justify-end gap-2 md:col-span-2">
              <SkeletonBlock className="h-5 w-20" />
              <SkeletonIcon />
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <SkeletonBlock className="h-6 w-28 rounded-full" />
            <SkeletonBlock className="h-6 w-36 rounded-full" />
            <SkeletonBlock className="h-6 w-24 rounded-full" />
          </div>
          <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white">
            <div className="flex items-center gap-3 border-b border-slate-100 bg-slate-50/70 px-4 py-3">
              <SkeletonBlock className="size-12" />
              <div className="min-w-0 flex-1 space-y-2">
                <SkeletonBlock className="h-4 w-56 max-w-full" />
                <SkeletonBlock className="h-3 w-28" />
              </div>
              <div className="flex gap-1">
                <SkeletonIcon />
                <SkeletonIcon />
                <SkeletonIcon />
              </div>
            </div>
            <div className="grid gap-3 p-4 sm:grid-cols-3">
              <SkeletonBlock className="h-16 w-full" />
              <SkeletonBlock className="h-16 w-full" />
              <SkeletonBlock className="h-16 w-full" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function DealerQuoteSkeleton() {
  return (
    <div className="fixed bottom-0 left-0 right-0 top-[var(--header-height)] overflow-hidden bg-background md:left-[84px]">
      <div className="relative flex h-full min-h-0 overflow-hidden border-x border-b border-slate-200/80 bg-background shadow-sm">
        <main className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <div className="shrink-0 border-b bg-card px-4 py-3 sm:px-5">
            <div className="flex flex-wrap items-center gap-3">
              <div className="space-y-2">
                <SkeletonBlock className="h-5 w-44" />
                <SkeletonBlock className="h-3 w-64 max-w-[70vw]" />
              </div>
              <div className="ml-auto flex items-center gap-2">
                <SkeletonBlock className="hidden h-8 w-28 rounded-full sm:block" />
                <SkeletonIcon />
                <SkeletonIcon />
                <SkeletonIcon />
              </div>
            </div>
          </div>
          <div className="flex-1 overflow-hidden pb-28 lg:pb-20">
            <div className="mx-auto flex w-full max-w-6xl flex-col">
              <WorkflowPanelSkeleton />
            </div>
          </div>
          <div className="pointer-events-none absolute inset-x-0 bottom-1 z-20 hidden justify-center px-2 pb-[env(safe-area-inset-bottom)] lg:flex">
            <div className="pointer-events-auto flex w-fit max-w-[calc(100%-1rem)] items-center gap-1 rounded-full border border-slate-200 bg-card/95 p-1 shadow-lg backdrop-blur">
              <SkeletonIcon />
              <SkeletonIcon />
              <SkeletonIcon />
              <SkeletonIcon />
            </div>
          </div>
        </main>
        <aside className="hidden w-80 shrink-0 border-l bg-card/80 p-4 xl:block">
          <div className="space-y-4">
            <SkeletonBlock className="h-5 w-32" />
            <SkeletonBlock className="h-24 w-full" />
            <SkeletonBlock className="h-24 w-full" />
            <div className="space-y-2 pt-2">
              <SkeletonBlock className="h-4 w-full" />
              <SkeletonBlock className="h-4 w-4/5" />
              <SkeletonBlock className="h-10 w-full" />
            </div>
          </div>
        </aside>
        <div className="absolute inset-x-0 bottom-0 z-20 border-t bg-card p-3 shadow-[0_-4px_18px_rgba(0,0,0,0.08)] lg:hidden">
          <div className="mx-auto flex w-full max-w-lg items-center gap-3">
            <div className="flex-1 space-y-2">
              <SkeletonBlock className="h-3 w-24" />
              <SkeletonBlock className="h-6 w-32" />
            </div>
            <SkeletonBlock className="h-11 w-24" />
          </div>
        </div>
      </div>
    </div>
  );
}
