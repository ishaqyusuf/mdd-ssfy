"use client";

import { useMemo, useState } from "react";
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
	getSelectedProdUids,
	isComponentVisibleByRules,
	normalizeSalesFormTitle as normalizeTitle,
	resolveComponentPriceByDeps,
} from "../../domain";
import {
	applyMultiSelectStepMutation,
	applySingleSelectStepMutation,
} from "../../domain/mutation-engine";
import {
	buildStepComponentOverrideMap,
	buildWorkflowMouldingRowsContext,
	buildWorkflowMouldingRowsPatch,
	buildWorkflowServiceRowsContext,
	buildWorkflowServiceRowsPatch,
	buildWorkflowShelfSectionsContext,
	buildWorkflowShelfSectionsPatch,
	componentLabel,
	getItemWorkflowStepFamily,
	getLineTitlePlaceholder,
	getStepPriceDeps,
	getWorkflowLineDisplayTotal,
	getWorkflowSteps,
	isComponentEnabledForView,
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
	stepKey,
	useItemWorkflowController,
	WorkflowLineList,
	WorkflowStepComponentPanel,
	WorkflowStepRenderer,
	type WorkflowComponentRecord,
	type WorkflowLineItemRecord,
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
	const activeStepByLine =
		props.editor?.activeStepByLine || localActiveStepByLine;
	const activeItem =
		props.editor?.activeItem === undefined
			? localActiveItem
			: props.editor.activeItem;
	const routeQuery = dataSource.useStepRouting();
	const routeData = routeQuery.data || null;
	const profilesQuery = dataSource.useCustomerProfiles?.();
	const activeProfileCoefficient = useMemo(() => {
		const selectedProfileId = Number(record?.form?.customerProfileId || 0);
		if (!selectedProfileId) return 1;
		const profile = (profilesQuery?.data || []).find(
			(entry) => Number(entry?.id || 0) === selectedProfileId,
		);
		const coefficient = Number(profile?.coefficient || 0);
		return Number.isFinite(coefficient) && coefficient > 0 ? coefficient : 1;
	}, [profilesQuery?.data, record?.form?.customerProfileId]);
	const { activeLine, activeLineSteps, activeStepIndex, activeStep } =
		useItemWorkflowController({
			lineItems: record.lineItems,
			activeItem: activeItem || null,
			activeStepByLine,
			resolveActiveStepIndex: resolveInteractiveStepIndex,
			getItemLabel: lineItemPickerLabel,
		});
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

		const stepFamily = getItemWorkflowStepFamily(line, activeItemStep);
		const selectedUids = new Set(
			getSelectedProdUids(activeItemStep).map((uid) => String(uid || "")),
		);
		const filteredVisibleComponents = filterComponents(visibleComponents);
		return (
			<WorkflowStepRenderer
				stepFamily={stepFamily}
				isHousePackageToolStep={isHousePackageToolStepTitle(
					activeItemStep?.step?.title,
				)}
				isRedirectDisabled={isRedirectDisabledStep(activeItemStep)}
				housePackageToolPanel={
					props.slots?.renderHousePackageToolPanel?.({
						line,
						step: activeItemStep,
					}) || (
						<div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
							House package tool editing is available when the host supplies the
							HPT surface adapter.
						</div>
					)
				}
				redirectDisabledPanel={
					<div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
						This step is skipped by redirect and remains for context.
					</div>
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
						redirectOptions={[]}
						formatPrice={moneyIfPositive}
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
						onOpenPricing={() => undefined}
						onOpenDoorSizeVariant={() => undefined}
						onRefresh={() => void stepComponentsQuery.refetch?.()}
						onToggleCustomComponents={() =>
							setIncludeCustomComponents((prev) => !prev)
						}
						onEnableCustomComponent={() => setIncludeCustomComponents(true)}
						onProceedMultiSelect={() =>
							proceedMultiSelect(line, steps, activeIndex)
						}
						onEdit={() => undefined}
						onEditSectionOverride={() => undefined}
						onSelect={(component) =>
							selectComponent(line, steps, activeIndex, component)
						}
						onClearRedirect={() => undefined}
						onSetRedirect={() => undefined}
						onDelete={() => undefined}
						onOpenDoorSizes={() => undefined}
						onOpenMouldingQty={() => undefined}
						onCloseMouldingQty={() => undefined}
						onMouldingQtyChange={() => undefined}
						onAddMoulding={() => undefined}
					/>
				}
			/>
		);
	}

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
