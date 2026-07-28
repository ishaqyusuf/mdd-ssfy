import { doorItemControlUid } from "@/app-deps/(clean-code)/(sales)/_common/utils/item-control-utils";
import ConfirmBtn from "@/components/_v1/confirm-btn";
import { AnimatedNumber } from "@/components/animated-number";
import Note from "@/modules/notes";
import { noteTagFilter } from "@/modules/notes/utils";
import TextWithTooltip from "@gnd/ui/custom/text-with-tooltip";
import { Icons } from "@gnd/ui/icons";

import { Button } from "@gnd/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@gnd/ui/tabs";

import { Door } from "./hpt-door";

import {
	LineInput,
	LineSwitch,
} from "@/app-deps/(clean-code)/(sales)/sales-book/(form)/_components/line-input";
import {
	type HptContext,
	HptContextProvider,
	HptLineContextProvider,
	useHpt,
	useHptLine,
} from "@/components/forms/sales-form/context";
import { HptNote } from "@/components/forms/sales-form/hpt/hpt-note";
import { PriceEstimateCell } from "@/components/forms/sales-form/hpt/price-estimate-cell";
import {
	type SalesFormHptLineRow,
	DataTable as SalesFormHptLinesTable,
} from "@/components/tables-2/sales-form-hpt-lines/data-table";
import { useEffect } from "react";
import { HptAddDoorSize } from "./hpt-add-door-size";

interface Props {
	itemStepUid: string;
}
export function HptSection({ itemStepUid }: Props) {
	return (
		<HptContextProvider
			args={[
				{
					itemStepUid,
				},
			]}
		>
			<Content itemStepUid={itemStepUid} />
		</HptContextProvider>
	);
}
function Content({ itemStepUid }: { itemStepUid: string }) {
	const ctx = useHpt();
	const isOpen = ctx.itemForm?.currentStepUid === itemStepUid;

	useEffect(() => {
		if (!isOpen) return;
		ctx.hpt.updateGroupedCost();
		ctx.hpt.calculateTotalPrice();
	}, [ctx.hpt, isOpen]);

	return (
		<section className="space-y-4 bg-gradient-to-br from-white via-slate-50/70 to-slate-100/60 p-4">
			<Tabs
				onValueChange={(e) => {
					ctx.hpt.tabChanged(e);
					// ctx.setTab(e);
				}}
				value={ctx.hpt.tabUid}
			>
				<TabsList className="flex h-auto w-full flex-wrap justify-start gap-2 rounded-2xl bg-slate-100/80 p-2">
					{ctx.doors?.map((door) => (
						<TabsTrigger
							key={door.uid}
							value={door.uid}
							className="rounded-full border border-transparent px-4 py-2 text-xs font-semibold uppercase tracking-wide data-[state=active]:border-primary/20 data-[state=active]:bg-white data-[state=active]:text-primary"
						>
							<TextWithTooltip className="max-w-[260px]" text={door.title} />
						</TabsTrigger>
					))}
				</TabsList>
				{ctx.doors?.map((door, i) => (
					<TabsContent key={door.uid} value={door.uid}>
						<DoorSizeTable door={door} sn={i + 1} />
					</TabsContent>
				))}
			</Tabs>
		</section>
	);
}
interface DoorSizeTable {
	door: HptContext["doors"][number];
	sn: number;
}

