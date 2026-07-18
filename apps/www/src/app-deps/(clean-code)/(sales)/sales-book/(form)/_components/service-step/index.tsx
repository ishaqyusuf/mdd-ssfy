import ConfirmBtn from "@/components/_v1/confirm-btn";
import { AnimatedNumber } from "@/components/animated-number";
import {
	type CleanCodeSalesFormServiceLineRow,
	DataTable as CleanCodeSalesFormServiceLinesTable,
} from "@/components/tables-2/clean-code-sales-form-service-lines/data-table";
import { Icons } from "@gnd/ui/icons";

import { Button } from "@gnd/ui/button";

import { LineInput, LineSwitch } from "../line-input";
import { Context, useCreateContext, useCtx } from "./ctx";

interface Props {
	itemStepUid;
}
export default function ServiceLineItem({ itemStepUid }: Props) {
	const ctx = useCreateContext(itemStepUid);
	const serviceRows = buildServiceRows(
		ctx.itemIds || [],
		ctx.itemForm?.groupItem?.form || {},
	);

	return (
		<Context.Provider value={ctx}>
			<div className="space-y-3 lg:hidden">
				{ctx.itemIds?.map((m, index) => (
					<ServiceMobileCard key={`mobile-${m}`} sn={index + 1} lineUid={m} />
				))}
				<div className="rounded-xl border bg-accent/40 p-3">
					<Button
						onClick={() => {
							ctx.ctx.addServiceLine();
						}}
						className="w-full"
					>
						<Icons.add className="mr-2 size-4" />
						<span>Line</span>
					</Button>
				</div>
			</div>
			<div className="hidden lg:block">
				<div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
					<CleanCodeSalesFormServiceLinesTable data={serviceRows} />
					<div className="border-border border-x border-b bg-sidebar-accent p-2">
						<Button
							onClick={() => {
								ctx.ctx.addServiceLine();
							}}
						>
							<Icons.add className="mr-2 size-4" />
							<span>Line</span>
						</Button>
					</div>
				</div>
			</div>
		</Context.Provider>
	);
}

function buildServiceRows(
	itemIds: string[],
	form: Record<string, { selected?: boolean }>,
): CleanCodeSalesFormServiceLineRow[] {
	return itemIds.reduce<CleanCodeSalesFormServiceLineRow[]>(
		(rows, lineUid, index) => {
			if (!form?.[lineUid]?.selected) return rows;

			rows.push({
				id: lineUid,
				lineUid,
				sn: index + 1,
			});

			return rows;
		},
		[],
	);
}

function ServiceMobileCard({ lineUid, sn }: { sn; lineUid }) {
	const ctx = useCtx();
	const mfd = ctx.itemForm?.groupItem?.form?.[lineUid];
	const valueChanged = () => {
		ctx.ctx.updateGroupedCost();
		ctx.ctx.calculateTotalPrice();
	};

	if (!mfd?.selected) return null;

	return (
		<div className="rounded-xl border bg-background p-4 shadow-sm">
			<div className="flex items-start justify-between gap-3">
				<div className="text-xs uppercase text-muted-foreground">
					Service #{sn}
				</div>
				<ConfirmBtn
					onClick={() => {
						ctx.ctx.removeGroupItem(lineUid);
					}}
					trash
					disabled={ctx.ctx.selectCount === 1}
					size="icon"
				/>
			</div>
			<div className="mt-3 space-y-3">
				<div className="space-y-1">
					<div className="text-xs uppercase text-muted-foreground">
						Description
					</div>
					<LineInput cls={ctx.ctx} name="meta.description" lineUid={lineUid} />
				</div>
				<div className="grid grid-cols-4 gap-2 items-end">
					<div className="space-y-1">
						<div className="text-xs uppercase text-muted-foreground">Tax</div>
						<LineSwitch
							cls={ctx.ctx}
							name="meta.taxxable"
							lineUid={lineUid}
							valueChanged={valueChanged}
						/>
					</div>
					<div className="space-y-1">
						<div className="text-xs uppercase text-muted-foreground">
							Production
						</div>
						<LineSwitch
							cls={ctx.ctx}
							name="meta.produceable"
							lineUid={lineUid}
						/>
					</div>
					<div className="space-y-1 min-w-0">
						<div className="text-xs uppercase text-muted-foreground">Qty</div>
						<LineInput
							cls={ctx.ctx}
							name="qty.total"
							lineUid={lineUid}
							type="number"
							valueChanged={valueChanged}
							mask
							qtyInputProps={{
								min: 1,
							}}
						/>
					</div>
					<div className="space-y-1 min-w-0">
						<div className="text-xs uppercase text-muted-foreground">
							Unit Price
						</div>
						<LineInput
							cls={ctx.ctx}
							name="pricing.customPrice"
							lineUid={lineUid}
							type="number"
							valueChanged={valueChanged}
						/>
					</div>
				</div>
				<div className="space-y-1">
					<div className="text-xs uppercase text-muted-foreground">
						Line Total
					</div>
					<div className="text-base font-semibold">
						<AnimatedNumber value={mfd?.pricing?.totalPrice || 0} />
					</div>
				</div>
			</div>
		</div>
	);
}
