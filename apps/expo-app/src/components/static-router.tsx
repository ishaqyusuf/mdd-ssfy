import { useRouter } from "expo-router";

type Router = ReturnType<typeof useRouter>;
export let _router: Router;
export let _goBack: Router["back"];
export let _push: Router["push"];
export let _replace: Router["replace"];
export let _setRouteParams: Router["setParams"];

export function StaticRouter() {
  _router = useRouter();
  // _qc = useQueryClient();
  _goBack = _router?.back;
  _push = _router?.push;
  _replace = _router?.replace;
  _setRouteParams = _router?.setParams;

  return null; // nothing to render
}
// export {
//   dehydrate,
//   useMutation,
//   useQueryClient,
//   MutationCache,
//   QueryClient,
//   defaultShouldDehydrateQuery,
//   useQuery,
//   // useSuspenseInfiniteQuery,
//   // useSuspenseQuery,
// } from "@tanstack/react-query";
