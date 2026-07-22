"use client";

import { MouldingCalculator } from "@/components/moulding-calculator";
import { useAuth } from "@/hooks/use-auth";
import {
	DoorSizeVariantDialog,
	DoorSupplierManager,
	SalesFormEnginePanel,
	getRedirectableRoutes,
	getWorkflowSteps,
	resolveConfiguredRouteStepsForLine,
} from "@gnd/sales/sales-form";
import { useMemo, useState } from "react";
import { useWwwSalesFormWorkflowData } from "../adapters/use-sales-form-workflow-data";
import {
	useSalesDeleteSupplierMutation,
	useSalesSaveSupplierMutation,
	useSalesSuppliersQuery,
	useSalesUpdateStepMetaMutation,
} from "../api";
import type { NewSalesFormLineItem } from "../schema";
import { useNewSalesFormStore } from "../store";
import { useWorkflowComponentAdmin } from "./use-workflow-component-admin";
import { createWwwWorkflowAdminCapabilities } from "./workflow-capabilities";

export function WwwSalesFormWorkflowPanel() {
	const auth = useAuth();
	const record = useNewSalesFormStore((state) => state.record);
	const editor = useNewSalesFormStore((state) => state.editor);
	const addLineItem = useNewSalesFormStore((state) => state.addLineItem);
	const updateLineItem = useNewSalesFormStore((state) => state.updateLineItem);
	const removeLineItem = useNewSalesFormStore((state) => state.removeLineItem);
	const setEditor = useNewSalesFormStore((state) => state.setEditor);
	const dataSource = useWwwSalesFormWorkflowData();
	const suppliersQuery = useSalesSuppliersQuery(true);
	const saveSupplierMutation = useSalesSaveSupplierMutation();
	const deleteSupplierMutation = useSalesDeleteSupplierMutation();
	const updateStepMetaMutation = useSalesUpdateStepMetaMutation();
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
	const [supplierNameInput, setSupplierNameInput] = useState("");
	const [editingSupplier, setEditingSupplier] = useState<{
		id: number;
		name?: string | null;
	} | null>(null);
	const workflowAdminCapabilities = useMemo(
		() => createWwwWorkflowAdminCapabilities(auth.roleTitle),
		[auth.roleTitle],
	);
	const componentAdmin = useWorkflowComponentAdmin({
		record: { lineItems: record?.lineItems || [] },
		updateLineItem: (uid, patch) => updateLineItem(uid, patch),
	});

	const workflowEditor = useMemo(
		() => ({
			activeItem: editor.activeItem,
			activeStepByLine: editor.activeStepByLine,
		}),
		[editor.activeItem, editor.activeStepByLine],
	);
	const workflowDataSource = useMemo(
		() => ({
			...dataSource,
			renderMouldingCalculator: ({
				title,
				unitPrice,
				qty,
				onCalculate,
			}: {
				title: string;
				unitPrice: number;
				qty: number;
				onCalculate: (qty: number) => void;
			}) => (
				<MouldingCalculator
					title={title}
					unitPrice={unitPrice}
					qty={qty}
					onCalculate={onCalculate}
				/>
			),
		}),
		[dataSource],
	);

	if (!record) return null;

	function getRouteOptions(routeData: Record<string, any> | null) {
		return getRedirectableRoutes(routeData).map((route) => ({
			uid: route.uid,
			title: route.title,
		}));
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
	const doorSizeVariantScopedLine = doorSizeVariantLine
		? {
				...doorSizeVariantLine,
				formSteps: resolveConfiguredRouteStepsForLine({
					routeData: doorSizeVariantModal.routeData,
					line: doorSizeVariantLine,
				}),
			}
		: null;
	const doorSizeVariantSteps = doorSizeVariantScopedLine
		? getWorkflowSteps(doorSizeVariantScopedLine)
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
			<SalesFormEnginePanel
				record={record}
				editor={workflowEditor}
				dataSource={workflowDataSource}
				workflowCapabilities={workflowAdminCapabilities}
				pricing={{
					lineTotalMode: "editable",
				}}
				actions={{
					addLineItem: () => addLineItem(),
					updateLineItem: (uid, patch) =>
						updateLineItem(uid, patch as Partial<NewSalesFormLineItem>),
					removeLineItem,
					setActiveItem: (uid) => setEditor({ activeItem: uid }),
					setActiveStep: (lineUid, stepIndex) =>
						setEditor({
							activeStepByLine: {
								...editor.activeStepByLine,
								[lineUid]: stepIndex,
							},
						}),
				}}
				slots={{
					getComponentRedirectOptions: ({ routeData }) =>
						getRouteOptions(routeData),
					renderDoorSupplierPanel:
						workflowAdminCapabilities.canManageDoorSuppliers
							? ({ supplierUid, updateSupplier, refetchSuppliers }) => {
									const suppliers = (
										suppliersQuery.data?.stepProducts || []
									).flatMap((supplier) => {
										const id = Number(supplier.id || 0);
										if (!id) return [];
										return [
											{
												id,
												uid: supplier.uid,
												name: supplier.name,
											},
										];
									});

									return (
										<DoorSupplierManager
											suppliers={suppliers}
											selectedSupplierUid={supplierUid || null}
											supplierNameInput={supplierNameInput}
											editingSupplier={editingSupplier}
											isSaving={saveSupplierMutation.isPending}
											isDeleting={deleteSupplierMutation.isPending}
											onSupplierNameInputChange={setSupplierNameInput}
											onSaveSupplier={async () => {
												const name = supplierNameInput.trim();
												if (!name) return;
												await saveSupplierMutation.mutateAsync({
													id: editingSupplier?.id || null,
													name,
												});
												await suppliersQuery.refetch();
												await refetchSuppliers?.();
												setSupplierNameInput("");
												setEditingSupplier(null);
											}}
											onCancelEdit={() => {
												setEditingSupplier(null);
												setSupplierNameInput("");
											}}
											onSelectDefault={() => updateSupplier(null)}
											onSelectSupplier={(supplier) =>
												updateSupplier({
													uid: supplier.uid,
													name: supplier.name,
												})
											}
											onEditSupplier={(supplier) => {
												setEditingSupplier({
													id: supplier.id,
													name: supplier.name,
												});
												setSupplierNameInput(supplier.name || "");
											}}
											onDeleteSupplier={async (supplier) => {
												if (supplierUid === supplier.uid) {
													updateSupplier(null);
												}
												await deleteSupplierMutation.mutateAsync({
													id: supplier.id,
												});
												await suppliersQuery.refetch();
												await refetchSuppliers?.();
											}}
										/>
									);
								}
							: undefined,
					componentActions: {
						...componentAdmin.componentActions,
						onOpenDoorSizeVariant:
							workflowAdminCapabilities.canManageDoorSizeVariants
								? (input) =>
										setDoorSizeVariantModal({
											open: true,
											lineUid: String(input.line.uid || ""),
											stepIndex: input.stepIndex,
											routeData: input.routeData,
										})
								: undefined,
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
			{componentAdmin.dialogs}
		</>
	);
}
