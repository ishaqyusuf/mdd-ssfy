import { FloatingBottomSheet } from "@/components/floating-bottom-sheet";
import { SafeArea } from "@/components/safe-area";
import { _trpc } from "@/components/static-trpc";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Pressable as HapticPressable } from "@/components/ui/pressable";
import { Text } from "@/components/ui/text";
import { useDebounce } from "@/hooks/use-debounce";
import type { ServiceRow } from "@gnd/sales/sales-form-core";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import {
	FlatList,
	Modal as NativeModal,
	Pressable,
	type TextInput,
	View,
} from "react-native";
import { KeyboardStickyView } from "react-native-keyboard-controller";
import { formatMoney, parseCurrencyInput } from "../../lib/format";
import {
	IconButton,
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

type ServiceSuggestion = {
	service: string;
	unitPrice: number;
	usageCount?: number | null;
	lastUsedAt?: string | null;
};

export function ServiceRowsSummary({
	rows,
	variant = "inline",
}: {
	rows: ServiceRow[];
	variant?: "inline" | "sticky";
}) {
	const totalQty = rows.reduce((sum, row) => sum + Number(row.qty || 0), 0);
	const totalAmount = rows.reduce(
		(sum, row) => sum + Number(row.lineTotal || 0),
		0,
	);
	const compact = variant === "sticky";

	return (
		<View
			className={`border-b border-border ${
				compact ? "bg-background py-3" : "py-4"
			}`}
		>
			<View className="flex-row items-end justify-between gap-3">
				<View>
					<Text className="text-[10px] font-bold uppercase tracking-widest text-primary">
						Line Total
					</Text>
					<Text
						className={`mt-1 font-black text-foreground ${
							compact ? "text-2xl" : "text-4xl"
						}`}
					>
						{formatMoney(totalAmount)}
					</Text>
				</View>
				<View className="items-end">
					<Text className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
						Qty
					</Text>
					<Text
						className={`mt-1 font-black text-foreground ${
							compact ? "text-xl" : "text-2xl"
						}`}
					>
						{totalQty}
					</Text>
				</View>
			</View>
		</View>
	);
}

export function ServiceRowsEditor({
	rows,
	disabled,
	canEditPricing = true,
	hideAddButton = false,
	onChange,
	onAdd,
	onRemove,
}: {
	rows: ServiceRow[];
	disabled?: boolean;
	canEditPricing?: boolean;
	hideAddButton?: boolean;
	onChange: (index: number, patch: Partial<ServiceRow>) => void;
	onAdd: () => void;
	onRemove: (index: number) => void;
}) {
	const [pendingDeleteIndex, setPendingDeleteIndex] = useState<number | null>(
		null,
	);
	const [suggestionTargetIndex, setSuggestionTargetIndex] = useState<
		number | null
	>(null);
	const [serviceSuggestionSearch, setServiceSuggestionSearch] = useState("");
	const debouncedServiceSuggestionSearch = useDebounce(
		serviceSuggestionSearch.trim(),
		250,
	);
	const pendingDeleteRow =
		pendingDeleteIndex == null ? null : rows[pendingDeleteIndex] || null;
	const pendingDeleteLabel =
		String(pendingDeleteRow?.service || "").trim() ||
		`service line ${Number(pendingDeleteIndex ?? 0) + 1}`;
	const serviceSuggestionModalOpen = suggestionTargetIndex != null;
	const serviceSuggestionsQuery = useQuery(
		_trpc.newSalesForm.searchServiceSuggestions.queryOptions(
			{
				query: debouncedServiceSuggestionSearch,
				limit: 20,
			},
			{
				enabled: serviceSuggestionModalOpen,
				refetchOnWindowFocus: false,
			},
		),
	);
	const serviceSuggestions = useMemo(
		() =>
			((serviceSuggestionsQuery.data || []) as ServiceSuggestion[]).filter(
				(suggestion) => suggestion.service,
			),
		[serviceSuggestionsQuery.data],
	);

	const confirmDelete = () => {
		if (pendingDeleteIndex == null) return;
		onRemove(pendingDeleteIndex);
		setPendingDeleteIndex(null);
	};
	const openServiceSuggestions = (index: number) => {
		if (disabled) return;
		setServiceSuggestionSearch("");
		setSuggestionTargetIndex(index);
	};
	const closeServiceSuggestions = () => {
		setSuggestionTargetIndex(null);
		setServiceSuggestionSearch("");
	};
	const selectServiceSuggestion = (suggestion: ServiceSuggestion) => {
		if (suggestionTargetIndex == null) return;
		onChange(suggestionTargetIndex, {
			service: suggestion.service.toUpperCase(),
			...(canEditPricing ? { unitPrice: Number(suggestion.unitPrice || 0) } : {}),
		});
		closeServiceSuggestions();
	};

	return (
		<>
			<View>
				{rows.length ? <ServiceRowsSummary rows={rows} /> : null}
				<View className="mt-4 gap-4">
					{rows.length ? (
						rows.map((row, index) => (
							<View
								key={`${row.uid || index}`}
								className="gap-6 rounded-2xl border border-border bg-card p-5 shadow-sm"
							>
								<View className="flex-row items-center gap-2">
									<View className="h-8 w-8 items-center justify-center rounded-full bg-muted">
										<Text className="text-xs font-black text-muted-foreground">
											{index + 1}
										</Text>
									</View>
									<View className="flex-1" />
									{canEditPricing ? (
										<>
											<ServiceToggle
												label="Tax"
												selected={Boolean(row.taxxable)}
												disabled={disabled}
												onPress={() =>
													onChange(index, { taxxable: !row.taxxable })
												}
											/>
											<ServiceToggle
												label="Prod"
												selected={Boolean(row.produceable)}
												disabled={disabled}
												onPress={() =>
													onChange(index, { produceable: !row.produceable })
												}
											/>
										</>
									) : null}
									<IconButton
										icon="Trash"
										tone="danger"
										disabled={disabled}
										onPress={() => setPendingDeleteIndex(index)}
									/>
								</View>
								<View className="gap-2">
									<Text className="text-[10px] font-bold uppercase tracking-widest text-primary">
										Service
									</Text>
									<View className="relative">
										<StepTextInput
											value={String(row.service || "")}
											onChangeText={(service) =>
												onChange(index, { service: service.toUpperCase() })
											}
											editable={!disabled}
											placeholder="Enter service name..."
											autoCapitalize="characters"
											fontWeight="bold"
											multiline
											style={{
												minHeight: 52,
												maxHeight: 132,
												borderWidth: 0,
												borderBottomWidth: 2,
												borderBottomColor: "#1D4ED8",
												borderRadius: 0,
												backgroundColor: "transparent",
												paddingHorizontal: 0,
												paddingRight: 52,
												paddingVertical: 8,
												fontSize: 18,
												textAlignVertical: "top",
											}}
										/>
										<Pressable
											onPress={() => openServiceSuggestions(index)}
											disabled={disabled}
											accessibilityLabel="Search service suggestions"
											className="absolute bottom-0 right-0 top-0 w-12 items-center justify-center rounded-full active:bg-muted disabled:opacity-40"
										>
											<Icon
												name="Search"
												className="text-primary"
												size={18}
											/>
										</Pressable>
									</View>
								</View>
								<View className="flex-row items-end gap-4">
									<ServiceQtyStepper
										value={row.qty}
										disabled={disabled}
										onChange={(qty) => onChange(index, { qty })}
									/>
									{canEditPricing ? (
										<ServiceUnitPriceField
											value={row.unitPrice}
											disabled={disabled}
											onChange={(unitPrice) => onChange(index, { unitPrice })}
										/>
									) : (
										<View className="min-w-0 flex-1 gap-2">
											<Text className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
												Unit Price
											</Text>
											<View className="h-11 justify-center rounded-xl border border-input bg-muted px-3">
												<Text className="text-sm font-bold text-foreground">
													{formatMoney(row.unitPrice || 0)}
												</Text>
											</View>
										</View>
									)}
								</View>
								<View className="items-end">
									<Text className="text-xl font-black text-foreground">
										{formatMoney(row.lineTotal || 0)}
									</Text>
								</View>
							</View>
						))
					) : (
						<View className="border-y border-border py-4">
							<Text className="text-sm font-bold text-foreground">
								No service rows
							</Text>
							<Text className="text-xs text-muted-foreground">
								Add a service row to edit service quantity
								{canEditPricing ? " and pricing" : ""}.
							</Text>
						</View>
					)}
				</View>
				{hideAddButton ? null : (
					<Pressable
						onPress={onAdd}
						disabled={disabled}
						className="mt-3 h-11 flex-row items-center justify-center gap-2 rounded-xl border border-primary bg-primary/5 px-3 disabled:opacity-40"
					>
						<Icon name="Plus" className="text-primary" size={14} />
						<Text className="text-xs font-bold text-primary">
							Add service line
						</Text>
					</Pressable>
				)}
			</View>
			<ServiceSuggestionModal
				visible={serviceSuggestionModalOpen}
				query={serviceSuggestionSearch}
				suggestions={serviceSuggestions}
				isLoading={
					serviceSuggestionsQuery.isLoading ||
					(serviceSuggestionsQuery.isFetching && !serviceSuggestions.length)
				}
				disabled={disabled}
				onClose={closeServiceSuggestions}
				onQueryChange={setServiceSuggestionSearch}
				onSelect={selectServiceSuggestion}
			/>
			<FloatingBottomSheet
				visible={pendingDeleteIndex != null}
				onClose={() => setPendingDeleteIndex(null)}
				accessibilityLabel="Delete service line"
				title="Delete service line?"
			>
				<View className="gap-4 px-5 pb-5">
					<View>
						<Text className="text-base font-semibold text-foreground">
							Delete {pendingDeleteLabel}?
						</Text>
						<Text className="mt-1 text-sm text-muted-foreground">
							This removes only this service line from the invoice item.
						</Text>
					</View>
					<View className="flex-row gap-2">
						<Button
							variant="outline"
							className="h-11 flex-1 rounded-xl"
							onPress={() => setPendingDeleteIndex(null)}
						>
							<Text>Cancel</Text>
						</Button>
						<Button
							className="h-11 flex-1 rounded-xl bg-red-600"
							onPress={confirmDelete}
						>
							<Text>Delete</Text>
						</Button>
					</View>
				</View>
			</FloatingBottomSheet>
		</>
	);
}

function ServiceSuggestionModal({
	visible,
	query,
	suggestions,
	isLoading,
	disabled,
	onClose,
	onQueryChange,
	onSelect,
}: {
	visible: boolean;
	query: string;
	suggestions: ServiceSuggestion[];
	isLoading?: boolean;
	disabled?: boolean;
	onClose: () => void;
	onQueryChange: (query: string) => void;
	onSelect: (suggestion: ServiceSuggestion) => void;
}) {
	const searchInputRef = useRef<TextInput>(null);

	useEffect(() => {
		if (!visible) return;
		const timer = setTimeout(() => {
			searchInputRef.current?.focus();
		}, 250);
		return () => clearTimeout(timer);
	}, [visible]);

	return (
		<NativeModal
			visible={visible}
			animationType="slide"
			presentationStyle="fullScreen"
			onRequestClose={onClose}
		>
			<SafeArea>
				<View className="flex-1 bg-background">
					<View className="flex-row items-center gap-3 border-b border-border px-4 py-3">
						<Pressable
							onPress={onClose}
							className="h-11 w-11 items-center justify-center rounded-full active:bg-muted"
						>
							<Icon name="X" className="text-foreground" size={18} />
						</Pressable>
						<View className="min-w-0 flex-1">
							<Text className="text-base font-bold text-foreground">
								Service suggestion
							</Text>
							<Text className="text-xs text-muted-foreground">
								Search or choose a recent service
							</Text>
						</View>
					</View>
					<FlatList
						data={isLoading ? [] : suggestions}
						keyExtractor={(item) => item.service}
						keyboardDismissMode="interactive"
						keyboardShouldPersistTaps="handled"
						contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 96 }}
						ListEmptyComponent={
							isLoading ? (
								<View className="items-center border-b border-border py-8">
									<Text className="text-center text-sm font-bold text-foreground">
										Loading services...
									</Text>
								</View>
							) : (
								<View className="items-center border-b border-border py-8">
									<Text className="text-center text-sm font-bold text-foreground">
										No services found.
									</Text>
									<Text className="mt-1 text-center text-xs text-muted-foreground">
										Saved service line names will appear here.
									</Text>
								</View>
							)
						}
						renderItem={({ item }) => (
							<HapticPressable
								haptic
								onPress={() => onSelect(item)}
								disabled={disabled}
								className="min-h-16 justify-center border-b border-border py-3 active:opacity-90 disabled:opacity-40"
							>
								<View className="flex-row items-start gap-3">
									<View className="min-w-0 flex-1">
										<Text
											numberOfLines={2}
											className="text-sm font-black text-foreground"
										>
											{item.service || "SERVICE"}
										</Text>
										<Text className="mt-1 text-xs text-muted-foreground">
											{Number(item.usageCount || 0) > 1
												? `Used ${item.usageCount} times`
												: "Recent service"}
										</Text>
									</View>
									<Text className="text-sm font-black text-foreground">
										{formatMoney(item.unitPrice || 0)}
									</Text>
								</View>
							</HapticPressable>
						)}
					/>
					<KeyboardStickyView
						offset={{ closed: 0, opened: 0 }}
						pointerEvents="box-none"
						style={{
							position: "absolute",
							left: 0,
							right: 0,
							bottom: 0,
							zIndex: 20,
							paddingHorizontal: 16,
							paddingBottom: 20,
							paddingTop: 8,
						}}
					>
						<View
							style={{
								height: 48,
								flexDirection: "row",
								alignItems: "center",
								borderRadius: 12,
								borderWidth: 1,
								borderColor: "#D9DEE8",
								backgroundColor: "#FFFFFF",
								paddingHorizontal: 12,
							}}
						>
							<Icon name="Search" className="text-muted-foreground" size={15} />
							<StepTextInput
								ref={searchInputRef}
								autoFocus={visible}
								showSoftInputOnFocus
								value={query}
								onChangeText={onQueryChange}
								editable={!disabled}
								placeholder="Search service names"
								style={{
									minHeight: 38,
									flex: 1,
									borderWidth: 0,
									backgroundColor: "transparent",
									paddingHorizontal: 8,
								}}
							/>
						</View>
					</KeyboardStickyView>
				</View>
			</SafeArea>
		</NativeModal>
	);
}

