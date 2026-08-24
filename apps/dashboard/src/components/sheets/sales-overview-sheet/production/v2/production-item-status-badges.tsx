import { Badge } from "@gnd/ui/badge";

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
	const stats = item.analytics?.stats;
	const badges = getProductionItemStatusBadges({
		assigned: getQuantityMatrixTotal(stats?.prodAssigned),
		fulfilled: getQuantityMatrixTotal(stats?.dispatchCompleted),
		shippable: Boolean(item.itemConfig?.shipping),
		submitted: getQuantityMatrixTotal(stats?.prodCompleted),
		total: getQuantityMatrixTotal(item.qty),
	});

	if (!badges.length) return null;

	return (
		<div className="mt-2 flex flex-wrap gap-1.5">
			{badges.map((badge) => (
				<Badge key={badge.label} variant={badge.variant}>
					{badge.label}
				</Badge>
			))}
		</div>
	);
}
