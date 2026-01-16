import { _qc, _trpc } from "@/components/static-trpc";

type Join<K, P> = K extends string
  ? P extends string
    ? `${K}.${P}`
    : never
  : never;

type DotPaths<T> = {
  [K in keyof T]: T[K] extends { queryKey: (...args: any) => any }
    ? K & string
    : T[K] extends object
    ? Join<K & string, DotPaths<T[K]>>
    : never;
}[keyof T];

type Routes = DotPaths<typeof _trpc>;

export function invalidateQueries(type: "qk" | "infinite", routes: Routes[]) {
  routes.map((route) => {
    const proc = getProcedure(route);
    _qc.invalidateQueries({
      queryKey: proc[type === "qk" ? "queryKey" : "infiniteQueryKey"](),
    });
  });
}
function getProcedure(path: Routes) {
  return path.split(".").reduce<any>((acc, key) => acc[key], _trpc);
}