function DoorSizeTable({ door, sn }: DoorSizeTable) {
	const ctx = useHpt();

	const itemType = ctx?.hpt?.getItemForm()?.groupItem?.itemType;
	const isSlab = itemType === "Door Slabs Only";
	const showSwingColumn = door.sizeList.some((sl) =>
		Boolean(
			ctx.config.hasSwing || ctx.itemForm?.groupItem?.form?.[sl.path]?.swing,
		),
	);
	const hptRows = door.sizeList.reduce<SalesFormHptLineRow[]>(
		(rows, sl, index) => {
			if (!ctx.itemForm?.groupItem?.form?.[sl.path]?.selected) return rows;

			rows.push({
				id: sl.path,
				lineUid: sl.path,
				sn: index + 1,
			});

			return rows;
		},
		[],
	);
	return (
		<div className="grid w-full grid-cols-1 gap-4 xl:grid-cols-4">
			<div className="space-y-4 xl:col-span-3">
				<div className="lg:hidden">
					<Door door={door} />
				</div>
				<div className="lg:hidden space-y-3">
					{door.sizeList.map((sl, i) => (
						<DoorSizeRow
							doorIndex={sn - 1}
							sn={i + 1}
							lineUid={sl.path}
							key={`mobile-${sl.path}`}
							mode="mobile"
						/>
					))}
					<div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
						<HptAddDoorSize doorIndex={sn - 1} />
					</div>
				</div>
				<div className="hidden lg:block">
					<div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
						<SalesFormHptLinesTable
							data={hptRows}
							isSlab={isSlab}
							showSwing={showSwingColumn}
							noHandle={Boolean(ctx.config.noHandle)}
						/>
						<div className="border-border border-x border-b bg-sidebar-accent p-2">
							<HptAddDoorSize doorIndex={sn - 1} />
						</div>
					</div>
					<HptNotesPanel rows={hptRows} />
				</div>
			</div>
			<div className="hidden xl:block">
				<Door door={door} />
			</div>
		</div>
	);
}
function HptNotesPanel({ rows }: { rows: SalesFormHptLineRow[] }) {
	const { showNote } = useHpt();

	if (!showNote) return null;

	return (
		<div className="mt-3 space-y-3">
			{rows.map((row) => (
				<HptLineContextProvider
					key={`note-${row.lineUid}`}
					args={[
						{
							lineUid: row.lineUid,
							sn: row.sn,
						},
					]}
				>
					<HptNote />
				</HptLineContextProvider>
			))}
		</div>
	);
}
function DoorSizeRow({
	lineUid,
	sn,
	doorIndex,
	mode = "desktop",
}: {
	lineUid;
	sn;
	doorIndex;
	mode?: "desktop" | "mobile";
}) {
	return (
		<HptLineContextProvider
			args={[
				{
					lineUid,
					sn,
				},
			]}
		>
			<DoorSizeRowContent
				doorIndex={doorIndex}
				sizeIndex={sn - 1}
				mode={mode}
			/>
		</HptLineContextProvider>
	);
}
function DoorSizeRowContent({
	doorIndex,
	sizeIndex,
	mode = "desktop",
}: {
	doorIndex;
	sizeIndex;
	mode?: "desktop" | "mobile";
}) {
	const ctx = useHpt();
	const line = useHptLine();
	const { lineUid, zDoor, sizeForm, size, sn, valueChanged } = line;
	const { isSlab, showNote, setShowNote } = ctx;
	const showSwing = Boolean(ctx.config.hasSwing || sizeForm?.swing);

	if (!zDoor?.selected) return <></>;

	if (mode === "mobile") {
		return (
			<div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
				<div className="flex items-start justify-between gap-3">
					<div>
						<div className="text-xs uppercase tracking-wide text-slate-500">
							Size
						</div>
						<div className="text-base font-semibold text-slate-900">
							{size.size}
						</div>
					</div>
					<div className="flex items-center gap-2">
						<Button
							variant={showNote ? "default" : "outline"}
							size="xs"
							className="rounded-full"
							onClick={() => {
								setShowNote(!showNote);
							}}
						>
							<Icons.Notebook className="size-4" />
						</Button>
						<ConfirmBtn
							disabled={ctx.hpt.selectCount === 1}
							onClick={() => {
								ctx.hpt.removeGroupItem(size.path);
							}}
							trash
							size="icon"
						/>
					</div>
				</div>

				<div className="grid gap-3 sm:grid-cols-2">
					{!isSlab || (
						<div className="space-y-1">
							<div className="text-xs uppercase tracking-wide text-slate-500">
								Prod
							</div>
							<LineSwitch
								cls={ctx.hpt}
								name="prodOverride.production"
								lineUid={lineUid}
							/>
						</div>
					)}
					{showSwing && (
						<div className="space-y-1">
							<div className="text-xs uppercase tracking-wide text-slate-500">
								Swing
							</div>
							<LineInput cls={ctx.hpt} name="swing" lineUid={lineUid} />
						</div>
					)}
				</div>

				<div className="grid gap-2 grid-cols-3 items-end">
					<div className="space-y-1">
						<div className="text-xs uppercase tracking-wide text-slate-500">
							Estimate
						</div>
						<PriceEstimateCell />
					</div>
					<div className="space-y-1">
						<div className="text-xs uppercase tracking-wide text-slate-500">
							{ctx.config.noHandle ? "Qty" : "Qty"}
						</div>
						{ctx.config.noHandle ? (
							<LineInput
								cls={ctx.hpt}
								name="qty.total"
								lineUid={lineUid}
								className="w-full text-center"
								type="number"
								valueChanged={valueChanged}
								mask
								qtyInputProps={{ min: 0 }}
							/>
						) : (
							<div className="grid grid-cols-2 gap-2">
								<LineInput
									cls={ctx.hpt}
									name="qty.lh"
									lineUid={lineUid}
									type="number"
									valueChanged={valueChanged}
									mask
									qtyInputProps={{ min: 0 }}
								/>
								<LineInput
									cls={ctx.hpt}
									name="qty.rh"
									lineUid={lineUid}
									type="number"
									valueChanged={valueChanged}
									mask
									qtyInputProps={{ min: 1 }}
								/>
							</div>
						)}
					</div>
					<div className="space-y-1">
						<div className="text-xs uppercase tracking-wide text-slate-500">
							Line Total
						</div>
						<div className="text-base font-semibold text-slate-900">
							<AnimatedNumber value={zDoor?.pricing?.totalPrice || 0} />
						</div>
					</div>
				</div>
				<HptNotePanel />
			</div>
		);
	}

	return null;
}

function HptNotePanel() {
	const line = useHptLine();
	const { hpt, itemForm, isSlab, showNote, config } = useHpt();
	const { size, sizeForm } = line;
	const salesId = hpt?.zus?.metaData?.id;
	const itemId = itemForm?.id;
	const controlUid = doorItemControlUid(sizeForm?.doorId, size.size);
	const tagFilters =
		salesId && itemId && sizeForm?.doorId
			? [
					noteTagFilter("itemControlUID", controlUid),
					noteTagFilter("salesItemId", itemId),
					noteTagFilter("salesId", salesId),
				]
			: null;

	if (!showNote) return null;

	return (
		<div className="rounded-lg border bg-muted/20 p-3">
			{tagFilters ? (
				<Note
					admin
					subject={"Production Note"}
					headline=""
					statusFilters={["public"]}
					typeFilters={["production", "general"]}
					tagFilters={tagFilters}
				/>
			) : (
				<div className="flex items-center text-center font-mono$ text-red-600">
					<span>To access item note, you need to first save your invoice</span>
				</div>
			)}
		</div>
	);
}
