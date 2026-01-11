import { useTRPC } from "@/trpc/client";
import { useQueryClient } from "@tanstack/react-query";

export let _trpc: ReturnType<typeof useTRPC>;
export let _qc: ReturnType<typeof useQueryClient>;

export function StaticTrpc() {
  _trpc = useTRPC();
  _qc = useQueryClient();

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
