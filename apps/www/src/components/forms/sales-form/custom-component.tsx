import { useStepContext } from "@/app-deps/(clean-code)/(sales)/sales-book/(form)/_components/components-section/ctx";
import { ComponentHelperClass } from "@/app-deps/(clean-code)/(sales)/sales-book/(form)/_utils/helpers/zus/step-component-class";
import Button from "@/components/common/button";
import {
	CustomComponentCombobox,
	buildCustomComponentOptions,
	customComponentPriceChanged,
	findCustomComponentOption,
} from "@/components/forms/sales-form/custom-component-combobox";
import type { CustomComponentOption } from "@/components/forms/sales-form/custom-component-combobox";
import { useTRPC } from "@/trpc/client";
import { CUSTOM_IMG_ID } from "@/utils/constants";
import { useMutation } from "@tanstack/react-query";
import { useMemo } from "react";
import { useForm } from "react-hook-form";

export function CustomComponentForm({
	itemStepUid,
	onComplete,
}: {
	itemStepUid: string;
	onComplete?: () => void;
}) {
	const trpc = useTRPC();
	const ctx = useStepContext(itemStepUid);
	const customOptions = useMemo(
		() => buildCustomComponentOptions(ctx.stepComponents),
		[ctx.stepComponents],
	);

	const form = useForm({
		defaultValues: {
			title: "",
			basePrice: null as number | null,
			selectedOption: null as CustomComponentOption | null,
		},
	});
	const formData = form.watch();
	const selectedOption =
		formData.selectedOption ||
		findCustomComponentOption(customOptions, formData.title || "");
	const hasSelectedOption = Boolean(
		selectedOption?.uid || selectedOption?.componentId,
	);
	const priceChanged = customComponentPriceChanged(
		selectedOption,
		formData.basePrice,
	);
	const saveComponentMutation = useMutation(
		trpc.inventories.upsertDykeCustomStepComponent.mutationOptions({
			onError() {},
			async onSuccess(data) {
				ctx.cls.addStepComponent(data.component);
				await refreshAndSelectComponent(String(data.component.uid || ""));
				onComplete?.();
			},
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
	async function refreshAndSelectComponent(uid: string) {
		if (!uid) return;
		await ctx.cls.refreshStepComponentsData(true);
		const cls = new ComponentHelperClass(itemStepUid, uid);
		if (formData.basePrice != null) await cls.fetchUpdatedPrice();
		setTimeout(() => cls.selectComponent(), 250);
	}
	function save(options?: { updatePrice?: boolean }) {
		const title = String(formData.title || "").trim();
		if (!title || !stepForm?.stepId) return;

		if (hasSelectedOption && !options?.updatePrice) {
			void refreshAndSelectComponent(String(selectedOption?.uid || ""));
			onComplete?.();
			return;
		}

		saveComponentMutation.mutate({
			id: selectedOption?.componentId,
			uid: selectedOption?.uid || undefined,
			img: CUSTOM_IMG_ID,
			meta: {},
			title,
			price: formData.basePrice,
			pricingId: selectedOption?.pricingId,
			dependenciesUid: selectedOption?.dependenciesUid,
			stepId: stepForm.stepId,
		});
	}
	const stepForm = ctx.cls.getStepForm();
	if (!stepForm?.meta?.custom) return null;
	return (
		<div className="grid gap-4">
			<CustomComponentCombobox
				title={formData.title}
				price={formData.basePrice}
				options={customOptions}
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
			<div className="flex justify-end gap-2">
				{hasSelectedOption && priceChanged ? (
					<Button
						disabled={
							saveComponentMutation.isPending ||
							archiveComponentMutation.isPending
						}
						onClick={() => save({ updatePrice: true })}
						size="xs"
						variant="outline"
					>
						Update price
					</Button>
				) : null}
				<Button
					disabled={
						saveComponentMutation.isPending ||
						archiveComponentMutation.isPending ||
						!String(formData.title || "").trim()
					}
					onClick={() => save()}
					size="xs"
				>
					Proceed
				</Button>
			</div>
		</div>
	);
}
