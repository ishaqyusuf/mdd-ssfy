import { Text } from "@/components/ui/text";
import type { MouldingRow } from "@gnd/sales/sales-form-core";
import { View } from "react-native";
import { formatMoney } from "../../lib/format";
import {
	IconButton,
	NumberField,
	RowShell,
	StepSectionHeader,
	StepTextInput,
} from "../shared/mobile-editor-primitives";

export function MouldingRowsEditor({
	rows,
	disabled,
	onChange,
	onRemove,
}: {
	rows: MouldingRow[];
	disabled?: boolean;
	onChange: (index: number, patch: Partial<MouldingRow>) => void;
	onRemove: (row: MouldingRow) => void;
}) {
	return (
		<View className="border-t border-border pt-3">
			<StepSectionHeader title="Moulding line" />
			<View className="mt-2 gap-3">
				{rows.length ? (
					rows.map((row, index) => (
						<RowShell key={`${row.uid || index}`}>
							<View className="flex-row gap-2">
								<View className="min-w-0 flex-1">
									<Text className="mb-1 text-[10px] font-bold uppercase text-muted-foreground">
										Moulding
									</Text>
									<StepTextInput
										value={String(row.description || row.title || "")}
										onChangeText={(description) =>
											onChange(index, { description })
										}
										editable={!disabled}
										placeholder="Moulding"
										fontWeight="bold"
									/>
								</View>
								<View className="justify-end">
									<IconButton
										icon="Trash"
										tone="danger"
										disabled={disabled}
										onPress={() => onRemove(row)}
									/>
								</View>
							</View>
							<View className="flex-row gap-2">
								<NumberField
									label="Qty"
									value={row.qty}
									disabled={disabled}
									onChange={(qty) => onChange(index, { qty })}
								/>
								<NumberField
									label="Add-on"
									value={row.addon}
									disabled={disabled}
									onChange={(addon) => onChange(index, { addon })}
								/>
								<NumberField
									label="Custom"
									value={row.customPrice ?? ""}
									disabled={disabled}
									onChange={(customPrice) => onChange(index, { customPrice })}
								/>
							</View>
							<View className="flex-row items-center justify-between gap-2">
								<Text className="text-[11px] text-muted-foreground">
									Estimate{" "}
									{formatMoney(row.estimateUnit || row.salesPrice || 0)}
								</Text>
								<Text className="text-right text-xs font-bold text-foreground">
									{formatMoney(row.lineTotal || 0)}
								</Text>
							</View>
						</RowShell>
					))
				) : (
					<RowShell muted>
						<Text className="text-sm font-bold text-foreground">
							No moulding selected
						</Text>
						<Text className="text-xs text-muted-foreground">
							Configure the workflow to choose moulding, then edit quantities
							here.
						</Text>
					</RowShell>
				)}
			</View>
		</View>
	);
}
