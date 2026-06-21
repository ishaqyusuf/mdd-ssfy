import { Text } from "@/components/ui/text";
import {
	calculateMouldingQuantity,
	deriveMouldingPieceLength,
} from "@gnd/sales/sales-form-core";
import { useEffect, useMemo, useState } from "react";
import { Pressable, View } from "react-native";
import { formatMoney } from "../../lib/format";
import { NumberField } from "../shared/mobile-editor-primitives";

const STANDARD_PIECE_LENGTHS = [8, 12, 16, 17];

export function MouldingRowCalculator({
	title,
	unitPrice,
	disabled,
	onCalculate,
	expanded,
	onExpandedChange,
}: {
	title?: string | null;
	unitPrice?: number | null;
	disabled?: boolean;
	onCalculate: (qty: number) => void;
	expanded: boolean;
	onExpandedChange: (expanded: boolean) => void;
}) {
	const derivedPieceLength = deriveMouldingPieceLength(title);
	const [linearFeet, setLinearFeet] = useState(0);
	const [pieceLength, setPieceLength] = useState(derivedPieceLength);
	const [wastePercentage, setWastePercentage] = useState(0);
	const pieceLengthOptions = useMemo(
		() =>
			Array.from(new Set([...STANDARD_PIECE_LENGTHS, derivedPieceLength])).sort(
				(a, b) => a - b,
			),
		[derivedPieceLength],
	);
	const calculation = useMemo(
		() =>
			calculateMouldingQuantity({
				linearFeet,
				pieceLength,
				wastePercentage,
				unitPrice,
			}),
		[linearFeet, pieceLength, unitPrice, wastePercentage],
	);

	useEffect(() => {
		if (!expanded) setPieceLength(derivedPieceLength);
	}, [derivedPieceLength, expanded]);

	if (!expanded) return null;

	return (
		<View className="mt-3 gap-3 border-t border-border pt-3">
			<View className="gap-2">
				<Text className="text-[10px] font-bold uppercase text-muted-foreground">
					Piece length
				</Text>
				<View className="flex-row flex-wrap gap-2">
					{pieceLengthOptions.map((length) => {
						const selected = length === pieceLength;
						return (
							<Pressable
								key={`moulding-length-${length}`}
								onPress={() => setPieceLength(length)}
								disabled={disabled}
								className={`h-9 min-w-14 items-center justify-center rounded-lg border px-3 disabled:opacity-40 ${
									selected
										? "border-primary bg-primary"
										: "border-border bg-background"
								}`}
							>
								<Text
									className={`text-xs font-bold ${selected ? "text-primary-foreground" : "text-foreground"}`}
								>
									{length}'
								</Text>
							</Pressable>
						);
					})}
				</View>
			</View>

			<View className="flex-row gap-2">
				<NumberField
					label="Total LF"
					value={linearFeet}
					disabled={disabled}
					onChange={(value) => setLinearFeet(Math.max(0, value))}
				/>
				<NumberField
					label="Waste %"
					value={wastePercentage}
					disabled={disabled}
					onChange={(value) =>
						setWastePercentage(Math.min(100, Math.max(0, value)))
					}
				/>
			</View>

			<View className="flex-row items-center justify-between gap-3 border-y border-border py-3">
				<Result label="Price" value={formatMoney(unitPrice || 0)} />
				<Result
					label="Adjusted LF"
					value={String(calculation.adjustedLinearFeet)}
				/>
				<Result label="Pieces" value={String(calculation.pieces)} emphasized />
				<Result
					label="Cost"
					value={formatMoney(calculation.totalCost)}
					emphasized
				/>
			</View>

			<View className="flex-row gap-2">
				<Pressable
					onPress={() => onExpandedChange(false)}
					disabled={disabled}
					className="h-10 flex-1 items-center justify-center rounded-lg border border-border bg-background disabled:opacity-40"
				>
					<Text className="text-xs font-bold text-foreground">Cancel</Text>
				</Pressable>
				<Pressable
					onPress={() => {
						onCalculate(calculation.pieces);
						onExpandedChange(false);
					}}
					disabled={disabled || calculation.pieces <= 0}
					className="h-10 flex-1 items-center justify-center rounded-lg bg-primary disabled:opacity-40"
				>
					<Text className="text-xs font-bold text-primary-foreground">
						Apply
					</Text>
				</Pressable>
			</View>
		</View>
	);
}

function Result({
	label,
	value,
	emphasized,
}: {
	label: string;
	value: string;
	emphasized?: boolean;
}) {
	return (
		<View className="min-w-0 flex-1">
			<Text className="text-[9px] font-bold uppercase text-muted-foreground">
				{label}
			</Text>
			<Text
				numberOfLines={1}
				className={`mt-0.5 text-[11px] ${emphasized ? "font-bold text-primary" : "font-semibold text-foreground"}`}
			>
				{value}
			</Text>
		</View>
	);
}
