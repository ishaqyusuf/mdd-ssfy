import { useTRPC } from "@/trpc/client";
import { useQueryClient } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export let _trpc: ReturnType<typeof useTRPC>;
export let _qc: ReturnType<typeof useQueryClient>;
export let _insets: ReturnType<typeof useSafeAreaInsets>;

export function StaticTrpc() {
  _trpc = useTRPC();
  _qc = useQueryClient();
  _insets = useSafeAreaInsets();

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
