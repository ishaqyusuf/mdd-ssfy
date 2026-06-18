"use client";

import { NumberInput } from "@/components/currency-input";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from "@gnd/ui/alert-dialog";
import { Button } from "@gnd/ui/button";
import { ComboboxDropdown } from "@gnd/ui/combobox-dropdown";
import { Icons } from "@gnd/ui/icons";
import { Label } from "@gnd/ui/label";

export type CustomComponentOption = {
	id: string;
	label: string;
	componentId?: number;
	uid?: string | null;
	title: string;
	price: number | null;
	pricingId?: number;
	dependenciesUid?: string;
};

type CustomComponentSource = {
	id?: number | string | null;
	uid?: string | null;
	title?: string | null;
	name?: string | null;
	basePrice?: number | string | null;
	salesPrice?: number | string | null;
	custom?: boolean | null;
	pricing?: Record<string, { id?: number; price?: number | null } | undefined>;
	_metaData?: {
		custom?: boolean | null;
		deletedAt?: string | null;
	} | null;
};

type CustomComponentPricing = {
	price: number | null;
	pricingId?: number;
	dependenciesUid?: string;
};

function firstFiniteNumber(...values: unknown[]) {
	for (const value of values) {
		if (value == null || value === "") continue;
		const numeric = Number(value);
		if (Number.isFinite(numeric)) return numeric;
	}
	return null;
}

export function normalizeCustomComponentTitleInput(value: string) {
	return value.toUpperCase();
}

export function isCustomMarkedComponent(component: CustomComponentSource) {
	return component?._metaData?.custom === true || component?.custom === true;
}

function buildCustomComponentOptionId(
	component: CustomComponentSource,
	title: string,
	pricing: CustomComponentPricing,
) {
	return [
		component?.id == null ? "id:none" : `id:${component.id}`,
		component?.uid ? `uid:${component.uid}` : "uid:none",
		pricing.pricingId == null ? "pricing:none" : `pricing:${pricing.pricingId}`,
		pricing.dependenciesUid ? `dep:${pricing.dependenciesUid}` : "dep:none",
		title ? `title:${title}` : "title:none",
	].join("|");
}

export function getCustomComponentPricing(component: CustomComponentSource) {
	const pricing = component?.pricing;
	const entries =
		pricing && typeof pricing === "object" && !Array.isArray(pricing)
			? Object.entries(pricing)
			: [];
	const componentUid = String(component?.uid || "");
	const direct = componentUid ? pricing?.[componentUid] : null;
	const fallbackEntry = entries[0];
	const selectedKey = direct ? componentUid : fallbackEntry?.[0];
	const selectedPricing = direct || fallbackEntry?.[1] || null;
	const price = firstFiniteNumber(
		selectedPricing?.price,
		component?.basePrice,
		component?.salesPrice,
	);

	return {
		price,
		pricingId: selectedPricing?.id,
		dependenciesUid:
			selectedKey && selectedKey !== componentUid
				? String(selectedKey)
				: undefined,
	};
}

export function buildCustomComponentOptions(
	components?: CustomComponentSource[] | null,
): CustomComponentOption[] {
	return (components || [])
		.filter(
			(component) =>
				isCustomMarkedComponent(component) && !component?._metaData?.deletedAt,
		)
		.map((component) => {
			const pricing = getCustomComponentPricing(component);
			const title = normalizeCustomComponentTitleInput(
				String(component?.title || component?.name || "").trim(),
			);
			return {
				id: buildCustomComponentOptionId(component, title, pricing),
				label:
					title ||
					normalizeCustomComponentTitleInput(
						String(component?.uid || "Custom component"),
					),
				componentId:
					typeof component?.id === "number" ? component.id : undefined,
				uid: component?.uid || null,
				title,
				price: pricing.price,
				pricingId: pricing.pricingId,
				dependenciesUid: pricing.dependenciesUid,
			};
		})
		.filter((option) => option.title || option.uid)
		.sort((a, b) =>
			a.label.localeCompare(b.label, undefined, { sensitivity: "base" }),
		);
}

export function customComponentPriceChanged(
	option: CustomComponentOption | null | undefined,
	price: number | null | undefined,
) {
	if (!option) return false;
	if (price == null && option.price == null) return false;
	if (price == null || option.price == null) return true;
	return Number(price) !== Number(option.price);
}

