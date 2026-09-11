import type { projectFulfillmentQuantities, FulfillmentQuantity } from "@gnd/sales/fulfillment-quantities";
import { Card, CardContent, CardHeader, CardTitle } from "@gnd/ui/card";

type Projection = ReturnType<typeof projectFulfillmentQuantities>;
function quantityText(q: FulfillmentQuantity) {
	return q.lh || q.rh ? `${q.lh} LH / ${q.rh} RH` : String(q.qty);
}
const columns = [
	["ordered", "Ordered"],
	["delivered", "Delivered"],
	["assigned", "Assigned"],
	["packed", "Packed"],
	["remainingToDeliver", "To deliver"],
	["availableToAssign", "To assign"],
] as const;

export function FulfillmentQuantitySummary({ data }: { data: Projection }) {
	return (
		<Card>
			<CardHeader className="pb-3">
				<CardTitle className="text-base">Fulfillment quantities</CardTitle>
			</CardHeader>
			<CardContent className="space-y-3">
				{!data.resolved ? (
					<p role="status" className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
						Quantities need review. Existing fulfillment scope or delivery evidence is incomplete. Available quantities cannot be confirmed yet.
					</p>
				) : null}
				<details>
					<summary className="cursor-pointer rounded-sm text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
						{data.resolved ? `${data.backlogQty} units backlog` : "Review order quantities"}
					</summary>
					<div className="mt-3 divide-y">
						{data.lines.map((line) => (
							<div key={line.uid} className="space-y-2 py-3">
								<p className="text-sm font-medium">{line.title || `Item ${line.salesItemId}`}{line.size ? ` · ${line.size}` : ""}</p>
								<dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
									{columns.map(([key, label]) => (
										<div key={key}>
											<dt className="text-xs text-muted-foreground">{label}</dt>
											<dd>{!data.resolved && (key === "availableToAssign" || key === "assigned") ? "Needs review" : quantityText(line[key])}</dd>
										</div>
									))}
								</dl>
							</div>
						))}
						{data.lines.length === 0 ? <p className="py-3 text-sm text-muted-foreground">No shipping quantities are available.</p> : null}
					</div>
				</details>
				<p className="text-xs text-muted-foreground">Packed items are included in their fulfillment quantities. Backlog can remain while another fulfillment is active.</p>
			</CardContent>
		</Card>
	);
}
