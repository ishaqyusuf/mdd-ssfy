import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import type { ReactNode } from "react";
import {
	Pressable,
	type StyleProp,
	StyleSheet,
	TextInput,
	type TextInputProps,
	type TextStyle,
	View,
} from "react-native";
import { parseCurrencyInput } from "../../lib/format";

export function StepSectionHeader({
	title,
	actionLabel,
	actionIcon = "Plus",
	disabled,
	onAction,
}: {
	title: string;
	actionLabel?: string;
	actionIcon?: "Plus" | "Trash" | "ChevronDown";
	disabled?: boolean;
	onAction?: () => void;
}) {
	return (
		<View className="flex-row items-center justify-between gap-2">
			<Text className="text-[11px] font-bold uppercase text-muted-foreground">
				{title}
			</Text>
			{actionLabel && onAction ? (
				<Pressable
					onPress={onAction}
					disabled={disabled}
					className="h-8 flex-row items-center gap-1 rounded-full border border-primary bg-primary/5 px-3 disabled:opacity-40"
				>
					<Icon name={actionIcon} className="text-primary" size={13} />
					<Text className="text-[11px] font-bold text-primary">
						{actionLabel}
					</Text>
				</Pressable>
			) : null}
		</View>
	);
}

export function StepTextInput({
	style,
	multiline,
	textAlign,
	fontWeight,
	...props
}: TextInputProps & {
	textAlign?: "left" | "center" | "right";
	fontWeight?: "normal" | "bold";
}) {
	return (
		<TextInput
			{...props}
			multiline={multiline}
			placeholderTextColor={props.placeholderTextColor || "#8A8A8A"}
			style={[
				styles.input,
				multiline ? styles.multiline : null,
				textAlign === "right" ? styles.textRight : null,
				textAlign === "center" ? styles.textCenter : null,
				fontWeight === "bold" ? styles.bold : null,
				style,
			]}
		/>
	);
}

export function NumberField({
	label,
	value,
	disabled,
	onChange,
	style,
}: {
	label: string;
	value?: number | string | null;
	disabled?: boolean;
	onChange: (value: number) => void;
	style?: StyleProp<TextStyle>;
}) {
	return (
		<View className="min-w-0 flex-1 gap-1">
			<Text className="text-[10px] font-bold uppercase text-muted-foreground">
				{label}
			</Text>
			<StepTextInput
				value={String(value ?? 0)}
				keyboardType="decimal-pad"
				onChangeText={(nextValue) => onChange(parseCurrencyInput(nextValue))}
				editable={!disabled}
				fontWeight="bold"
				style={[styles.numberInput, style]}
			/>
		</View>
	);
}

export function RowShell({
	children,
	muted,
}: {
	children: ReactNode;
	muted?: boolean;
}) {
	return (
		<View
			className={`gap-2 rounded-xl border border-border p-2 ${
				muted ? "bg-card" : "bg-background"
			}`}
		>
			{children}
		</View>
	);
}

export function SelectChip({
	title,
	subtitle,
	selected,
	disabled,
	onPress,
}: {
	title: string;
	subtitle?: string | null;
	selected: boolean;
	disabled?: boolean;
	onPress: () => void;
}) {
	return (
		<Pressable
			onPress={onPress}
			disabled={disabled}
			className={`min-h-12 min-w-32 justify-center rounded-xl border px-3 py-2 disabled:opacity-40 ${
				selected ? "border-primary bg-primary/10" : "border-border bg-card"
			}`}
		>
			<Text
				numberOfLines={1}
				className={`max-w-40 text-[11px] font-bold ${
					selected ? "text-primary" : "text-foreground"
				}`}
			>
				{title}
			</Text>
			{subtitle ? (
				<Text
					numberOfLines={1}
					className="mt-0.5 text-[10px] text-muted-foreground"
				>
					{subtitle}
				</Text>
			) : null}
		</Pressable>
	);
}

export function IconButton({
	icon,
	tone = "default",
	disabled,
	onPress,
}: {
	icon: "Trash" | "Plus" | "X";
	tone?: "default" | "danger";
	disabled?: boolean;
	onPress: () => void;
}) {
	return (
		<Pressable
			onPress={onPress}
			disabled={disabled}
			className="h-10 w-10 items-center justify-center rounded-xl border border-border bg-background active:bg-muted disabled:opacity-40"
		>
			<Icon
				name={icon}
				className={tone === "danger" ? "text-red-600" : "text-foreground"}
				size={14}
			/>
		</Pressable>
	);
}

const styles = StyleSheet.create({
	input: {
		minWidth: 0,
		minHeight: 40,
		borderWidth: 1,
		borderColor: "#E5E7EB",
		borderRadius: 12,
		backgroundColor: "#FFFFFF",
		color: "#111827",
		paddingHorizontal: 12,
		fontSize: 12,
	},
	multiline: {
		minHeight: 64,
		paddingVertical: 8,
		textAlignVertical: "top",
	},
	numberInput: {
		paddingHorizontal: 8,
	},
	textRight: {
		textAlign: "right",
	},
	textCenter: {
		textAlign: "center",
	},
	bold: {
		fontWeight: "700",
	},
});
