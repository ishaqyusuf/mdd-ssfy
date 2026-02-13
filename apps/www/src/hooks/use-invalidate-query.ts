import { _qc, _trpc } from "@/components/static-trpc";
import { RouterInputs, AppRouter } from "@api/trpc/routers/_app";

type TRPCClient = typeof _trpc;

type Routes = {
    [NS in keyof TRPCClient]: TRPCClient[NS] extends Record<string, any>
        ? {
              [P in keyof TRPCClient[NS]]: `${NS & string}.${P & string}`;
          }[keyof TRPCClient[NS]]
        : never;
}[keyof TRPCClient];

export function invalidateQueries(...routes: Routes[]) {
    routes.forEach((route) => {
        const [ns, proc] = route.split(".") as [keyof typeof _trpc, string];

        _qc.invalidateQueries({
            queryKey: (_trpc as any)[ns][proc].queryKey(),
        });
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

invalidateQueries("hrm.getEmployees", "hrm.getProfiles");

