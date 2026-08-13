import { Card, CardContent, CardHeader, CardTitle } from "@gnd/ui/card";

function record(value: unknown): Record<string, unknown> {
	return value && typeof value === "object" && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: {};
}

function rows(value: unknown) {
	return Array.isArray(value) ? value.map(record) : [];
}

function money(value: unknown) {
	return new Intl.NumberFormat("en-US", {
		style: "currency",
		currency: "USD",
	}).format(Number(value || 0));
}

function DetailRows({ title, value }: { title: string; value: unknown }) {
	const details = rows(value);
	if (!details.length) return null;
	return (
		<div className="mt-3 rounded-md bg-muted/40 p-3">
			<p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
				{title}
			</p>
			<div className="space-y-2 text-xs">
				{details.map((detail, index) => (
					<div
						key={String(detail.uid || detail.id || index)}
						className="grid grid-cols-[1fr_auto] gap-3"
					>
						<span>
							{String(
								detail.title ||
									detail.service ||
									detail.description ||
									detail.dimension ||
									`${title} ${index + 1}`,
							)}
							{" · "}Qty {Number(detail.qty || detail.totalQty || 0)}
						</span>
						<span>
							{money(
								detail.lineTotal ||
									detail.totalPrice ||
									Number(detail.qty || detail.totalQty || 0) *
										Number(detail.unitPrice || 0),
							)}
						</span>
					</div>
				))}
			</div>
		</div>
	);
}

export function SpecialOrderOrderReview({
	order,
}: {
	order: {
		lineItems?: unknown[];
		extraCosts?: unknown[];
		summary?: Record<string, unknown>;
	};
}) {
	const lineItems = (order.lineItems || []).map(record);
	const extraCosts = (order.extraCosts || []).map(record);
	const summary = order.summary || {};
	return (
		<Card>
			<CardHeader>
				<CardTitle>Complete order</CardTitle>
			</CardHeader>
			<CardContent className="space-y-4">
				<div className="divide-y rounded-md border">
					{lineItems.map((line, index) => {
						const meta = record(line.meta);
						const housePackage = record(line.housePackageTool);
						return (
							<div key={String(line.uid || line.id || index)} className="p-4">
								<div className="flex items-start justify-between gap-4">
									<div>
										<p className="font-medium">
											{String(
												line.title || line.description || `Item ${index + 1}`,
											)}
										</p>
										<p className="mt-1 text-sm text-muted-foreground">
											Quantity {Number(line.qty || 0)} · Unit {money(line.unitPrice)}
										</p>
									</div>
									<p className="font-semibold">
										{money(line.lineTotal || line.total)}
									</p>
								</div>
								{rows(line.formSteps).length ? (
									<dl className="mt-3 grid gap-1 text-xs sm:grid-cols-2">
										{rows(line.formSteps).map((step, stepIndex) => {
											const stepRef = record(step.step);
											return (
												<div key={`${index}-${stepIndex}`} className="flex gap-2">
													<dt className="text-muted-foreground">
														{String(stepRef.title || step.title || "Specification")}:
													</dt>
													<dd>{String(step.value || "—")}</dd>
												</div>
											);
										})}
									</dl>
								) : null}
								<DetailRows title="Shelf items" value={line.shelfItems} />
								<DetailRows title="Services" value={meta.serviceRows} />
								<DetailRows title="Moulding" value={meta.mouldingRows} />
								<DetailRows title="House package doors" value={housePackage.doors} />
							</div>
						);
					})}
				</div>
				{extraCosts.length ? (
					<div className="space-y-2 text-sm">
						{extraCosts.map((cost, index) => (
							<div key={String(cost.id || index)} className="flex justify-between gap-4">
								<span>{String(cost.label || cost.name || "Additional cost")}</span>
								<span>{money(cost.amount)}</span>
							</div>
						))}
					</div>
				) : null}
				<div className="space-y-2 border-t pt-4 text-sm">
					<div className="flex justify-between gap-4"><span>Subtotal</span><span>{money(summary.subTotal)}</span></div>
					<div className="flex justify-between gap-4"><span>Discount{Number(summary.discountPct || 0) ? ` (${Number(summary.discountPct)}%)` : ""}</span><span>−{money(summary.discount)}</span></div>
					<div className="flex justify-between gap-4"><span>Tax{Number(summary.taxRate || 0) ? ` (${Number(summary.taxRate)}%)` : ""}</span><span>{money(summary.taxTotal)}</span></div>
					<div className="flex justify-between gap-4 pt-1 text-lg font-semibold"><span>Order total</span><span>{money(summary.grandTotal)}</span></div>
				</div>
			</CardContent>
		</Card>
	);
}
