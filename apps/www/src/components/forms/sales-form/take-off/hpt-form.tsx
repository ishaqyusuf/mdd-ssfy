import { useTakeoffItem } from "./context";

import { Env } from "@/components/env";
import {
	type SalesFormTakeoffHptLineRow,
	DataTable as SalesFormTakeoffHptLinesTable,
} from "@/components/tables-2/sales-form-takeoff-hpt-lines/data-table";
import { useMemo } from "react";
import { HptContextProvider, HptLineContextProvider, useHpt } from "../context";

export function HptForm() {
	const item = useTakeoffItem();
	const hptUid = [...item.stepSequence]?.reverse()?.[0];
	return (
		<HptContextProvider
			args={[
				{
					itemStepUid: hptUid,
				},
			]}
		>
			<HptLineProvider />
		</HptContextProvider>
	);
}
function HptLineProvider() {
	const hpt = useHpt();
	if (!hpt?.door?.sizePrice?.length) return null;
	const { itemForm } = hpt;
	const lineUid = itemForm?.groupItem?.itemIds?.[0];
	return (
		<HptLineContextProvider
			args={[
				{
					lineUid,
				},
			]}
		>
			<Content lineUid={lineUid} />
		</HptLineContextProvider>
	);
}
function Content({ lineUid }: { lineUid?: string }) {
	const item = useTakeoffItem();
	const ctx = useHpt();
	const hptRows = useMemo<SalesFormTakeoffHptLineRow[]>(
		() => [{ id: lineUid || "takeoff-hpt-line" }],
		[lineUid],
	);

	return (
		<div className="flex min-w-0 gap-2">
			<Env isDev>
				<span>{item.itemUid}</span>
			</Env>
			<div className="min-w-0 flex-1">
				<SalesFormTakeoffHptLinesTable
					data={hptRows}
					showSwing={Boolean(ctx.config.hasSwing)}
					noHandle={Boolean(ctx.config.noHandle)}
				/>
			</div>
		</div>
	);
}
