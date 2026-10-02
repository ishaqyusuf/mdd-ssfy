"use client";

import {
	parseAsBoolean,
	parseAsInteger,
	parseAsString,
	parseAsStringEnum,
	useQueryStates,
} from "nuqs";

export const SALES_INVENTORY_SEGMENTS = [
	"stock",
	"warehouse",
	"inbounds",
	"non_stock",
] as const;

export type SalesInventorySegment = (typeof SALES_INVENTORY_SEGMENTS)[number];

export function useSalesInventorySegmentQuery() {
	const [params, setParams] = useQueryStates({
		inventoryLocation: parseAsString,
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
			inventoryLocation:
				segment === "warehouse" ? params.inventoryLocation : null,
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
		inventoryLocation: params.inventoryLocation ?? "all",
		setInventoryLocation: (location: string) =>
			setParams({ inventoryLocation: location === "all" ? null : location }),
		openInboundCreator: params.inventoryCreateInbound ?? false,
		selectedInventoryInboundId: params.inventoryInboundId ?? null,
		inventorySegment,
		setInventorySegment,
		setOpenInboundCreator,
		setSelectedInventoryInboundId,
	};
}
