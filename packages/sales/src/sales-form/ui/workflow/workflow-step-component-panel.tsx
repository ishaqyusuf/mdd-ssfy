/** @jsxImportSource react */
"use client";

import type { ReactNode, RefObject } from "react";
import { Button } from "@gnd/ui/button";
import { Menu } from "@gnd/ui/custom/menu";
import {
	isDoorStepTitle,
	isMultiSelectStepTitle,
	type WorkflowComponentRecord,
	type WorkflowStepRecord,
} from "./workflow-records";
import { StepComponentPicker } from "./step-component-picker";
import { MouldingSelectionPopover } from "./moulding-selection-popover";
import { WorkflowComponentActionMenu } from "./workflow-component-action-menu";
import { WorkflowComponentBadges } from "./workflow-component-badges";
import { WorkflowComponentCard } from "./workflow-component-card";
import { WorkflowComponentPreview } from "./workflow-component-preview";
import { WorkflowComponentToolbar } from "./workflow-component-toolbar";

export type WorkflowStepComponentPanelRedirectOption = {
	uid: string;
	title: string;
};

export type WorkflowMouldingSelectionState = {
	open: boolean;
	lineUid?: string | null;
	stepIndex?: number | null;
	componentUid?: string | null;
	qty: string;
	inputRef?: RefObject<HTMLInputElement | null>;
};

export type WorkflowStepComponentPanelProps<
	TComponent extends WorkflowComponentRecord,
> = {
	lineUid: string;
	activeStep: WorkflowStepRecord;
	activeStepIndex: number;
	steps: WorkflowStepRecord[];
	loading: boolean;
	components: TComponent[];
	filteredComponents: TComponent[];
	selectedUids: Set<string>;
	search: string;
	noticeSlot?: ReactNode;
	includeCustomComponents: boolean;
	isDealershipMode: boolean;
	mouldingSelection?: WorkflowMouldingSelectionState;
	isMouldingSelectionStep?: boolean;
	redirectOptions: WorkflowStepComponentPanelRedirectOption[];
	formatPrice: (value: unknown) => string;
	componentLabel: (value?: string | null) => string;
	resolveImageSrc: (value?: string | null) => string | null;
	calculatorSlot?: (component: TComponent) => ReactNode;
	onSearchChange: (value: string) => void;
	onJumpStep: (index: number) => void;
	onSelectAll: () => void;
	onOpenPricing?: (component: TComponent) => void;
	onOpenDoorSizeVariant?: () => void;
	onEnableCustomComponent?: () => void;
	onRefresh: () => void;
	onToggleCustomComponents: () => void;
	onProceedMultiSelect: () => void;
	onEdit?: (component: TComponent) => void;
	onEditSectionOverride?: (component: TComponent) => void;
	onSelect: (component: TComponent) => void;
	onClearRedirect?: (component: TComponent) => void;
	onSetRedirect?: (component: TComponent, uid: string) => void;
	onDelete?: (component: TComponent) => void;
	onOpenDoorSizes: (component: TComponent) => void;
	onOpenMouldingQty: (component: TComponent) => void;
	onCloseMouldingQty: () => void;
	onMouldingQtyChange: (qty: string) => void;
	onAddMoulding: (component: TComponent) => void;
};

export function WorkflowStepComponentPanel<
	TComponent extends WorkflowComponentRecord,
