import { BottomSheetKeyboardAwareScrollView } from "@/components/ui/bottom-sheet-keyboard-aware-scroll-view";
import { Icon } from "@/components/ui/icon";
import { Modal as BottomSheetModal, useModal } from "@/components/ui/modal";
import { Text } from "@/components/ui/text";
import type { MouldingRow } from "@gnd/sales/sales-form-core";
import { BottomSheetView } from "@gorhom/bottom-sheet";
import { useEffect, useMemo, useState } from "react";
import {
	Image,
	Modal as NativeModal,
	PanResponder,
	Pressable,
	View,
} from "react-native";
import { formatMoney, parseCurrencyInput } from "../../lib/format";
import {
	NumberField,
	OptionalNumberField,
	StepTextInput,
} from "../shared/mobile-editor-primitives";
import { MouldingRowCalculator } from "./moulding-row-calculator";

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
	const totalQty = useMemo(
		() => rows.reduce((sum, row) => sum + Number(row.qty || 0), 0),
		[rows],
	);
	const totalAmount = useMemo(
		() => rows.reduce((sum, row) => sum + Number(row.lineTotal || 0), 0),
		[rows],
	);
	const [previewImage, setPreviewImage] = useState<{
		uri: string;
		title: string;
	} | null>(null);
	const optionsSheet = useModal();
	const calculatorSheet = useModal();
	const [optionsRowIndex, setOptionsRowIndex] = useState<number | null>(null);
	const [calculatorRowIndex, setCalculatorRowIndex] = useState<number | null>(
		null,
	);
	const [optionsDraft, setOptionsDraft] = useState<{
		addon: number;
		customPrice: number | null;
	}>({ addon: 0, customPrice: null });

	const openCalculatorSheet = (_row: MouldingRow, index: number) => {
		setCalculatorRowIndex(index);
		calculatorSheet.present();
	};
	const closeCalculatorSheet = () => {
		calculatorSheet.dismiss();
		setCalculatorRowIndex(null);
	};
	const openOptionsSheet = (row: MouldingRow, index: number) => {
		setOptionsRowIndex(index);
		setOptionsDraft({
			addon: toFiniteNumber(row.addon),
			customPrice: toOptionalFiniteNumber(row.customPrice),
		});
		optionsSheet.present();
	};
	const closeOptionsSheet = () => {
		optionsSheet.dismiss();
		setOptionsRowIndex(null);
	};
	const applyOptionsSheet = () => {
		if (optionsRowIndex == null) return;
		onChange(optionsRowIndex, {
			addon: optionsDraft.addon,
			customPrice: optionsDraft.customPrice,
		});
		closeOptionsSheet();
	};
	const clearOptionsSheet = () => {
		if (optionsRowIndex == null) return;
		onChange(optionsRowIndex, { addon: 0, customPrice: null });
		closeOptionsSheet();
	};

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
						<MouldingLineRow
							key={`${row.uid || index}`}
							row={row}
							index={index}
							disabled={disabled}
							rowsCount={rows.length}
							onChange={onChange}
							onOpenCalculator={openCalculatorSheet}
							onOpenOptions={openOptionsSheet}
							onPreview={setPreviewImage}
							onRemove={onRemove}
						/>
					))
				) : (
					<View className="border-y border-border py-4">
						<Text className="text-sm font-bold text-foreground">
							No moulding selected
						</Text>
						<Text className="text-xs text-muted-foreground">
							Configure the workflow to choose moulding, then edit quantities
							here.
						</Text>
					</View>
				)}
			</View>
			<MouldingImagePreviewModal
				image={previewImage}
				onClose={() => setPreviewImage(null)}
			/>
			<BottomSheetModal
				ref={calculatorSheet.ref}
				hideHeader
				enableDynamicSizing
				onDismiss={() => setCalculatorRowIndex(null)}
			>
				<BottomSheetView className="px-6 pb-14 pt-5">
					<Text
						numberOfLines={2}
						className="text-base font-bold text-foreground"
					>
						{calculatorRowIndex == null
							? "Moulding calculator"
							: rows[calculatorRowIndex]?.title ||
								rows[calculatorRowIndex]?.description ||
								"Moulding calculator"}
					</Text>
					{calculatorRowIndex != null ? (
						<View className="mt-5">
							<MouldingRowCalculator
								title={
									rows[calculatorRowIndex]?.title ||
									rows[calculatorRowIndex]?.description
								}
								unitPrice={
									rows[calculatorRowIndex]?.estimateUnit ||
									rows[calculatorRowIndex]?.salesPrice ||
									0
								}
								disabled={disabled}
								expanded
								onExpandedChange={(expanded) => {
									if (!expanded) closeCalculatorSheet();
								}}
								onCalculate={(qty) => onChange(calculatorRowIndex, { qty })}
							/>
						</View>
					) : null}
				</BottomSheetView>
			</BottomSheetModal>
			<BottomSheetModal
				ref={optionsSheet.ref}
				hideHeader
				snapPoints={["58%", "82%"]}
				keyboardBehavior="interactive"
				keyboardBlurBehavior="restore"
				android_keyboardInputMode="adjustResize"
				onDismiss={() => setOptionsRowIndex(null)}
			>
				<BottomSheetKeyboardAwareScrollView
					bottomOffset={132}
					disableScrollOnKeyboardHide
					keyboardDismissMode="interactive"
					keyboardShouldPersistTaps="handled"
					showsVerticalScrollIndicator={false}
					contentContainerStyle={{
						paddingHorizontal: 24,
						paddingTop: 20,
						paddingBottom: 156,
					}}
				>
					<Text
						numberOfLines={2}
						className="text-base font-bold text-foreground"
					>
						{optionsRowIndex == null
							? "Moulding options"
							: rows[optionsRowIndex]?.title ||
								rows[optionsRowIndex]?.description ||
								"Moulding options"}
					</Text>
					<View className="mt-5 gap-4">
						<NumberField
							label="Add-on"
							value={optionsDraft.addon}
							disabled={disabled}
							onChange={(addon) =>
								setOptionsDraft((current) => ({ ...current, addon }))
							}
						/>
						<OptionalNumberField
							label="Custom"
							value={optionsDraft.customPrice}
							disabled={disabled}
							onChange={(customPrice) =>
								setOptionsDraft((current) => ({ ...current, customPrice }))
							}
						/>
					</View>
					<View className="mt-6 flex-row gap-3">
						<Pressable
							onPress={clearOptionsSheet}
							disabled={disabled || optionsRowIndex == null}
							className="h-11 flex-1 items-center justify-center rounded-xl border border-border bg-background disabled:opacity-40"
						>
							<Text className="text-xs font-bold text-foreground">Clear</Text>
						</Pressable>
						<Pressable
							onPress={closeOptionsSheet}
							className="h-11 flex-1 items-center justify-center rounded-xl border border-border bg-background"
						>
							<Text className="text-xs font-bold text-foreground">Cancel</Text>
						</Pressable>
						<Pressable
							onPress={applyOptionsSheet}
							disabled={disabled || optionsRowIndex == null}
							className="h-11 flex-1 items-center justify-center rounded-xl bg-primary disabled:opacity-40"
						>
							<Text className="text-xs font-bold text-primary-foreground">
								Apply
							</Text>
						</Pressable>
					</View>
				</BottomSheetKeyboardAwareScrollView>
			</BottomSheetModal>
		</View>
	);
}

