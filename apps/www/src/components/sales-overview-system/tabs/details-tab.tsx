"use client";

import { Icons } from "@gnd/ui/icons";

import { useSalesOverviewSystem } from "../provider";
import {
	OverviewSectionCard,
	OverviewSectionLabel,
} from "../section-primitives";

function DetailsRow({
	label,
	value,
}: {
	label: string;
	value?: string | null;
}) {
	if (!value) return null;
	return (
		<div className="flex items-start justify-between gap-4 border-b border-border/40 py-2.5 last:border-b-0">
			<p className="min-w-[130px] text-sm text-muted-foreground">{label}</p>
			<p className="text-right text-sm font-medium font-mono break-all">
				{value}
			</p>
		</div>
	);
}

export function SalesOverviewDetailsTab() {
	const {
		state: { data },
	} = useSalesOverviewSystem();

	return (
		<div className="space-y-5 p-1">
			{/* Identifiers */}
			<OverviewSectionCard>
				<OverviewSectionLabel icon={Icons.Hash} label="Identifiers" />
				<DetailsRow label="Internal ID" value={String(data?.id || "")} />
				<DetailsRow label="Order Number" value={data?.orderId} />
				<DetailsRow label="P.O Number" value={data?.poNo} />
				<DetailsRow label="UUID / Slug" value={data?.uuid} />
				<DetailsRow
					label="Customer ID"
					value={String(data?.customerId || "")}
				/>
				<DetailsRow label="Account No" value={data?.accountNo} />
			</OverviewSectionCard>

			{/* Classification */}
			<OverviewSectionCard>
				<OverviewSectionLabel icon={Icons.Tag} label="Classification" />
				<DetailsRow label="Sale Type" value={data?.type} />
				<DetailsRow
					label="Is Quote"
					value={data?.type === "quote" ? "Yes" : "No"}
				/>
				<DetailsRow
					label="Is Business"
					value={data?.isBusiness ? "Yes" : "No"}
				/>
				<DetailsRow label="Is Dyke" value={data?.isDyke ? "Yes" : "No"} />
				<DetailsRow label="Sales Rep" value={data?.salesRep} />
				<DetailsRow label="Rep Initial" value={data?.salesRepInitial} />
			</OverviewSectionCard>

			{/* Dates */}
			<OverviewSectionCard>
				<OverviewSectionLabel icon={Icons.Info} label="Dates &amp; Terms" />
				<DetailsRow label="Sales Date" value={data?.salesDate} />
				<DetailsRow label="Due Date" value={data?.dueDate} />
				<DetailsRow label="Net Terms" value={data?.netTerm} />
				<DetailsRow
					label="Delivery Option"
					value={data?.deliveryOption || data?.status?.delivery?.status}
				/>
			</OverviewSectionCard>

			{/* Raw status snapshot */}
			<OverviewSectionCard>
				<OverviewSectionLabel icon={Icons.Database} label="Status Snapshot" />
				<pre className="overflow-x-auto rounded-lg bg-muted/50 p-4 text-[11px] leading-relaxed text-foreground/80">
					{JSON.stringify(
						{
							production: data?.status?.production,
							assignment: data?.status?.assignment,
							delivery: data?.status?.delivery,
							stats: data?.stats,
						},
						null,
						2,
					)}
				</pre>
			</OverviewSectionCard>
		</div>
	);
}
