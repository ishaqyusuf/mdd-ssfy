"use client";

import { SalesFormSummarySidebar } from "@gnd/sales/sales-form";
import dynamic from "next/dynamic";
import { useSalesFormCapabilities } from "../adapters/use-sales-form-capabilities";
import { useSalesFormPermissions } from "../adapters/use-sales-form-permissions";
import { useNewSalesFormStore } from "../store";

interface Props {
	mode: "create" | "edit";
	type: "order" | "quote";
	isSaved: boolean;
	isSaving?: boolean;
	mobileOpen: boolean;
	onClose: () => void;
	onSave: () => void;
	onSaveClose: () => void;
	onSaveNew: () => void;
	onSaveFinal: () => void;
}

const SalesHistory = dynamic(
	() => import("@/components/sales-hx").then((mod) => mod.SalesHistory),
	{
		loading: () => (
			<div className="space-y-3">
				<div className="h-10 w-full animate-pulse rounded bg-muted" />
				<div className="h-20 w-full animate-pulse rounded bg-muted" />
				<div className="h-20 w-full animate-pulse rounded bg-muted" />
			</div>
		),
	},
);

const InvoiceOverviewPanel = dynamic(
	() =>
		import("./invoice-overview-panel").then((mod) => mod.InvoiceOverviewPanel),
	{
		loading: () => (
			<div className="space-y-3">
				<div className="h-10 w-full animate-pulse rounded bg-muted" />
				<div className="h-32 w-full animate-pulse rounded bg-muted" />
				<div className="h-24 w-full animate-pulse rounded bg-muted" />
			</div>
		),
	},
);

export function InvoiceSummarySidebar(props: Props) {
	const record = useNewSalesFormStore((state) => state.record);
	const capabilities = useSalesFormCapabilities(props.type);
	const permissions = useSalesFormPermissions(props.type);

	return (
		<SalesFormSummarySidebar
			mode={props.mode}
			type={props.type}
			isSaved={props.isSaved}
			isSaving={props.isSaving}
			mobileOpen={props.mobileOpen}
			orderId={record?.orderId}
			capabilities={capabilities}
			permissions={permissions}
			summaryPanel={
				<InvoiceOverviewPanel mode={props.mode} type={props.type} />
			}
			historyPanel={
				capabilities.salesHistory ? (
					<SalesHistory salesId={record?.salesId} />
				) : undefined
			}
			onClose={props.onClose}
			onSave={props.onSave}
			onSaveClose={props.onSaveClose}
			onSaveNew={props.onSaveNew}
			onSaveFinal={props.onSaveFinal}
		/>
	);
}