function MouldingLineRow({
	row,
	index,
	disabled,
	rowsCount,
	onChange,
	onOpenCalculator,
	onOpenOptions,
	onPreview,
	onRemove,
}: {
	row: MouldingRow;
	index: number;
	disabled?: boolean;
	rowsCount: number;
	onChange: (index: number, patch: Partial<MouldingRow>) => void;
	onOpenCalculator: (row: MouldingRow, index: number) => void;
	onOpenOptions: (row: MouldingRow, index: number) => void;
	onPreview: (image: { uri: string; title: string }) => void;
	onRemove: (row: MouldingRow) => void;
}) {
	const addon = toFiniteNumber(row.addon);
	const customPrice = toOptionalFiniteNumber(row.customPrice);
	const hasAddon = addon !== 0;
	const hasCustom = customPrice != null;

	return (
		<View className="border-b border-border/60 py-5">
			<View className="mb-4 flex-row gap-4">
				<MouldingRowImage
					src={row.img}
					title={row.title}
					onPreview={onPreview}
				/>
				<View className="min-w-0 flex-1">
					<View className="gap-2">
						<Text
							numberOfLines={2}
							className="text-base font-extrabold leading-5 text-foreground"
						>
							{String(row.title || row.description || "Moulding").toUpperCase()}
						</Text>
						{(hasAddon || hasCustom) && (
							<View className="flex-row flex-wrap gap-1.5">
								{hasAddon ? (
									<AmountChip label="Add-on" value={addon} tone="primary" />
								) : null}
								{hasCustom ? (
									<AmountChip
										label="Custom"
										value={customPrice || 0}
										tone="secondary"
									/>
								) : null}
							</View>
						)}
					</View>
					<View className="mt-3 flex-row gap-2">
						<MouldingActionButton
							icon="Calculator"
							disabled={disabled}
							accessibilityLabel="Open moulding calculator"
							onPress={() => onOpenCalculator(row, index)}
						/>
						<MouldingActionButton
							icon="more"
							disabled={disabled}
							accessibilityLabel="Configure add-on and custom price"
							onPress={() => onOpenOptions(row, index)}
						/>
						<View className="flex-1" />
						<MouldingActionButton
							icon="Trash"
							tone="danger"
							disabled={disabled || rowsCount <= 1}
							accessibilityLabel="Remove moulding row"
							onPress={() => onRemove(row)}
						/>
					</View>
				</View>
			</View>
			<View className="flex-row items-end gap-4">
				<MouldingQtyStepper
					value={row.qty}
					disabled={disabled}
					onChange={(qty) => onChange(index, { qty })}
				/>
				<View className="min-w-0 flex-1 items-end">
					<Text className="mb-1 text-[10px] font-bold uppercase text-muted-foreground">
						Estimate
					</Text>
					<Text
						className={`text-sm font-bold text-muted-foreground ${
							hasAddon || hasCustom ? "line-through" : ""
						}`}
					>
						{formatMoney(row.estimateUnit || row.salesPrice || 0)}
					</Text>
				</View>
				<View className="min-w-0 flex-1 items-end">
					<Text className="mb-1 text-[10px] font-bold uppercase text-primary">
						Final Total
					</Text>
					<Text className="text-2xl font-black leading-7 text-primary">
						{formatMoney(row.lineTotal || 0)}
					</Text>
				</View>
			</View>
		</View>
	);
}

