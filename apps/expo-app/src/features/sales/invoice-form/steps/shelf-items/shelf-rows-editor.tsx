import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import {
	type ShelfProductOption,
	type ShelfRowDraft,
	type ShelfSectionDraft,
	patchShelfRowPrice,
	patchShelfRowQty,
} from "@gnd/sales/sales-form-core";
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

export function ShelfRowsEditor({
	sections,
	products,
	productSearch,
	isLoadingProducts,
	disabled,
	onProductSearchChange,
	onSelectProduct,
	onChange,
	onAddSection,
	onAddRow,
	onRemoveRow,
	onRemoveSection,
}: {
	sections: ShelfSectionDraft[];
	products: ShelfProductOption[];
	productSearch: string;
	isLoadingProducts?: boolean;
	disabled?: boolean;
	onProductSearchChange: (query: string) => void;
	onSelectProduct: (
		sectionIndex: number,
		rowIndex: number,
		product: ShelfProductOption | null,
	) => void;
	onChange: (
		sectionIndex: number,
		rowIndex: number,
		patch: Partial<ShelfRowDraft>,
	) => void;
	onAddSection: () => void;
	onAddRow: (sectionIndex: number) => void;
	onRemoveRow: (sectionIndex: number, rowIndex: number) => void;
	onRemoveSection: (sectionIndex: number) => void;
}) {
	return (
		<View className="border-t border-border pt-3">
			<StepSectionHeader
				title="Shelf items"
				actionLabel="Section"
				disabled={disabled}
				onAction={onAddSection}
			/>
			<View className="mt-2 gap-3">
				{sections.map((section, sectionIndex) => (
					<RowShell key={`${section.uid || sectionIndex}`}>
						<View className="flex-row items-center gap-2">
							<View className="min-w-0 flex-1">
								<Text className="text-[11px] font-bold text-foreground">
									Section {sectionIndex + 1}
								</Text>
								<Text className="text-[10px] text-muted-foreground">
									{section.rows.length} row
									{section.rows.length === 1 ? "" : "s"}
									{" - "}
									{formatMoney(section.subTotal || 0)}
								</Text>
							</View>
							<Pressable
								onPress={() => onAddRow(sectionIndex)}
								disabled={disabled}
								className="h-8 flex-row items-center gap-1 rounded-full border border-primary bg-primary/5 px-3 disabled:opacity-40"
							>
								<Icon name="Plus" className="text-primary" size={12} />
								<Text className="text-[10px] font-bold text-primary">Row</Text>
							</Pressable>
							<IconButton
								icon="Trash"
								tone="danger"
								disabled={disabled}
								onPress={() => onRemoveSection(sectionIndex)}
							/>
						</View>

						{section.rows.map((row, rowIndex) => (
							<View
								key={`${section.uid}:${row.uid || rowIndex}`}
								className="gap-2 border-t border-border pt-3"
							>
								<View className="gap-2 rounded-xl border border-border bg-card p-2">
									<View className="h-10 flex-row items-center rounded-lg border border-border bg-background px-2">
										<Icon
											name="Search"
											className="text-muted-foreground"
											size={14}
										/>
										<StepTextInput
											value={productSearch}
											onChangeText={onProductSearchChange}
											editable={!disabled}
											placeholder="Search shelf products"
											style={{
												minHeight: 32,
												flex: 1,
												borderWidth: 0,
												backgroundColor: "transparent",
												paddingHorizontal: 8,
											}}
										/>
									</View>
									<ScrollView
										horizontal
										showsHorizontalScrollIndicator={false}
										contentContainerStyle={{ gap: 6 }}
									>
										<SelectChip
											title="Custom"
											subtitle="Manual row"
											selected={!row.productId}
											disabled={disabled}
											onPress={() =>
												onSelectProduct(sectionIndex, rowIndex, null)
											}
										/>
										{products.map((product) => (
											<SelectChip
												key={`shelf-product-${section.uid}-${row.uid || rowIndex}-${product.id}`}
												title={String(product.title || "Shelf product")}
												subtitle={formatMoney(
													Number(product.salesPrice ?? product.unitPrice ?? 0),
												)}
												selected={
													Number(row.productId || 0) === Number(product.id || 0)
												}
												disabled={disabled}
												onPress={() =>
													onSelectProduct(sectionIndex, rowIndex, product)
												}
											/>
										))}
										{isLoadingProducts ? (
											<Text className="self-center text-xs text-muted-foreground">
												Loading products...
											</Text>
										) : null}
									</ScrollView>
								</View>

								<StepTextInput
									value={String(row.description || "")}
									onChangeText={(description) =>
										onChange(sectionIndex, rowIndex, { description })
									}
									editable={!disabled}
									placeholder="Shelf item"
									fontWeight="bold"
								/>
								<View className="flex-row gap-2">
									<NumberField
										label="Qty"
										value={row.qty}
										disabled={disabled}
										onChange={(qty) =>
											onChange(
												sectionIndex,
												rowIndex,
												patchShelfRowQty(row, qty),
											)
										}
									/>
									<NumberField
										label="Unit"
										value={row.unitPrice}
										disabled={disabled}
										onChange={(unitPrice) =>
											onChange(
												sectionIndex,
												rowIndex,
												patchShelfRowPrice(row, unitPrice),
											)
										}
									/>
									<View className="w-24 justify-end">
										<Text className="text-right text-xs font-bold text-foreground">
											{formatMoney(row.totalPrice || 0)}
										</Text>
									</View>
									<View className="justify-end">
										<IconButton
											icon="Trash"
											tone="danger"
											disabled={disabled}
											onPress={() => onRemoveRow(sectionIndex, rowIndex)}
										/>
									</View>
								</View>
							</View>
						))}
					</RowShell>
				))}
			</View>
		</View>
	);
}
