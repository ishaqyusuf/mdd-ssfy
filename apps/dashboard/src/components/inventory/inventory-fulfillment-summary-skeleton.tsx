import { Card } from "@gnd/ui/card";

export function InventoryFulfillmentSummarySkeleton({
	count,
}: {
	count: number;
}) {
	return (
		<div
			className={count === 5 ? "grid gap-4 md:grid-cols-5" : "grid gap-4 md:grid-cols-4"}
		>
			{Array.from({ length: count }, (_, index) => (
				<Card key={`summary-${index}`} className="space-y-3 p-4">
					<div className="h-3 w-24 animate-pulse rounded bg-muted" />
					<div className="h-8 w-20 animate-pulse rounded bg-muted" />
				</Card>
			))}
		</div>
	);
}
