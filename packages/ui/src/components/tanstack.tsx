export { QueryClientProvider, isServer } from "@tanstack/react-query";

export type { QueryClient as QueryClientType } from "@tanstack/react-query";
export { createTRPCContext } from "@trpc/tanstack-react-query";
export { createTRPCClient, httpBatchLink, loggerLink } from "@trpc/client";
export { HydrationBoundary } from "@tanstack/react-query";

export {
  dehydrate,
  useMutation,
  useQueryClient,
  MutationCache,
  QueryClient,
  defaultShouldDehydrateQuery,
  useQuery,
  useSuspenseInfiniteQuery,
  useSuspenseQuery,
} from "@tanstack/react-query";
export { httpBatchLink as serverHttpBatchLink } from "@trpc/client/links/httpBatchLink";

export {
  type TRPCQueryOptions,
  createTRPCOptionsProxy,
} from "@trpc/tanstack-react-query";
