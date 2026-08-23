export const MANDATORY_SALES_HANDOFF_CHANNEL =
	"sales_handoff_action_escalation" as const;

export function includeMandatorySalesHandoffChannel(types: string[]) {
	return Array.from(new Set([...types, MANDATORY_SALES_HANDOFF_CHANNEL]));
}
