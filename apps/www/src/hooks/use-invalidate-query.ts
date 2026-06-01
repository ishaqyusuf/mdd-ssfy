import { RouterInputs } from "@api/trpc/routers/_app";
import { useQueryClient } from "@gnd/ui/tanstack";
import { useTRPC } from "@/trpc/client";

export type Routes = {
    [NS in keyof RouterInputs]: RouterInputs[NS] extends Record<string, any>
        ? {
              [P in keyof RouterInputs[NS]]: `${NS & string}.${P & string}`;
          }[keyof RouterInputs[NS]]
        : never;
}[keyof RouterInputs];
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

export function useInvalidateQuery() {
    const trpc = useTRPC();
    const queryClient = useQueryClient();

    function getProcedure(route: Routes) {
        const [ns, proc] = route.split(".") as [string, string];

        return (trpc as any)[ns][proc];
    }

    function invalidateQueries(...routes: Routes[]) {
        routes.forEach((route) => {
            queryClient.invalidateQueries({
                queryKey: getProcedure(route).queryKey(),
            });
        });
    }

    function invalidateQuery<R extends Routes>(route: R, input?: RouteInput<R>) {
        queryClient.invalidateQueries({
            queryKey: getProcedure(route).queryKey(input),
        });
    }

    function invalidateInfiniteQueries(...routes: Routes[]) {
        routes.forEach((route) => {
            queryClient.invalidateQueries({
                queryKey: getProcedure(route).infiniteQueryKey(),
            });
        });
    }

    return {
        invalidateInfiniteQueries,
        invalidateQueries,
        invalidateQuery,
    };
}

// invalidateQueries("hrm.getEmployees", "hrm.getProfiles");
