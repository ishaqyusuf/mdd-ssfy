import { Text } from "@/components/ui/text";
import { Icon } from "@/components/ui/icon";
import {
	isDoorRowPriceMissing,
	patchDoorRowCustomPrice,
	readSalesFormObjectMetadata,
	updateDoorRowBasePrice,
	type DoorStoredRow,
	type WorkflowComponentRecord,
} from "@gnd/sales/sales-form-core";
import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import {
	formatWorkflowComponentLabel,
	getWorkflowSelectableTitle,
} from "../../api/workflow-selectable-copy";
import { formatMoney } from "../../lib/format";
import {
	IconButton,
	NumberField,
	OptionalNumberField,
	RowShell,
	SelectChip,
	StepSectionHeader,
	StepTextInput,
} from "../shared/mobile-editor-primitives";
import {
	buildDoorGroups,
	canRemoveHousePackageDoorOption,
	type HousePackagePricedStep,
} from "./house-package-tool-rows";
import {
	HousePackagePriceBreakdown,
} from "./house-package-tool-pricing";

export function HousePackageToolEditor({
	rows,
	selectedDoors,
	noHandle,
	hasSwing,
	disabled,
	profileCoefficient,
	pricedSteps,
	sharedDoorSurcharge,
	onChange,
	onRemove,
	onRemoveDoorOption,
	onConfigureDoorSizes,
	onAddDoor,
	swapCandidates,
	isLoadingSwapCandidates,
	onSwapDoorOption,
}: {
	rows: DoorStoredRow[];
	selectedDoors?: WorkflowComponentRecord[];
	noHandle?: boolean;
	hasSwing?: boolean;
	disabled?: boolean;
	profileCoefficient?: number | null;
	pricedSteps?: HousePackagePricedStep[];
	sharedDoorSurcharge?: number;
	onChange: (index: number, patch: Partial<DoorStoredRow>) => void;
	onRemove: (index: number) => void;
	onRemoveDoorOption?: (component: WorkflowComponentRecord) => void;
	onConfigureDoorSizes?: (component: WorkflowComponentRecord) => void;
	onAddDoor?: () => void;
	swapCandidates?: WorkflowComponentRecord[];
	isLoadingSwapCandidates?: boolean;
	onSwapDoorOption?: (
		sourceComponent: WorkflowComponentRecord,
		targetComponent: WorkflowComponentRecord,
	) => void;
}) {
	const groups = useMemo(
		() => buildDoorGroups(rows, selectedDoors || []),
		[rows, selectedDoors],
	);
	const [activeGroupKey, setActiveGroupKey] = useState(
		() => groups[0]?.key || "manual",
	);
	const [swapOpen, setSwapOpen] = useState(false);
	const activeGroup =
		groups.find((group) => group.key === activeGroupKey) || groups[0] || null;
	const activeSwapCandidates = (swapCandidates || []).filter(
		(component) =>
			String(component.uid || "") !== String(activeGroup?.component?.uid || ""),
	);
	const getDoorOptionTitle = (component: WorkflowComponentRecord) =>
		formatWorkflowComponentLabel(getWorkflowSelectableTitle(component));
	const canRemoveActiveDoorOption = canRemoveHousePackageDoorOption({
		selectedDoors,
		disabled,
		hasRemoveHandler: Boolean(onRemoveDoorOption),
	});

	useEffect(() => {
		if (!groups.length) {
			setActiveGroupKey("manual");
			return;
		}
		if (groups.some((group) => group.key === activeGroupKey)) return;
		setActiveGroupKey(groups[0]?.key || "manual");
	}, [activeGroupKey, groups]);

	useEffect(() => {
		setSwapOpen(false);
	}, [activeGroupKey]);

	const visibleRows = activeGroup?.rows || [];
	const totalQty = rows.reduce(
		(sum, row) => sum + Number(row.totalQty || 0),
		0,
	);
	const totalPrice = rows.reduce(
		(sum, row) => sum + Number(row.lineTotal || 0),
		0,
	);

	return (
		<View className="border-t border-border pt-3">
			<StepSectionHeader title="House package tool" />
			<View className="mt-2 rounded-xl border border-border bg-primary/5 p-3">
				<View className="flex-row items-center justify-between gap-3">
					<View>
						<Text className="text-[10px] font-bold uppercase text-primary">
							Package total
						</Text>
						<Text className="mt-0.5 text-lg font-bold text-foreground">
							{formatMoney(totalPrice)}
						</Text>
					</View>
					<View className="items-end">
						<Text className="text-[10px] font-bold uppercase text-muted-foreground">
							Doors
						</Text>
						<Text className="mt-0.5 text-lg font-bold text-foreground">
							{totalQty}
						</Text>
					</View>
				</View>
				{onAddDoor ? (
					<Pressable
						onPress={onAddDoor}
						disabled={disabled}
						className="mt-3 min-h-11 flex-row items-center justify-center gap-2 rounded-xl border border-primary bg-background active:bg-muted disabled:opacity-40"
					>
						<Icon name="Plus" className="text-primary" size={14} />
						<Text className="text-xs font-bold text-primary">
							Add door
						</Text>
					</Pressable>
				) : null}
			</View>

			{groups.length > 1 ? (
				<ScrollView
					horizontal
					showsHorizontalScrollIndicator={false}
					className="mt-3"
					contentContainerStyle={{ gap: 6, paddingRight: 16 }}
				>
					{groups.map((group) => (
						<SelectChip
							key={group.key}
							title={group.title}
							subtitle={`${group.totalQty} doors - ${formatMoney(group.totalPrice)}`}
							selected={group.key === activeGroup?.key}
							disabled={disabled}
							onPress={() => setActiveGroupKey(group.key)}
						/>
					))}
				</ScrollView>
			) : null}

			{activeGroup?.component ? (
				<View className="mt-3 flex-row items-center gap-2 rounded-xl border border-border bg-card p-2">
					<View className="min-w-0 flex-1">
						<Text numberOfLines={1} className="text-sm font-bold text-foreground">
							{activeGroup.title}
						</Text>
						<Text className="text-[10px] text-muted-foreground">
							{activeGroup.rows.length} size row
							{activeGroup.rows.length === 1 ? "" : "s"} -{" "}
							{formatMoney(activeGroup.totalPrice)}
						</Text>
					</View>
					{onConfigureDoorSizes ? (
						<Pressable
							onPress={() =>
								activeGroup.component
									? onConfigureDoorSizes(activeGroup.component)
									: undefined
							}
							disabled={disabled}
							className="min-h-11 flex-row items-center gap-1 rounded-xl border border-border bg-background px-3 active:bg-muted disabled:opacity-40"
						>
							<Icon name="Settings" className="text-foreground" size={14} />
							<Text className="text-[11px] font-bold text-foreground">
								Sizes
							</Text>
						</Pressable>
					) : null}
					{onSwapDoorOption ? (
						<Pressable
							onPress={() => setSwapOpen((open) => !open)}
							disabled={disabled}
							className="min-h-11 flex-row items-center gap-1 rounded-xl border border-border bg-background px-3 active:bg-muted disabled:opacity-40"
						>
							<Icon name="Route" className="text-foreground" size={14} />
							<Text className="text-[11px] font-bold text-foreground">
								Swap
							</Text>
						</Pressable>
					) : null}
					<IconButton
						icon="Trash"
						tone="danger"
						disabled={!canRemoveActiveDoorOption}
						onPress={() => {
							if (!canRemoveActiveDoorOption) return;
							onRemoveDoorOption?.(activeGroup.component!);
						}}
					/>
				</View>
			) : null}

			{swapOpen && activeGroup?.component ? (
				<View className="mt-2 gap-2 rounded-xl border border-border bg-card p-2">
					<Text className="text-[10px] font-bold uppercase text-muted-foreground">
						Swap door
					</Text>
					<ScrollView
						horizontal
						showsHorizontalScrollIndicator={false}
						contentContainerStyle={{ gap: 6, paddingRight: 16 }}
					>
						{activeSwapCandidates.map((component) => (
							<SelectChip
								key={`swap-door-${component.uid || component.id}`}
								title={getDoorOptionTitle(component)}
								subtitle={formatMoney(component.salesPrice || 0)}
								selected={false}
								disabled={disabled}
								onPress={() => {
									if (!activeGroup.component || !onSwapDoorOption) return;
									onSwapDoorOption(activeGroup.component, component);
									setSwapOpen(false);
								}}
							/>
						))}
						{isLoadingSwapCandidates ? (
							<Text className="self-center text-xs text-muted-foreground">
								Loading doors...
							</Text>
						) : null}
						{!isLoadingSwapCandidates && !activeSwapCandidates.length ? (
							<Text className="self-center text-xs text-muted-foreground">
								No other door options available.
							</Text>
						) : null}
					</ScrollView>
				</View>
			) : null}

			<View className="mt-3 gap-3">
				{visibleRows.length ? (
					visibleRows.map(({ row, index }) => (
						<HousePackageDoorRow
							key={`${row.stepProductId || "door"}:${row.dimension || index}`}
							row={row}
							noHandle={noHandle}
							hasSwing={hasSwing}
							disabled={disabled}
							doorTitle={activeGroup.title}
							pricedSteps={pricedSteps || []}
							sharedDoorSurcharge={Number(sharedDoorSurcharge || 0)}
							profileCoefficient={profileCoefficient}
							onChange={(patch) => onChange(index, patch)}
							onRemove={() => onRemove(index)}
						/>
					))
				) : (
					<RowShell muted>
						<Text className="text-sm font-bold text-foreground">
							No sizes configured
						</Text>
						<Text className="text-xs text-muted-foreground">
							Use Sizes on the selected door to configure this house package.
						</Text>
					</RowShell>
				)}
			</View>
		</View>
	);
}

