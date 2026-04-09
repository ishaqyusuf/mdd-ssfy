export const ORDER_PRODUCTION_GATE_STATUSES = [
  "missing",
  "defined",
  "triggered",
] as const;

export const ORDER_PRODUCTION_GATE_RULE_TYPES = [
  "fully_paid",
  "half_paid",
  "lead_time_before_delivery",
] as const;

export const ORDER_PRODUCTION_GATE_TIME_UNITS = ["day", "week"] as const;

export type OrderProductionGateStatus =
  (typeof ORDER_PRODUCTION_GATE_STATUSES)[number];
export type OrderProductionGateRuleType =
  (typeof ORDER_PRODUCTION_GATE_RULE_TYPES)[number];
export type OrderProductionGateTimeUnit =
  (typeof ORDER_PRODUCTION_GATE_TIME_UNITS)[number];

export type OrderProductionGateLike = {
  status?: string | null;
  ruleType?: string | null;
  leadTimeValue?: number | null;
  leadTimeUnit?: string | null;
  definedAt?: Date | string | null;
  triggeredAt?: Date | string | null;
};

export type OrderProductionGateOrderLike = {
  amountDue?: number | null;
  grandTotal?: number | null;
  prodDueDate?: Date | string | null;
};

export function hasDefinedProductionGate(
  gate?: OrderProductionGateLike | null,
): boolean {
  return !!gate?.ruleType && !!gate?.definedAt;
}

function toValidDate(value?: Date | string | null) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function evaluateTriggeredByRule({
  gate,
  order,
  now,
}: {
  gate: OrderProductionGateLike;
  order: OrderProductionGateOrderLike;
  now: Date;
}) {
  switch (gate.ruleType) {
    case "fully_paid":
      return Number(order.amountDue || 0) <= 0;
    case "half_paid": {
      const grandTotal = Number(order.grandTotal || 0);
      if (grandTotal <= 0) return false;
      const paid = grandTotal - Number(order.amountDue || 0);
      return paid >= grandTotal / 2;
    }
    case "lead_time_before_delivery": {
      const prodDueDate = toValidDate(order.prodDueDate);
      const leadTimeValue = Number(gate.leadTimeValue || 0);
      if (!prodDueDate || leadTimeValue <= 0) return false;
      const triggerAt = new Date(prodDueDate);
      const unit = gate.leadTimeUnit === "week" ? "week" : "day";
      const multiplier = unit === "week" ? 7 : 1;
      triggerAt.setDate(triggerAt.getDate() - leadTimeValue * multiplier);
      return now >= triggerAt;
    }
    default:
      return false;
  }
}

export function deriveOrderProductionGateState({
  gate,
  order,
  now = new Date(),
}: {
  gate?: OrderProductionGateLike | null;
  order: OrderProductionGateOrderLike;
  now?: Date;
}) {
  if (!gate || !hasDefinedProductionGate(gate)) {
    return {
      hasProductionDefinition: false,
      productionGateStatus: "missing" as OrderProductionGateStatus,
      productionGateTriggered: false,
      shouldPersistTriggeredAt: false,
      triggeredAt: null as Date | null,
    };
  }

  const triggered =
    !!gate.triggeredAt || evaluateTriggeredByRule({ gate, order, now });
  const triggeredAt = gate.triggeredAt ? toValidDate(gate.triggeredAt) : null;

  return {
    hasProductionDefinition: true,
    productionGateStatus: triggered
      ? ("triggered" as OrderProductionGateStatus)
      : ("defined" as OrderProductionGateStatus),
    productionGateTriggered: triggered,
    shouldPersistTriggeredAt: triggered && !triggeredAt,
    triggeredAt: triggeredAt || (triggered ? now : null),
  };
}
