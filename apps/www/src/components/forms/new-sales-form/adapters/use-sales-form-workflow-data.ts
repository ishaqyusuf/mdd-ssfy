"use client";

import type {
    SalesFormWorkflowDataSource,
    SalesFormWorkflowStepComponentInput,
} from "@gnd/sales/sales-form";
import { createWorkflowComponentImageResolver } from "@gnd/sales/sales-form";
import { useMemo } from "react";
import {
    useCustomerProfilesQuery,
    useNewSalesFormShelfCategoriesQuery,
    useNewSalesFormShelfProductsQuery,
    useNewSalesFormStepRoutingQuery,
    useSalesStepComponentsQuery,
    useSalesSuppliersQuery,
} from "../api";

export function useWwwSalesFormWorkflowData(): SalesFormWorkflowDataSource {
    const resolveImageSrc = useMemo(
        () =>
            createWorkflowComponentImageResolver(
                process.env.NEXT_PUBLIC_CLOUDINARY_BASE_URL,
            ),
        [],
    );

    return useMemo(
        () => ({
            useStepRouting: () => useNewSalesFormStepRoutingQuery(),
            useStepComponents: (input: SalesFormWorkflowStepComponentInput) =>
                useSalesStepComponentsQuery(
                    {
                        stepId: input.stepId || undefined,
                        stepTitle: input.stepTitle || undefined,
                    },
                    input.enabled !== false &&
                        Boolean(input.stepId || input.stepTitle),
                ),
            useDoorComponents: (input: SalesFormWorkflowStepComponentInput) =>
                useSalesStepComponentsQuery(
                    {
                        stepId: input.stepId || undefined,
                        stepTitle: input.stepTitle || "Door",
                    },
                    input.enabled !== false &&
                        Boolean(input.stepId || input.stepTitle),
                ),
            useCustomerProfiles: () => useCustomerProfilesQuery(true),
            useShelfCategories: () => useNewSalesFormShelfCategoriesQuery({}),
            useShelfProducts: (input) =>
                useNewSalesFormShelfProductsQuery(
                    { categoryIds: input.categoryIds },
                    input.enabled !== false && input.categoryIds.length > 0,
                ),
            useDoorSuppliers: (input) =>
                useSalesSuppliersQuery(input?.enabled !== false),
            resolveImageSrc,
        }),
        [resolveImageSrc],
    );
}
