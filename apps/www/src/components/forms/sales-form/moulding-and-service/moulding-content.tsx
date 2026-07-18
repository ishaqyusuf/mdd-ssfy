import { LineInput } from "@/app-deps/(clean-code)/(sales)/sales-book/(form)/_components/line-input";
import { MouldingClass } from "@/app-deps/(clean-code)/(sales)/sales-book/(form)/_utils/helpers/zus/moulding-class";
import { DataLine } from "@/components/(clean-code)/data-table/Dl";
import { MoneyBadge } from "@/components/(clean-code)/money-badge";
import Money from "@/components/_v1/money";
import { AnimatedNumber } from "@/components/animated-number";
import ConfirmBtn from "@/components/confirm-button";
import { DataTable as SalesFormMouldingLinesTable } from "@/components/tables-2/sales-form-moulding-lines/data-table";
import { Menu } from "@gnd/ui/custom/menu";
import { Label } from "@gnd/ui/label";
import { LineItemProvider, useGroupedItem, useLineItem } from "../context";
import { useTakeoffItem } from "../take-off/context";
import { QtyInput } from "./qty-input";
import { SelectMoulding } from "./select-moulding";

export function MouldingContent() {
	const itemCtx = useTakeoffItem();
	const groupItem = itemCtx?.itemForm?.groupItem;
	const mouldingRows =
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
						<MouldingMobileCard index={sn} />
					</LineItemProvider>
				))}
			</div>
			<div className="hidden lg:block">
				<SalesFormMouldingLinesTable data={mouldingRows} />
			</div>
			<div>
				<SelectMoulding />
			</div>
		</>
	);
}
function MouldingMobileCard({ index }: { index: number }) {
	const line = useLineItem();
	return (
		<div className="rounded-xl border bg-background p-4 shadow-sm">
			<div className="flex items-start justify-between gap-3">
				<div>
					<div className="text-xs uppercase text-muted-foreground">
						Moulding #{index + 1}
					</div>
					<div className="font-semibold uppercase">
						{line?.lineForm?.meta?.description}
					</div>
				</div>
				<Action />
			</div>
			<div className="mt-4 grid gap-3 sm:grid-cols-2">
				<div className="space-y-1">
					<div className="text-xs uppercase text-muted-foreground">Qty</div>
					<QtyInput />
				</div>
				<div className="space-y-1">
					<div className="text-xs uppercase text-muted-foreground">
						Estimate
					</div>
					<PriceEstimateCell />
				</div>
				<div className="space-y-1">
					<div className="text-xs uppercase text-muted-foreground">
						Addon/Qty
					</div>
					<AddonCell />
				</div>
				<div className="space-y-1">
					<div className="text-xs uppercase text-muted-foreground">
						Line Total
					</div>
					<div className="text-base font-semibold">
						<TotalCell />
					</div>
				</div>
			</div>
		</div>
	);
}
function TotalCell() {
	const line = useLineItem();
	return <AnimatedNumber value={line?.lineForm?.pricing?.totalPrice || 0} />;
}
function AddonCell() {
	const { mouldingItemStepUid, valueChanged } = useGroupedItem();
	const { lineUid } = useLineItem();
	const mould = new MouldingClass(mouldingItemStepUid);
	return (
		<LineInput
			cls={mould}
			name="pricing.addon"
			lineUid={lineUid}
			type="number"
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
function PriceEstimateCell() {
	const lineCtx = useLineItem();
	const ctx = useGroupedItem();
	const { lineForm, lineUid } = lineCtx;
	const mould = new MouldingClass(ctx.mouldingItemStepUid);
	const lineItem = mould.getMouldingLineItemForm();
	const moulding = ctx?.mouldings?.find(
		(m) => String(m.productId) === String(lineForm?.mouldingProductId),
	);
	return (
		<Menu
			noSize
			Icon={null}
			label={<Money value={lineForm?.pricing?.unitPrice} />}
		>
			<div className="min-w-[300px] p-2">
				<div>
					<Label>Price Summary</Label>
				</div>
				<dl>
					{lineItem?.pricedSteps?.map((step) => (
						<DataLine
							size="sm"
							key={step.title}
							label={step.title}
							value={
								<div className="flex items-center justify-end gap-4">
									<span>{step.value}</span>
									<MoneyBadge>{step.price}</MoneyBadge>
								</div>
							}
						/>
					))}
					<DataLine
						size="sm"
						label="Moulding"
						value={
							<div className="flex items-center justify-end gap-4">
								<span className="line-clamp-2 max-w-xs">{`${moulding?.title}`}</span>
								<MoneyBadge>{moulding?.salesPrice}</MoneyBadge>
							</div>
						}
					/>
					<DataLine
						size="sm"
						label="Custom Price"
						value={
							<LineInput
								className="w-28"
								cls={mould}
								name="pricing.customPrice"
								lineUid={lineUid}
								type="number"
								allowZero
								valueChanged={ctx.valueChanged}
							/>
						}
					/>
				</dl>
			</div>
		</Menu>
	);
}
