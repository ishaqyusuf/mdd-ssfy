export function resolveInboundActivityId(
	tags: Record<string, unknown> | null | undefined,
) {
	if (tags?.type !== "inventory_inbound_activity") return null;
	const inboundId = Number(tags.inboundId);
	return Number.isInteger(inboundId) && inboundId > 0 ? inboundId : null;
}

export function resolveInboundReference(orderNumber: string | number | null) {
	return String(orderNumber ?? "").trim();
}
