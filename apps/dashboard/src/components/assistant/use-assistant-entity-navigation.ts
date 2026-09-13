"use client";

import { useCommunityProjectParams } from "@/hooks/use-community-project-params";
import { useCustomerOverviewV2SheetQuery } from "@/hooks/use-customer-overview-v2-sheet-query";
import { useInventoryParams } from "@/hooks/use-inventory-params";
import { useSalesOverviewQuery } from "@/hooks/use-sales-overview-query";
import type { AssistantEntityReference } from "@api/assistant/contracts";
import { useRouter } from "next/navigation";
import { useCallback, useLayoutEffect, useRef } from "react";
import { assistantAppRoutes } from "./assistant-entities";

export function useAssistantEntityNavigation(
	onOpenDocument: (
		entity: Extract<AssistantEntityReference, { kind: "document" }>,
	) => void,
) {
	const router = useRouter();
	const sales = useSalesOverviewQuery();
	const customer = useCustomerOverviewV2SheetQuery();
	const inventory = useInventoryParams();
	const community = useCommunityProjectParams();
	const navigation = useRef({
		router,
		sales,
		customer,
		inventory,
		community,
		onOpenDocument,
	});
	useLayoutEffect(() => {
		navigation.current = {
			router,
			sales,
			customer,
			inventory,
			community,
			onOpenDocument,
		};
	}, [community, customer, inventory, onOpenDocument, router, sales]);

	return useCallback((entity: AssistantEntityReference) => {
		const current = navigation.current;
		switch (entity.kind) {
			case "order":
				current.sales.open(entity.id, "sales");
				return;
			case "customer":
				current.customer.open(entity.id);
				return;
			case "inventory":
				void current.inventory.setParams({ productId: Number(entity.id) });
				return;
			case "community":
				void current.community.setParams({
					openCommunityProjectId: Number(entity.id),
				});
				return;
			case "document":
				current.onOpenDocument(entity);
				return;
			case "app":
				current.router.push(assistantAppRoutes[entity.id]);
		}
	}, []);
}
