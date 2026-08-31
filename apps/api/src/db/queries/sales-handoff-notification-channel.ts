export const MANDATORY_SALES_HANDOFF_CHANNEL =
	"sales_handoff_action_escalation" as const;

export const MANDATORY_OPERATIONAL_NOTIFICATION_CHANNELS = [
	MANDATORY_SALES_HANDOFF_CHANNEL,
	"dispatch_packing_delay",
	"sales_production_submission_material_review",
	"sales_production_submission_material_approved",
	"sales_production_submission_material_rejected",
	"sales_production_assigned",
	"sales_production_unassigned",
	"sales_production_submitted",
	"sales_dispatch_assigned",
	"sales_dispatch_unassigned",
	"sales_dispatch_date_updated",
] as const;

export function includeMandatoryOperationalChannels(types: string[]) {
	return Array.from(
		new Set([...types, ...MANDATORY_OPERATIONAL_NOTIFICATION_CHANNELS]),
	);
}

export function includeMandatorySalesHandoffChannel(types: string[]) {
	return Array.from(new Set([...types, MANDATORY_SALES_HANDOFF_CHANNEL]));
}
