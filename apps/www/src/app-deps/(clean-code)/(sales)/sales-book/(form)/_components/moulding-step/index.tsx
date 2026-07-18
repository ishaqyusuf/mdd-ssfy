import {
	type CleanCodeSalesFormMouldingLineRow,
	DataTable as CleanCodeSalesFormMouldingLinesTable,
} from "@/components/tables-2/clean-code-sales-form-moulding-lines/data-table";

import type { MouldingClass } from "../../_utils/helpers/zus/moulding-class";
import { Context, useCreateContext } from "./ctx";

interface Props {
	itemStepUid;
}
export default function MouldingLineItem({ itemStepUid }: Props) {
	const ctx = useCreateContext(itemStepUid);
	const mouldingRows = buildMouldingRows(
		ctx.mouldings || [],
		ctx.itemForm?.groupItem?.form || {},
	);

	return (
		<Context.Provider value={ctx}>
			<div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
				<CleanCodeSalesFormMouldingLinesTable
					data={mouldingRows}
					itemType={ctx?.ctx?.getItemType()}
				/>
			</div>
		</Context.Provider>
	);
}

type MouldingItem = ReturnType<
	MouldingClass["getMouldingLineItemForm"]
>["mouldings"][number];

function buildMouldingRows(
	mouldings: MouldingItem[],
	form: Record<string, { selected?: boolean }>,
): CleanCodeSalesFormMouldingLineRow[] {
	return mouldings.reduce<CleanCodeSalesFormMouldingLineRow[]>(
		(rows, moulding, index) => {
			const lineUid = moulding?.uid;

			if (!lineUid || !form?.[lineUid]?.selected) return rows;

			const unitPrice = Number(moulding?.basePrice?.price);

			rows.push({
				id: lineUid,
				lineUid,
				sn: index + 1,
				title: String(moulding?.title || ""),
				basePrice: moulding?.basePrice?.price,
				unitPrice: Number.isFinite(unitPrice) ? unitPrice : undefined,
			});

			return rows;
		},
		[],
	);
}
