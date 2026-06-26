import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import type { ServiceRow } from "@gnd/sales/sales-form-core";
import { Pressable, View } from "react-native";
import { formatMoney, parseCurrencyInput } from "../../lib/format";
import {
	IconButton,
	NumberField,
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
	hideAddButton = false,
	onChange,
	onAdd,
	onRemove,
}: {
	rows: ServiceRow[];
	disabled?: boolean;
	hideAddButton?: boolean;
	onChange: (index: number, patch: Partial<ServiceRow>) => void;
	onAdd: () => void;
	onRemove: (index: number) => void;
}) {
	const totalQty = rows.reduce((sum, row) => sum + Number(row.qty || 0), 0);
	const totalAmount = rows.reduce(
		(sum, row) => sum + Number(row.lineTotal || 0),
		0,
	);

	return (
		<View>
			{rows.length ? (
				<View className="border-b border-border pb-3">
					<View className="flex-row items-center justify-between gap-3">
						<View>
							<Text className="text-[10px] font-bold uppercase text-primary">
								Line total
							</Text>
							<Text className="mt-0.5 text-lg font-bold text-foreground">
								{formatMoney(totalAmount)}
							</Text>
						</View>
						<View className="items-end">
							<Text className="text-[10px] font-bold uppercase text-muted-foreground">
								Qty
							</Text>
							<Text className="mt-0.5 text-lg font-bold text-foreground">
								{totalQty}
							</Text>
						</View>
					</View>
				</View>
			) : null}
			<View className="mt-2">
				{rows.length ? (
					rows.map((row, index) => (
						<View
							key={`${row.uid || index}`}
							className="border-b border-border py-3"
						>
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
							<View className="mt-2">
								<Text className="mb-1 text-[10px] font-bold uppercase text-muted-foreground">
									Service
								</Text>
								<StepTextInput
									value={String(row.service || "")}
									onChangeText={(service) => onChange(index, { service })}
									editable={!disabled}
									placeholder="Service"
									fontWeight="bold"
								/>
							</View>
							<View className="mt-2 flex-row gap-2">
								<ServiceQtyStepper
									value={row.qty}
									disabled={disabled}
									onChange={(qty) => onChange(index, { qty })}
								/>
								<NumberField
									label="Unit"
									value={row.unitPrice}
									disabled={disabled}
									placeholder="0"
									zeroAsPlaceholder
									onChange={(unitPrice) => onChange(index, { unitPrice })}
								/>
								<View className="w-32 justify-end">
									<Text className="text-right text-xl font-black text-foreground">
										{formatMoney(row.lineTotal || 0)}
									</Text>
								</View>
							</View>
						</View>
					))
				) : (
					<View className="border-y border-border py-4">
						<Text className="text-sm font-bold text-foreground">
							No service rows
						</Text>
						<Text className="text-xs text-muted-foreground">
							Add a service row to edit service quantity and pricing.
						</Text>
					</View>
				)}
			</View>
			{hideAddButton ? null : (
				<Pressable
					onPress={onAdd}
					disabled={disabled}
					className="mt-3 h-10 flex-row items-center justify-center gap-2 rounded-xl border border-primary bg-primary/5 px-3 disabled:opacity-40"
				>
					<Icon name="Plus" className="text-primary" size={14} />
					<Text className="text-xs font-bold text-primary">Add service</Text>
				</Pressable>
			)}
		</View>
	);
}

function ServiceQtyStepper({
	value,
	disabled,
	onChange,
}: {
	value?: number | string | null;
	disabled?: boolean;
	onChange: (value: number) => void;
}) {
	const qty = Math.max(0, Number(value || 0));
	const changeQty = (nextQty: number) => onChange(Math.max(0, nextQty));

	return (
		<View className="min-w-0 flex-1 gap-1">
			<Text className="text-[10px] font-bold uppercase text-muted-foreground">
				Qty
			</Text>
			<View className="h-10 flex-row items-center rounded-xl border border-input bg-background">
				<Pressable
					onPress={() => changeQty(qty - 1)}
					disabled={disabled || qty <= 0}
					className="h-10 w-9 items-center justify-center rounded-xl active:bg-muted disabled:opacity-40"
				>
					<Icon name="Minus" className="text-foreground" size={14} />
				</Pressable>
				<StepTextInput
					value={String(value ?? 0)}
					keyboardType="number-pad"
					onChangeText={(nextValue) => changeQty(parseCurrencyInput(nextValue))}
					editable={!disabled}
					textAlign="center"
					fontWeight="bold"
					style={{
						width: 42,
						minHeight: 36,
						borderWidth: 0,
						backgroundColor: "transparent",
						paddingHorizontal: 0,
					}}
				/>
				<Pressable
					onPress={() => changeQty(qty + 1)}
					disabled={disabled}
					className="h-10 w-9 items-center justify-center rounded-xl active:bg-muted disabled:opacity-40"
				>
					<Icon name="Plus" className="text-foreground" size={14} />
				</Pressable>
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
