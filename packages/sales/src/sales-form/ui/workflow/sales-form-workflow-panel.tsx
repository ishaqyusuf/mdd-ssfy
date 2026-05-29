"use client";

import { useCallback, useMemo, useState } from "react";
import { Badge } from "@gnd/ui/badge";
import { Button } from "@gnd/ui/button";
import { ConfirmBtn } from "@gnd/ui/confirm-button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@gnd/ui/dialog";
import { Menu } from "@gnd/ui/custom/menu";
import { Icon } from "@gnd/ui/icons";
import { Input } from "@gnd/ui/input";
import { Label } from "@gnd/ui/label";
import { Textarea } from "@gnd/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@gnd/ui/tooltip";
import type {
	SalesFormWorkflowActions,
	SalesFormWorkflowCapabilities,
	SalesFormWorkflowDataSource,
	SalesFormWorkflowEditorState,
	SalesFormWorkflowPricingSurface,
	SalesFormWorkflowRecord,
	SalesFormWorkflowSurfaceSlots,
} from "../../contracts";
import { createSalesFormWorkflowCapabilities } from "../../contracts";
import {
	buildSelectedByStepUid,
	buildSelectedProdUidsByStepUid,
	deriveDoorSizeCandidates,
	getRedirectableRoutes,
	getHptDoorSalesUnitPrice,
	getSelectedDoorComponentsForLine,
	getSelectedProdUids,
	getRouteConfigForLine,
	resolveConfiguredRouteStepsForLine,
	isComponentVisibleByRules,
	isMouldingItem,
	normalizeSalesFormTitle as normalizeTitle,
	resolveComponentPriceByDeps,
	resolveDoorTierPricing,
	searchShelfProductIndex,
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
	clearUnpricedDoorRowQty,
	componentLabel,
	computeSharedDoorSurcharge,
	createShelfProductDraft,
	createShelfSectionDraft,
	buildShelfProductsById,
	getDoorSupplierMeta,
	getItemWorkflowStepFamily,
	getLineTitlePlaceholder,
	getShelfLeafCategoryIds,
	getShelfRowBasePrice,
	getShelfRowDisplayTotal,
	getShelfRowDisplayUnitPrice,
	getShelfRowSalesPrice,
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
	DoorStepPanel,
	type DoorStepPanelTab,
	HousePackageToolPanel,
	MouldingLineItemsEditor,
	profileAdjustedDoorSalesPrice,
	removeWorkflowHptDoorOption,
	ServiceLineItemsEditor,
	ShelfCategoryPathInput,
	ShelfInlineItemsEditor,
	ShelfProductCombobox,
	stepKey,
	useItemWorkflowController,
	useMouldingWorkflow,
	WorkflowComponentPreview,
	WorkflowComponentToolbar,
	WorkflowLineList,
	WorkflowShelfPanel,
	WorkflowStepComponentPanel,
	WorkflowStepRenderer,
	swapWorkflowDoorComponent,
	updateWorkflowDoorSupplier,
	type WorkflowComponentRecord,
	type DoorStoredRow,
	type WorkflowLineItemRecord,
	type ShelfCategoryRecord,
	type ShelfProductOption,
	type ShelfRowDraft,
	type ShelfSectionDraft,
	type WorkflowStepRecord,
} from "./index";
import { WorkflowPanelNotice } from "./workflow-panel-notice";
import {
	resolveWorkflowRouteStatus,
	resolveWorkflowStepComponentStatus,
} from "./workflow-query-state";

export type SalesFormWorkflowPanelProps<
	TLine extends WorkflowLineItemRecord = WorkflowLineItemRecord,
> = {
	record: SalesFormWorkflowRecord<TLine>;
	editor?: SalesFormWorkflowEditorState;
	actions: SalesFormWorkflowActions<TLine>;
	dataSource: SalesFormWorkflowDataSource;
	pricing?: SalesFormWorkflowPricingSurface<TLine>;
	workflowCapabilities?: Partial<SalesFormWorkflowCapabilities>;
	slots?: SalesFormWorkflowSurfaceSlots<TLine>;
	className?: string;
};

export function SalesFormWorkflowPanel<
	TLine extends WorkflowLineItemRecord = WorkflowLineItemRecord,
