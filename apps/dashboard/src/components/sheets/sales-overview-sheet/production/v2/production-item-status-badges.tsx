import { Badge } from "@gnd/ui/badge";

import { ItemMaterialStatusBadge } from "@/components/production-v2/item-material-status-badge";
import { useProduction } from "../../context";
import type { ProductionItem } from "../../production-item-context";
import {
	getProductionItemStatusBadges,
	getQuantityMatrixTotal,
} from "./production-item-status";

export function ProductionItemStatusBadges({
	item,
}: {
	item: ProductionItem;
}) {
	const { data } = useProduction();
	const stats = item.analytics?.stats;
	const assignments =
		data?.order.assignments.filter(
			(assignment) => assignment.salesItemControlUid === item.controlUid,
		) || [];
	const assignmentCount = assignments.length;
	const staffedAssignmentCount =
		assignments.filter((assignment) => assignment.assignedTo?.id).length || 0;
	const badges = getProductionItemStatusBadges({
		assignmentCount,
		assigned: getQuantityMatrixTotal(stats?.prodAssigned),
		fulfilled: getQuantityMatrixTotal(stats?.dispatchCompleted),
		shippable: Boolean(item.itemConfig?.shipping),
		staffedAssignmentCount,
		submitted: getQuantityMatrixTotal(stats?.prodCompleted),
		total: getQuantityMatrixTotal(item.qty),
	});

	if (!badges.length && !item.materialStatus) return null;

	return (
		<div className="mt-2 flex flex-wrap gap-1.5">
			<ItemMaterialStatusBadge status={item.materialStatus} />
			{badges.map((badge) => (
				<Badge key={badge.label} variant={badge.variant}>
					{badge.label}
				</Badge>
			))}
		</div>
	);
}
