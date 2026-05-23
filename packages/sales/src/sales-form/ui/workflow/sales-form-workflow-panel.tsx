"use client";

import { useMemo, useState } from "react";
import { Badge } from "@gnd/ui/badge";
import { Button } from "@gnd/ui/button";
import { Menu } from "@gnd/ui/custom/menu";
import { Input } from "@gnd/ui/input";
import { Textarea } from "@gnd/ui/textarea";
import type {
	SalesFormWorkflowActions,
	SalesFormWorkflowDataSource,
	SalesFormWorkflowEditorState,
	SalesFormWorkflowPricingSurface,
	SalesFormWorkflowRecord,
	SalesFormWorkflowSurfaceSlots,
} from "../../contracts";
import {
	buildSelectedByStepUid,
	buildSelectedProdUidsByStepUid,
	deriveDoorSizeCandidates,
	getRedirectableRoutes,
	getSelectedDoorComponentsForLine,
	getSelectedProdUids,
	getRouteConfigForLine,
	isComponentVisibleByRules,
	normalizeSalesFormTitle as normalizeTitle,
	resolveComponentPriceByDeps,
	resolveDoorTierPricing,
	summarizeDoors,
} from "../../domain";
import {
	applyMultiSelectStepMutation,
	applySingleSelectStepMutation,
} from "../../domain/mutation-engine";
import {
	buildStepComponentOverrideMap,
	buildWorkflowMouldingRowsContext,
	buildWorkflowMouldingRowsPatch,
	buildWorkflowDoorRowsPatch,
	buildWorkflowDoorSizeVariantPatch,
	buildWorkflowServiceRowsContext,
	buildWorkflowServiceRowsPatch,
	buildWorkflowShelfSectionsContext,
	buildWorkflowShelfSectionsPatch,
	componentLabel,
	computeSharedDoorSurcharge,
	createShelfProductDraft,
	createShelfSectionDraft,
	buildShelfProductsById,
	getDoorSupplierMeta,
	getItemWorkflowStepFamily,
	getLineTitlePlaceholder,
	getShelfLeafCategoryIds,
	getShelfRowDisplayTotal,
	getShelfRowDisplayUnitPrice,
	getStepPriceDeps,
	getWorkflowLineDisplayTotal,
	getWorkflowSteps,
	isComponentEnabledForView,
	isDoorStepTitle,
	isHousePackageToolStepTitle,
	isMultiSelectStepTitle,
	isRedirectDisabledStep,
	lineItemPickerLabel,
	moneyIfPositive,
	profileAdjustedSalesPrice,
	resolveInteractiveStepIndex,
	RootComponentPicker,
	saveWorkflowSelectedComponent,
	selectWorkflowRootComponent,
	DoorSizeQtyDialog,
	DoorSwapDialog,
	HousePackageToolPanel,
	MouldingLineItemsEditor,
	profileAdjustedDoorSalesPrice,
	removeWorkflowHptDoorOption,
	ServiceLineItemsEditor,
	ShelfCategoryPathInput,
	ShelfProductCombobox,
	stepKey,
	useItemWorkflowController,
	WorkflowLineList,
	WorkflowShelfPanel,
	WorkflowStepComponentPanel,
	WorkflowStepRenderer,
	swapWorkflowDoorComponent,
	updateWorkflowDoorSupplier,
	type WorkflowComponentRecord,
	type DoorStoredRow,
	type WorkflowLineItemRecord,
	type ShelfProductOption,
	type ShelfSectionDraft,
	type WorkflowStepRecord,
} from "./index";

export type SalesFormWorkflowPanelProps<
	TLine extends WorkflowLineItemRecord = WorkflowLineItemRecord,
> = {
	record: SalesFormWorkflowRecord<TLine>;
	editor?: SalesFormWorkflowEditorState;
	actions: SalesFormWorkflowActions<TLine>;
	dataSource: SalesFormWorkflowDataSource;
	pricing?: SalesFormWorkflowPricingSurface<TLine>;
	slots?: SalesFormWorkflowSurfaceSlots<TLine>;
	className?: string;
};

export function SalesFormWorkflowPanel<
	TLine extends WorkflowLineItemRecord = WorkflowLineItemRecord,