function MouldingActionButton({
	icon,
	selected,
	tone = "default",
	disabled,
	accessibilityLabel,
	onPress,
}: {
	icon: "Calculator" | "more" | "Trash";
	selected?: boolean;
	tone?: "default" | "danger";
	disabled?: boolean;
	accessibilityLabel: string;
	onPress: () => void;
}) {
	return (
		<Pressable
			accessibilityRole="button"
			accessibilityLabel={accessibilityLabel}
			accessibilityState={{ selected: Boolean(selected) }}
			onPress={onPress}
			disabled={disabled}
			className={`h-8 w-8 items-center justify-center rounded-lg border disabled:opacity-40 ${
				selected
					? "border-primary bg-primary/10"
					: "border-border bg-background active:bg-muted"
			}`}
		>
			<Icon
				name={icon}
				className={
					tone === "danger"
						? "text-red-600"
						: selected
							? "text-primary"
							: "text-foreground"
				}
				size={18}
			/>
		</Pressable>
	);
}

function AmountChip({
	label,
	value,
	tone = "secondary",
}: {
	label: string;
	value: number;
	tone?: "primary" | "secondary";
}) {
	return (
		<View
			className={`rounded-md px-2 py-1 ${
				tone === "primary" ? "bg-primary/10" : "bg-muted"
			}`}
		>
			<Text
				className={`text-center text-[9px] font-bold uppercase ${
					tone === "primary" ? "text-primary/70" : "text-muted-foreground"
				}`}
			>
				{label}
			</Text>
			<Text
				className={`text-center text-[11px] font-extrabold ${
					tone === "primary" ? "text-primary" : "text-foreground"
				}`}
			>
				{formatMoney(value)}
			</Text>
		</View>
	);
}

function MouldingQtyStepper({
	value,
	disabled,
	onChange,
}: {
	value?: number | string | null;
	disabled?: boolean;
	onChange: (value: number) => void;
}) {
	const qty = Math.max(1, Number(value || 1));
	const changeQty = (nextQty: number) => onChange(Math.max(1, nextQty));

	return (
		<View className="gap-1">
			<Text className="text-[10px] font-bold uppercase text-muted-foreground">
				Quantity
			</Text>
			<View className="h-11 flex-row items-center overflow-hidden rounded-xl border-2 border-border bg-background">
				<Pressable
					onPress={() => changeQty(qty - 1)}
					disabled={disabled || qty <= 1}
					className="h-11 w-10 items-center justify-center active:bg-muted disabled:opacity-40"
				>
					<Icon name="Minus" className="text-foreground" size={16} />
				</Pressable>
				<StepTextInput
					value={String(qty)}
					keyboardType="number-pad"
					onChangeText={(nextValue) => changeQty(parseCurrencyInput(nextValue))}
					editable={!disabled}
					textAlign="center"
					fontWeight="bold"
					style={{
						width: 40,
						minHeight: 40,
						borderWidth: 0,
						backgroundColor: "transparent",
						paddingHorizontal: 0,
					}}
				/>
				<Pressable
					onPress={() => changeQty(qty + 1)}
					disabled={disabled}
					className="h-11 w-10 items-center justify-center border-l border-border active:bg-muted disabled:opacity-40"
				>
					<Icon name="Plus" className="text-foreground" size={16} />
				</Pressable>
			</View>
		</View>
	);
}

