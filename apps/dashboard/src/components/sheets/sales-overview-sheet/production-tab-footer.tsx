import { getProductionTabItems } from "@/components/sales-overview-system/lib/production-items";
import { Menu } from "@gnd/ui/custom/menu";
import { Icons } from "@gnd/ui/icons";
import NumberFlow from "@number-flow/react";
import { useMemo, useState } from "react";

import { Button } from "@gnd/ui/button";
import { Checkbox } from "@gnd/ui/checkbox";
import { cn } from "@gnd/ui/cn";
import { Label } from "@gnd/ui/label";
import { SheetFooter } from "@gnd/ui/sheet";

import { useSalesOverviewQuery } from "@/hooks/use-sales-overview-query";
import { CustomSheetContentPortal } from "../custom-sheet-content";
import { useProduction } from "./context";
import { ProductionItemMenuActions } from "./production-item-menu";

export function ProductionTabFooter() {
	const { data, selections, setSelections } = useProduction();
	const prodItems = getProductionTabItems(data?.items);
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
	const query = useSalesOverviewQuery();
	const [opened, setOpened] = useState(false);
	if (query.dispatchMode) return null;
	return (
		<CustomSheetContentPortal>
			<SheetFooter className="-m-4 -mb-2 border-t p-4 shadow-xl">
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
						onOpenChanged={setOpened}
						label={"Action"}
						Icon={Icons.ActivityIcon}
					>
						<ProductionItemMenuActions
							itemUids={ctx.selectCount ? ctx.selectedUids : undefined}
							setOpened={setOpened}
						/>
					</Menu>
				</div>
			</SheetFooter>
		</CustomSheetContentPortal>
	);
}
