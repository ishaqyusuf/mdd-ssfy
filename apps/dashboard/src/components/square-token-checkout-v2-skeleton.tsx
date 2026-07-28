import { Card, CardContent, CardHeader } from "@gnd/ui/card";

export function SquareTokenCheckoutV2Skeleton() {
  return (
    <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
      <Card className="overflow-hidden border-slate-200">
        <CardHeader className="space-y-3 border-b border-slate-100 bg-slate-50">
          <div className="h-6 w-24 animate-pulse rounded-full bg-slate-200" />
          <div className="h-10 w-3/5 animate-pulse rounded bg-slate-200" />
          <div className="h-5 w-4/5 animate-pulse rounded bg-slate-100" />
        </CardHeader>
        <CardContent className="space-y-6 p-6">
          <div className="grid gap-4 md:grid-cols-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div
                key={index}
                className="h-28 animate-pulse rounded-2xl border border-slate-200 bg-slate-50"
              />
            ))}
          </div>
          <div className="space-y-3 rounded-2xl border border-slate-200 p-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                className="h-14 animate-pulse rounded-xl bg-slate-100"
              />
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="space-y-6">
        <Card className="border-slate-200">
          <CardContent className="space-y-4 p-6">
            <div className="h-6 w-40 animate-pulse rounded bg-slate-200" />
            <div className="h-24 animate-pulse rounded-2xl bg-slate-100" />
            <div className="h-px bg-slate-100" />
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <div
                  key={index}
                  className="h-5 animate-pulse rounded bg-slate-100"
                />
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-slate-950">
          <CardContent className="space-y-3 p-6">
            <div className="h-6 w-36 animate-pulse rounded bg-slate-700" />
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                className="h-5 animate-pulse rounded bg-slate-800"
              />
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
