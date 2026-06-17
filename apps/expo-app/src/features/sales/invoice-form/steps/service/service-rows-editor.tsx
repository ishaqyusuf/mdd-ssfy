import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import type { ServiceRow } from "@gnd/sales/sales-form-core";
import { Pressable, View } from "react-native";
import { formatMoney } from "../../lib/format";
import {
	IconButton,
	NumberField,
	RowShell,
	StepSectionHeader,
	StepTextInput,
} from "../shared/mobile-editor-primitives";

export function createServiceRow(nextIndex: number): ServiceRow {
	return {
		uid: `service-${nextIndex}-${Date.now().toString(36)}`,
		service: "",
		taxxable: false,
		produceable: false,
		qty: 1,
		unitPrice: 0,
	};
}

export function ServiceRowsEditor({
	rows,
	disabled,
	onChange,
	onAdd,
	onRemove,
}: {
	rows: ServiceRow[];
	disabled?: boolean;
	onChange: (index: number, patch: Partial<ServiceRow>) => void;
	onAdd: () => void;
	onRemove: (index: number) => void;
}) {
	return (
		<View className="border-t border-border pt-3">
			<StepSectionHeader
				title="Service line"
				actionLabel="Add service"
				disabled={disabled}
				onAction={onAdd}
			/>
			<View className="mt-2 gap-3">
				{rows.map((row, index) => (
					<RowShell key={`${row.uid || index}`}>
						<View className="flex-row items-center gap-2">
							<View className="h-7 w-7 items-center justify-center rounded-full bg-muted">
								<Text className="text-[11px] font-bold text-muted-foreground">
									{index + 1}
								</Text>
							</View>
							<View className="flex-1" />
							<ServiceToggle
								label="Tax"
								selected={Boolean(row.taxxable)}
								disabled={disabled}
								onPress={() => onChange(index, { taxxable: !row.taxxable })}
							/>
							<ServiceToggle
								label="Prod"
								selected={Boolean(row.produceable)}
								disabled={disabled}
								onPress={() =>
									onChange(index, { produceable: !row.produceable })
								}
							/>
							<IconButton
								icon="Trash"
								tone="danger"
								disabled={disabled}
								onPress={() => onRemove(index)}
							/>
						</View>
						<StepTextInput
							value={String(row.service || "")}
							onChangeText={(service) => onChange(index, { service })}
							editable={!disabled}
							placeholder="Service"
						/>
						<View className="flex-row gap-2">
							<NumberField
								label="Qty"
								value={row.qty}
								disabled={disabled}
								onChange={(qty) => onChange(index, { qty })}
							/>
							<NumberField
								label="Unit"
								value={row.unitPrice}
								disabled={disabled}
								onChange={(unitPrice) => onChange(index, { unitPrice })}
							/>
							<View className="w-24 justify-end">
								<Text className="text-right text-xs font-bold text-foreground">
									{formatMoney(row.lineTotal || 0)}
								</Text>
							</View>
						</View>
					</RowShell>
				))}
			</View>
		</View>
	);
}

function ServiceToggle({
	label,
	selected,
	disabled,
	onPress,
}: {
	label: string;
	selected: boolean;
	disabled?: boolean;
	onPress: () => void;
}) {
	return (
		<Pressable
			onPress={onPress}
			disabled={disabled}
			className={`h-8 flex-row items-center gap-1 rounded-full border px-2 disabled:opacity-40 ${
				selected ? "border-primary bg-primary/10" : "border-border bg-card"
			}`}
		>
			<Icon
				name={selected ? "Check" : "XCircle"}
				className={selected ? "text-primary" : "text-muted-foreground"}
				size={11}
			/>
			<Text
				className={`text-[10px] font-bold ${
					selected ? "text-primary" : "text-muted-foreground"
				}`}
			>
				{label}
			</Text>
		</Pressable>
	);
}
