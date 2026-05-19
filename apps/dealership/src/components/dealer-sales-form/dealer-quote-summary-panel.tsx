"use client";

import { SalesFormTotalsCard } from "@gnd/sales/sales-form";
import { Button } from "@gnd/ui/button";
import { Save } from "lucide-react";

type DealerQuoteSummaryPanelProps = {
	subTotal?: number | null;
	taxTotal?: number | null;
	grandTotal?: number | null;
	isSaving?: boolean;
	isFetching?: boolean;
	canSave?: boolean;
	isEditing?: boolean;
	onSave: () => void;
};

export function DealerQuoteSummaryPanel(props: DealerQuoteSummaryPanelProps) {
	return (
		<SalesFormTotalsCard
			className="border-0 p-0"
			grandTotal={props.grandTotal}
			subTotal={props.subTotal}
			taxTotal={props.taxTotal}
			title="Customer quote total"
			footer={
				<Button
					className="mt-5 w-full"
					disabled={props.isSaving || props.isFetching || !props.canSave}
					onClick={props.onSave}
					type="button"
				>
					<Save className="mr-2 size-4" />
					{props.isSaving
						? "Saving..."
						: props.isEditing
							? "Update quote"
							: "Save quote"}
				</Button>
			}
		/>
	);
}