export function findCustomComponentOption(
	options: CustomComponentOption[],
	title: string,
) {
	const normalized = normalizeCustomComponentTitleInput(title).trim();
	if (!normalized) return null;
	return (
		options.find(
			(option) =>
				normalizeCustomComponentTitleInput(option.title).trim() === normalized,
		) || null
	);
}

export function CustomComponentCombobox({
	title,
	price,
	options,
	selectedOption,
	disabled,
	onTitleChange,
	onPriceChange,
	onSelect,
	onDeleteOption,
}: {
	title: string;
	price: number | null;
	options: CustomComponentOption[];
	selectedOption?: CustomComponentOption | null;
	disabled?: boolean;
	onTitleChange: (value: string) => void;
	onPriceChange: (value: number | null) => void;
	onSelect?: (option: CustomComponentOption | null) => void;
	onDeleteOption?: (option: CustomComponentOption) => void;
}) {
	const normalizedTitle = normalizeCustomComponentTitleInput(title);
	const exactOption = findCustomComponentOption(options, title);
	const selectedItem =
		selectedOption ||
		exactOption ||
		(normalizedTitle.trim()
			? {
					id: `draft:${normalizedTitle.trim().toLowerCase()}`,
					label: normalizedTitle.trim(),
					title: normalizedTitle.trim(),
					price,
				}
			: undefined);

	return (
		<div className="grid gap-3">
			<div className="grid gap-2">
				<Label>Component</Label>
				<ComboboxDropdown
					items={options}
					selectedItem={selectedItem}
					placeholder="Search or create custom component"
					searchPlaceholder="Type custom component title..."
					disabled={disabled}
					showCreateWhenMatches={false}
					normalizeInput={normalizeCustomComponentTitleInput}
					onSearch={onTitleChange}
					onCreate={(value) => {
						onTitleChange(normalizeCustomComponentTitleInput(value));
						onSelect?.(null);
					}}
					renderOnCreate={(value) => (
						<span className="text-sm">
							Create "{normalizeCustomComponentTitleInput(value)}"
						</span>
					)}
					renderListItem={({ item }) => (
						<div className="group flex w-full items-center justify-between gap-3">
							<span className="truncate text-sm">{item.label}</span>
							<div className="flex shrink-0 items-center gap-1">
								{item.price != null ? (
									<span className="text-xs text-muted-foreground">
										${Number(item.price).toFixed(2)}
									</span>
								) : null}
								{onDeleteOption ? (
									<AlertDialog>
										<AlertDialogTrigger asChild>
											<Button
												type="button"
												size="icon"
												variant="ghost"
												className="size-7 opacity-0 transition-opacity group-hover:opacity-100 focus:opacity-100"
												aria-label={`Delete ${item.label}`}
												onMouseDown={(event) => {
													event.preventDefault();
													event.stopPropagation();
												}}
												onClick={(event) => {
													event.preventDefault();
													event.stopPropagation();
												}}
											>
												<Icons.Trash className="size-4" />
											</Button>
										</AlertDialogTrigger>
										<AlertDialogContent size="sm">
											<AlertDialogHeader>
												<AlertDialogTitle>Delete custom component?</AlertDialogTitle>
												<AlertDialogDescription>
													This hides "{item.label}" from future custom
													component selection while preserving older sales that
													already use it.
												</AlertDialogDescription>
											</AlertDialogHeader>
											<AlertDialogFooter>
												<AlertDialogCancel
													onClick={(event) => event.stopPropagation()}
												>
													Cancel
												</AlertDialogCancel>
												<AlertDialogAction
													variant="destructive"
													onClick={(event) => {
														event.stopPropagation();
														onDeleteOption(item);
													}}
												>
													Delete
												</AlertDialogAction>
											</AlertDialogFooter>
										</AlertDialogContent>
									</AlertDialog>
								) : null}
							</div>
						</div>
					)}
					emptyResults="No custom component found"
					onSelect={(option) => {
						onTitleChange(
							normalizeCustomComponentTitleInput(option.title || option.label),
						);
						onPriceChange(option.price ?? null);
						onSelect?.(option);
					}}
				/>
			</div>
			<div className="grid justify-items-end gap-2">
				<Label className="text-right">Cost Price</Label>
				<NumberInput
					prefix="$"
					value={price ?? undefined}
					placeholder="$0.00"
					className="h-10 w-40 rounded-md text-right"
					disabled={disabled}
					onValueChange={(values) => {
						onPriceChange(values.floatValue ?? null);
					}}
				/>
			</div>
		</div>
	);
}
