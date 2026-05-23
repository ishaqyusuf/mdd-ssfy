"use client";

import { FileUploader } from "@/components/common/file-uploader";
import {
	buildWorkflowComponentEditState,
	ComponentEditDialog,
	DoorSizeVariantDialog,
	getRedirectableRoutes,
	getWorkflowSteps,
	removeWorkflowSelectedComponent,
	saveWorkflowComponentEdit,
	SalesFormWorkflowPanel,
	setWorkflowComponentRedirect,
	type ComponentEditDialogRouteOption,
	type WorkflowComponentEditState,
	type WorkflowComponentRecord,
} from "@gnd/sales/sales-form";
import { useMemo, useState } from "react";
import { useSalesUpdateStepMetaMutation } from "../api";
import { useWwwSalesFormWorkflowData } from "../adapters/use-sales-form-workflow-data";
import type { NewSalesFormLineItem } from "../schema";
import { useNewSalesFormStore } from "../store";

const initialComponentEditState: WorkflowComponentEditState = {
	open: false,
	mode: "edit",
	lineUid: null,
	stepIndex: -1,
	componentUid: "",
	componentTitle: "",
	componentImg: "",
	salesPrice: "0",
	redirectUid: "",
	overrideMode: false,
	noHandle: false,
	hasSwing: true,
};

