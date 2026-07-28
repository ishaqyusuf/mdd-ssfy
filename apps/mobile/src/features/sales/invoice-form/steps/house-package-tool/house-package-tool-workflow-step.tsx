import { _trpc } from "@/components/static-trpc";
import {
	buildStepComponentOverrideMap,
	buildWorkflowDoorRowsPatch,
	buildWorkflowDoorSyncPatch,
	calcWorkflowDoorRow,
	clearUnpricedDoorRowQty,
	computeHptSharedDoorSurcharge,
	deriveDoorSizeRows,
	getDoorSupplierMeta,
	getWorkflowSteps,
	isDoorStepTitle,
	readSalesFormObjectMetadata,
	removeWorkflowHptDoorOption,
	resolveWorkflowVisibleComponents,
	rowsForDoorComponent,
	swapWorkflowDoorComponent,
	updateWorkflowDoorSupplier,
	type DoorStoredRow,
	type WorkflowComponentRecord,
	type WorkflowLineItemRecord,
} from "@gnd/sales/sales-form-core";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useEffect, useMemo } from "react";
import { useInvoiceFormModalStore } from "../../store/use-invoice-form-modal-store";
import type { NewSalesFormLineItem } from "../../types";
import {
	getDoorRouteConfig,
	getDoorRows,
	getMobileDoorRouteFlags,
	getSelectedDoorComponents,
	linePatchChanged,
	mapWorkflowComponent,
} from "../line-workflow-helpers";
import { HousePackageToolEditor } from "./house-package-tool-editor";
import { getHousePackagePricedSteps } from "./house-package-tool-rows";

