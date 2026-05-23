"use client";

import {
	SalesFormEnginePanel,
	createDealerSalesFormWorkflowCapabilities,
} from "@gnd/sales/sales-form";
import { useDealerSalesFormWorkflowData } from "./adapters/use-sales-form-workflow-data";
import type { DealerSalesFormRecord } from "./types";

type DealerQuoteMainPanelProps = {
	record: DealerSalesFormRecord;
	onAddLineItem: () => void;
	onRemoveLineItem: (uid: string) => void;
	onUpdateLineItem: (
		uid: string,
		patch: Partial<DealerSalesFormRecord["lineItems"][number]>,
	) => void;
	lineTotalsByUid?: Record<string, number>;
};

export function DealerQuoteMainPanel(props: DealerQuoteMainPanelProps) {
	const workflowDataSource = useDealerSalesFormWorkflowData();
	const workflowCapabilities = createDealerSalesFormWorkflowCapabilities();

	return (
		<div className="p-4">
			<div>
				<SalesFormEnginePanel
					record={props.record}
					dataSource={workflowDataSource}
					workflowCapabilities={workflowCapabilities}
					pricing={{
						lineTotalMode: workflowCapabilities.canEditLinePricing
							? "editable"
							: "readonly",
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