>(props: SalesFormWorkflowPanelProps<TLine>) {
	const { record, dataSource, actions } = props;
	const [localActiveStepByLine, setLocalActiveStepByLine] = useState<
		Record<string, number>
	>({});
	const [localActiveItem, setLocalActiveItem] = useState<string | null>(
		record.lineItems[0]?.uid ? String(record.lineItems[0].uid) : null,
	);
	const [componentSearch, setComponentSearch] = useState("");
	const [includeCustomComponents, setIncludeCustomComponents] = useState(false);
	const [activeHptDoorUidByLine, setActiveHptDoorUidByLine] = useState<
		Record<string, string>
	>({});
	const [doorSizeModal, setDoorSizeModal] = useState<{
		open: boolean;
		lineUid: string | null;
		component: WorkflowComponentRecord | null;
	}>({
		open: false,
		lineUid: null,
		component: null,
	});
	const [doorSwapModal, setDoorSwapModal] = useState<{
		open: boolean;
		lineUid: string | null;
		sourceUid: string | null;
	}>({
		open: false,
		lineUid: null,
		sourceUid: null,
	});
	const activeStepByLine =
		props.editor?.activeStepByLine || localActiveStepByLine;
	const activeItem =
		props.editor?.activeItem === undefined
			? localActiveItem
			: props.editor.activeItem;
	const routeQuery = dataSource.useStepRouting();
	const routeData = routeQuery.data || null;
	const { activeLine, activeLineSteps, activeStepIndex, activeStep } =
		useItemWorkflowController({
			lineItems: record.lineItems as any,
			activeItem: activeItem || null,
			activeStepByLine,
			resolveActiveStepIndex: resolveInteractiveStepIndex,
			getItemLabel: lineItemPickerLabel,
		});
	const profilesQuery = dataSource.useCustomerProfiles?.();
	const activeShelfCategoryIds = useMemo(
		() =>
			Array.from(
				new Set(
					((activeLine?.shelfItems || []) as Record<string, any>[])
						.flatMap((row) => [
							Number(row?.categoryId || 0),
							Number(row?.meta?.shelfParentCategoryId || 0),
							...(Array.isArray(row?.meta?.categoryIds)
								? row.meta.categoryIds.map((value: unknown) =>
										Number(value || 0),
									)
								: []),
						])
						.filter((id) => id > 0),
				),
			),
		[activeLine?.shelfItems],
	);
	const shelfCategoriesQuery = dataSource.useShelfCategories?.();
	const shelfProductsQuery = dataSource.useShelfProducts?.({
		categoryIds: activeShelfCategoryIds,
		enabled: activeShelfCategoryIds.length > 0,
	});
	const doorSuppliersQuery = dataSource.useDoorSuppliers?.({
		enabled: Boolean(dataSource.useDoorSuppliers),
	});
	const shelfProductsByCategory = useMemo(() => {
		const bucket = new Map<number, ShelfProductOption[]>();
		for (const product of (shelfProductsQuery?.data || []) as Record<
			string,
			any
		>[]) {
			const keys = [
				Number(product?.categoryId || 0),
				Number(product?.parentCategoryId || 0),
			].filter((id) => id > 0);
			for (const key of keys) {
				const list = bucket.get(key) || [];
				list.push(product as ShelfProductOption);
				bucket.set(key, list);
			}
		}
		return bucket;
	}, [shelfProductsQuery?.data]);
	const activeProfileCoefficient = useMemo(() => {
		const selectedProfileId = Number(record?.form?.customerProfileId || 0);
		if (!selectedProfileId) return 1;
		const profile = (profilesQuery?.data || []).find(
			(entry) => Number(entry?.id || 0) === selectedProfileId,
		);
		const coefficient = Number(profile?.coefficient || 0);
		return Number.isFinite(coefficient) && coefficient > 0 ? coefficient : 1;
	}, [profilesQuery?.data, record?.form?.customerProfileId]);
	const rootStepId = routeData?.rootStepUid
		? routeData?.stepsByUid?.[routeData.rootStepUid]?.id
		: null;
	const rootComponentsQuery = (
		dataSource.useRootComponents || dataSource.useStepComponents
	)({
		stepId: rootStepId || null,
		stepTitle: null,
		enabled: Boolean(rootStepId),
	});
	const stepComponentsQuery = dataSource.useStepComponents({
		stepId: activeStep?.stepId || activeStep?.step?.id || null,
		stepTitle: activeStep?.step?.title || null,
		enabled: Boolean(activeStep),
	});
	const activeStepComponentOverrides = useMemo(
		() => buildStepComponentOverrideMap(activeStep || null),
		[activeStep],
	);
	const activeDoorStep = useMemo(
		() => activeLineSteps.find((step) => isDoorStepTitle(step?.step?.title)),
		[activeLineSteps],
	);
	const doorComponentsQuery = (
		dataSource.useDoorComponents || dataSource.useStepComponents
	)({
		stepId: activeDoorStep?.stepId || activeDoorStep?.step?.id || null,
		stepTitle: activeDoorStep?.step?.title || "Door",
		enabled: Boolean(activeDoorStep),
	});
	const activeRootComponents = useMemo(() => {
		const roots = rootComponentsQuery.data || [];
		const configured = new Set(Object.keys(routeData?.composedRouter || {}));
		if (!configured.size) return [];
		const selectedByStepUid = buildSelectedByStepUid(activeLineSteps);
		const selectedProdUidsByStepUid =
			buildSelectedProdUidsByStepUid(activeLineSteps);
		return roots
			.filter((component) => configured.has(String(component?.uid || "")))
			.filter((component) =>
				isComponentEnabledForView(component, includeCustomComponents),
			)
			.filter((component) =>
				isComponentVisibleByRules(
					component,
					selectedByStepUid,
					selectedProdUidsByStepUid,
				),
			)
			.map((component) =>
				priceComponent(
					component,
					activeStep || null,
					activeStepComponentOverrides,
					selectedByStepUid,
					selectedProdUidsByStepUid,
					activeProfileCoefficient,
				),
			);
	}, [
		activeLineSteps,
		activeProfileCoefficient,
		activeStep,
		activeStepComponentOverrides,
		includeCustomComponents,
		rootComponentsQuery.data,
		routeData,
	]);
	const visibleComponents = useMemo(() => {
		const selectedByStepUid = buildSelectedByStepUid(activeLineSteps);
		const selectedProdUidsByStepUid =
			buildSelectedProdUidsByStepUid(activeLineSteps);
		return (stepComponentsQuery.data || [])
			.filter((component) =>
				isComponentEnabledForView(component, includeCustomComponents),
			)
			.filter((component) =>
				isComponentVisibleByRules(
					component,
					selectedByStepUid,
					selectedProdUidsByStepUid,
				),
			)
			.map((component) =>
				priceComponent(
					component,
					activeStep || null,
					activeStepComponentOverrides,
					selectedByStepUid,
					selectedProdUidsByStepUid,
					activeProfileCoefficient,
				),
			);
	}, [
		activeLineSteps,
		activeProfileCoefficient,
		activeStep,
		activeStepComponentOverrides,
		includeCustomComponents,
		stepComponentsQuery.data,
	]);
	const visibleDoorComponents = useMemo(() => {
		const selectedByStepUid = buildSelectedByStepUid(activeLineSteps);
		const selectedProdUidsByStepUid =
			buildSelectedProdUidsByStepUid(activeLineSteps);
		return (doorComponentsQuery.data || [])
			.filter((component) =>
				isComponentEnabledForView(component, includeCustomComponents),
			)
			.filter((component) =>
				isComponentVisibleByRules(
					component,
					selectedByStepUid,
					selectedProdUidsByStepUid,
				),
			)
			.map((component) =>
				priceComponent(
					component,
					activeDoorStep || activeStep || null,
					buildStepComponentOverrideMap(activeDoorStep || null),
					selectedByStepUid,
					selectedProdUidsByStepUid,
					activeProfileCoefficient,
				),
			);
	}, [
		activeDoorStep,
		activeLineSteps,
		activeProfileCoefficient,
		activeStep,
		doorComponentsQuery.data,
		includeCustomComponents,
	]);

	function setActiveItem(uid: string | null) {
		setLocalActiveItem(uid);
		actions.setActiveItem?.(uid);
	}

	function setActiveStep(lineUid: string, stepIndex: number) {
		setLocalActiveStepByLine((prev) => ({
			...prev,
			[lineUid]: stepIndex,
		}));
		actions.setActiveStep?.(lineUid, stepIndex);
	}

	function updateLine(line: TLine, patch: Partial<TLine>) {
		const uid = String(line.uid || "");
		if (!uid) return;
		actions.updateLineItem(uid, patch);
	}

	function openDoorSizeModal(line: TLine, component: WorkflowComponentRecord) {
		setDoorSizeModal({
			open: true,
			lineUid: String(line.uid || ""),
			component,
		});
	}

	function renderFlatLineEditor(line: TLine) {
		const update = (patch: Partial<TLine>) => updateLine(line, patch);
		if (props.slots?.renderFlatLineEditor) {
			return props.slots.renderFlatLineEditor({ line, updateLine: update });
		}
		return (
			<DefaultFlatLineEditor
				line={line}
				lineTotalMode={props.pricing?.lineTotalMode || "editable"}
				displayTotal={
					props.pricing?.getLineDisplayTotal?.(line) ??
					getWorkflowLineDisplayTotal(line, activeProfileCoefficient)
				}
				onUpdate={update}
			/>
		);
	}

	function renderDefaultHousePackageToolPanel(
		line: TLine,
		step: WorkflowStepRecord,
	) {
		const rows = Array.isArray((line as any).housePackageTool?.doors)
			? (((line as any).housePackageTool.doors || []) as DoorStoredRow[])
			: [];
		let selectedDoorComponents = getSelectedDoorComponentsForLine(line, {
			availableComponents: visibleDoorComponents,
		});
		if (!selectedDoorComponents.length && rows.length) {
			const recoveredComponentIds = Array.from(
				new Set(rows.map((row) => Number(row?.stepProductId || 0))),
			);
			selectedDoorComponents = recoveredComponentIds.map(
				(componentId, index) =>
					visibleDoorComponents.find(
						(component) => Number(component?.id || 0) === componentId,
					) || {
						id: componentId || null,
						uid: componentId
							? `persisted-door-${componentId}`
							: `persisted-door-${index + 1}`,
						title: componentId ? `Door ${componentId}` : "Saved Door",
						img: null,
						salesPrice: null,
						basePrice: null,
						pricing: null,
						supplierVariants: [],
					},
			);
		}
		const activeDoorUid =
			activeHptDoorUidByLine[String(line.uid || "")] ||
			String(selectedDoorComponents[0]?.uid || "");
		const activeDoorComponent =
			selectedDoorComponents.find(
				(component) => String(component.uid || "") === activeDoorUid,
			) ||
			selectedDoorComponents[0] ||
			null;
		const routeConfig = getRouteConfigForLine({
			routeData,
			line,
			step,
			component: activeDoorComponent,
		});
		const noHandle = !!routeConfig?.noHandle;
		const hasSwing = routeConfig?.hasSwing !== false;
		const summary = summarizeDoors(rows, { noHandle, hasSwing });
		const focusedRows = activeDoorComponent
			? summary.rows.filter(
					(row) =>
						Number(row?.stepProductId || 0) ===
						Number(activeDoorComponent?.id || 0),
				)
			: summary.rows;
		const displayedRows =
			activeDoorComponent &&
			!focusedRows.length &&
			selectedDoorComponents.length === 1 &&
			summary.rows.length
				? summary.rows
				: focusedRows;
		const sharedDoorSurcharge = computeSharedDoorSurcharge(line as any);
		const doorStep = getWorkflowSteps(line).find((candidate) =>
			isDoorStepTitle(candidate?.step?.title),
		);
		const doorStepIndex = getWorkflowSteps(line).findIndex((candidate) =>
			isDoorStepTitle(candidate?.step?.title),
		);
		const supplier = getDoorSupplierMeta(doorStep);
		const swapDoorCandidates = visibleDoorComponents.filter(
			(component) =>
				String(component?.uid || "") !== String(activeDoorComponent?.uid || ""),
		);
		const availableSizes = (() => {
			if (!activeDoorComponent) return [] as string[];
			const sizes = deriveDoorSizeCandidates(
				line,
				activeDoorComponent?.pricing || {},
				routeData,
			);
			return sizes.filter(
				(size) =>
					!displayedRows.some(
						(row) => String(row?.dimension || "").trim() === size,
					),
			);
		})();
		const pricedSteps = getWorkflowSteps(line).filter((candidate) => {
			const title = normalizeTitle(candidate?.step?.title);
			return (
				Number(candidate?.price || 0) > 0 &&
				title !== "item type" &&
				title !== "door" &&
				title !== "house package tool" &&
				title !== "hpt"
			);
		});

		function applyRows(nextRows: DoorStoredRow[]) {
			const next = buildWorkflowDoorRowsPatch({
				line,
				rows: nextRows,
				sharedDoorSurcharge,
				noHandle,
				hasSwing,
				profileCoefficient: activeProfileCoefficient,
			});
			updateLine(line, next.linePatch as unknown as Partial<TLine>);
		}

		function patchRow(
			sourceRow: DoorStoredRow,
			patch: Record<string, unknown>,
		) {
			applyRows(
				summary.rows.map((row) =>
					row === sourceRow
						? {
								...row,
								...patch,
							}
						: row,
				),
			);
		}
		function addSizeRow(size: string) {
			if (!activeDoorComponent) return;
			const tierPricing = resolveDoorTierPricing({
				pricing: activeDoorComponent?.pricing || {},
				size,
				supplierUid: supplier.supplierUid,
				supplierVariants: activeDoorComponent?.supplierVariants || [],
				salesMultiplier:
					Number.isFinite(activeProfileCoefficient) &&
					activeProfileCoefficient > 0
						? Number((1 / activeProfileCoefficient).toFixed(2))
						: 1,
				fallbackSalesPrice: activeDoorComponent?.salesPrice,
				fallbackBasePrice: activeDoorComponent?.basePrice,
			});
			const hasResolvedPrice = Boolean(tierPricing.hasPrice);
			applyRows([
				...summary.rows,
				{
					id: null,
					dimension: size,
					swing: "",
					doorType: "",
					doorPrice: 0,
					jambSizePrice: 0,
					casingPrice: 0,
					unitPrice: hasResolvedPrice
						? Number((tierPricing.salesPrice + sharedDoorSurcharge).toFixed(2))
						: 0,
					lhQty: 0,
					rhQty: 0,
					totalQty: 0,
					lineTotal: 0,
					stepProductId: activeDoorComponent.id || null,
					meta: {
						baseUnitPrice: hasResolvedPrice
							? Number(tierPricing.basePrice.toFixed(2))
							: 0,
						priceMissing: !hasResolvedPrice,
					},
				},
			]);
		}
		function deleteDoorOption() {
			if (!activeDoorComponent || doorStepIndex < 0) return;
			const result = removeWorkflowHptDoorOption({
				routeData,
				line,
				stepIndex: doorStepIndex,
				component: activeDoorComponent,
			});
			if (!result) return;
			updateLine(line, result.linePatch as unknown as Partial<TLine>);
			setActiveHptDoorUidByLine((prev) => {
				const next = { ...prev };
				if (result.activeDoorUid) {
					next[String(line.uid || "")] = result.activeDoorUid;
				} else {
					delete next[String(line.uid || "")];
				}
				return next;
			});
		}

		return (
			<HousePackageToolPanel
				selectedDoorComponents={selectedDoorComponents}
				activeDoorUid={activeDoorUid}
				activeDoorComponent={activeDoorComponent}
				focusedRows={displayedRows}
				summary={summary}
				availableSizes={availableSizes}
				pricedSteps={pricedSteps}
				supplierName={supplier.supplierName}
				noHandle={noHandle}
				hasSwing={hasSwing}
				sharedDoorSurcharge={sharedDoorSurcharge}
				profileCoefficient={activeProfileCoefficient}
				canSwapDoor={Boolean(swapDoorCandidates.length)}
				formatMoney={(value) => moneyIfPositive(Number(value || 0)) || "$0.00"}
				componentLabel={componentLabel}
				resolveImageSrc={(src) =>
					dataSource.resolveImageSrc?.(src) || src || null
				}
				onActiveDoorChange={(uid) =>
					setActiveHptDoorUidByLine((prev) => ({
						...prev,
						[String(line.uid || "")]: uid,
					}))
				}
				onAddSize={addSizeRow}
				onConfigureSizes={() =>
					activeDoorComponent
						? openDoorSizeModal(line, activeDoorComponent)
						: undefined
				}
				onSwapDoor={() =>
					setDoorSwapModal({
						open: true,
						lineUid: String(line.uid || ""),
						sourceUid: activeDoorComponent?.uid
							? String(activeDoorComponent.uid)
							: null,
					})
				}
				onDeleteDoor={deleteDoorOption}
				onPatchRow={patchRow}
				onRemoveSizeRow={(row) =>
					applyRows(summary.rows.filter((candidate) => candidate !== row))
				}
			/>
		);
	}

	function selectRoot(line: TLine, component: WorkflowComponentRecord) {
		const result = selectWorkflowRootComponent({
			routeData,
			line,
			component,
		});
		if (!result) return;
		updateLine(line, result.linePatch as Partial<TLine>);
		setActiveItem(String(line.uid || ""));
		setActiveStep(String(line.uid || ""), result.activeStepIndex);
	}

	function selectComponent(
		line: TLine,
		steps: WorkflowStepRecord[],
		stepIndex: number,
		component: WorkflowComponentRecord,
		selectedOverride?: boolean,
	) {
		const result = saveWorkflowSelectedComponent({
			routeData,
			line,
			steps,
			currentStepIndex: stepIndex,
			component,
			visibleComponents,
			activeStepTitle: activeStep?.step?.title || "",
			selectedOverride,
		});
		if (!result) return;
		updateLine(line, result.linePatch as Partial<TLine>);
		setActiveStep(String(line.uid || ""), result.activeStepIndex);
	}

	function proceedMultiSelect(
		line: TLine,
		steps: WorkflowStepRecord[],
		stepIndex: number,
	) {
		const current = steps[stepIndex];
		if (!current) return;
		const nextSteps = [...steps];
		const stepResult = isMultiSelectStepTitle(current?.step?.title)
			? applyMultiSelectStepMutation({
					steps: nextSteps,
					currentStepIndex: stepIndex,
					component: { uid: current.prodUid || "", title: current.value || "" },
					visibleComponents,
					selectedOverride: true,
					activeStepTitle: current?.step?.title || "",
				}).steps
			: applySingleSelectStepMutation({
					steps: nextSteps,
					currentStepIndex: stepIndex,
					component: {
						id: current.componentId,
						uid: current.prodUid || "",
						title: current.value || "",
						salesPrice: current.price,
						basePrice: current.basePrice,
					},
					activeStepTitle: current?.step?.title || "",
				});
		updateLine(line, { formSteps: stepResult } as Partial<TLine>);
		setActiveStep(
			String(line.uid || ""),
			Math.min(stepIndex + 1, stepResult.length - 1),
		);
	}

	function renderPanel(
		line: TLine,
		steps: WorkflowStepRecord[],
		activeIndex: number,
		activeItemStep?: WorkflowStepRecord,
	) {
		const normalizedSearch = componentSearch.trim().toLowerCase();
		const filterComponents = (components: WorkflowComponentRecord[]) =>
			!normalizedSearch
				? components
				: components.filter((component) =>
						[component?.title, component?.uid]
							.filter(Boolean)
							.join(" ")
							.toLowerCase()
							.includes(normalizedSearch),
					);

		if (!steps.length) {
			const filteredRootComponents = filterComponents(activeRootComponents);
			return (
				<div className="space-y-4">
					{renderFlatLineEditor(line)}
					<RootComponentPicker
						loading={Boolean(
							routeQuery.isPending || rootComponentsQuery.isPending,
						)}
						components={activeRootComponents}
						filteredComponents={filteredRootComponents}
						search={componentSearch}
						getKey={(component) => String(component.uid || component.id || "")}
						renderComponent={(component) => (
							<button
								type="button"
								className="overflow-hidden rounded-xl border bg-card text-left transition hover:border-primary"
								onClick={() => selectRoot(line, component)}
							>
								<div className="h-32 bg-muted">
									{component.img ? (
										<img
											src={
												dataSource.resolveImageSrc?.(component.img) ||
												String(component.img)
											}
											alt={component.title || component.uid || "Component"}
											className="h-full w-full object-contain p-2"
										/>
									) : (
										<div className="flex h-full items-center justify-center text-xs text-muted-foreground">
											No image
										</div>
									)}
								</div>
								<div className="space-y-1 p-3">
									<p className="font-semibold leading-tight">
										{componentLabel(component.title || component.uid)}
									</p>
									{moneyIfPositive(component.salesPrice) ? (
										<p className="text-xs font-medium text-primary">
											{moneyIfPositive(component.salesPrice)}
										</p>
									) : null}
								</div>
							</button>
						)}
						toolbarSlot={
							<WorkflowPanelToolbar
								count={filteredRootComponents.length}
								total={activeRootComponents.length}
								search={componentSearch}
								includeCustomComponents={includeCustomComponents}
								onSearchChange={setComponentSearch}
								onRefresh={() => {
									void routeQuery.refetch?.();
									void rootComponentsQuery.refetch?.();
								}}
								onToggleCustom={() =>
									setIncludeCustomComponents((prev) => !prev)
								}
							/>
						}
					/>
				</div>
			);
		}

		if (!activeItemStep) {
			return (
				<p className="text-sm text-muted-foreground">
					Step is missing and cannot load components yet.
				</p>
			);
		}

		const stepFamily = getItemWorkflowStepFamily(line as any, activeItemStep);
		const selectedUids = new Set(
			getSelectedProdUids(activeItemStep).map((uid) => String(uid || "")),
		);
		const filteredVisibleComponents = filterComponents(visibleComponents);
		const componentActionContext = (component: WorkflowComponentRecord) => ({
			routeData,
			line,
			steps,
			step: activeItemStep,
			stepIndex: activeIndex,
			component,
		});
		const componentRedirectOptions =
			props.slots?.getComponentRedirectOptions?.({
				routeData,
				line,
				step: activeItemStep,
				stepIndex: activeIndex,
			}) ||
			getRedirectableRoutes(routeData).map((step) => ({
				uid: step.uid,
				title: step.title,
			}));
		const mouldingContext = buildWorkflowMouldingRowsContext(line as any);
		const serviceContext = buildWorkflowServiceRowsContext(line as any);
		const shelfContext = buildWorkflowShelfSectionsContext(
			line,
			activeProfileCoefficient,
		);
		return (
			<WorkflowStepRenderer
				stepFamily={stepFamily}
				isHousePackageToolStep={isHousePackageToolStepTitle(
					activeItemStep?.step?.title,
				)}
				isRedirectDisabled={isRedirectDisabledStep(activeItemStep)}
				housePackageToolPanel={
					activeItemStep
						? props.slots?.renderHousePackageToolPanel?.({
								line,
								step: activeItemStep,
							}) || renderDefaultHousePackageToolPanel(line, activeItemStep)
						: null
				}
				redirectDisabledPanel={
					<div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
						This step is skipped by redirect and remains for context.
					</div>
				}
				mouldingLineItemPanel={
					props.slots?.renderMouldingPanel?.({
						line,
						rows: mouldingContext.rows,
						updateRows: (rows) =>
							updateLine(
								line,
								buildWorkflowMouldingRowsPatch({
									line,
									rows,
									sharedComponentPrice: mouldingContext.sharedComponentPrice,
								}) as unknown as Partial<TLine>,
							),
					}) || (
						<MouldingLineItemsEditor
							rows={mouldingContext.rows}
							totalQty={mouldingContext.totalQty}
							totalAmount={mouldingContext.totalAmount}
							formatMoney={(value) => moneyIfPositive(value) || null}
							componentLabel={componentLabel}
							resolveImageSrc={(src) =>
								dataSource.resolveImageSrc?.(src) || src || null
							}
							onRowsChange={(rows) =>
								updateLine(
									line,
									buildWorkflowMouldingRowsPatch({
										line,
										rows,
										sharedComponentPrice: mouldingContext.sharedComponentPrice,
									}) as unknown as Partial<TLine>,
								)
							}
							onRemoveRow={(uid) => {
								const rows = mouldingContext.rows.filter(
									(row) => String(row.uid || "") !== uid,
								);
								updateLine(
									line,
									buildWorkflowMouldingRowsPatch({
										line,
										rows,
										sharedComponentPrice: mouldingContext.sharedComponentPrice,
									}) as unknown as Partial<TLine>,
								);
							}}
						/>
					)
				}
				serviceLineItemPanel={
					props.slots?.renderServicePanel?.({
						line,
						rows: serviceContext.rows,
						updateRows: (rows) =>
							updateLine(
								line,
								buildWorkflowServiceRowsPatch({
									line,
									rows,
								}) as unknown as Partial<TLine>,
							),
					}) || (
						<ServiceLineItemsEditor
							rows={serviceContext.rows}
							formatMoney={(value) => moneyIfPositive(value) || null}
							onRowsChange={(rows) =>
								updateLine(
									line,
									buildWorkflowServiceRowsPatch({
										line,
										rows,
									}) as unknown as Partial<TLine>,
								)
							}
							createRow={(nextIndex) => ({
								uid: `service-${nextIndex}-${Date.now().toString(36)}`,
								service: "",
								taxxable: false,
								produceable: false,
								qty: 1,
								unitPrice: 0,
							})}
						/>
					)
				}
				shelfPanel={
					props.slots?.renderShelfPanel?.({
						line,
						sections: shelfContext.sections,
						updateSections: (sections) =>
							updateLine(
								line,
								buildWorkflowShelfSectionsPatch({
									sections,
									profileCoefficient: activeProfileCoefficient,
								}).linePatch as unknown as Partial<TLine>,
							),
					}) || (
						<DefaultShelfPanel
							sections={shelfContext.sections}
							categories={
								(shelfCategoriesQuery?.data || []) as Record<string, any>[]
							}
							productsByCategory={shelfProductsByCategory}
							profileCoefficient={activeProfileCoefficient}
							onSectionsChange={(sections) =>
								updateLine(
									line,
									buildWorkflowShelfSectionsPatch({
										sections,
										profileCoefficient: activeProfileCoefficient,
									}).linePatch as unknown as Partial<TLine>,
								)
							}
						/>
					)
				}
				componentPickerPanel={
					<WorkflowStepComponentPanel
						lineUid={String(line.uid || "")}
						activeStep={activeItemStep}
						activeStepIndex={activeIndex}
						steps={steps}
						loading={Boolean(stepComponentsQuery.isPending)}
						components={visibleComponents}
						filteredComponents={filteredVisibleComponents}
						selectedUids={selectedUids}
						search={componentSearch}
						includeCustomComponents={includeCustomComponents}
						redirectOptions={componentRedirectOptions}
						formatPrice={(value) => moneyIfPositive(Number(value || 0)) || ""}
						componentLabel={componentLabel}
						resolveImageSrc={(src) =>
							dataSource.resolveImageSrc?.(src) || src || null
						}
						onSearchChange={setComponentSearch}
						onJumpStep={(stepIndex) =>
							setActiveStep(String(line.uid || ""), stepIndex)
						}
						onSelectAll={() => {
							for (const component of visibleComponents) {
								selectComponent(line, steps, activeIndex, component, true);
							}
						}}
						onOpenPricing={
							props.slots?.componentActions?.onOpenPricing
								? (component) =>
										props.slots?.componentActions?.onOpenPricing?.(
											componentActionContext(component),
										)
								: undefined
						}
						onOpenDoorSizeVariant={
							props.slots?.componentActions?.onOpenDoorSizeVariant
								? () => {
										const component =
											visibleComponents.find((candidate) =>
												selectedUids.has(String(candidate.uid || "")),
											) ||
											visibleComponents[0] ||
											null;
										if (!component) return;
										props.slots?.componentActions?.onOpenDoorSizeVariant?.(
											componentActionContext(component),
										);
									}
								: undefined
						}
						onRefresh={() => void stepComponentsQuery.refetch?.()}
						onToggleCustomComponents={() =>
							setIncludeCustomComponents((prev) => !prev)
						}
						onEnableCustomComponent={
							props.slots?.componentActions?.onEnableCustomComponent
								? () =>
										props.slots?.componentActions?.onEnableCustomComponent?.({
											routeData,
											line,
											steps,
											step: activeItemStep,
											stepIndex: activeIndex,
										})
								: undefined
						}
						onProceedMultiSelect={() =>
							proceedMultiSelect(line, steps, activeIndex)
						}
						onEdit={
							props.slots?.componentActions?.onEdit
								? (component) =>
										props.slots?.componentActions?.onEdit?.(
											componentActionContext(component),
										)
								: undefined
						}
						onEditSectionOverride={
							props.slots?.componentActions?.onEditSectionOverride
								? (component) =>
										props.slots?.componentActions?.onEditSectionOverride?.(
											componentActionContext(component),
										)
								: undefined
						}
						onSelect={(component) =>
							selectComponent(line, steps, activeIndex, component)
						}
						onClearRedirect={
							props.slots?.componentActions?.onClearRedirect
								? (component) =>
										props.slots?.componentActions?.onClearRedirect?.(
											componentActionContext(component),
										)
								: undefined
						}
						onSetRedirect={
							props.slots?.componentActions?.onSetRedirect
								? (component, redirectUid) =>
										props.slots?.componentActions?.onSetRedirect?.({
											...componentActionContext(component),
											redirectUid,
										})
								: undefined
						}
						onDelete={
							props.slots?.componentActions?.onDelete
								? (component) =>
										props.slots?.componentActions?.onDelete?.(
											componentActionContext(component),
										)
								: undefined
						}
						onOpenDoorSizes={(component) => openDoorSizeModal(line, component)}
						onOpenMouldingQty={() => undefined}
						onCloseMouldingQty={() => undefined}
						onMouldingQtyChange={() => undefined}
						onAddMoulding={() => undefined}
					/>
				}
			/>
		);
	}

	const doorSizeModalLine =
		record.lineItems.find(
			(line) => String(line.uid || "") === String(doorSizeModal.lineUid || ""),
		) || null;
	const doorSizeModalSteps = doorSizeModalLine
		? getWorkflowSteps(doorSizeModalLine)
		: [];
	const doorSizeModalDoorStepIndex = doorSizeModalSteps.findIndex((step) =>
		isDoorStepTitle(step?.step?.title),
	);
	const doorSizeModalDoorStep =
		doorSizeModalDoorStepIndex >= 0
			? doorSizeModalSteps[doorSizeModalDoorStepIndex]
			: null;
	const doorSizeModalSupplier = getDoorSupplierMeta(doorSizeModalDoorStep);
	const doorSizeModalIsActiveDoorStep =
		Boolean(doorSizeModalLine) &&
		String(activeLine?.uid || "") === String(doorSizeModalLine?.uid || "") &&
		isDoorStepTitle(activeStep?.step?.title);
	const doorSizeModalRouteConfig = doorSizeModalLine
		? getRouteConfigForLine({
				routeData,
				line: doorSizeModalLine,
				step: doorSizeModalDoorStep || activeStep,
				component: doorSizeModal.component,
			})
		: null;
	const doorSwapModalLine =
		record.lineItems.find(
			(line) => String(line.uid || "") === String(doorSwapModal.lineUid || ""),
		) || null;
	const doorSwapModalSteps = doorSwapModalLine
		? getWorkflowSteps(doorSwapModalLine)
		: [];
	const doorSwapModalDoorStepIndex = doorSwapModalSteps.findIndex((step) =>
		isDoorStepTitle(step?.step?.title),
	);
	const doorSwapSelectedComponents = doorSwapModalLine
		? getSelectedDoorComponentsForLine(doorSwapModalLine, {
				availableComponents: visibleDoorComponents,
			})
		: [];
	const doorSwapSourceComponent =
		doorSwapSelectedComponents.find(
			(component) =>
				String(component?.uid || "") === String(doorSwapModal.sourceUid || ""),
		) || null;
	const doorSwapCandidates = visibleDoorComponents.filter(
		(component) =>
			String(component?.uid || "") !== String(doorSwapModal.sourceUid || ""),
	);

	return (
		<div className={props.className}>
			{actions.addLineItem ? (
				<div className="flex items-center justify-end border-b bg-card px-4 py-3">
					<Button size="sm" variant="outline" onClick={actions.addLineItem}>
						Add Item
					</Button>
				</div>
			) : null}
			<WorkflowLineList
				items={record.lineItems.map((line, index) => ({ line, index }))}
				activeLineUid={activeLine?.uid || activeItem || null}
				activeStepByLine={activeStepByLine}
				resolveActiveStepIndex={resolveInteractiveStepIndex}
				getLineTitlePlaceholder={(line) =>
					getLineTitlePlaceholder(line) || null
				}
				getLineDisplayTotal={(line) =>
					props.pricing?.getLineDisplayTotal?.(line) ??
					getWorkflowLineDisplayTotal(line, activeProfileCoefficient)
				}
				onActivateLine={(line, isActive) =>
					setActiveItem(isActive ? null : String(line.uid || ""))
				}
				onTitleChange={(line, value) =>
					updateLine(line, { title: value } as Partial<TLine>)
				}
				onRemoveLine={(line) => actions.removeLineItem(String(line.uid || ""))}
				onStepChange={(line, stepIndex) =>
					setActiveStep(String(line.uid || ""), stepIndex)
				}
				renderPanel={(line, steps, activeIndex, activeItemStep) =>
					renderPanel(
						line,
						getWorkflowSteps({ formSteps: steps }),
						activeIndex,
						activeItemStep,
					)
				}
				isRedirectDisabledStep={isRedirectDisabledStep}
				stepKey={stepKey}
				componentLabel={componentLabel}
			/>
			{doorSizeModalLine ? (
				<DoorSizeQtyDialog
					open={doorSizeModal.open}
					onOpenChange={(open) =>
						setDoorSizeModal((prev) => ({
							...prev,
							open,
							lineUid: open ? prev.lineUid : null,
							component: open ? prev.component : null,
						}))
					}
					line={doorSizeModalLine as any}
					routeData={routeData}
					component={doorSizeModal.component}
					supplierUid={doorSizeModalSupplier.supplierUid}
					supplierName={doorSizeModalSupplier.supplierName}
					suppliers={(doorSuppliersQuery?.data?.stepProducts || []).map(
						(supplier) => ({
							uid: String(supplier?.uid || ""),
							name: String(supplier?.name || ""),
						}),
					)}
					profileCoefficient={activeProfileCoefficient}
					routeConfig={doorSizeModalRouteConfig}
					onSupplierChange={(supplierUid) => {
						if (!doorSizeModalLine || doorSizeModalDoorStepIndex < 0) return;
						const supplier =
							supplierUid == null
								? null
								: (doorSuppliersQuery?.data?.stepProducts || []).find(
										(entry) =>
											String(entry?.uid || "") === String(supplierUid || ""),
									) || null;
						const patch = updateWorkflowDoorSupplier({
							line: doorSizeModalLine as any,
							stepIndex: doorSizeModalDoorStepIndex,
							supplier: supplier
								? {
										uid: supplier.uid,
										name: supplier.name,
									}
								: null,
							profileCoefficient: activeProfileCoefficient,
						});
						if (!patch) return;
						updateLine(doorSizeModalLine, patch as unknown as Partial<TLine>);
					}}
					onRemoveSelection={() => undefined}
					onNextStep={() => {
						if (!doorSizeModalLine || doorSizeModalDoorStepIndex < 0) return;
						setActiveStep(
							String(doorSizeModalLine.uid || ""),
							Math.min(
								doorSizeModalDoorStepIndex + 1,
								Math.max(0, doorSizeModalSteps.length - 1),
							),
						);
					}}
					onApply={({ rows, selected }) => {
						if (!doorSizeModalLine || !doorSizeModal.component) return;
						const next = buildWorkflowDoorSizeVariantPatch({
							line: doorSizeModalLine,
							componentId: Number(doorSizeModal.component.id || 0),
							rows,
							sharedDoorSurcharge: computeSharedDoorSurcharge(
								doorSizeModalLine as any,
							),
							profileCoefficient: activeProfileCoefficient,
						});
						updateLine(
							doorSizeModalLine,
							next.linePatch as unknown as Partial<TLine>,
						);

						if (!doorSizeModalIsActiveDoorStep) return;
						const firstResolvedRow = next.rows.find(
							(row) => Number(row.totalQty || 0) > 0,
						);
						const resolvedDoorComponent = firstResolvedRow
							? {
									...doorSizeModal.component,
									salesPrice: Number(firstResolvedRow.unitPrice || 0),
									basePrice: Number(firstResolvedRow?.meta?.baseUnitPrice || 0),
								}
							: doorSizeModal.component;
						selectComponent(
							doorSizeModalLine,
							doorSizeModalSteps,
							activeStepIndex,
							resolvedDoorComponent,
							selected,
						);
					}}
				/>
			) : null}
			{doorSwapModalLine ? (
				<DoorSwapDialog
					open={
						doorSwapModal.open &&
						String(doorSwapModal.lineUid || "") ===
							String(doorSwapModalLine.uid || "")
					}
					onOpenChange={(open) =>
						setDoorSwapModal((prev) => ({
							...prev,
							open,
							lineUid: open ? prev.lineUid : null,
							sourceUid: open ? prev.sourceUid : null,
						}))
					}
					sourceComponent={doorSwapSourceComponent}
					candidates={doorSwapCandidates}
					resolveImageSrc={(src) =>
						dataSource.resolveImageSrc?.(src) || src || null
					}
					componentLabel={componentLabel}
					formatPrice={moneyIfPositive}
					onSwap={(component) => {
						if (
							!doorSwapModalLine ||
							!doorSwapSourceComponent ||
							doorSwapModalDoorStepIndex < 0
						) {
							return;
						}
						const result = swapWorkflowDoorComponent({
							line: doorSwapModalLine,
							stepIndex: doorSwapModalDoorStepIndex,
							sourceComponent: doorSwapSourceComponent,
							targetComponent: component,
							profileCoefficient: activeProfileCoefficient,
						});
						if (!result) return;
						updateLine(
							doorSwapModalLine,
							result.linePatch as unknown as Partial<TLine>,
						);
						setActiveHptDoorUidByLine((prev) => ({
							...prev,
							[String(doorSwapModalLine.uid || "")]: result.activeDoorUid,
						}));
						setDoorSwapModal({
							open: false,
							lineUid: null,
							sourceUid: null,
						});
					}}
				/>
			) : null}
		</div>
	);
}

