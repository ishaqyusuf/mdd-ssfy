import { Text } from "@/components/ui/text";
import { Icon } from "@/components/ui/icon";
import type {
	DoorStoredRow,
	WorkflowComponentRecord,
} from "@gnd/sales/sales-form-core";
import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { formatMoney } from "../../lib/format";
import {
	IconButton,
	NumberField,
	RowShell,
	SelectChip,
	StepSectionHeader,
	StepTextInput,
} from "../shared/mobile-editor-primitives";
import {
	buildDoorGroups,
	createHousePackageDoorRow,
} from "./house-package-tool-rows";

export function HousePackageToolEditor({
	rows,
	selectedDoors,
	noHandle,
	hasSwing,
	disabled,
	profileCoefficient,
	onAddRow,
	onChange,
	onRemove,
	onRemoveDoorOption,
	onConfigureDoorSizes,
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
	onAddRow: (row: DoorStoredRow) => void;
	onChange: (index: number, patch: Partial<DoorStoredRow>) => void;
	onRemove: (index: number) => void;
	onRemoveDoorOption?: (component: WorkflowComponentRecord) => void;
	onConfigureDoorSizes?: (component: WorkflowComponentRecord) => void;
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

	const addSizeRow = () => {
		if (activeGroup?.component && onConfigureDoorSizes) {
			onConfigureDoorSizes(activeGroup.component);
			return;
		}
		onAddRow(
			createHousePackageDoorRow(activeGroup?.component, profileCoefficient),
		);
	};

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
			<StepSectionHeader
				title="House package tool"
				actionLabel="Add size"
				disabled={disabled}
				onAction={addSizeRow}
			/>
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
							className="h-10 flex-row items-center gap-1 rounded-xl border border-border bg-background px-3 active:bg-muted disabled:opacity-40"
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
							className="h-10 flex-row items-center gap-1 rounded-xl border border-border bg-background px-3 active:bg-muted disabled:opacity-40"
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
						disabled={disabled || !onRemoveDoorOption}
						onPress={() => onRemoveDoorOption?.(activeGroup.component!)}
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
								title={componentLabel(component.title || component.uid || "Door")}
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
							Add a size to build this house package on mobile.
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
	onChange,
	onRemove,
}: {
	row: DoorStoredRow;
	noHandle?: boolean;
	hasSwing?: boolean;
	disabled?: boolean;
	onChange: (patch: Partial<DoorStoredRow>) => void;
	onRemove: () => void;
}) {
	const lhQty = Number(row.lhQty || 0);
	const rhQty = Number(row.rhQty || 0);

	return (
		<RowShell>
			<View className="flex-row gap-2">
				<View className="min-w-0 flex-1">
					<Text className="mb-1 text-[10px] font-bold uppercase text-muted-foreground">
						Size
					</Text>
					<StepTextInput
						value={String(row.dimension || "")}
						onChangeText={(dimension) => onChange({ dimension })}
						editable={!disabled}
						placeholder="2-8 x 6-8"
						fontWeight="bold"
					/>
				</View>
				{hasSwing === false ? null : (
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
				)}
			</View>

			<View className="flex-row gap-2">
				{noHandle ? null : (
					<>
						<NumberField
							label="LH"
							value={row.lhQty}
							disabled={disabled}
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
							disabled={disabled}
							onChange={(nextRhQty) =>
								onChange({
									rhQty: nextRhQty,
									totalQty: lhQty + nextRhQty,
								})
							}
						/>
					</>
				)}
				<NumberField
					label="Total"
					value={row.totalQty}
					disabled={disabled}
					onChange={(totalQty) => onChange({ totalQty })}
				/>
			</View>

			<View className="flex-row gap-2">
				<NumberField
					label="Add-on"
					value={row.addon ?? ""}
					disabled={disabled}
					onChange={(addon) => onChange({ addon })}
				/>
				<NumberField
					label="Custom"
					value={row.customPrice ?? ""}
					disabled={disabled}
					onChange={(customPrice) => onChange({ customPrice })}
				/>
				<View className="w-24 justify-end">
					<Text className="text-right text-xs font-bold text-foreground">
						{formatMoney(row.lineTotal || 0)}
					</Text>
				</View>
				<View className="justify-end">
					<IconButton
						icon="Trash"
						tone="danger"
						disabled={disabled}
						onPress={onRemove}
					/>
				</View>
			</View>
		</RowShell>
	);
}