export function HousePackageToolWorkflowStep({
	line,
	disabled,
	profileCoefficient,
	onPatch,
	onAddDoor,
}: {
	line: NewSalesFormLineItem;
	disabled?: boolean;
	profileCoefficient?: number | null;
	onPatch: (patch: Partial<NewSalesFormLineItem>) => void;
	onAddDoor?: () => void;
}) {
	const router = useRouter();
	const setDoorSizePicker = useInvoiceFormModalStore(
		(state) => state.actions.setDoorSizePicker,
	);
	const clearDoorSizePicker = useInvoiceFormModalStore(
		(state) => state.actions.clearDoorSizePicker,
	);
	const workflowLine = line as unknown as WorkflowLineItemRecord;
	const workflowSteps = useMemo(() => getWorkflowSteps(workflowLine), [workflowLine]);
	const doorRows = getDoorRows(workflowLine);
	const hptPricedSteps = getHousePackagePricedSteps(workflowSteps);
	const sharedDoorSurcharge = computeHptSharedDoorSurcharge(workflowLine);
	const doorRouteConfig = getDoorRouteConfig(workflowLine, workflowSteps);
	const doorRouteFlags = getMobileDoorRouteFlags(doorRouteConfig);
	const selectedDoorComponents = getSelectedDoorComponents(workflowSteps);
	const doorStepIndex = workflowSteps.findIndex((step) =>
		isDoorStepTitle(step.step?.title || step.title),
	);
	const doorStep = doorStepIndex >= 0 ? workflowSteps[doorStepIndex] : null;
	const doorStepId = Number(doorStep?.stepId || doorStep?.step?.id || 0);
	const doorStepTitle = String(doorStep?.step?.title || doorStep?.title || "");
	const doorSupplierMeta = getDoorSupplierMeta(doorStep);

	const workflowRouteQuery = useQuery(
		_trpc.newSalesForm.getStepRouting.queryOptions(
			{},
			{
				enabled: Boolean(doorStep),
				refetchOnWindowFocus: false,
			},
		),
	);
	const workflowRouteData = workflowRouteQuery.data || null;
	const doorSuppliersQuery = useQuery(
		_trpc.sales.getSuppliers.queryOptions(
			{},
			{
				enabled: Boolean(doorStep),
				refetchOnWindowFocus: false,
			},
		),
	);
	const doorSuppliers = useMemo(
		() => readDoorSuppliers(doorSuppliersQuery.data),
		[doorSuppliersQuery.data],
	);
	const doorComponentsQuery = useQuery(
		_trpc.sales.getStepComponents.queryOptions(
			{
				stepId: doorStepId || undefined,
				stepTitle: doorStepId ? undefined : doorStepTitle || "Door",
			},
			{
				enabled: Boolean(doorStep),
				refetchOnWindowFocus: false,
			},
		),
	);
	const visibleDoorComponents = useMemo(
		() =>
			resolveWorkflowVisibleComponents({
				components: Array.isArray(doorComponentsQuery.data)
					? doorComponentsQuery.data.map(mapWorkflowComponent)
					: [],
				steps: workflowSteps,
				activeStep: doorStep,
				overrides: buildStepComponentOverrideMap(doorStep),
				includeCustomComponents: false,
				profileCoefficient: profileCoefficient || 1,
			}),
		[doorComponentsQuery.data, doorStep, profileCoefficient, workflowSteps],
	);

	const patchWorkflowLine = (patch: Partial<NewSalesFormLineItem>) => {
		if (!disabled) onPatch(patch);
	};

	useEffect(() => {
		if (disabled || !doorRows.length) return;
		const patch = buildWorkflowDoorSyncPatch({
			line: workflowLine,
			availableComponents: visibleDoorComponents,
			profileCoefficient,
		});
		const linePatch = patch?.linePatch as
			| Partial<NewSalesFormLineItem>
			| undefined;
		if (!linePatch || !linePatchChanged(line, linePatch)) return;
		onPatch(linePatch);
	}, [
		disabled,
		doorRows.length,
		line,
		onPatch,
		profileCoefficient,
		visibleDoorComponents,
		workflowLine,
	]);

	const updateDoorRows = (rows: DoorStoredRow[]) => {
		patchWorkflowLine(
			buildWorkflowDoorRowsPatch({
				line: workflowLine,
				rows,
				sharedDoorSurcharge: computeHptSharedDoorSurcharge(workflowLine),
				noHandle: doorRouteFlags.noHandle,
				hasSwing: doorRouteFlags.hasSwing,
				profileCoefficient,
			}).linePatch as Partial<NewSalesFormLineItem>,
		);
	};

	const updateDoorRow = (index: number, patch: Partial<DoorStoredRow>) => {
		updateDoorRows(
			doorRows.map((row, rowIndex) =>
				rowIndex === index ? { ...row, ...patch } : row,
			),
		);
	};

	const removeDoorRow = (index: number) => {
		updateDoorRows(doorRows.filter((_row, rowIndex) => rowIndex !== index));
	};

	const removeDoorOption = (component: WorkflowComponentRecord) => {
		if (doorStepIndex < 0) return;
		const result = removeWorkflowHptDoorOption({
			routeData: workflowRouteData,
			line: workflowLine,
			stepIndex: doorStepIndex,
			component,
		});
		if (!result) return;
		patchWorkflowLine(result.linePatch as Partial<NewSalesFormLineItem>);
	};

	const swapDoorOption = (
		sourceComponent: WorkflowComponentRecord,
		targetComponent: WorkflowComponentRecord,
	) => {
		if (doorStepIndex < 0) return;
		const result = swapWorkflowDoorComponent({
			line: workflowLine,
			stepIndex: doorStepIndex,
			sourceComponent,
			targetComponent,
			profileCoefficient,
		});
		if (!result) return;
		patchWorkflowLine(result.linePatch as Partial<NewSalesFormLineItem>);
	};

	const configureDoorSizes = (component: WorkflowComponentRecord) => {
		const componentId = Number(component.id || 0);
		if (!componentId) return;
		const routeFlags = doorRouteFlags;
		const initialRows = deriveDoorSizeRows({
			line: workflowLine as any,
			existingRows: rowsForDoorComponent(workflowLine as any, componentId),
			component,
			routeData: workflowRouteData,
			supplierUid: doorSupplierMeta.supplierUid,
			profileCoefficient: profileCoefficient || 1,
		}) as DoorStoredRow[];

		const applyPickerRows = () => {
			const picker = useInvoiceFormModalStore.getState().doorSizePicker;
			const selectedRows = (picker?.rows || []).filter(
				(row) => Number(row.totalQty || 0) > 0,
			);
			const otherRows = doorRows.filter(
				(row) => Number(row.stepProductId || 0) !== componentId,
			);
			const patch = buildWorkflowDoorRowsPatch({
				line: workflowLine,
				rows: [...otherRows, ...selectedRows],
				sharedDoorSurcharge: computeHptSharedDoorSurcharge(workflowLine),
				noHandle: routeFlags.noHandle,
				hasSwing: routeFlags.hasSwing,
				profileCoefficient,
			});
			const linePatch = patch.linePatch as Partial<NewSalesFormLineItem>;
			patchWorkflowLine({
				...linePatch,
				meta: {
					...(readSalesFormObjectMetadata(workflowLine.meta) || {}),
					...(readSalesFormObjectMetadata(linePatch.meta) || {}),
					workflowDoorRouteConfig: routeFlags,
				},
			});
			clearDoorSizePicker();
		};

		setDoorSizePicker({
			component,
			rows: initialRows.map((row) => clearUnpricedDoorRowQty(row)),
			supplierUid: doorSupplierMeta.supplierUid,
			supplierName: doorSupplierMeta.supplierName,
			suppliers: doorSuppliers,
			isLoadingSuppliers: doorSuppliersQuery.isFetching,
			noHandle: routeFlags.noHandle,
			disabled,
			primaryActionLabel: "Apply",
			showSecondaryAction: false,
			onSupplierChange: (supplier) => {
				if (doorStepIndex < 0) return;
				const picker = useInvoiceFormModalStore.getState().doorSizePicker;
				const supplierPatch = updateWorkflowDoorSupplier({
					line: workflowLine,
					stepIndex: doorStepIndex,
					supplier,
					profileCoefficient: profileCoefficient || 1,
				});
				if (supplierPatch) {
					patchWorkflowLine(
						supplierPatch as Partial<NewSalesFormLineItem>,
					);
				}
				const nextRows = deriveDoorSizeRows({
					line: workflowLine as any,
					existingRows: picker?.rows || initialRows,
					component,
					routeData: workflowRouteData,
					supplierUid: supplier?.uid || null,
					profileCoefficient: profileCoefficient || 1,
				}) as DoorStoredRow[];
				if (!picker) return;
				setDoorSizePicker({
					...picker,
					rows: nextRows.map((row) => clearUnpricedDoorRowQty(row)),
					supplierUid: supplier?.uid || null,
					supplierName: supplier?.name || null,
				});
			},
			onChangeRow: (rowIndex, rowPatch) => {
				const picker = useInvoiceFormModalStore.getState().doorSizePicker;
				if (!picker) return;
				const nextRows = picker.rows.map((row, index) =>
					index === rowIndex
						? clearUnpricedDoorRowQty(
								calcWorkflowDoorRow({
									...row,
									...rowPatch,
								}) as DoorStoredRow,
							)
						: row,
				);
				setDoorSizePicker({
					...picker,
					rows: nextRows,
				});
			},
			onOk: applyPickerRows,
			onNextStep: applyPickerRows,
			onClose: clearDoorSizePicker,
		});
		router.push("/(sales)/invoices/door-size" as any);
	};

	return (
		<HousePackageToolEditor
			rows={doorRows}
			selectedDoors={selectedDoorComponents}
			noHandle={doorRouteFlags.noHandle}
			hasSwing={doorRouteFlags.hasSwing}
			disabled={disabled}
			profileCoefficient={profileCoefficient}
			pricedSteps={hptPricedSteps}
			sharedDoorSurcharge={sharedDoorSurcharge}
			onChange={updateDoorRow}
			onRemove={removeDoorRow}
			onRemoveDoorOption={removeDoorOption}
			onConfigureDoorSizes={configureDoorSizes}
			onAddDoor={onAddDoor}
			swapCandidates={visibleDoorComponents}
			isLoadingSwapCandidates={doorComponentsQuery.isFetching}
			onSwapDoorOption={swapDoorOption}
		/>
	);
}

function readDoorSuppliers(value: unknown) {
	if (!value || typeof value !== "object") return [];
	const rows = (value as { stepProducts?: unknown }).stepProducts;
	return Array.isArray(rows)
		? rows.map((row) => {
				const supplier = (row || {}) as Record<string, unknown>;
				return {
					id: supplier.id == null ? null : Number(supplier.id || 0),
					uid: supplier.uid ? String(supplier.uid) : null,
					name: supplier.name ? String(supplier.name) : null,
				};
			})
		: [];
}