function priceComponent(
	component: WorkflowComponentRecord,
	activeStep: WorkflowStepRecord | null,
	overrides: Map<string, WorkflowComponentRecord>,
	selectedByStepUid: Record<string, string>,
	selectedProdUidsByStepUid: Record<string, string[]>,
	profileCoefficient: number,
) {
	const override = overrides.get(String(component?.uid || ""));
	const price = resolveComponentPriceByDeps(
		{
			...component,
			...(override || {}),
		},
		selectedByStepUid,
		{
			priceStepDeps: getStepPriceDeps(activeStep || null),
			selectedProdUidsByStepUid,
		},
	);
	const resolvedBasePrice =
		override?.basePrice == null
			? (price.basePrice ??
				component?.basePrice ??
				price.salesPrice ??
				component?.salesPrice)
			: override?.basePrice;
	const resolvedSalesPrice =
		override?.salesPrice == null
			? (price.salesPrice ?? component?.salesPrice)
			: override?.salesPrice;
	return {
		...component,
		...(override || {}),
		salesPrice: profileAdjustedSalesPrice(
			resolvedSalesPrice,
			resolvedBasePrice,
			profileCoefficient,
		),
		basePrice: Number(resolvedBasePrice ?? 0),
	};
}

function numericValue(value: unknown) {
	const next = Number(value || 0);
	return Number.isFinite(next) ? next : 0;
}

