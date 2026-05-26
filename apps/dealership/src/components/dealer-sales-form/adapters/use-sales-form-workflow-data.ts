"use client";

import { useTRPC } from "@/trpc/client";
import type {
  SalesFormWorkflowDataSource,
  SalesFormWorkflowStepComponentInput,
} from "@gnd/sales/sales-form";
import { createWorkflowComponentImageResolver } from "@gnd/sales/sales-form";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";

export function useDealerSalesFormWorkflowData(): SalesFormWorkflowDataSource {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const resolveImageSrc = useMemo(
    () =>
      createWorkflowComponentImageResolver(
        process.env.NEXT_PUBLIC_CLOUDINARY_BASE_URL,
      ),
    [],
  );

  return useMemo(
    () => ({
      useStepRouting: () =>
        useQuery(trpc.dealerPortal.workflowReference.queryOptions()),
      useStepComponents: (input: SalesFormWorkflowStepComponentInput) =>
        useQuery(
          trpc.dealerPortal.workflowStepComponents.queryOptions(
            {
              stepId: input.stepId || undefined,
              stepTitle: input.stepTitle || null,
            },
            {
              enabled:
                input.enabled !== false &&
                Boolean(input.stepId || input.stepTitle),
            },
          ),
        ),
      useDoorComponents: (input: SalesFormWorkflowStepComponentInput) =>
        useQuery(
          trpc.dealerPortal.workflowStepComponents.queryOptions(
            {
              stepId: input.stepId || undefined,
              stepTitle: input.stepTitle || "Door",
            },
            {
              enabled:
                input.enabled !== false &&
                Boolean(input.stepId || input.stepTitle),
            },
          ),
        ),
      useShelfCategories: () =>
        useQuery(trpc.dealerPortal.workflowShelfCategories.queryOptions({})),
      useShelfProducts: (input) =>
        useQuery(
          trpc.dealerPortal.workflowShelfProducts.queryOptions(
            { categoryIds: input.categoryIds },
            {
              enabled: input.enabled !== false && input.categoryIds.length > 0,
            },
          ),
        ),
      useShelfProductIndex: (input) =>
        useQuery(
          trpc.dealerPortal.workflowShelfProductIndex.queryOptions(
            {},
            {
              enabled: input?.enabled !== false,
              refetchOnWindowFocus: false,
              staleTime: 1000 * 60 * 30,
              gcTime: 1000 * 60 * 60,
            },
          ),
        ),
      getShelfProductDetails: (input) =>
        queryClient.fetchQuery(
          trpc.dealerPortal.workflowShelfProductDetails.queryOptions(
            { ids: input.ids },
            {
              refetchOnWindowFocus: false,
              staleTime: 1000 * 60 * 30,
              gcTime: 1000 * 60 * 60,
            },
          ),
        ),
      useDoorSuppliers: (input) =>
        useQuery(
          trpc.dealerPortal.workflowDoorSuppliers.queryOptions(
            {},
            {
              enabled: input?.enabled !== false,
            },
          ),
        ),
      resolveImageSrc,
    }),
    [queryClient, resolveImageSrc, trpc],
  );
}