export function WwwSalesFormWorkflowPanel() {
	const record = useNewSalesFormStore((state) => state.record);
	const editor = useNewSalesFormStore((state) => state.editor);
	const addLineItem = useNewSalesFormStore((state) => state.addLineItem);
	const updateLineItem = useNewSalesFormStore((state) => state.updateLineItem);
	const removeLineItem = useNewSalesFormStore((state) => state.removeLineItem);
	const setEditor = useNewSalesFormStore((state) => state.setEditor);
	const dataSource = useWwwSalesFormWorkflowData();
	const updateStepMetaMutation = useSalesUpdateStepMetaMutation();
	const [componentEditModal, setComponentEditModal] =
		useState<WorkflowComponentEditState>(initialComponentEditState);
	const [componentEditRedirectOptions, setComponentEditRedirectOptions] =
		useState<ComponentEditDialogRouteOption[]>([]);
	const [doorSizeVariantModal, setDoorSizeVariantModal] = useState<{
		open: boolean;
		lineUid: string | null;
		stepIndex: number;
		routeData: Record<string, any> | null;
	}>({
		open: false,
		lineUid: null,
		stepIndex: -1,
		routeData: null,
	});

	const workflowEditor = useMemo(
		() => ({
			activeItem: editor.activeItem,
		}),
		[editor.activeItem],
	);

	if (!record) return null;

	function getRouteOptions(routeData: Record<string, any> | null) {
		return getRedirectableRoutes(routeData).map((route) => ({
			uid: route.uid,
			title: route.title,
		}));
	}

	function openComponentEdit(input: {
		routeData: Record<string, any> | null;
		line: NewSalesFormLineItem;
		stepIndex: number;
		component: WorkflowComponentRecord;
		mode?: "edit" | "sectionOverride";
	}) {
		const next = buildWorkflowComponentEditState({
			line: input.line,
			stepIndex: input.stepIndex,
			component: input.component,
			mode: input.mode,
		});
		if (!next) return;
		setComponentEditRedirectOptions(getRouteOptions(input.routeData));
		setComponentEditModal(next);
	}

	function updateComponentRedirect(input: {
		routeData: Record<string, any> | null;
		line: NewSalesFormLineItem;
		stepIndex: number;
		component: WorkflowComponentRecord;
		redirectUid: string | null;
	}) {
		const result = setWorkflowComponentRedirect({
			routeData: input.routeData,
			line: input.line,
			stepIndex: input.stepIndex,
			componentUid: String(input.component.uid || ""),
			redirectUid: input.redirectUid,
		});
		if (!result) return;
		updateLineItem(
			input.line.uid,
			result.linePatch as Partial<NewSalesFormLineItem>,
		);
	}

	function removeComponent(input: {
		line: NewSalesFormLineItem;
		stepIndex: number;
		component: WorkflowComponentRecord;
	}) {
		const result = removeWorkflowSelectedComponent({
			line: input.line,
			stepIndex: input.stepIndex,
			componentUid: String(input.component.uid || ""),
		});
		if (!result) return;
		updateLineItem(
			input.line.uid,
			result.linePatch as Partial<NewSalesFormLineItem>,
		);
	}

	function saveComponentEdit() {
		if (!componentEditModal.lineUid || componentEditModal.stepIndex < 0) {
			setComponentEditModal(initialComponentEditState);
			return;
		}
		const line = record?.lineItems.find(
			(item) => item.uid === componentEditModal.lineUid,
		);
		if (!line) {
			setComponentEditModal(initialComponentEditState);
			return;
		}
		const patch = saveWorkflowComponentEdit({
			line,
			state: componentEditModal,
		});
		if (patch) {
			updateLineItem(line.uid, patch as Partial<NewSalesFormLineItem>);
		}
		setComponentEditModal(initialComponentEditState);
	}

	async function saveDoorSizeVariants(variations: unknown[]) {
		if (!doorSizeVariantModal.lineUid || doorSizeVariantModal.stepIndex < 0) {
			setDoorSizeVariantModal((prev) => ({ ...prev, open: false }));
			return;
		}
		const line = record?.lineItems.find(
			(item) => item.uid === doorSizeVariantModal.lineUid,
		);
		if (!line) {
			setDoorSizeVariantModal((prev) => ({ ...prev, open: false }));
			return;
		}
		const steps = [...getWorkflowSteps(line)];
		const step = steps[doorSizeVariantModal.stepIndex];
		if (!step) {
			setDoorSizeVariantModal((prev) => ({ ...prev, open: false }));
			return;
		}
		const nextMeta = {
			...(step.meta || {}),
			doorSizeVariation: variations,
		};
		if (step.stepId) {
			await updateStepMetaMutation.mutateAsync({
				stepId: Number(step.stepId),
				meta: nextMeta,
			});
		}
		steps[doorSizeVariantModal.stepIndex] = {
			...step,
			meta: nextMeta,
		};
		updateLineItem(line.uid, {
			formSteps: steps,
		});
		setDoorSizeVariantModal({
			open: false,
			lineUid: null,
			stepIndex: -1,
			routeData: null,
		});
	}

	const doorSizeVariantLine = doorSizeVariantModal.lineUid
		? record.lineItems.find(
				(line) => line.uid === doorSizeVariantModal.lineUid,
			) || null
		: null;
	const doorSizeVariantSteps = doorSizeVariantLine
		? getWorkflowSteps(doorSizeVariantLine)
		: [];
	const doorSizeVariantStep =
		doorSizeVariantModal.stepIndex >= 0
			? doorSizeVariantSteps[doorSizeVariantModal.stepIndex]
			: null;
	const doorSizeVariantInitial =
		doorSizeVariantStep?.meta?.doorSizeVariation ||
		doorSizeVariantModal.routeData?.stepsByUid?.[
			doorSizeVariantStep?.step?.uid || ""
		]?.meta?.doorSizeVariation ||
		[];

	return (
		<>
			<SalesFormWorkflowPanel
				record={record as any}
				editor={workflowEditor}
				dataSource={dataSource}
				pricing={{
					lineTotalMode: "editable",
				}}
				actions={{
					addLineItem: () => addLineItem(),
					updateLineItem: (uid, patch) =>
						updateLineItem(uid, patch as Partial<NewSalesFormLineItem>),
					removeLineItem,
					setActiveItem: (uid) => setEditor({ activeItem: uid }),
					setActiveStep: () => undefined,
				}}
				slots={{
					getComponentRedirectOptions: ({ routeData }) =>
						getRouteOptions(routeData),
					componentActions: {
						onOpenPricing: (input) =>
							openComponentEdit({
								...input,
								line: input.line as NewSalesFormLineItem,
							}),
						onEdit: (input) =>
							openComponentEdit({
								...input,
								line: input.line as NewSalesFormLineItem,
							}),
						onEditSectionOverride: (input) =>
							openComponentEdit({
								...input,
								line: input.line as NewSalesFormLineItem,
								mode: "sectionOverride",
							}),
						onOpenDoorSizeVariant: (input) =>
							setDoorSizeVariantModal({
								open: true,
								lineUid: String(input.line.uid || ""),
								stepIndex: input.stepIndex,
								routeData: input.routeData,
							}),
						onClearRedirect: (input) =>
							updateComponentRedirect({
								...input,
								line: input.line as NewSalesFormLineItem,
								redirectUid: null,
							}),
						onSetRedirect: (input) =>
							updateComponentRedirect({
								...input,
								line: input.line as NewSalesFormLineItem,
								redirectUid: input.redirectUid,
							}),
						onDelete: (input) =>
							removeComponent({
								line: input.line as NewSalesFormLineItem,
								stepIndex: input.stepIndex,
								component: input.component,
							}),
					},
				}}
			/>
			{doorSizeVariantLine ? (
				<DoorSizeVariantDialog
					open={doorSizeVariantModal.open}
					onOpenChange={(open) =>
						setDoorSizeVariantModal((prev) => ({
							...prev,
							open,
							lineUid: open ? prev.lineUid : null,
							stepIndex: open ? prev.stepIndex : -1,
							routeData: open ? prev.routeData : null,
						}))
					}
					routeData={doorSizeVariantModal.routeData}
					steps={doorSizeVariantSteps}
					initialVariations={doorSizeVariantInitial}
					onSave={(variations) => {
						void saveDoorSizeVariants(variations);
					}}
				/>
			) : null}
			<ComponentEditDialog
				open={componentEditModal.open}
				onOpenChange={(open) =>
					setComponentEditModal((prev) =>
						open
							? { ...prev, open }
							: {
									...initialComponentEditState,
									mode: prev.mode,
								},
					)
				}
				mode={componentEditModal.mode}
				componentTitle={componentEditModal.componentTitle}
				salesPrice={componentEditModal.salesPrice}
				redirectUid={componentEditModal.redirectUid}
				overrideMode={componentEditModal.overrideMode}
				noHandle={componentEditModal.noHandle}
				hasSwing={componentEditModal.hasSwing}
				redirectOptions={componentEditRedirectOptions}
				imageUploadSlot={
					<FileUploader
						src={componentEditModal.componentImg || null}
						label="Component Image"
						folder="dyke"
						width={120}
						height={120}
						onUpload={(assetId) =>
							setComponentEditModal((prev) => ({
								...prev,
								componentImg: String(assetId || ""),
							}))
						}
					/>
				}
				onPatch={(patch) =>
					setComponentEditModal((prev) => ({
						...prev,
						...patch,
					}))
				}
				onSave={saveComponentEdit}
			/>
		</>
	);
}
