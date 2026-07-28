import { useStepContext } from "@/app-deps/(clean-code)/(sales)/sales-book/(form)/_components/components-section/ctx";
import { ComponentHelperClass } from "@/app-deps/(clean-code)/(sales)/sales-book/(form)/_utils/helpers/zus/step-component-class";
import Button from "@/components/common/button";
import {
	CustomComponentCombobox,
	buildCustomComponentOptions,
	customComponentPriceChanged,
	findCustomComponentOption,
	normalizeCustomComponentTitleInput,
} from "@/components/forms/sales-form/custom-component-combobox";
import type { CustomComponentOption } from "@/components/forms/sales-form/custom-component-combobox";
import { useTRPC } from "@/trpc/client";
import { CUSTOM_IMG_ID } from "@/utils/constants";
import { useMutation } from "@tanstack/react-query";
import { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";

function firstFiniteCustomNumber(...values: unknown[]) {
	for (const value of values) {
		if (value == null || value === "") continue;
		const numeric = Number(value);
		if (Number.isFinite(numeric)) return numeric;
	}
	return null;
}

function withCustomSelectionPrice(
	component: any,
	price: number | null,
	salesPrice?: number | null,
) {
	const resolvedBasePrice = firstFiniteCustomNumber(
		price,
		component?.basePrice,
		component?.salesPrice,
	);
	const resolvedSalesPrice = firstFiniteCustomNumber(
		salesPrice,
		component?.salesPrice,
		resolvedBasePrice,
	);
	return {
		...component,
		salesPrice: resolvedSalesPrice,
		basePrice: resolvedBasePrice ?? component?.basePrice ?? null,
		custom: true,
		_metaData: {
			...(component?._metaData || {}),
			custom: true,
		},
	};
}

export function CustomComponentForm({
	itemStepUid,
	onComplete,
	onCancel,
}: {
	itemStepUid: string;
	onComplete?: () => void;
	onCancel?: () => void;
}) {
	const trpc = useTRPC();
	const ctx = useStepContext(itemStepUid);
	const stepForm = ctx.cls.getStepForm();
	const customOptions = useMemo(
		() => buildCustomComponentOptions(ctx.stepComponents),
		[ctx.stepComponents],
	);
	const currentCustomOption = useMemo(() => {
		const selectedUid = String(stepForm?.componentUid || "");
		const option =
			customOptions.find(
				(customOption) => String(customOption.uid || "") === selectedUid,
			) || findCustomComponentOption(customOptions, stepForm?.value || "");
		const isSelectedCustom = Boolean(
			selectedUid && (stepForm?.flatRate === true || option),
		);
		if (!isSelectedCustom) return null;

		if (option) {
			return {
				...option,
				price: firstFiniteCustomNumber(
					stepForm?.basePrice,
					option.price,
					stepForm?.salesPrice,
				),
			};
		}

		const title = normalizeCustomComponentTitleInput(
			String(stepForm?.value || "").trim(),
		);
		return {
			id: `selected:${selectedUid}:${stepForm?.componentId || "none"}`,
			label: title || "CUSTOM",
			componentId:
				typeof stepForm?.componentId === "number"
					? stepForm.componentId
					: undefined,
			uid: selectedUid,
			title: title || "CUSTOM",
			price: firstFiniteCustomNumber(stepForm?.basePrice, stepForm?.salesPrice),
		} satisfies CustomComponentOption;
	}, [
		customOptions,
		stepForm?.basePrice,
		stepForm?.componentId,
		stepForm?.componentUid,
		stepForm?.flatRate,
		stepForm?.salesPrice,
		stepForm?.value,
	]);

	const form = useForm({
		defaultValues: {
			title: "",
			basePrice: null as number | null,
			selectedOption: null as CustomComponentOption | null,
		},
	});
	useEffect(() => {
		if (!currentCustomOption) return;
		form.reset({
			title: currentCustomOption.title,
			basePrice: currentCustomOption.price,
			selectedOption: currentCustomOption,
		});
	}, [currentCustomOption, form]);
	const formData = form.watch();
	const selectedOption =
		formData.selectedOption ||
		findCustomComponentOption(customOptions, formData.title || "");
	const hasSelectedOption = Boolean(
		selectedOption?.uid || selectedOption?.componentId,
	);
	const selectedComponent = selectedOption
		? ctx.stepComponents.find(
				(component) =>
					String(component?.uid || "") === String(selectedOption.uid || "") ||
					Number(component?.id || 0) === Number(selectedOption.componentId || 0),
			)
		: null;
	const priceChanged = customComponentPriceChanged(
		selectedOption,
		formData.basePrice,
	);
	const saveComponentMutation = useMutation(
		trpc.inventories.upsertDykeCustomStepComponent.mutationOptions({
			onError() {},
		}),
	);
	const archiveComponentMutation = useMutation(
		trpc.inventories.archiveDykeCustomStepComponent.mutationOptions({
			async onSuccess(_data, variables) {
				await ctx.cls.refreshStepComponentsData(true);
				if (
					(variables.uid &&
						String(selectedOption?.uid || "") === String(variables.uid)) ||
					(variables.id &&
						Number(selectedOption?.componentId || 0) === Number(variables.id))
				) {
					form.setValue("selectedOption", null);
					form.setValue("title", "");
					form.setValue("basePrice", null);
				}
			},
		}),
	);
	async function refreshAndSelectComponent(
		uid: string,
		component?: any,
		price = formData.basePrice,
	) {
		if (!uid) return;
		const salesPrice =
			price == null ? undefined : ctx.cls.calculateSales(Number(price));
		const componentForSelection = component
			? withCustomSelectionPrice(component, price, salesPrice)
			: null;
		if (componentForSelection) ctx.cls.addStepComponent(componentForSelection);
		else await ctx.cls.refreshStepComponentsData(true);

		const cls = new ComponentHelperClass(
			itemStepUid,
			uid,
			componentForSelection || component,
		);
		cls.selectComponent();

		void ctx.cls.refreshStepComponentsData(true).then(() => {
			if (componentForSelection) ctx.cls.addStepComponent(componentForSelection);
		});
	}
	async function save() {
		const title = normalizeCustomComponentTitleInput(
			String(formData.title || "").trim(),
		);
		if (!title || !stepForm?.stepId) return;

		if (hasSelectedOption && !priceChanged) {
			const costPrice = selectedOption?.price ?? formData.basePrice;
			const component = withCustomSelectionPrice(
				selectedComponent || {
					id: selectedOption?.componentId ?? null,
					uid: selectedOption?.uid || "",
					title: selectedOption?.title || title,
					img: CUSTOM_IMG_ID,
				},
				costPrice,
				costPrice == null
					? undefined
					: ctx.cls.calculateSales(Number(costPrice)),
			);
			ctx.cls.addStepComponent(component);
			void refreshAndSelectComponent(String(component.uid || ""), component);
			onComplete?.();
			return;
		}

		const input = {
			id: selectedOption?.componentId,
			uid: selectedOption?.uid || undefined,
			img: CUSTOM_IMG_ID,
			meta: { custom: true },
			title,
			price: formData.basePrice,
			pricingId: selectedOption?.pricingId,
			dependenciesUid: selectedOption?.dependenciesUid,
			stepId: stepForm.stepId,
		};
		const data = await saveComponentMutation.mutateAsync(input).catch(() => null);
		if (!data) return;
		const component = withCustomSelectionPrice(
			data.component,
			input.price,
			input.price == null
				? undefined
				: ctx.cls.calculateSales(Number(input.price)),
		);
		await refreshAndSelectComponent(
			String(component.uid || ""),
			component,
			input.price,
		);
		onComplete?.();
	}
	if (!stepForm?.meta?.custom) return null;
	return (
		<div className="grid gap-4">
			<CustomComponentCombobox
				title={formData.title}
				price={formData.basePrice}
				options={customOptions}
				selectedOption={selectedOption}
				disabled={
					saveComponentMutation.isPending || archiveComponentMutation.isPending
				}
				onTitleChange={(title) => {
					form.setValue("title", title);
					if (
						formData.selectedOption &&
						formData.selectedOption.title.trim().toLowerCase() !==
							title.trim().toLowerCase()
					) {
						form.setValue("selectedOption", null);
					}
				}}
				onPriceChange={(price) => form.setValue("basePrice", price)}
				onSelect={(option) => form.setValue("selectedOption", option)}
				onDeleteOption={(option) => {
					archiveComponentMutation.mutate({
						id: option.componentId,
						uid: option.uid || undefined,
					});
				}}
			/>
			<div className="flex flex-wrap justify-end gap-2">
				<Button size="sm" variant="outline" onClick={onCancel}>
					Cancel
				</Button>
				<Button
					disabled={
						saveComponentMutation.isPending ||
						archiveComponentMutation.isPending ||
						!String(formData.title || "").trim()
					}
					onClick={() => void save()}
					size="sm"
				>
					Proceed
				</Button>
			</div>
		</div>
	);
}