>(props: WorkflowStepComponentPanelProps<TComponent>) {
	const activeStepTitle = props.activeStep?.step?.title;
	const activeStepMeta =
		props.activeStep?.step?.meta &&
		typeof props.activeStep.step.meta === "object" &&
		!Array.isArray(props.activeStep.step.meta)
			? (props.activeStep.step.meta as Record<string, unknown>)
			: {};
	const activeFormStepMeta =
		props.activeStep?.meta &&
		typeof props.activeStep.meta === "object" &&
		!Array.isArray(props.activeStep.meta)
			? (props.activeStep.meta as Record<string, unknown>)
			: {};
	const isDoorStep = isDoorStepTitle(activeStepTitle);
	const isMultiSelectStep = isMultiSelectStepTitle(activeStepTitle);
	const supportsCustomComponents = Boolean(
		activeStepMeta.custom || activeFormStepMeta.custom,
	);

	return (
		<StepComponentPicker
			loading={props.loading}
			hasComponents={Boolean(props.components.length)}
			filteredComponents={props.filteredComponents}
			search={props.search}
			noticeSlot={props.noticeSlot}
			getKey={(component) => String(component.uid || "")}
			renderComponent={(component) => {
				const componentUid = String(component.uid || "");
				const isSelected = props.selectedUids.has(componentUid);
				const mouldingOpen =
					Boolean(props.mouldingSelection?.open) &&
					props.mouldingSelection?.lineUid === props.lineUid &&
					props.mouldingSelection?.stepIndex === props.activeStepIndex &&
					String(props.mouldingSelection?.componentUid || "") === componentUid;

				return (
					<WorkflowComponentCard
						selected={isSelected}
						badgesSlot={
							!props.isDealershipMode ? (
								<WorkflowComponentBadges
									hasVariations={Boolean(
										(component as { variations?: unknown[] | null })?.variations
											?.length,
									)}
									hasSectionOverride={Boolean(
										component?.sectionOverride?.overrideMode,
									)}
									hasRedirect={Boolean(component?.redirectUid)}
								/>
							) : null
						}
						actionsSlot={
							!props.isDealershipMode ? (
								<WorkflowComponentActionMenu
									redirectOptions={props.redirectOptions}
									onEdit={
										props.onEdit ? () => props.onEdit?.(component) : undefined
									}
									onEditSectionOverride={
										props.onEditSectionOverride
											? () => props.onEditSectionOverride?.(component)
											: undefined
									}
									onSelect={() => props.onSelect(component)}
									onClearRedirect={
										props.onClearRedirect
											? () => props.onClearRedirect?.(component)
											: undefined
									}
									onSetRedirect={
										props.onSetRedirect
											? (uid) => props.onSetRedirect?.(component, uid)
											: undefined
									}
									onDelete={
										props.onDelete
											? () => props.onDelete?.(component)
											: undefined
									}
								/>
							) : null
						}
					>
						{props.isMouldingSelectionStep ? (
							<MouldingSelectionPopover
								open={mouldingOpen}
								onOpenChange={(open) => {
									if (!open) {
										props.onCloseMouldingQty();
										return;
									}
									props.onOpenMouldingQty(component);
								}}
								title={props.componentLabel(component.title)}
								qty={props.mouldingSelection?.qty || "1"}
								inputRef={props.mouldingSelection?.inputRef}
								onQtyChange={props.onMouldingQtyChange}
								onCancel={props.onCloseMouldingQty}
								onAdd={() => props.onAddMoulding(component)}
								trigger={
									<button type="button" className="w-full text-left">
										<WorkflowComponentPreview
											imageSrc={props.resolveImageSrc(component.img)}
											alt={component.title || componentUid}
											title={props.componentLabel(component.title)}
											price={props.formatPrice(component.salesPrice)}
										/>
									</button>
								}
								calculatorSlot={props.calculatorSlot?.(component)}
							/>
						) : (
							<button
								type="button"
								className="w-full text-left"
								onClick={() =>
									isDoorStep
										? props.onOpenDoorSizes(component)
										: props.onSelect(component)
								}
							>
								<WorkflowComponentPreview
									imageSrc={props.resolveImageSrc(component.img)}
									alt={component.title || componentUid}
									title={props.componentLabel(component.title)}
									price={props.formatPrice(component.salesPrice)}
								/>
							</button>
						)}
					</WorkflowComponentCard>
				);
			}}
			toolbarSlot={
				<WorkflowComponentToolbar
					count={props.filteredComponents.length}
					total={props.components.length}
					search={props.search}
					onSearchChange={props.onSearchChange}
					menuSlot={
						!props.isDealershipMode ? (
							<>
								<Menu.Item
									SubMenu={(props.steps || []).map((step, index) => (
										<Menu.Item
											key={`jump-step-${props.lineUid}-${step?.uid || step?.stepId || step?.step?.id || step?.step?.title || "step"}`}
											onClick={() => props.onJumpStep(index)}
										>
											{step?.step?.title || `Step ${index + 1}`}
										</Menu.Item>
									))}
								>
									Tabs
								</Menu.Item>
								<Menu.Item
									disabled={!isMultiSelectStep}
									onClick={() => {
										if (!isMultiSelectStep) return;
										props.onSelectAll();
									}}
								>
									Select All
								</Menu.Item>
								{props.onOpenPricing ? (
									<Menu.Item
										onClick={() => {
											const openPricing = props.onOpenPricing;
											if (!openPricing) return;
											const selectedComponent =
												props.components.find((component) =>
													props.selectedUids.has(String(component.uid || "")),
												) || props.components[0];
											if (!selectedComponent) return;
											openPricing(selectedComponent);
										}}
									>
										Pricing
									</Menu.Item>
								) : null}
								{isDoorStep && props.onOpenDoorSizeVariant ? (
									<Menu.Item onClick={props.onOpenDoorSizeVariant}>
										Door Size Variant
									</Menu.Item>
								) : null}
								{props.onEnableCustomComponent ? (
									<Menu.Item onClick={props.onEnableCustomComponent}>
										Custom
									</Menu.Item>
								) : null}
								<Menu.Item onClick={props.onRefresh}>Refresh</Menu.Item>
								<Menu.Item onClick={props.onToggleCustomComponents}>
									Enable Custom: {props.includeCustomComponents ? "On" : "Off"}
								</Menu.Item>
							</>
						) : null
					}
					actionSlot={
						supportsCustomComponents || isMultiSelectStep ? (
							<div className="flex w-full flex-wrap justify-end gap-2 sm:w-auto">
								{supportsCustomComponents && props.onEnableCustomComponent ? (
									<Button
										type="button"
										variant="outline"
										onClick={props.onEnableCustomComponent}
									>
										Custom
									</Button>
								) : null}
								{isMultiSelectStep ? (
									<Button
										onClick={props.onProceedMultiSelect}
										disabled={!props.selectedUids.size}
									>
										Proceed
									</Button>
								) : null}
							</div>
						) : null
					}
				/>
			}
		/>
	);
}
