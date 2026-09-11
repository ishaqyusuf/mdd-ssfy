import { getProductionTabItems } from "@/components/sales-overview-system/lib/production-items";
import { Menu } from "@gnd/ui/custom/menu";
import Sheet from "@gnd/ui/custom/sheet-v2";
import { Icons } from "@gnd/ui/icons";
import NumberFlow from "@number-flow/react";
import { useMemo, useRef, useState } from "react";

import { Button } from "@gnd/ui/button";
import { Checkbox } from "@gnd/ui/checkbox";
import { cn } from "@gnd/ui/cn";
import { Label } from "@gnd/ui/label";
import { SheetFooter } from "@gnd/ui/sheet";

import { useSalesOverviewQuery } from "@/hooks/use-sales-overview-query";
import { useProduction } from "./context";
import { ProductionItemMenuActions } from "./production-item-menu";

export function ProductionTabFooter() {
	const { data, selections, setSelections } = useProduction();
	const query = useSalesOverviewQuery();
	const workerMode = Boolean(query.assignedTo);
	const productionItems = getProductionTabItems(data?.items);
	const prodItems = workerMode
		? productionItems.filter(
				(item) => Number(item.analytics?.stats?.prodAssigned?.qty || 0) > 0,
			)
		: productionItems;
	const ctx = useMemo(() => {
		const selectedUids = Object.entries(selections)
			.filter(([, value]) => value)
			.map(([uid]) => uid);
		const selectCount = selectedUids.length;

		return {
			selectCount,
			selectedUids,
			allSelected:
				prodItems.length > 0 &&
				prodItems.every((i) => selectedUids.includes(i.controlUid)),
		};
	}, [selections, prodItems]);
	function toggleCheckState() {
		const newState = !ctx.allSelected;
		const newSelections: Record<string, boolean> = {};
		for (const item of prodItems) {
			newSelections[item.controlUid] = newState;
		}

		setSelections(() => ({ ...newSelections }));
	}
	const [opened, setOpened] = useState(false);
	const [menuBusy, setMenuBusy] = useState(false);
	const menuBusyRef = useRef(false);
	const updateMenuBusy = (busy: boolean) => {
		menuBusyRef.current = busy;
		setMenuBusy(busy);
	};
	if (query.dispatchMode || (workerMode && !ctx.selectCount)) return null;
	return (
		<Sheet.Portal>
			<SheetFooter className="border-t bg-background p-4 md:p-6">
				<div className="flex flex-1 items-center gap-4">
					<div className="inline-flex items-center gap-2">
						<Checkbox
							onCheckedChange={toggleCheckState}
							checked={ctx.allSelected}
							id="selectAll"
						/>
						<Label className="" htmlFor="selectAll">
							Mark All
						</Label>
					</div>
					<div
						className={cn(
							!ctx.selectCount && "text-red-100 text-opacity-0",
							"text-sm",
						)}
					>
						<NumberFlow value={ctx.selectCount} suffix=" items selected" />
					</div>
					<div className="flex-1" />
					<Menu
						noSize
						open={opened}
						onOpenChanged={(nextOpen) => {
							if (!nextOpen && menuBusyRef.current) return;
							setOpened(nextOpen);
						}}
						disabled={menuBusy}
						label={"Action"}
						Icon={Icons.ActivityIcon}
					>
						<ProductionItemMenuActions
							itemUids={ctx.selectCount ? ctx.selectedUids : undefined}
							workerMode={workerMode}
							setOpened={setOpened}
							setMenuBusy={updateMenuBusy}
						/>
					</Menu>
				</div>
			</SheetFooter>
		</Sheet.Portal>
	);
}
