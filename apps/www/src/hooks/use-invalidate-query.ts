import { _qc, _trpc } from "@/components/static-trpc";
import { RouterInputs } from "@api/trpc/routers/_app";

type TRPCClient = typeof _trpc;

export type Routes = {
    [NS in keyof TRPCClient]: TRPCClient[NS] extends Record<string, any>
        ? {
              [P in keyof TRPCClient[NS]]: `${NS & string}.${P & string}`;
          }[keyof TRPCClient[NS]]
        : never;
}[keyof TRPCClient];
export type SplitRoute<R extends Routes> = R extends `${infer NS}.${infer P}`
    ? [NS & keyof RouterInputs, P & keyof RouterInputs[NS & keyof RouterInputs]]
    : never;

export type RouteInput<R extends Routes> =
    SplitRoute<R> extends [infer NS, infer P]
        ? NS extends keyof RouterInputs
            ? P extends keyof RouterInputs[NS]
                ? RouterInputs[NS][P]
                : never
            : never
        : never;

export function invalidateQueries(...routes: Routes[]) {
    routes.forEach((route) => {
        const [ns, proc] = route.split(".") as [keyof typeof _trpc, string];

        _qc.invalidateQueries({
            queryKey: (_trpc as any)[ns][proc].queryKey(),
        });
    });
}
export function invalidateQuery<R extends Routes>(
    route: R,
    input?: RouteInput<R>,
) {
    const [ns, proc] = route.split(".") as [keyof typeof _trpc, string];

    _qc.invalidateQueries({
        queryKey: (_trpc as any)[ns][proc].queryKey(input),
    });
}

export function invalidateInfiniteQueries(...routes: Routes[]) {
    routes.forEach((route) => {
        const [ns, proc] = route.split(".") as [keyof typeof _trpc, string];

        _qc.invalidateQueries({
            queryKey: (_trpc as any)[ns][proc].infiniteQueryKey(),
        });
    });
}

// invalidateQueries("hrm.getEmployees", "hrm.getProfiles");

