import type { ReactNode } from "react";
import { formatSalesFormCurrency } from "./format";

export type SalesFormTotalsCardProps = {
	title: string;
	subTotal?: number | null;
	taxTotal?: number | null;
	grandTotal?: number | null;
	subTotalLabel?: string;
	taxTotalLabel?: string;
	grandTotalLabel?: string;
	className?: string;
	footer?: ReactNode;
};

export function SalesFormTotalsCard(props: SalesFormTotalsCardProps) {
	return (
		<aside className={props.className || "rounded-lg border p-4"}>
			<h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
				{props.title}
			</h3>
			<div className="mt-4 space-y-3 text-sm">
				<div className="flex justify-between gap-4">
					<span>{props.subTotalLabel || "Subtotal"}</span>
					<span>{formatSalesFormCurrency(props.subTotal)}</span>
				</div>
				<div className="flex justify-between gap-4">
					<span>{props.taxTotalLabel || "Tax"}</span>
					<span>{formatSalesFormCurrency(props.taxTotal)}</span>
				</div>
				<div className="flex justify-between gap-4 border-t pt-3 text-base font-semibold">
					<span>{props.grandTotalLabel || "Total"}</span>
					<span>{formatSalesFormCurrency(props.grandTotal)}</span>
				</div>
			</div>
			{props.footer}
		</aside>
	);
}
