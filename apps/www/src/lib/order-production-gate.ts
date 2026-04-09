import { prisma } from "@/db";
import {
	deriveOrderProductionGateState,
	ORDER_PRODUCTION_GATE_RULE_TYPES,
	ORDER_PRODUCTION_GATE_TIME_UNITS,
} from "@gnd/sales/production-gate";

export const orderProductionGateRuleTypes = ORDER_PRODUCTION_GATE_RULE_TYPES;
export const orderProductionGateTimeUnits = ORDER_PRODUCTION_GATE_TIME_UNITS;

export function buildLegacyProductionGateRedirect(orderNo: string) {
	const params = new URLSearchParams({
		"sales-overview-id": orderNo,
		"sales-type": "order",
		mode: "sales-production",
		salesTab: "production",
	});

	return `/sales-book/orders?${params.toString()}`;
}

export function buildV2ProductionGateRedirect(orderNo: string) {
	const params = new URLSearchParams({
		overviewId: orderNo,
		overviewType: "order",
		overviewMode: "sales-production",
		overviewTab: "production",
	});

	return `/sales/dashboard/orders?${params.toString()}`;
}

export async function syncOrderProductionGateStatus(
	salesOrderId: number,
	tx: typeof prisma = prisma,
) {
	const order = await tx.salesOrders.findUnique({
		where: { id: salesOrderId },
		select: {
			id: true,
			amountDue: true,
			grandTotal: true,
			prodDueDate: true,
			productionGate: {
				select: {
					id: true,
					status: true,
					ruleType: true,
					leadTimeValue: true,
					leadTimeUnit: true,
					definedAt: true,
					triggeredAt: true,
				},
			},
		},
	});

	if (!order?.productionGate) {
		return {
			hasProductionDefinition: false,
			productionGateStatus: "missing",
			productionGateTriggered: false,
		} as const;
	}

	const derived = deriveOrderProductionGateState({
		gate: order.productionGate,
		order,
	});

	if (
		order.productionGate.status !== derived.productionGateStatus ||
		derived.shouldPersistTriggeredAt
	) {
		await tx.orderProductionGate.update({
			where: { salesOrderId },
			data: {
				status: derived.productionGateStatus,
				triggeredAt: derived.triggeredAt,
			},
		});
	}

	return derived;
}
