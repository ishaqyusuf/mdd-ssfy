import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import {
	getHptDoorSalesUnitPrice,
	readSalesFormObjectMetadata,
	resolveHptDoorUnitPriceBreakdown,
	type DoorStoredRow,
} from "@gnd/sales/sales-form-core";
import { useState } from "react";
import { Pressable, View } from "react-native";
import { formatMoney } from "../../lib/format";
import type { HousePackagePricedStep } from "./house-package-tool-rows";

export function HousePackagePriceBreakdown({
	row,
	doorTitle,
	pricedSteps,
	sharedDoorSurcharge,
	profileCoefficient,
}: {
	row: DoorStoredRow;
	doorTitle: string;
	pricedSteps: HousePackagePricedStep[];
	sharedDoorSurcharge: number;
	profileCoefficient?: number | null;
}) {
	const [expanded, setExpanded] = useState(false);
	const breakdown = resolveHptDoorUnitPriceBreakdown(row, {
		sharedDoorSurcharge,
		profileCoefficient,
	});
	const rowMeta = readSalesFormObjectMetadata(row.meta) || {};
	const doorPrice = getHptDoorSalesUnitPrice(row, {
		sharedDoorSurcharge,
		profileCoefficient,
	});
	const baseCost = finiteNumber(rowMeta.baseUnitPrice);

	return (
		<View className="overflow-hidden rounded-lg border border-border bg-card">
			<Pressable
				accessibilityRole="button"
				accessibilityLabel="Toggle estimate breakdown"
				accessibilityState={{ expanded }}
				onPress={() => setExpanded((current) => !current)}
				className="min-h-11 flex-row items-center gap-3 px-3 py-2 active:bg-muted"
			>
				<View className="min-w-0 flex-1">
					<Text className="text-[10px] font-bold uppercase text-muted-foreground">
						Final unit
					</Text>
					<View className="mt-0.5 flex-row flex-wrap items-center gap-2">
						{breakdown.hasCustomPrice ? (
							<Text className="text-[11px] text-muted-foreground line-through">
								{formatMoney(breakdown.calculatedFinalUnitPrice)}
							</Text>
						) : null}
						<Text className="text-xs font-bold text-foreground">
							{formatMoney(breakdown.unitPrice)}
						</Text>
					</View>
				</View>
				<View className="items-end">
					<Text className="text-[10px] font-bold uppercase text-muted-foreground">
						Line
					</Text>
					<Text className="mt-0.5 text-xs font-bold text-foreground">
						{formatMoney(row.lineTotal || 0)}
					</Text>
				</View>
				<Icon
					name={expanded ? "ChevronDown" : "ChevronRight"}
					className="text-muted-foreground"
					size={15}
				/>
			</Pressable>

			{expanded ? (
				<View className="gap-2 border-t border-border px-3 py-3">
					<Text className="text-[10px] font-bold uppercase text-muted-foreground">
						Estimate breakdown
					</Text>
					{pricedSteps.map((step) => (
						<BreakdownRow key={step.key} label={step.title} value={step.price} />
					))}
					<BreakdownRow label="Door" textValue={doorTitle} />
					<BreakdownRow label="Size" textValue={row.dimension || "--"} />
					<BreakdownRow label="Door price" value={doorPrice} />
					<BreakdownRow
						label="Base cost"
						textValue={baseCost == null ? "--" : formatMoney(baseCost)}
					/>
					<BreakdownRow
						label="Component surcharge"
						value={sharedDoorSurcharge}
					/>
					<BreakdownRow
						label="Calculated unit"
						value={breakdown.calculatedFinalUnitPrice}
					/>
					<BreakdownRow label="Final unit" value={breakdown.unitPrice} strong />
					<BreakdownRow label="Qty" textValue={String(row.totalQty || 0)} />
					<BreakdownRow label="Add-on" value={breakdown.addon} />
					<BreakdownRow
						label="Custom price"
						textValue={
							breakdown.customPrice == null
								? "Auto"
								: formatMoney(breakdown.customPrice)
						}
					/>
					<View className="border-t border-border pt-2">
						<BreakdownRow
							label="Line total"
							value={Number(row.lineTotal || 0)}
							strong
						/>
					</View>
				</View>
			) : null}
		</View>
	);
}

function BreakdownRow({
	label,
	value,
	textValue,
	strong,
}: {
	label: string;
	value?: number;
	textValue?: string;
	strong?: boolean;
}) {
	return (
		<View className="flex-row items-start justify-between gap-3">
			<Text
				className={`min-w-0 flex-1 text-[11px] ${strong ? "font-bold text-foreground" : "text-muted-foreground"}`}
			>
				{label}
			</Text>
			<Text
				className={`max-w-[55%] text-right text-[11px] ${strong ? "font-bold text-foreground" : "font-semibold text-foreground"}`}
			>
				{textValue ?? formatMoney(value || 0)}
			</Text>
		</View>
	);
}

function finiteNumber(value: unknown) {
	if (value == null || value === "") return null;
	const parsed = Number(value);
	return Number.isFinite(parsed) ? parsed : null;
}
