"use client";

import { parseAsInteger, parseAsStringEnum, useQueryStates } from "nuqs";

export const SALES_INVENTORY_SEGMENTS = [
	"stock",
	"inbounds",
	"non_stock",
] as const;

export type SalesInventorySegment = (typeof SALES_INVENTORY_SEGMENTS)[number];

export function useSalesInventorySegmentQuery() {
	const [params, setParams] = useQueryStates({
		inventorySegment: parseAsStringEnum([...SALES_INVENTORY_SEGMENTS]),
		inventoryInboundId: parseAsInteger,
	});

	const inventorySegment = params.inventorySegment ?? "stock";
	const setInventorySegment = (
		segment: SalesInventorySegment,
		options: { inboundId?: number | null } = {},
	) => {
		setParams({
			inventorySegment: segment === "stock" ? null : segment,
			inventoryInboundId:
				segment === "inbounds" && options.inboundId ? options.inboundId : null,
		});
	};
	const setSelectedInventoryInboundId = (inboundId: number | null) => {
		setParams({
			inventoryInboundId: inboundId,
		});
	};

	return {
		selectedInventoryInboundId: params.inventoryInboundId ?? null,
		inventorySegment,
		setInventorySegment,
		setSelectedInventoryInboundId,
	};
}
