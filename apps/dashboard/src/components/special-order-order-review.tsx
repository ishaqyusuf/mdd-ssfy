import { SalesHtmlSections } from "@gnd/pdf/sales-v2";
import type { PrintSection } from "@gnd/sales/print";
import { Card, CardContent, CardHeader, CardTitle } from "@gnd/ui/card";

function record(value: unknown): Record<string, unknown> {
	return value && typeof value === "object" && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: {};
}

function money(value: unknown) {
	return new Intl.NumberFormat("en-US", {
		style: "currency",
		currency: "USD",
	}).format(Number(value || 0));
}

export function SpecialOrderOrderReview({
	order,
	baseUrl,
}: {
	order: {
		invoiceSections?: PrintSection[];
		extraCosts?: unknown[];
		summary?: Record<string, unknown>;
	};
	baseUrl?: string;
}) {
	const extraCosts = (order.extraCosts || []).map(record);
	const summary = order.summary || {};

	return (
		<Card>
			<CardHeader>
				<CardTitle>Complete order</CardTitle>
			</CardHeader>
			<CardContent className="space-y-4 overflow-hidden">
				<SalesHtmlSections
					sections={order.invoiceSections || []}
					baseUrl={baseUrl}
					showImages
					variant="template-2"
				/>
				{extraCosts.length ? (
					<div className="space-y-2 text-sm">
						{extraCosts.map((cost, index) => (
							<div
								key={String(cost.id || index)}
								className="flex justify-between gap-4"
							>
								<span>
									{String(cost.label || cost.name || "Additional cost")}
								</span>
								<span>{money(cost.amount)}</span>
							</div>
						))}
					</div>
				) : null}
				<div className="space-y-2 border-t pt-4 text-sm">
					<div className="flex justify-between gap-4">
						<span>Subtotal</span>
						<span>{money(summary.subTotal)}</span>
					</div>
					<div className="flex justify-between gap-4">
						<span>
							Discount
							{Number(summary.discountPct || 0)
								? ` (${Number(summary.discountPct)}%)`
								: ""}
						</span>
						<span>−{money(summary.discount)}</span>
					</div>
					<div className="flex justify-between gap-4">
						<span>
							Tax
							{Number(summary.taxRate || 0)
								? ` (${Number(summary.taxRate)}%)`
								: ""}
						</span>
						<span>{money(summary.taxTotal)}</span>
					</div>
					<div className="flex justify-between gap-4 pt-1 text-lg font-semibold">
						<span>Order total</span>
						<span>{money(summary.grandTotal)}</span>
					</div>
				</div>
			</CardContent>
		</Card>
	);
}