function DefaultFlatLineEditor<TLine extends WorkflowLineItemRecord>(props: {
	line: TLine;
	lineTotalMode: "editable" | "readonly";
	displayTotal: number;
	onUpdate: (patch: Partial<TLine>) => void;
}) {
	return (
		<div className="space-y-4 rounded-xl border bg-card p-3">
			<div className="grid gap-3 md:grid-cols-12">
				<label className="space-y-2 md:col-span-2">
					<span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
						Qty
					</span>
					<Input
						type="number"
						min={0}
						value={numericValue(props.line.qty)}
						onChange={(event) =>
							props.onUpdate({
								qty: Number(event.target.value || 0),
							} as unknown as Partial<TLine>)
						}
					/>
				</label>
				<label className="space-y-2 md:col-span-3">
					<span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
						Base Unit Price
					</span>
					<Input
						type="number"
						min={0}
						step="0.01"
						value={numericValue(props.line.unitPrice)}
						onChange={(event) =>
							props.onUpdate({
								unitPrice: Number(event.target.value || 0),
							} as unknown as Partial<TLine>)
						}
					/>
				</label>
				<label className="space-y-2 md:col-span-3">
					<span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
						Display Total
					</span>
					{props.lineTotalMode === "readonly" ? (
						<div className="flex h-9 items-center rounded-md border bg-muted/30 px-3 text-sm font-medium">
							{props.displayTotal.toFixed(2)}
						</div>
					) : (
						<Input
							type="number"
							min={0}
							step="0.01"
							value={numericValue(props.line.lineTotal)}
							onChange={(event) =>
								props.onUpdate({
									lineTotal: Number(event.target.value || 0),
								} as unknown as Partial<TLine>)
							}
						/>
					)}
				</label>
			</div>
			<label className="block space-y-2">
				<span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
					Description
				</span>
				<Textarea
					value={String(props.line.description || "")}
					onChange={(event) =>
						props.onUpdate({
							description: event.target.value,
						} as unknown as Partial<TLine>)
					}
					className="min-h-20"
				/>
			</label>
		</div>
	);
}

