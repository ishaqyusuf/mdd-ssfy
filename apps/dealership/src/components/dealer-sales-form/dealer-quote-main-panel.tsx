"use client";

import { SalesFormWorkflowPanel } from "@gnd/sales/sales-form";
import { Input } from "@gnd/ui/input";
import type React from "react";
import { useDealerSalesFormWorkflowData } from "./adapters/use-sales-form-workflow-data";
import type {
	DealerSalesFormCustomer,
	DealerSalesFormProfile,
	DealerSalesFormRecord,
} from "./types";

type DealerQuoteMainPanelProps = {
	customers: DealerSalesFormCustomer[];
	profiles: DealerSalesFormProfile[];
	record: DealerSalesFormRecord;
	onCustomerChange: (
		customerId: number | null,
		customerProfileId?: number | null,
	) => void;
	onCustomerProfileChange: (customerProfileId: number | null) => void;
	onTaxRateChange: (taxRate: number) => void;
	onAddLineItem: () => void;
	onRemoveLineItem: (uid: string) => void;
	onUpdateLineItem: (
		uid: string,
		patch: Partial<DealerSalesFormRecord["lineItems"][number]>,
	) => void;
	lineTotalsByUid?: Record<string, number>;
};

function QuoteField({
	label,
	name,
	...props
}: React.InputHTMLAttributes<HTMLInputElement> & {
	label: string;
	name: string;
}) {
	return (
		<label className="space-y-2">
			<span className="text-sm font-medium">{label}</span>
			<Input name={name} {...props} />
		</label>
	);
}

export function DealerQuoteMainPanel(props: DealerQuoteMainPanelProps) {
	const customerId = props.record.form.customerId;
	const customerProfileId = props.record.form.customerProfileId;
	const workflowDataSource = useDealerSalesFormWorkflowData();

	return (
		<div className="space-y-4 p-4">
			<div className="grid gap-3 rounded-lg border p-4 md:grid-cols-3">
				<label className="space-y-2">
					<span className="text-sm font-medium">Customer</span>
					<select
						className="h-9 w-full rounded-md border bg-background px-3 text-sm"
						onChange={(event) => {
							const nextCustomerId = Number(event.target.value || 0) || null;
							const customer = props.customers.find(
								(item) => item.id === nextCustomerId,
							);
							props.onCustomerChange(
								nextCustomerId,
								customer?.customerTypeId || null,
							);
						}}
						value={customerId || ""}
					>
						<option value="">Select customer</option>
						{props.customers.map((customer) => (
							<option key={customer.id} value={customer.id}>
								{customer.businessName ||
									customer.name ||
									customer.email ||
									customer.id}
							</option>
						))}
					</select>
				</label>
				<label className="space-y-2">
					<span className="text-sm font-medium">Sales profile</span>
					<select
						className="h-9 w-full rounded-md border bg-background px-3 text-sm"
						onChange={(event) =>
							props.onCustomerProfileChange(
								Number(event.target.value || 0) || null,
							)
						}
						value={customerProfileId || ""}
					>
						<option value="">Standard</option>
						{props.profiles.map((profile) => (
							<option key={profile.id} value={profile.id}>
								{profile.title}
							</option>
						))}
					</select>
				</label>
				<QuoteField
					label="Tax rate"
					min={0}
					name="taxRate"
					onChange={(event) =>
						props.onTaxRateChange(Number(event.target.value || 0))
					}
					step="0.01"
					type="number"
					value={Number(props.record.summary?.taxRate || 0)}
				/>
			</div>
			<div className="space-y-3">
				<SalesFormWorkflowPanel
					record={props.record}
					dataSource={workflowDataSource}
					pricing={{
						lineTotalMode: "readonly",
						getLineDisplayTotal: (line) =>
							props.lineTotalsByUid?.[line.uid] ??
							Number(line.qty || 0) * Number(line.unitPrice || 0),
					}}
					actions={{
						addLineItem: props.onAddLineItem,
						updateLineItem: props.onUpdateLineItem,
						removeLineItem: props.onRemoveLineItem,
					}}
				/>
			</div>
		</div>
	);
}