function MouldingRowImage({
	src,
	title,
	onPreview,
}: {
	src?: string | null;
	title?: string | null;
	onPreview: (image: { uri: string; title: string }) => void;
}) {
	const imageUri = resolveMouldingImageUri(src);
	const imageResetKey = imageUri || "";
	const [imageFailed, setImageFailed] = useState(false);

	useEffect(() => {
		const nextImageKey = imageResetKey;
		if (nextImageKey || nextImageKey === "") {
			setImageFailed(false);
		}
	}, [imageResetKey]);

	return (
		<Pressable
			disabled={!imageUri || imageFailed}
			onPress={() =>
				imageUri
					? onPreview({ uri: imageUri, title: title || "Moulding" })
					: undefined
			}
			className="h-20 w-20 overflow-hidden rounded-xl border border-border bg-muted p-2 disabled:opacity-70"
		>
			{imageUri && !imageFailed ? (
				<Image
					source={{ uri: imageUri }}
					resizeMode="contain"
					accessibilityLabel={title || "Moulding"}
					className="h-full w-full"
					onError={() => setImageFailed(true)}
				/>
			) : (
				<View className="h-full w-full items-center justify-center">
					<Icon name="FileText" className="text-muted-foreground" size={16} />
				</View>
			)}
		</Pressable>
	);
}

function MouldingImagePreviewModal({
	image,
	onClose,
}: {
	image: { uri: string; title: string } | null;
	onClose: () => void;
}) {
	const swipeToCloseResponder = useMemo(
		() =>
			PanResponder.create({
				onMoveShouldSetPanResponder: (_event, gesture) =>
					gesture.dy > 12 && gesture.dy > Math.abs(gesture.dx),
				onMoveShouldSetPanResponderCapture: (_event, gesture) =>
					gesture.dy > 12 && gesture.dy > Math.abs(gesture.dx),
				onPanResponderRelease: (_event, gesture) => {
					if (gesture.dy > 72) onClose();
				},
			}),
		[onClose],
	);

	return (
		<NativeModal
			visible={Boolean(image)}
			animationType="fade"
			transparent
			statusBarTranslucent
			onRequestClose={onClose}
		>
			<Pressable
				accessibilityRole="button"
				accessibilityLabel="Close image preview"
				onPress={onClose}
				className="flex-1 bg-black/90 px-4 pb-8 pt-12"
				{...swipeToCloseResponder.panHandlers}
			>
				<Text
					numberOfLines={1}
					className="absolute left-4 top-14 max-w-[78%] text-sm font-bold text-white"
				>
					{image?.title || "Moulding"}
				</Text>
				<Pressable
					onPress={onClose}
					accessibilityRole="button"
					accessibilityLabel="Close image preview"
					className="absolute right-4 top-12 z-10 h-10 w-10 items-center justify-center rounded-full bg-white/15 active:bg-white/25"
				>
					<Icon name="X" className="text-white" size={18} />
				</Pressable>
				{image ? (
					<Pressable
						onPress={(event) => event.stopPropagation()}
						className="flex-1 items-center justify-center"
					>
						<Image
							source={{ uri: image.uri }}
							resizeMode="contain"
							accessibilityLabel={image.title}
							className="h-full w-full"
						/>
					</Pressable>
				) : null}
			</Pressable>
		</NativeModal>
	);
}

function toFiniteNumber(value: unknown, fallback = 0) {
	const numberValue = Number(value || fallback);
	return Number.isFinite(numberValue) ? numberValue : fallback;
}

function toOptionalFiniteNumber(value: unknown) {
	if (value == null || value === "") return null;
	const numberValue = Number(value);
	return Number.isFinite(numberValue) ? numberValue : null;
}

function resolveMouldingImageUri(src?: string | null) {
	const value = String(src || "").trim();
	if (!value) return null;
	if (/^(https?:|data:|blob:)/i.test(value)) return value;

	const base =
		process.env.EXPO_PUBLIC_CLOUDINARY_BASE_URL ||
		process.env.NEXT_PUBLIC_CLOUDINARY_BASE_URL;
	if (!base) return null;

	const normalizedBase = String(base).replace(/\/+$/, "");
	const normalizedPath = value.replace(/^\/+/, "");
	const pathWithBucket = normalizedPath.startsWith("dyke/")
		? normalizedPath
		: `dyke/${normalizedPath}`;

	return `${normalizedBase}/${pathWithBucket}`;
}
