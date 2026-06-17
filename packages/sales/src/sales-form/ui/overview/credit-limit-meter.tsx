/** @jsxImportSource react */
import { formatSalesFormCurrency } from "./format";

export type SalesFormCreditLimitMeterProps = {
	creditLimit?: number | null;
	creditUsed?: number | null;
};

export function SalesFormCreditLimitMeter(props: SalesFormCreditLimitMeterProps) {
	const creditLimit = Number(props.creditLimit || 0);
	const creditUsed = Number(props.creditUsed || 0);
	const usagePct =
		creditLimit > 0
			? Math.min(100, Math.max(0, (creditUsed / creditLimit) * 100))
			: 0;

	return (
		<div className="flex flex-col gap-3 rounded-xl border border-transparent bg-muted p-4">
			<div className="flex items-center justify-between gap-4 text-[10px] text-muted-foreground">
				<span className="font-bold uppercase tracking-widest">
					Customer Credit Limit
				</span>
				<span className="font-mono font-bold text-foreground">
					{creditLimit > 0
						? `${formatSalesFormCurrency(creditUsed)} / ${formatSalesFormCurrency(creditLimit)}`
						: "N/A"}
				</span>
			</div>
			<div className="h-1.5 w-full overflow-hidden rounded-full bg-border">
				<div
					className="h-1.5 rounded-full bg-primary"
					style={{ width: `${usagePct}%` }}
				/>
			</div>
		</div>
	);
}
