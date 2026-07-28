"use client";

import {
	parseAsBoolean,
	parseAsInteger,
	parseAsStringEnum,
	useQueryStates,
} from "nuqs";

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
		inventoryCreateInbound: parseAsBoolean,
	});

	const inventorySegment = params.inventorySegment ?? "stock";
	const setInventorySegment = (
		segment: SalesInventorySegment,
		options: {
			inboundId?: number | null;
			openCreate?: boolean;
		} = {},
	) => {
		setParams({
			inventorySegment: segment === "stock" ? null : segment,
			inventoryInboundId:
				segment === "inbounds" && options.inboundId ? options.inboundId : null,
			inventoryCreateInbound:
				segment === "stock" && options.openCreate ? true : null,
		});
	};
	const setSelectedInventoryInboundId = (inboundId: number | null) => {
		setParams({
			inventoryInboundId: inboundId,
		});
	};
	const setOpenInboundCreator = (open: boolean) => {
		setParams({
			inventoryCreateInbound: open ? true : null,
		});
	};

	return {
		openInboundCreator: params.inventoryCreateInbound ?? false,
		selectedInventoryInboundId: params.inventoryInboundId ?? null,
		inventorySegment,
		setInventorySegment,
		setOpenInboundCreator,
		setSelectedInventoryInboundId,
	};
}
