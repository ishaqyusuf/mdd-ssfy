import type { Prisma } from "@gnd/db";
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

function buildItemsInclude(): Prisma.SalesOrderItemsInclude {
	return {
		formSteps: {
			where: excludeDeletedWhere,
			include: {
				step: true,
				component: true,
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
	};
}

export function buildPrintSalesInclude(
	mode: PrintMode,
): Prisma.SalesOrdersInclude {
	const needsFinancials =
		mode === "invoice" || mode === "quote" || mode === "order-packing";
	const needsPacking = mode === "packing-slip" || mode === "order-packing";

	return {
		items: {
			where: excludeDeletedWhere,
			include: buildItemsInclude(),
		},
		customer: { where: excludeDeletedWhere },
		billingAddress: { where: excludeDeletedWhere },
		shippingAddress: { where: excludeDeletedWhere },
		salesRep: { where: excludeDeletedWhere },
		...(needsFinancials ? financialInclude : {}),
		...(needsPacking ? packingInclude : {}),
	};
}

export const PrintSalesInclude = buildPrintSalesInclude("order-packing");

export type PrintSalesData = Prisma.SalesOrdersGetPayload<{
	include: typeof PrintSalesInclude;
}>;

export type PrintSalesItem = PrintSalesData["items"][number];
