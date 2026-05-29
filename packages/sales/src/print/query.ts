import type { Prisma } from "@gnd/db";
import { parsePrintModes } from "./modes";
import type { PrintMode } from "./types";

const excludeDeletedWhere = { deletedAt: null } as const;
const packingInclude = {
	deliveries: {
		where: excludeDeletedWhere,
		include: {
			items: {
				include: {
					submission: {
						include: { assignment: true },
					},
				},
			},
		},
	},
} as const satisfies Prisma.SalesOrdersInclude;

const financialInclude = {
	extraCosts: true,
	payments: { where: excludeDeletedWhere },
	taxes: {
		where: excludeDeletedWhere,
		include: { taxConfig: true },
	},
} as const satisfies Prisma.SalesOrdersInclude;

/**
 * Isolated Prisma include for print — only what the V2 print pipeline needs.
 * Never import SalesIncludeAll; keep the print query self-contained.
 */
const StepProductSelect = {
	name: true,
	img: true,
	product: { select: { title: true, img: true } },
	door: { select: { title: true, img: true } },
} satisfies Prisma.DykeStepProductsSelect;

function buildItemsInclude() {
	return {
		formSteps: {
			where: excludeDeletedWhere,
			include: {
				step: true,
				component: {
					include: {
						door: true,
						product: true,
					},
				},
			},
		},
		shelfItems: {
			where: excludeDeletedWhere,
			include: { shelfProduct: true },
		},
		housePackageTool: {
			where: excludeDeletedWhere,
			include: {
				door: { where: excludeDeletedWhere },
				molding: { where: excludeDeletedWhere },
				stepProduct: {
					select: StepProductSelect,
				},
				doors: {
					where: excludeDeletedWhere,
					include: {
						stepProduct: {
							select: StepProductSelect,
						},
					},
				},
			},
		},
	} satisfies Prisma.SalesOrderItemsInclude;
}

export function buildPrintSalesInclude(mode: PrintMode | PrintMode[] | string) {
	const modes = Array.isArray(mode) ? mode : parsePrintModes(mode);
	const needsFinancials =
		modes.includes("invoice") ||
		modes.includes("quote") ||
		modes.includes("order-packing");
	const needsPacking =
		modes.includes("packing-slip") || modes.includes("order-packing");

	return {
		items: {
			where: excludeDeletedWhere,
			include: buildItemsInclude(),
		},
		customer: { where: excludeDeletedWhere },
		billingAddress: { where: excludeDeletedWhere },
		shippingAddress: { where: excludeDeletedWhere },
		salesRep: { where: excludeDeletedWhere },
		dealerSale: true,
		...(needsFinancials ? financialInclude : {}),
		...(needsPacking ? packingInclude : {}),
	} satisfies Prisma.SalesOrdersInclude;
}

export const PrintSalesInclude = {
	items: {
		where: excludeDeletedWhere,
		include: buildItemsInclude(),
	},
	customer: { where: excludeDeletedWhere },
	billingAddress: { where: excludeDeletedWhere },
	shippingAddress: { where: excludeDeletedWhere },
	salesRep: { where: excludeDeletedWhere },
	dealerSale: true,
	...financialInclude,
	...packingInclude,
} satisfies Prisma.SalesOrdersInclude;

export type PrintSalesData = Prisma.SalesOrdersGetPayload<{
	include: typeof PrintSalesInclude;
}>;

export type PrintSalesItem = PrintSalesData["items"][number];