function HousePackageDoorRow({
	row,
	noHandle,
	hasSwing,
	disabled,
	doorTitle,
	pricedSteps,
	sharedDoorSurcharge,
	profileCoefficient,
	onChange,
	onRemove,
}: {
	row: DoorStoredRow;
	noHandle?: boolean;
	hasSwing?: boolean;
	disabled?: boolean;
	doorTitle: string;
	pricedSteps: HousePackagePricedStep[];
	sharedDoorSurcharge: number;
	profileCoefficient?: number | null;
	onChange: (patch: Partial<DoorStoredRow>) => void;
	onRemove: () => void;
}) {
	const lhQty = Number(row.lhQty || 0);
	const rhQty = Number(row.rhQty || 0);
	const rowMeta = readSalesFormObjectMetadata(row.meta) || {};
	const priceMissing = isDoorRowPriceMissing(row);
	const quantityDisabled = disabled || priceMissing;

	return (
		<RowShell>
			<View className="flex-row gap-2">
				<View className="min-w-0 flex-1 gap-1">
					<Text className="text-[10px] font-bold uppercase text-muted-foreground">
						Size
					</Text>
					<View className="h-10 justify-center rounded-lg border border-border bg-muted/20 px-3">
						<Text className="text-xs font-bold text-foreground">
							{row.dimension || "--"}
						</Text>
					</View>
				</View>
				{hasSwing ? (
					<View className="w-20">
						<Text className="mb-1 text-[10px] font-bold uppercase text-muted-foreground">
							Swing
						</Text>
						<StepTextInput
							value={String(row.swing || "")}
							onChangeText={(swing) => onChange({ swing })}
							editable={!disabled}
							placeholder="LH"
							fontWeight="bold"
						/>
					</View>
				) : null}
			</View>

			<View className="flex-row gap-2">
				{noHandle ? (
					<NumberField
						label="Qty"
						value={row.totalQty}
						disabled={quantityDisabled}
						keyboardType="number-pad"
						onChange={(totalQty) =>
							onChange({ totalQty, lhQty: 0, rhQty: 0 })
						}
					/>
				) : (
					<>
						<NumberField
							label="LH"
							value={row.lhQty}
							disabled={quantityDisabled}
							keyboardType="number-pad"
							onChange={(nextLhQty) =>
								onChange({
									lhQty: nextLhQty,
									totalQty: nextLhQty + rhQty,
								})
							}
						/>
						<NumberField
							label="RH"
							value={row.rhQty}
							disabled={quantityDisabled}
							keyboardType="number-pad"
							onChange={(nextRhQty) =>
								onChange({
									rhQty: nextRhQty,
									totalQty: lhQty + nextRhQty,
								})
							}
						/>
					</>
				)}
				{noHandle ? null : (
					<View className="min-w-0 flex-1 gap-1">
						<Text className="text-[10px] font-bold uppercase text-muted-foreground">
							Total
						</Text>
						<View className="h-10 items-end justify-center rounded-lg border border-border bg-muted/20 px-3">
							<Text className="text-xs font-bold text-foreground">
								{row.totalQty || 0}
							</Text>
						</View>
					</View>
				)}
			</View>
			{priceMissing ? (
				<Text className="text-[11px] font-semibold text-red-600">
					Pricing is unavailable for this supplier and size. Configure sizes
					before adding quantity.
				</Text>
			) : null}

			<View className="flex-row gap-2">
				<NumberField
					label="Base"
					value={rowMeta.baseUnitPrice ?? 0}
					disabled={disabled}
					onChange={(basePrice) =>
						onChange(
							updateDoorRowBasePrice(
								row,
								basePrice,
								profileCoefficient,
							),
						)
					}
				/>
				<NumberField
					label="Add-on"
					value={row.addon ?? ""}
					disabled={disabled}
					onChange={(addon) => onChange({ addon })}
				/>
				<OptionalNumberField
					label="Custom"
					value={optionalNumber(row.customPrice)}
					disabled={disabled}
					onChange={(customPrice) =>
						onChange(patchDoorRowCustomPrice(row, customPrice))
					}
				/>
				<View className="justify-end">
					<IconButton
						icon="Trash"
						tone="danger"
						disabled={disabled}
						onPress={onRemove}
					/>
				</View>
			</View>
			<HousePackagePriceBreakdown
				row={row}
				doorTitle={doorTitle}
				pricedSteps={pricedSteps}
				sharedDoorSurcharge={sharedDoorSurcharge}
				profileCoefficient={profileCoefficient}
			/>
		</RowShell>
	);
}

function optionalNumber(value: unknown) {
	if (value == null || value === "") return null;
	const parsed = Number(value);
	return Number.isFinite(parsed) ? parsed : null;
}