>(props: SalesFormWorkflowPanelProps<TLine>) {
	const { record, dataSource, actions } = props;
	const workflowCapabilities = useMemo(
		() => createSalesFormWorkflowCapabilities(props.workflowCapabilities),
		[props.workflowCapabilities],
	);
	const [localActiveStepByLine, setLocalActiveStepByLine] = useState<
		Record<string, number>
	>({});
	const [localActiveItem, setLocalActiveItem] = useState<string | null>(
		record.lineItems[0]?.uid ? String(record.lineItems[0].uid) : null,
	);
	const [componentSearch, setComponentSearch] = useState("");
	const [includeCustomComponents, setIncludeCustomComponents] = useState(false);
	const [shelfUiVersion, setShelfUiVersion] = useState<"v1" | "v2">("v2");
	const [shelfProductSearch, setShelfProductSearch] = useState("");
	const [doorSectionTabByLine, setDoorSectionTabByLine] = useState<
		Record<string, DoorStepPanelTab>
	>({});
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
	const routeScopedLineItems = useMemo(
		() =>
			record.lineItems.map((line) => ({
				...line,
				formSteps: resolveConfiguredRouteStepsForLine({
					routeData,
					line,
				}),
			})),
		[record.lineItems, routeData],
	);
	const { activeLine, activeLineSteps, activeStepIndex, activeStep } =
		useItemWorkflowController({
			lineItems: routeScopedLineItems,
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
					(activeLine?.shelfItems || [])
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
		enabled: shelfUiVersion === "v1" && activeShelfCategoryIds.length > 0,
	});
	const hasShelfProductIndex = Boolean(dataSource.useShelfProductIndex);
	const shelfProductIndexQuery = dataSource.useShelfProductIndex?.({
		enabled: shelfUiVersion === "v2",
	});
	const selectedShelfProductIds = useMemo(
		() =>
			Array.from(
				new Set(
					(activeLine?.shelfItems || [])
						.map((row) => Number(row?.productId || 0))
						.filter((id) => id > 0),
				),
			),
		[activeLine?.shelfItems],
	);
	const shelfProductSearchQuery = dataSource.useShelfProductSearch?.({
		query: shelfProductSearch,
		selectedIds: selectedShelfProductIds,
		enabled: shelfUiVersion === "v2" && !hasShelfProductIndex,
		limit: shelfProductSearch.trim() ? 20 : 5,
	});
	const resolveShelfProductDetails = useCallback(
		async (product: ShelfProductOption) => {
			const productId = Number(product?.id || 0);
			if (!productId || !dataSource.getShelfProductDetails) return product;
			const details = await dataSource.getShelfProductDetails({
				ids: [productId],
			});
			return (
				(details.find((entry) => Number(entry?.id || 0) === productId) ||
					null) as ShelfProductOption | null
			);
		},
		[dataSource],
	);
	const doorSuppliersQuery = dataSource.useDoorSuppliers?.({
		enabled: Boolean(dataSource.useDoorSuppliers),
	});
	const shelfProductsByCategory = useMemo(() => {
		const bucket = new Map<number, ShelfProductOption[]>();
		for (const product of shelfProductsQuery?.data || []) {
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
	const shelfProducts = useMemo(() => {
		if (shelfProductIndexQuery?.data) {
			return searchShelfProductIndex(
				shelfProductIndexQuery.data as ShelfProductOption[],
				shelfProductSearch,
				{
					limit: shelfProductSearch.trim() ? 20 : 5,
					selectedIds: selectedShelfProductIds,
				},
			) as ShelfProductOption[];
		}
		return (shelfProductSearchQuery?.data || []) as ShelfProductOption[];
	}, [
		selectedShelfProductIds,
		shelfProductIndexQuery?.data,
		shelfProductSearch,
		shelfProductSearchQuery?.data,
	]);
	const activeProfileCoefficient = useMemo(() => {
		const pricingCoefficient = Number(props.pricing?.profileCoefficient || 0);
		if (Number.isFinite(pricingCoefficient) && pricingCoefficient > 0) {
			return pricingCoefficient;
		}
		const selectedProfileId = Number(record?.form?.customerProfileId || 0);
		if (!selectedProfileId) return 1;
		const profile = (profilesQuery?.data || []).find(
			(entry) => Number(entry?.id || 0) === selectedProfileId,
		);
		const coefficient = Number(profile?.coefficient || 0);
		return Number.isFinite(coefficient) && coefficient > 0 ? coefficient : 1;
	}, [
		profilesQuery?.data,
		props.pricing?.profileCoefficient,
		record?.form?.customerProfileId,
	]);
	const activePricingView = props.pricing?.activeView || "internal";
	const activeDealerSalesPercentage = Number(
		props.pricing?.dealerSalesPercentage || 0,
	);
	const activeSalesMultiplier = salesMultiplierForPricingView(
		activeProfileCoefficient,
		activePricingView,
		activeDealerSalesPercentage,
	);
	const activeDisplayProfileCoefficient =
		activeSalesMultiplier > 0
			? Number((1 / activeSalesMultiplier).toFixed(4))
			: activeProfileCoefficient;
	const dealerDoorPriceBreakdown = {
		enabled:
			workflowCapabilities.isDealershipMode &&
			(props.pricing?.showDealerPriceBreakdown ?? true),
		internalProfileCoefficient: activeProfileCoefficient,
		dealerSalesPercentage: activeDealerSalesPercentage,
		labels: props.pricing?.labels,
	};
	const pricingLabels = props.pricing?.labels;
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
	const activeSelectionState = useMemo(
		() => ({
			selectedByStepUid: buildSelectedByStepUid(activeLineSteps),
			selectedProdUidsByStepUid:
				buildSelectedProdUidsByStepUid(activeLineSteps),
		}),
		[activeLineSteps],
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
	const configuredRootComponentUids = useMemo(
		() => new Set(Object.keys(routeData?.composedRouter || {})),
		[routeData?.composedRouter],
	);
	const activeRootComponents = useMemo(() => {
		const roots = rootComponentsQuery.data || [];
		if (!configuredRootComponentUids.size) return [];
		return roots
			.filter((component) =>
				configuredRootComponentUids.has(String(component?.uid || "")),
			)
			.filter((component) =>
				isComponentEnabledForView(component, includeCustomComponents),
			)
			.filter((component) =>
				isComponentVisibleByRules(
					component,
					activeSelectionState.selectedByStepUid,
					activeSelectionState.selectedProdUidsByStepUid,
				),
			)
			.map((component) =>
				priceComponent(
					component,
					activeStep || null,
					activeStepComponentOverrides,
					activeSelectionState.selectedByStepUid,
					activeSelectionState.selectedProdUidsByStepUid,
					activeProfileCoefficient,
					activePricingView,
					activeDealerSalesPercentage,
				),
			);
	}, [
		activeDealerSalesPercentage,
		activeProfileCoefficient,
		activePricingView,
		activeSelectionState,
		activeStep,
		activeStepComponentOverrides,
		configuredRootComponentUids,
		includeCustomComponents,
		rootComponentsQuery.data,
	]);
	const visibleComponents = useMemo(() => {
		return (stepComponentsQuery.data || [])
			.filter((component) =>
				isComponentEnabledForView(component, includeCustomComponents),
			)
			.filter((component) =>
				isComponentVisibleByRules(
					component,
					activeSelectionState.selectedByStepUid,
					activeSelectionState.selectedProdUidsByStepUid,
				),
			)
			.map((component) =>
				priceComponent(
					component,
					activeStep || null,
					activeStepComponentOverrides,
					activeSelectionState.selectedByStepUid,
					activeSelectionState.selectedProdUidsByStepUid,
					activeProfileCoefficient,
					activePricingView,
					activeDealerSalesPercentage,
				),
			);
	}, [
		activeDealerSalesPercentage,
		activeProfileCoefficient,
		activePricingView,
		activeSelectionState,
		activeStep,
		activeStepComponentOverrides,
		includeCustomComponents,
		stepComponentsQuery.data,
	]);
	const visibleDoorComponents = useMemo(() => {
		return (doorComponentsQuery.data || [])
			.filter((component) =>
				isComponentEnabledForView(component, includeCustomComponents),
			)
			.filter((component) =>
				isComponentVisibleByRules(
					component,
					activeSelectionState.selectedByStepUid,
					activeSelectionState.selectedProdUidsByStepUid,
				),
			)
			.map((component) =>
				priceComponent(
					component,
					activeDoorStep || activeStep || null,
					buildStepComponentOverrideMap(activeDoorStep || null),
					activeSelectionState.selectedByStepUid,
					activeSelectionState.selectedProdUidsByStepUid,
					activeProfileCoefficient,
					activePricingView,
					activeDealerSalesPercentage,
				),
			);
	}, [
		activeDealerSalesPercentage,
		activeDoorStep,
		activeProfileCoefficient,
		activePricingView,
		activeSelectionState,
		activeStep,
		doorComponentsQuery.data,
		includeCustomComponents,
	]);
	const {
		mouldingSelectionPopover,
		mouldingQtyInputRef,
		openMouldingSelectionQtyPopover,
		saveMouldingSelectionWithQty,
		setMouldingSelectionQty,
		closeMouldingSelectionPopover,
	} = useMouldingWorkflow({
		activeLine,
		activeStep,
		activeStepIndex,
		normalizeTitle,
		visibleComponents,
		updateLineItem: (uid, patch) =>
			actions.updateLineItem(uid, patch as Partial<TLine>),
	});

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
		if (!workflowCapabilities.canEditFlatLineDetails) {
			return null;
		}

		const update = (patch: Partial<TLine>) => updateLine(line, patch);
		if (props.slots?.renderFlatLineEditor) {
			return props.slots.renderFlatLineEditor({ line, updateLine: update });
		}
		return (
			<DefaultFlatLineEditor
				line={line}
				lineTotalMode={
					workflowCapabilities.canEditLinePricing
						? props.pricing?.lineTotalMode || "editable"
						: "readonly"
				}
				canEditUnitPrice={workflowCapabilities.canEditLinePricing}
				displayTotal={
					props.pricing?.getLineDisplayTotal?.(line) ??
					getWorkflowLineDisplayTotal(line, activeDisplayProfileCoefficient)
				}
				onUpdate={update}
			/>
		);
	}

	function renderDefaultHousePackageToolPanel(
		line: TLine,
		step: WorkflowStepRecord,
	) {
		const rows = (
			Array.isArray(line.housePackageTool?.doors)
				? line.housePackageTool.doors || []
				: []
		).map(clearUnpricedDoorRowQty);
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
		const hasSwing = !!routeConfig?.hasSwing;
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
		const sharedDoorSurcharge = computeSharedDoorSurcharge(line);
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
				profileCoefficient: activeDisplayProfileCoefficient,
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
				salesMultiplier: activeSalesMultiplier,
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
					jambSizePrice: hasResolvedPrice
						? Number(tierPricing.salesPrice.toFixed(2))
						: 0,
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
						doorSalesUnitPrice: hasResolvedPrice
							? Number(tierPricing.salesPrice.toFixed(2))
							: 0,
						sharedDoorSurcharge,
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
				profileCoefficient={activeDisplayProfileCoefficient}
				canSwapDoor={Boolean(swapDoorCandidates.length)}
				canEditPricing={workflowCapabilities.canEditLinePricing}
				pricingLabels={pricingLabels}
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
			const rootLoading = Boolean(
				routeQuery.isPending || rootComponentsQuery.isPending,
			);
			const rootStatus = resolveWorkflowRouteStatus({
				routeQuery,
				rootComponentsQuery,
				routeReady: Boolean(routeData),
				rootStepId,
				rootComponentsCount: activeRootComponents.length,
				isLoading: rootLoading,
			});
			const refreshRootData = () => {
				void routeQuery.refetch?.();
				void rootComponentsQuery.refetch?.();
			};
			const rootNoticeSlot = rootStatus ? (
				<WorkflowPanelNotice {...rootStatus} onRetry={refreshRootData} />
			) : null;

			return (
				<div className="flex flex-col gap-4">
					{renderFlatLineEditor(line)}
					<RootComponentPicker
						loading={rootLoading}
						noticeSlot={rootNoticeSlot}
						components={activeRootComponents}
						filteredComponents={filteredRootComponents}
						search={componentSearch}
						getKey={(component) => String(component.uid || component.id || "")}
						renderComponent={(component) => (
							<button
								type="button"
								className="w-full overflow-hidden rounded-xl border bg-card text-left transition hover:border-primary"
								onClick={() => selectRoot(line, component)}
							>
								<WorkflowComponentPreview
									imageSrc={
										dataSource.resolveImageSrc?.(component.img) ||
										String(component.img || "")
									}
									alt={component.title || component.uid || "Component"}
									title={componentLabel(component.title || component.uid)}
									price={moneyIfPositive(component.salesPrice)}
								/>
							</button>
						)}
						toolbarSlot={
							<WorkflowComponentToolbar
								count={filteredRootComponents.length}
								total={activeRootComponents.length}
								search={componentSearch}
								maxWidthClassName="max-w-2xl"
								onSearchChange={setComponentSearch}
								menuSlot={
									!workflowCapabilities.isDealershipMode ? (
										<>
											<Menu.Item onClick={refreshRootData}>Refresh</Menu.Item>
											<Menu.Item
												onClick={() =>
													setIncludeCustomComponents((prev) => !prev)
												}
											>
												Enable Custom: {includeCustomComponents ? "On" : "Off"}
											</Menu.Item>
										</>
									) : null
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

		const stepFamily = getItemWorkflowStepFamily(line, activeItemStep);
		const isDoorStep = isDoorStepTitle(activeItemStep?.step?.title);
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
		const mouldingContext = buildWorkflowMouldingRowsContext(line);
		const serviceContext = buildWorkflowServiceRowsContext(line);
		const shelfContext = buildWorkflowShelfSectionsContext(
			line,
			activeDisplayProfileCoefficient,
		);
		const activeDoorSupplier = getDoorSupplierMeta(activeItemStep);
		const doorSupplierPanel = props.slots?.renderDoorSupplierPanel?.({
			line,
			step: activeItemStep,
			stepIndex: activeIndex,
			supplierUid: activeDoorSupplier.supplierUid,
			supplierName: activeDoorSupplier.supplierName,
			suppliers: doorSuppliersQuery?.data?.stepProducts || [],
			refetchSuppliers: doorSuppliersQuery?.refetch,
			updateSupplier: (supplier) => {
				const patch = updateWorkflowDoorSupplier({
					line,
					stepIndex: activeIndex,
					supplier,
					profileCoefficient: activeDisplayProfileCoefficient,
				});
				if (!patch) return;
				updateLine(line, patch as unknown as Partial<TLine>);
			},
		});
		const doorSectionTab =
			doorSectionTabByLine[String(line.uid || "")] || "doors";
		const componentStatus = resolveWorkflowStepComponentStatus({
			stepQuery: stepComponentsQuery,
			stepTitle: activeItemStep?.step?.title,
			componentsCount: visibleComponents.length,
		});
		const componentPickerPanel = (
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
				noticeSlot={
					componentStatus ? (
						<WorkflowPanelNotice
							{...componentStatus}
							onRetry={() => void stepComponentsQuery.refetch?.()}
						/>
					) : null
				}
				includeCustomComponents={includeCustomComponents}
				isDealershipMode={workflowCapabilities.isDealershipMode}
				mouldingSelection={{
					open: mouldingSelectionPopover.open,
					lineUid: mouldingSelectionPopover.lineUid,
					stepIndex: mouldingSelectionPopover.stepIndex,
					componentUid: mouldingSelectionPopover.component?.uid || null,
					qty: mouldingSelectionPopover.qty,
					inputRef: mouldingQtyInputRef,
				}}
				isMouldingSelectionStep={
					isMouldingItem(line) &&
					normalizeTitle(activeItemStep?.step?.title) === "moulding"
				}
				redirectOptions={componentRedirectOptions}
				formatPrice={(value) => moneyIfPositive(Number(value || 0)) || ""}
				componentLabel={componentLabel}
				resolveImageSrc={(src) =>
					dataSource.resolveImageSrc?.(src) || src || null
				}
				calculatorSlot={(component) =>
					dataSource.renderMouldingCalculator?.({
						title: String(component?.title || ""),
						unitPrice: Number(component?.salesPrice || 0),
						qty: Number(mouldingSelectionPopover.qty || 0),
						onCalculate: (qty) =>
							setMouldingSelectionQty(
								String(Math.max(1, Number(qty || 0) || 1)),
							),
					})
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
				onOpenMouldingQty={(component) =>
					openMouldingSelectionQtyPopover(line, activeIndex, component)
				}
				onCloseMouldingQty={closeMouldingSelectionPopover}
				onMouldingQtyChange={setMouldingSelectionQty}
				onAddMoulding={(component) =>
					saveMouldingSelectionWithQty(
						line,
						steps,
						activeIndex,
						component,
						mouldingSelectionPopover.qty,
						activeItemStep?.step?.title,
					)
				}
			/>
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
							canEditPricing={workflowCapabilities.canEditLinePricing}
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
							renderCalculator={
								dataSource.renderMouldingCalculator
									? ({ row, onCalculate }) =>
											dataSource.renderMouldingCalculator?.({
												title: String(row.title || ""),
												unitPrice: Number(row.estimateUnit || 0),
												qty: Number(row.qty || 0),
												onCalculate,
											})
									: undefined
							}
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
							canEditPricing={workflowCapabilities.canEditLinePricing}
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
									profileCoefficient: activeDisplayProfileCoefficient,
								}).linePatch as unknown as Partial<TLine>,
							),
					}) ||
					(() => {
						const updateShelfSections = (sections: ShelfSectionDraft[]) =>
							updateLine(
								line,
								buildWorkflowShelfSectionsPatch({
									sections,
									profileCoefficient: activeDisplayProfileCoefficient,
								}).linePatch as unknown as Partial<TLine>,
							);
						const versionToggle =
							process.env.NODE_ENV !== "production" ? (
								<div className="ml-auto flex items-center gap-1 rounded-md border bg-muted/30 p-1">
									<Button
										type="button"
										size="sm"
										className="h-7 px-2 text-xs"
										variant={shelfUiVersion === "v1" ? "default" : "ghost"}
										aria-pressed={shelfUiVersion === "v1"}
										onClick={() => setShelfUiVersion("v1")}
									>
										V1
									</Button>
									<Button
										type="button"
										size="sm"
										className="h-7 px-2 text-xs"
										variant={shelfUiVersion === "v2" ? "default" : "ghost"}
										aria-pressed={shelfUiVersion === "v2"}
										onClick={() => setShelfUiVersion("v2")}
									>
										V2
									</Button>
								</div>
							) : null;

						return shelfUiVersion === "v1" ? (
							<div className="space-y-3">
								{versionToggle}
								<DefaultShelfPanel
									sections={shelfContext.sections}
									categories={shelfCategoriesQuery?.data || []}
									productsByCategory={shelfProductsByCategory}
									profileCoefficient={activeDisplayProfileCoefficient}
									canEditPricing={workflowCapabilities.canEditLinePricing}
									onSectionsChange={updateShelfSections}
								/>
							</div>
						) : (
							<ShelfInlineItemsEditor
								sections={shelfContext.sections}
								categories={shelfCategoriesQuery?.data || []}
								products={shelfProducts}
								profileCoefficient={activeDisplayProfileCoefficient}
								canEditPricing={workflowCapabilities.canEditLinePricing}
								formatMoney={(value) => moneyIfPositive(value) || null}
								headerSlot={versionToggle}
								onProductSearchChange={setShelfProductSearch}
								isSearchingProducts={Boolean(
									shelfProductIndexQuery?.isPending ||
										shelfProductIndexQuery?.isFetching ||
										shelfProductSearchQuery?.isPending ||
										shelfProductSearchQuery?.isFetching,
								)}
								onResolveProductDetails={resolveShelfProductDetails}
								onSectionsChange={updateShelfSections}
							/>
						);
					})()
				}
				componentPickerPanel={
					isDoorStep && doorSupplierPanel ? (
						<DoorStepPanel
							title={activeItemStep?.step?.title || "Door"}
							isDoorStep
							activeTab={doorSectionTab}
							supplierName={activeDoorSupplier.supplierName}
							onTabChange={(tab) =>
								setDoorSectionTabByLine((prev) => ({
									...prev,
									[String(line.uid || "")]: tab,
								}))
							}
						>
							{doorSectionTab === "suppliers"
								? doorSupplierPanel
								: componentPickerPanel}
						</DoorStepPanel>
					) : (
						componentPickerPanel
					)
				}
			/>
		);
	}

	const doorSizeModalLine =
		routeScopedLineItems.find(
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
		routeScopedLineItems.find(
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
					<Button
						type="button"
						size="sm"
						variant="outline"
						onClick={actions.addLineItem}
					>
						Add Item
					</Button>
				</div>
			) : null}
			{routeScopedLineItems.length ? (
				<WorkflowLineList
					items={routeScopedLineItems.map((line, index) => ({ line, index }))}
					activeLineUid={activeLine?.uid || activeItem || null}
					activeStepByLine={activeStepByLine}
					resolveActiveStepIndex={resolveInteractiveStepIndex}
					getLineTitlePlaceholder={(line) =>
						getLineTitlePlaceholder(line) || null
					}
					getLineDisplayTotal={(line) =>
						props.pricing?.getLineDisplayTotal?.(line) ??
						getWorkflowLineDisplayTotal(line, activeDisplayProfileCoefficient)
					}
					onActivateLine={(line, isActive) =>
						setActiveItem(isActive ? null : String(line.uid || ""))
					}
					onTitleChange={(line, value) =>
						updateLine(line, { title: value } as Partial<TLine>)
					}
					onRemoveLine={(line) =>
						actions.removeLineItem(String(line.uid || ""))
					}
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
			) : (
				<div className="p-4">
					<WorkflowPanelNotice
						tone="empty"
						title="No line items"
						description="Add an item to start the workflow."
						actionLabel="Add Item"
						onRetry={actions.addLineItem}
					/>
				</div>
			)}
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
					line={doorSizeModalLine}
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
					profileCoefficient={activeDisplayProfileCoefficient}
					priceBreakdown={dealerDoorPriceBreakdown}
					pricingLabels={pricingLabels}
					routeConfig={doorSizeModalRouteConfig}
					canEditPricing={workflowCapabilities.canEditLinePricing}
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
							line: doorSizeModalLine,
							stepIndex: doorSizeModalDoorStepIndex,
							supplier: supplier
								? {
										uid: supplier.uid,
										name: supplier.name,
									}
								: null,
							profileCoefficient: activeDisplayProfileCoefficient,
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
						const sharedDoorSurcharge =
							computeSharedDoorSurcharge(doorSizeModalLine);
						const next = buildWorkflowDoorSizeVariantPatch({
							line: doorSizeModalLine,
							componentId: Number(doorSizeModal.component.id || 0),
							rows,
							sharedDoorSurcharge,
							profileCoefficient: activeDisplayProfileCoefficient,
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
									salesPrice: Number(
										getHptDoorSalesUnitPrice(firstResolvedRow, {
											sharedDoorSurcharge,
											profileCoefficient: activeDisplayProfileCoefficient,
										}) || 0,
									),
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
							profileCoefficient: activeDisplayProfileCoefficient,
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
	pricingView: "internal" | "dealer" = "internal",
	dealerSalesPercentage = 0,
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
	const internalSalesPrice = profileAdjustedSalesPrice(
		resolvedSalesPrice,
		resolvedBasePrice,
		profileCoefficient,
	);
	const dealerMultiplier =
		pricingView === "dealer"
			? 1 + Number(dealerSalesPercentage || 0) / 100
			: 1;
	return {
		...component,
		...(override || {}),
		salesPrice: Number((internalSalesPrice * dealerMultiplier).toFixed(2)),
		basePrice: Number(resolvedBasePrice ?? 0),
	};
}

function salesMultiplierForPricingView(
	profileCoefficient: number,
	pricingView: "internal" | "dealer",
	dealerSalesPercentage: number,
) {
	const internalMultiplier =
		Number.isFinite(profileCoefficient) && profileCoefficient > 0
			? Number((1 / profileCoefficient).toFixed(2))
			: 1;
	const dealerMultiplier =
		pricingView === "dealer" ? 1 + Number(dealerSalesPercentage || 0) / 100 : 1;
	return Number((internalMultiplier * dealerMultiplier).toFixed(4));
}

function numericValue(value: unknown) {
	const next = Number(value || 0);
	return Number.isFinite(next) ? next : 0;
}

function DefaultFlatLineEditor<TLine extends WorkflowLineItemRecord>(props: {
	line: TLine;
	lineTotalMode: "editable" | "readonly";
	canEditUnitPrice: boolean;
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
						disabled={!props.canEditUnitPrice}
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
	categories: ShelfCategoryRecord[];
	productsByCategory: Map<number, ShelfProductOption[]>;
	profileCoefficient: number;
	canEditPricing: boolean;
	onSectionsChange: (sections: ShelfSectionDraft[]) => void;
}) {
	const [pendingShelfClear, setPendingShelfClear] = useState<{
		sectionUid: string;
		scope: "category" | "section";
	} | null>(null);

	function patchSection(
		sectionIndex: number,
		patch:
			| Partial<ShelfSectionDraft>
			| ((section: ShelfSectionDraft) => ShelfSectionDraft),
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
				const sectionHasSelectedProducts = (section?.rows || []).some(
					(row: ShelfRowDraft) => Number(row?.productId || 0) > 0,
				);

				return (
					<section
						key={`shelf-section-${section.uid || sectionIndex}`}
						className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/60 p-3"
					>
						<Dialog
							open={
								pendingShelfClear?.sectionUid === String(section.uid) &&
								(pendingShelfClear?.scope === "category" ||
									pendingShelfClear?.scope === "section")
							}
							onOpenChange={(open) => {
								if (!open) setPendingShelfClear(null);
							}}
						>
							<DialogContent className="max-w-sm">
								<DialogHeader>
									<DialogTitle>Clear Categories</DialogTitle>
									<DialogDescription>
										Clearing categories will remove all selected products in
										this section.
									</DialogDescription>
								</DialogHeader>
								<DialogFooter>
									<Button
										type="button"
										variant="secondary"
										onClick={() => setPendingShelfClear(null)}
									>
										Cancel
									</Button>
									<Button
										type="button"
										variant="destructive"
										onClick={() => {
											patchSection(sectionIndex, {
												categoryIds: [],
												parentCategoryId: null,
												categoryId: null,
												rows: [createShelfProductDraft()],
											});
											setPendingShelfClear(null);
										}}
									>
										Continue
									</Button>
								</DialogFooter>
							</DialogContent>
						</Dialog>
						<div className="flex flex-wrap items-center gap-2">
							<p className="text-xs font-bold uppercase tracking-wide text-slate-700">
								Section {sectionIndex + 1}
							</p>
							<Badge variant="secondary" className="h-6 rounded-full px-2">
								{moneyIfPositive(section.subTotal) || "$0.00"}
							</Badge>
							<Button
								type="button"
								size="sm"
								variant="ghost"
								className="ml-auto"
								onClick={() => {
									if (sectionHasSelectedProducts) {
										setPendingShelfClear({
											sectionUid: String(section.uid),
											scope: "section",
										});
										return;
									}
									patchSection(sectionIndex, {
										categoryIds: [],
										parentCategoryId: null,
										categoryId: null,
										rows: [createShelfProductDraft()],
									});
								}}
							>
								Clear
							</Button>
							<Tooltip>
								<TooltipTrigger asChild>
									<ConfirmBtn
										type="button"
										size="icon-sm"
										variant="ghost"
										trash
										aria-label="Remove section"
										onClick={() =>
											props.onSectionsChange(
												props.sections.filter(
													(_section, i) => i !== sectionIndex,
												),
											)
										}
									/>
								</TooltipTrigger>
								<TooltipContent side="left" className="px-2 py-1 text-xs">
									Remove section
								</TooltipContent>
							</Tooltip>
						</div>

						<div className="grid gap-2 md:grid-cols-12">
							<div className="md:col-span-6">
								<ShelfCategoryPathInput
									categories={props.categories}
									categoryIds={categoryIds}
									onClearRequest={() => {
										if (sectionHasSelectedProducts) {
											setPendingShelfClear({
												sectionUid: String(section.uid),
												scope: "category",
											});
											return;
										}
										patchSection(sectionIndex, {
											categoryIds: [],
											parentCategoryId: null,
											categoryId: null,
											rows: (section?.rows || []).map((row: ShelfRowDraft) => ({
												...row,
												categoryId: null,
												productId: null,
												description: "",
												unitPrice: 0,
												totalPrice: 0,
												meta: {
													...(row?.meta || {}),
													categoryIds: [],
													shelfParentCategoryId: null,
													basePrice: 0,
													salesPrice: 0,
													customPrice: null,
												},
											})),
										});
									}}
									onChange={(nextCategoryIds) =>
										patchSection(sectionIndex, {
											categoryIds: nextCategoryIds,
											parentCategoryId: nextCategoryIds[0] ?? null,
											categoryId: nextCategoryIds.length
												? (nextCategoryIds[nextCategoryIds.length - 1] ?? null)
												: null,
											rows: (section?.rows || []).map((row: ShelfRowDraft) => ({
												...row,
												categoryId: nextCategoryIds.length
													? (nextCategoryIds[nextCategoryIds.length - 1] ??
														null)
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
											})),
										})
									}
								/>
							</div>
							<div className="flex items-center justify-end md:col-span-6">
								<Tooltip>
									<TooltipTrigger asChild>
										<Button
											type="button"
											size="icon-sm"
											variant="outline"
											aria-label="Add product"
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
											<Icon name="Plus" className="size-4" />
										</Button>
									</TooltipTrigger>
									<TooltipContent side="left" className="px-2 py-1 text-xs">
										Add product
									</TooltipContent>
								</Tooltip>
							</div>
						</div>

						<div className="space-y-2">
							<div className="hidden grid-cols-12 gap-2 px-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground md:grid">
								<span className="md:col-span-5">Product</span>
								<span className="text-right md:col-span-2">Price</span>
								<span className="text-right md:col-span-1">Qty</span>
								<span className="text-right md:col-span-2">Total</span>
								<span className="md:col-span-1" />
							</div>
							{(section?.rows || []).map(
								(row: ShelfRowDraft, rowIndex: number) => (
									<div
										key={`shelf-row-${section.uid || sectionIndex}-${row.uid || rowIndex}`}
										className="grid gap-2 rounded-lg border border-white/80 bg-white p-2 md:grid-cols-12"
									>
										<div className="md:col-span-5">
											<ShelfProductCombobox
												products={productOptions}
												value={row.productId}
												disabled={!categoryIds.length}
												formatMoney={(value) =>
													moneyIfPositive(Number(value || 0)) || ""
												}
												onClearRequest={() =>
													patchSection(sectionIndex, (current) => ({
														...current,
														rows: (current?.rows || []).map(
															(item: ShelfRowDraft, i: number) =>
																i === rowIndex
																	? {
																			...item,
																			productId: null,
																			description: "",
																			basePrice: 0,
																			salesPrice: 0,
																			customPrice: null,
																			unitPrice: 0,
																			totalPrice: 0,
																			meta: {
																				...(item?.meta || {}),
																				basePrice: 0,
																				salesPrice: 0,
																				customPrice: null,
																			},
																		}
																	: item,
														),
													}))
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
															(item: ShelfRowDraft, i: number) =>
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
										<div className="md:col-span-2">
											{props.canEditPricing ? (
												<Menu
													noSize
													Icon={null}
													label={
														<Button
															type="button"
															variant="outline"
															className="h-10 w-full justify-end text-xs font-semibold"
														>
															{moneyIfPositive(
																getShelfRowDisplayUnitPrice(row),
															) || "$0.00"}
														</Button>
													}
												>
													<div className="min-w-[260px] space-y-3 p-2">
														<div className="space-y-1">
															<p className="text-xs font-bold uppercase text-muted-foreground">
																Edit Shelf Price
															</p>
															<p className="text-xs text-muted-foreground">
																Base price recalculates sales price. Custom
																price overrides the final line price.
															</p>
														</div>
														<div className="space-y-2">
															<Label className="text-xs">Base Price</Label>
															<Input
																type="number"
																step="0.01"
																value={getShelfRowBasePrice(row)}
																onChange={(event) =>
																	patchSection(sectionIndex, (current) => ({
																		...current,
																		rows: (current?.rows || []).map(
																			(item: ShelfRowDraft, i: number) => {
																				if (i !== rowIndex) return item;
																				const nextBase = Number(
																					event.target.value || 0,
																				);
																				const nextSales =
																					profileAdjustedDoorSalesPrice(
																						null,
																						nextBase,
																						props.profileCoefficient,
																					);
																				const customPrice =
																					item?.customPrice ??
																					item?.meta?.customPrice ??
																					null;
																				const unitPrice =
																					customPrice != null
																						? Number(customPrice)
																						: nextSales;
																				return {
																					...item,
																					basePrice: nextBase,
																					salesPrice: nextSales,
																					unitPrice,
																					totalPrice: Number(
																						(
																							Number(item?.qty ?? 1) * unitPrice
																						).toFixed(2),
																					),
																					meta: {
																						...(item?.meta || {}),
																						basePrice: nextBase,
																						salesPrice: nextSales,
																						unitPrice,
																					},
																				};
																			},
																		),
																	}))
																}
															/>
														</div>
														<div className="flex justify-between text-xs">
															<span className="text-muted-foreground">
																Calculated Sales
															</span>
															<span className="font-semibold">
																{moneyIfPositive(getShelfRowSalesPrice(row)) ||
																	"$0.00"}
															</span>
														</div>
														<div className="space-y-2">
															<Label className="text-xs">Custom Price</Label>
															<Input
																type="number"
																step="0.01"
																value={row?.meta?.customPrice ?? ""}
																onChange={(event) =>
																	patchSection(sectionIndex, (current) => ({
																		...current,
																		rows: (current?.rows || []).map(
																			(item: ShelfRowDraft, i: number) =>
																				i === rowIndex
																					? {
																							...item,
																							customPrice:
																								event.target.value === ""
																									? null
																									: Number(
																											event.target.value || 0,
																										),
																							unitPrice:
																								event.target.value === ""
																									? Number(
																											item?.salesPrice ??
																												item?.meta
																													?.salesPrice ??
																												item?.unitPrice ??
																												0,
																										)
																									: Number(
																											event.target.value || 0,
																										),
																							meta: {
																								...(item?.meta || {}),
																								customPrice:
																									event.target.value === ""
																										? null
																										: Number(
																												event.target.value || 0,
																											),
																							},
																						}
																					: item,
																		),
																	}))
																}
															/>
														</div>
													</div>
												</Menu>
											) : (
												<div className="flex h-10 items-center justify-end rounded-md border bg-muted/20 px-3 text-xs font-semibold">
													{moneyIfPositive(getShelfRowDisplayUnitPrice(row)) ||
														"$0.00"}
												</div>
											)}
										</div>
										<Input
											className="text-right md:col-span-1"
											type="number"
											value={row.qty || 0}
											onChange={(event) =>
												patchSection(sectionIndex, (current) => ({
													...current,
													rows: (current?.rows || []).map(
														(item: ShelfRowDraft, i: number) =>
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