function ServiceUnitPriceField({
	value,
	disabled,
	onChange,
}: {
	value?: number | string | null;
	disabled?: boolean;
	onChange: (value: number) => void;
}) {
	const [draftValue, setDraftValue] = useState<string | null>(null);
	const inputValue =
		draftValue ?? (Number(value || 0) === 0 ? "" : String(value ?? 0));

	return (
		<View className="min-w-0 flex-1 gap-2">
			<Text className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
				Unit Price
			</Text>
			<View className="h-12 flex-row items-center rounded-2xl border border-input bg-background px-3">
				<Text className="mr-1 text-sm font-bold text-muted-foreground">$</Text>
				<StepTextInput
					value={inputValue}
					keyboardType="decimal-pad"
					onChangeText={(nextValue) => {
						setDraftValue(nextValue);
						onChange(parseCurrencyInput(nextValue));
					}}
					onBlur={() => setDraftValue(null)}
					editable={!disabled}
					placeholder="0"
					fontWeight="bold"
					style={{
						flex: 1,
						minHeight: 42,
						borderWidth: 0,
						backgroundColor: "transparent",
						paddingHorizontal: 0,
					}}
				/>
			</View>
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
		<View className="min-w-0 flex-1 gap-2">
			<Text className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
				Quantity
			</Text>
			<View className="h-12 flex-row items-center rounded-2xl border border-input bg-background px-1">
				<Pressable
					onPress={() => changeQty(qty - 1)}
					disabled={disabled || qty <= 0}
					className="h-10 w-10 items-center justify-center rounded-full bg-muted active:bg-primary/10 disabled:opacity-40"
				>
					<Icon name="Minus" className="text-muted-foreground" size={14} />
				</Pressable>
				<View className="mx-1 min-w-0 flex-1 items-center justify-center rounded-xl bg-muted/40">
					<StepTextInput
						value={String(value ?? 0)}
						keyboardType="number-pad"
						onChangeText={(nextValue) =>
							changeQty(parseCurrencyInput(nextValue))
						}
						editable={!disabled}
						textAlign="center"
						fontWeight="bold"
						style={{
							width: "100%",
							minHeight: 42,
							borderWidth: 0,
							backgroundColor: "transparent",
							paddingHorizontal: 0,
							fontSize: 18,
						}}
					/>
				</View>
				<Pressable
					onPress={() => changeQty(qty + 1)}
					disabled={disabled}
					className="h-10 w-10 items-center justify-center rounded-full bg-primary/10 active:bg-primary/20 disabled:opacity-40"
				>
					<Icon name="Plus" className="text-primary" size={14} />
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
			className={`h-11 flex-row items-center gap-1 rounded-full border px-3 disabled:opacity-40 ${
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
