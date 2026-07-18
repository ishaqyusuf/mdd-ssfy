import {
	LineInput,
	LineSwitch,
} from "@/app-deps/(clean-code)/(sales)/sales-book/(form)/_components/line-input";
import { AnimatedNumber } from "@/components/animated-number";
import ConfirmBtn from "@/components/confirm-button";
import { DataTable as SalesFormServiceLinesTable } from "@/components/tables-2/sales-form-service-lines/data-table";
import { Button } from "@gnd/ui/button";
import { cn } from "@gnd/ui/cn";
import { LineItemProvider, useGroupedItem, useLineItem } from "../context";
import { useTakeoffItem } from "../take-off/context";
import { QtyInput } from "./qty-input";

export function ServiceContent() {
	const { addService, groupClass, valueChanged } = useGroupedItem();
	const itemCtx = useTakeoffItem();
	const groupItem = itemCtx?.itemForm?.groupItem;
	const serviceRows =
		groupItem?.itemIds?.map((itemId, index) => ({
			id: itemId,
			itemId,
			index,
		})) ?? [];

	return (
		<>
			<div className="space-y-3 lg:hidden">
				{groupItem?.itemIds?.map((itemId, sn) => (
					<LineItemProvider
						key={`mobile-${itemId}`}
						args={[
							{
								uid: itemId,
								index: sn,
							},
						]}
					>
						<ServiceMobileCard index={sn} />
					</LineItemProvider>
				))}
			</div>
			<div className="hidden lg:block">
				<SalesFormServiceLinesTable
					data={serviceRows}
					groupClass={groupClass}
					valueChanged={valueChanged}
				/>
			</div>
			<Button
				variant={"secondary"}
				className={cn(
					"w-full",
					"border border-transparent hover:border-border text-xs uppercase p-1 h-7 rounded font-mono$ overflow-hidden gap-2",
				)}
				onClick={addService}
			>
				<span>Add Service</span>
			</Button>
		</>
	);
}
function ServiceMobileCard({ index }: { index: number }) {
	const { groupClass, valueChanged } = useGroupedItem();
	const { lineUid } = useLineItem();
	return (
		<div className="rounded-xl border bg-background p-4 shadow-sm">
			<div className="flex items-start justify-between gap-3">
				<div className="text-xs uppercase text-muted-foreground">
					Service #{index + 1}
				</div>
				<Action />
			</div>
			<div className="mt-3 space-y-3">
				<div className="space-y-1">
					<div className="text-xs uppercase text-muted-foreground">Service</div>
					<LineInput
						cls={groupClass}
						name="meta.description"
						lineUid={lineUid}
					/>
				</div>
				<div className="grid gap-3 sm:grid-cols-2">
					<div className="space-y-1">
						<div className="text-xs uppercase text-muted-foreground">Tax</div>
						<LineSwitch
							cls={groupClass}
							name="meta.taxxable"
							lineUid={lineUid}
							valueChanged={valueChanged}
						/>
					</div>
					<div className="space-y-1">
						<div className="text-xs uppercase text-muted-foreground">Prod</div>
						<LineSwitch
							cls={groupClass}
							name="meta.produceable"
							lineUid={lineUid}
						/>
					</div>
					<div className="space-y-1">
						<div className="text-xs uppercase text-muted-foreground">Qty</div>
						<QtyInput />
					</div>
					<div className="space-y-1">
						<div className="text-xs uppercase text-muted-foreground">Price</div>
						<UnitPrice />
					</div>
				</div>
				<div className="space-y-1">
					<div className="text-xs uppercase text-muted-foreground">Total</div>
					<div className="text-base font-semibold">
						<TotalCell />
					</div>
				</div>
			</div>
		</div>
	);
}
function UnitPrice() {
	const { mouldingItemStepUid, valueChanged, groupClass } = useGroupedItem();
	const { lineUid } = useLineItem();
	return (
		<LineInput
			cls={groupClass}
			name="pricing.customPrice"
			lineUid={lineUid}
			type="number"
			prefix="$"
			numberProps={{
				prefix: "$",
			}}
			valueChanged={valueChanged}
		/>
	);
}
function Action() {
	const lineCtx = useLineItem();
	const ctx = useGroupedItem();
	const { lineForm, lineUid } = lineCtx;
	return (
		<>
			<ConfirmBtn
				disabled={ctx?.groupClass?.selectCount === 1}
				onClick={() => {
					ctx?.removeItem(lineUid);
				}}
				trash
				size="icon"
			/>
		</>
	);
}
function TotalCell() {
	const line = useLineItem();
	return <AnimatedNumber value={line?.lineForm?.pricing?.totalPrice || 0} />;
}
