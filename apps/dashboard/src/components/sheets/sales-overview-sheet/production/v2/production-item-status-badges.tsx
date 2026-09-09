import { Badge } from "@gnd/ui/badge";

import { ItemMaterialStatusBadge } from "@/components/production-v2/item-material-status-badge";
import { useProduction } from "../../context";
import type { ProductionItem } from "../../production-item-context";
import {
	getProductionItemStatusBadges,
	getQuantityMatrixTotal,
	shouldShowProductionMaterialBadge,
} from "./production-item-status";

export function ProductionItemStatusBadges({
	item,
	workerMode = false,
}: {
	item: ProductionItem;
	workerMode?: boolean;
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
		workerMode,		assignmentCount,
		assigned: getQuantityMatrixTotal(stats?.prodAssigned),
		fulfilled: getQuantityMatrixTotal(stats?.dispatchCompleted),
		shippable: Boolean(item.itemConfig?.shipping),
		staffedAssignmentCount,
		submitted: getQuantityMatrixTotal(stats?.prodCompleted),
		reported: item.analytics?.reportedSubmitQty ?? undefined,
		total: getQuantityMatrixTotal(workerMode ? stats?.prodAssigned : item.qty),
	});

	const showMaterialBadge = !workerMode && shouldShowProductionMaterialBadge({
		code: item.materialStatus?.code,
		reported: item.analytics?.reportedSubmitQty,
		completed: getQuantityMatrixTotal(stats?.prodCompleted),
		fulfilled: getQuantityMatrixTotal(stats?.dispatchCompleted),
	});
	if (!badges.length && !showMaterialBadge) return null;

	return (
		<div className="mt-2 flex flex-wrap gap-1.5">
			{showMaterialBadge && (
				<ItemMaterialStatusBadge
					status={item.materialStatus}
					audience={workerMode ? "worker" : "admin"}
				/>
			)}
			{badges.map((badge) => (
				<Badge
					key={badge.label}
					variant={badge.variant}
					className={
						badge.label.includes("REVIEW PENDING")
							? "border-amber-200 bg-amber-50 text-amber-800"
							: undefined
					}
				>
					{badge.label}
				</Badge>
			))}
		</div>
	);
}