function DefaultShelfPanel(props: {
	sections: ShelfSectionDraft[];
	categories: Array<Record<string, any>>;
	productsByCategory: Map<number, ShelfProductOption[]>;
	profileCoefficient: number;
	onSectionsChange: (sections: ShelfSectionDraft[]) => void;
}) {
	function patchSection(
		sectionIndex: number,
		patch:
			| Record<string, any>
			| ((section: Record<string, any>) => Record<string, any>),
	) {
		props.onSectionsChange(
			props.sections.map((section, index) =>
				index === sectionIndex
					? typeof patch === "function"
						? patch(section)
						: { ...section, ...patch }
					: section,
			),
		);
	}

	return (
		<WorkflowShelfPanel
			sections={props.sections}
			onAddSection={() =>
				props.onSectionsChange([...props.sections, createShelfSectionDraft()])
			}
			renderSection={(section, sectionIndex) => {
				const categoryIds = Array.isArray(section?.categoryIds)
					? section.categoryIds
					: [];
				const leafCategoryIds = getShelfLeafCategoryIds(
					props.categories,
					categoryIds.length ? categoryIds[categoryIds.length - 1] : null,
				);
				const productOptions = Array.from(
					new Map(
						leafCategoryIds
							.flatMap(
								(categoryId) =>
									props.productsByCategory.get(Number(categoryId || 0)) || [],
							)
							.map((product) => [Number(product?.id || 0), product]),
					).values(),
				) as ShelfProductOption[];
				const productsById = buildShelfProductsById(productOptions);

				return (
					<section
						key={`shelf-section-${section.uid || sectionIndex}`}
						className="flex flex-col gap-3 rounded-lg border bg-muted/30 p-3"
					>
						<div className="flex flex-wrap items-center gap-2">
							<p className="text-xs font-semibold uppercase text-muted-foreground">
								Section {sectionIndex + 1}
							</p>
							<Badge variant="secondary" className="h-6 rounded-md px-2">
								{moneyIfPositive(section.subTotal) || "$0.00"}
							</Badge>
							<Button
								size="sm"
								variant="ghost"
								className="ml-auto"
								onClick={() =>
									patchSection(sectionIndex, {
										categoryIds: [],
										parentCategoryId: null,
										categoryId: null,
										rows: [createShelfProductDraft()],
									})
								}
							>
								Clear
							</Button>
							<Button
								size="sm"
								variant="destructive"
								onClick={() =>
									props.onSectionsChange(
										props.sections.filter((_section, i) => i !== sectionIndex),
									)
								}
							>
								Remove
							</Button>
						</div>

						<div className="grid gap-2 md:grid-cols-12">
							<div className="md:col-span-6">
								<ShelfCategoryPathInput
									categories={props.categories}
									categoryIds={categoryIds}
									onChange={(nextCategoryIds) =>
										patchSection(sectionIndex, {
											categoryIds: nextCategoryIds,
											parentCategoryId: nextCategoryIds[0] ?? null,
											categoryId: nextCategoryIds.length
												? nextCategoryIds[nextCategoryIds.length - 1]
												: null,
											rows: (section?.rows || []).map(
												(row: Record<string, any>) => ({
													...row,
													categoryId: nextCategoryIds.length
														? nextCategoryIds[nextCategoryIds.length - 1]
														: null,
													productId: null,
													description: "",
													unitPrice: 0,
													totalPrice: 0,
													meta: {
														...(row?.meta || {}),
														categoryIds: nextCategoryIds,
														shelfParentCategoryId: nextCategoryIds[0] ?? null,
														basePrice: 0,
														salesPrice: 0,
														customPrice: null,
													},
												}),
											),
										})
									}
								/>
							</div>
							<div className="flex items-center justify-end md:col-span-6">
								<Button
									size="sm"
									variant="outline"
									onClick={() =>
										patchSection(sectionIndex, (current) => ({
											...current,
											rows: [
												...(current?.rows || []),
												createShelfProductDraft(),
											],
										}))
									}
								>
									Add Product
								</Button>
							</div>
						</div>

						<div className="flex flex-col gap-2">
							{(section?.rows || []).map(
								(row: Record<string, any>, rowIndex: number) => (
									<div
										key={`shelf-row-${section.uid || sectionIndex}-${row.uid || rowIndex}`}
										className="grid gap-2 rounded-md border bg-background p-2 md:grid-cols-12"
									>
										<div className="md:col-span-5">
											<ShelfProductCombobox
												products={productOptions}
												value={row.productId}
												disabled={!categoryIds.length}
												formatMoney={(value) =>
													moneyIfPositive(Number(value || 0)) || ""
												}
												onChange={(productId) => {
													const selectedProduct =
														productsById.get(Number(productId || 0)) || null;
													const basePrice = Number(
														selectedProduct?.unitPrice || 0,
													);
													const salesPrice = profileAdjustedDoorSalesPrice(
														null,
														basePrice,
														props.profileCoefficient,
													);
													patchSection(sectionIndex, (current) => ({
														...current,
														rows: (current?.rows || []).map(
															(item: Record<string, any>, i: number) =>
																i === rowIndex
																	? {
																			...item,
																			categoryId: current?.categoryId ?? null,
																			productId,
																			description:
																				selectedProduct?.title ??
																				item.description,
																			basePrice,
																			salesPrice,
																			unitPrice: salesPrice,
																			totalPrice: Number(
																				(
																					Number(item?.qty ?? 1) * salesPrice
																				).toFixed(2),
																			),
																			meta: {
																				...(item?.meta || {}),
																				categoryIds: current?.categoryIds || [],
																				shelfParentCategoryId:
																					current?.parentCategoryId ?? null,
																				basePrice,
																				salesPrice,
																				customPrice: null,
																				unitPrice: salesPrice,
																			},
																		}
																	: item,
														),
													}));
												}}
											/>
										</div>
										<div className="flex h-10 items-center justify-end rounded-md border bg-muted/20 px-3 text-xs font-semibold md:col-span-2">
											{moneyIfPositive(getShelfRowDisplayUnitPrice(row)) ||
												"$0.00"}
										</div>
										<Input
											className="text-right md:col-span-1"
											type="number"
											value={row.qty || 0}
											onChange={(event) =>
												patchSection(sectionIndex, (current) => ({
													...current,
													rows: (current?.rows || []).map(
														(item: Record<string, any>, i: number) =>
															i === rowIndex
																? {
																		...item,
																		qty: Number(event.target.value || 0),
																	}
																: item,
													),
												}))
											}
										/>
										<div className="flex h-10 items-center justify-end rounded-md border bg-muted/20 px-3 text-xs font-semibold md:col-span-2">
											{moneyIfPositive(getShelfRowDisplayTotal(row)) || "$0.00"}
										</div>
										<Button
											className="md:col-span-2"
											variant="destructive"
											onClick={() =>
												patchSection(sectionIndex, (current) => ({
													...current,
													rows: (current?.rows || []).filter(
														(_item: unknown, i: number) => i !== rowIndex,
													),
												}))
											}
										>
											Remove
										</Button>
									</div>
								),
							)}
						</div>
					</section>
				);
			}}
		/>
	);
}

function WorkflowPanelToolbar(props: {
	count: number;
	total: number;
	search: string;
	includeCustomComponents: boolean;
	onSearchChange: (value: string) => void;
	onRefresh: () => void;
	onToggleCustom: () => void;
}) {
	return (
		<div className="mb-3 flex flex-wrap items-center gap-2">
			<input
				className="h-9 min-w-60 rounded-md border bg-background px-3 text-sm"
				value={props.search}
				onChange={(event) => props.onSearchChange(event.target.value)}
				placeholder="Search components"
			/>
			<span className="text-xs text-muted-foreground">
				{props.count} of {props.total}
			</span>
			<Menu
				noSize
				label={
					<button className="rounded-md border px-3 py-2 text-sm">
						Options
					</button>
				}
			>
				<Menu.Item onClick={props.onRefresh}>Refresh</Menu.Item>
				<Menu.Item onClick={props.onToggleCustom}>
					Enable Custom: {props.includeCustomComponents ? "On" : "Off"}
				</Menu.Item>
			</Menu>
		</div>
	);
}
