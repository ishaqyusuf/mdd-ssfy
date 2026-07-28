"use client";

import { FileUploader } from "@/components/common/file-uploader";
import { useTRPC } from "@/trpc/client";
import type {
	SalesFormWorkflowSurfaceSlots,
	WorkflowComponentRecord,
	WorkflowRouteData,
} from "@gnd/sales/sales-form";
import { Badge } from "@gnd/ui/badge";
import { Button } from "@gnd/ui/button";
import { Checkbox } from "@gnd/ui/checkbox";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@gnd/ui/dialog";
import { Input } from "@gnd/ui/input";
import { Label } from "@gnd/ui/label";
import { useQueryClient } from "@gnd/ui/tanstack";
import { useRef, useState } from "react";
import {
	useArchiveWorkflowComponentsMutation,
	useSaveWorkflowComponentDetailsMutation,
	useSaveWorkflowComponentPricingMutation,
	useSaveWorkflowComponentRedirectMutation,
	useSaveWorkflowComponentSectionOverrideMutation,
	useSaveWorkflowComponentVisibilityMutation,
} from "../api";
import type { NewSalesFormLineItem } from "../schema";
import {
	type WorkflowComponentPricingVariant as PricingVariant,
	buildWorkflowComponentPricingVariants,
} from "./workflow-component-pricing-variants";

type ActionInput = Parameters<
	NonNullable<
		NonNullable<
			SalesFormWorkflowSurfaceSlots<NewSalesFormLineItem>["componentActions"]
		>["onEditDetails"]
	>
>[0];

type BatchActionInput = Parameters<
	NonNullable<
		NonNullable<
			SalesFormWorkflowSurfaceSlots<NewSalesFormLineItem>["componentActions"]
		>["onEditVisibility"]
	>
>[0];

type VisibilityRule = {
	stepUid: string;
	operator: "is" | "isNot";
	componentsUid: string[];
};
type VisibilityGroup = { rules: VisibilityRule[] };
type EditableVisibilityRule = VisibilityRule & { key: string };
type EditableVisibilityGroup = {
	key: string;
	rules: EditableVisibilityRule[];
};

type AdminDialogState =
	| { kind: "closed" }
	| { kind: "details"; input: ActionInput }
	| { kind: "visibility"; input: BatchActionInput }
	| { kind: "pricing"; input: ActionInput }
	| { kind: "section"; input: ActionInput };

function objectRecord(value: unknown): Record<string, unknown> {
	return value && typeof value === "object" && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: {};
}

function routeSteps(routeData: WorkflowRouteData | null) {
	const source = routeData?.steps?.length
		? routeData.steps
		: Object.values(routeData?.stepsByUid || {}).filter(Boolean);
	return source.flatMap((step) => {
		const uid = String(step?.uid || "");
		if (!uid) return [];
		const components = Array.isArray(step?.components)
			? (step.components as WorkflowComponentRecord[])
			: [];
		return [{ uid, title: String(step?.title || uid), components }];
	});
}

function initialVisibility(
	components: WorkflowComponentRecord[],
	nextKey: () => string,
) {
	const value = components[0]?.variations;
	if (!Array.isArray(value)) return [];
	return value.flatMap((group) => {
		const groupRecord = objectRecord(group);
		const rules = Array.isArray(groupRecord.rules)
			? groupRecord.rules.flatMap((rule) => {
					const ruleRecord = objectRecord(rule);
					const stepUid = String(ruleRecord.stepUid || "");
					const componentsUid = Array.isArray(ruleRecord.componentsUid)
						? ruleRecord.componentsUid.map(String).filter(Boolean)
						: [];
					if (!stepUid || !componentsUid.length) return [];
					return [
						{
							key: nextKey(),
							stepUid,
							operator: ruleRecord.operator === "isNot" ? "isNot" : "is",
							componentsUid,
						} satisfies EditableVisibilityRule,
					];
				})
			: [];
		return rules.length ? [{ key: nextKey(), rules }] : [];
	});
}

export function useWorkflowComponentAdmin(input: {
	record: { lineItems: NewSalesFormLineItem[] };
	updateLineItem: (uid: string, patch: Partial<NewSalesFormLineItem>) => void;
}) {
	const trpc = useTRPC();
	const queryClient = useQueryClient();
	const detailsMutation = useSaveWorkflowComponentDetailsMutation();
	const visibilityMutation = useSaveWorkflowComponentVisibilityMutation();
	const sectionMutation = useSaveWorkflowComponentSectionOverrideMutation();
	const redirectMutation = useSaveWorkflowComponentRedirectMutation();
	const pricingMutation = useSaveWorkflowComponentPricingMutation();
	const archiveMutation = useArchiveWorkflowComponentsMutation();
	const [dialog, setDialog] = useState<AdminDialogState>({ kind: "closed" });

	async function refreshCatalog() {
		await Promise.all([
			queryClient.invalidateQueries({
				queryKey: trpc.sales.getStepComponents.queryKey(),
			}),
			queryClient.invalidateQueries({
				queryKey: trpc.newSalesForm.getStepRouting.queryKey(),
			}),
		]);
	}

	function patchSnapshots(
		component: WorkflowComponentRecord,
		patch: Partial<WorkflowComponentRecord>,
	) {
		const componentUid = String(component.uid || "");
		if (!componentUid) return;
		for (const line of input.record.lineItems) {
			let changed = false;
			const formSteps = (line.formSteps || []).map((step) => {
				const meta = objectRecord(step.meta);
				const selectedComponents = Array.isArray(meta.selectedComponents)
					? meta.selectedComponents.map((selected: WorkflowComponentRecord) => {
							if (String(selected?.uid || "") !== componentUid) return selected;
							changed = true;
							return { ...selected, ...patch };
						})
					: meta.selectedComponents;
				const direct = String(step?.prodUid || "") === componentUid;
				if (direct) changed = true;
				return {
					...step,
					...(direct
						? {
								value: patch.title ?? step.value,
								price: patch.salesPrice ?? step.price,
								basePrice: patch.basePrice ?? step.basePrice,
							}
						: {}),
					meta: { ...meta, selectedComponents },
				};
			});
			if (changed) input.updateLineItem(String(line.uid || ""), { formSteps });
		}
	}

	const componentActions: NonNullable<
		SalesFormWorkflowSurfaceSlots<NewSalesFormLineItem>["componentActions"]
	> = {
		onEditDetails: (action) => setDialog({ kind: "details", input: action }),
		onEditVisibility: (action) =>
			setDialog({ kind: "visibility", input: action }),
		onOpenPricing: (action) => setDialog({ kind: "pricing", input: action }),
		onEditSectionOverride: (action) =>
			setDialog({ kind: "section", input: action }),
		onClearRedirect: async (action) => {
			await redirectMutation.mutateAsync({
				componentId: Number(action.component.id),
				redirectUid: null,
			});
			patchSnapshots(action.component, { redirectUid: null });
			await refreshCatalog();
		},
		onSetRedirect: async (action) => {
			await redirectMutation.mutateAsync({
				componentId: Number(action.component.id),
				redirectUid: action.redirectUid,
			});
			patchSnapshots(action.component, {
				redirectUid: action.redirectUid,
			});
			await refreshCatalog();
		},
		onArchive: async (action) => {
			await archiveMutation.mutateAsync({
				componentIds: action.components.map((component) =>
					Number(component.id),
				),
			});
			await refreshCatalog();
			return true;
		},
	};

	return {
		componentActions,
		dialogs: (
			<WorkflowComponentAdminDialogs
				dialog={dialog}
				setDialog={setDialog}
				pending={
					detailsMutation.isPending ||
					visibilityMutation.isPending ||
					sectionMutation.isPending ||
					pricingMutation.isPending
				}
				onSaveDetails={async (values) => {
					if (dialog.kind !== "details") return;
					await detailsMutation.mutateAsync({
						componentId: Number(dialog.input.component.id),
						...values,
					});
					patchSnapshots(dialog.input.component, values);
					await refreshCatalog();
					setDialog({ kind: "closed" });
				}}
				onSaveVisibility={async (variations) => {
					if (dialog.kind !== "visibility") return;
					await visibilityMutation.mutateAsync({
						componentIds: dialog.input.components.map((component) =>
							Number(component.id),
						),
						variations,
					});
					for (const component of dialog.input.components) {
						patchSnapshots(component, { variations });
					}
					await refreshCatalog();
					setDialog({ kind: "closed" });
				}}
				onSaveSection={async (sectionOverride) => {
					if (dialog.kind !== "section") return;
					await sectionMutation.mutateAsync({
						componentId: Number(dialog.input.component.id),
						sectionOverride,
					});
					patchSnapshots(dialog.input.component, { sectionOverride });
					await refreshCatalog();
					setDialog({ kind: "closed" });
				}}
				onSavePricing={async (variants) => {
					if (dialog.kind !== "pricing") return;
					await pricingMutation.mutateAsync({
						componentId: Number(dialog.input.component.id),
						pricings: variants.map((variant) => ({
							id: variant.id,
							dependenciesUid: variant.path,
							price: variant.price.trim() ? Number(variant.price) : null,
						})),
					});
					const pricing = {
						...objectRecord(dialog.input.component.pricing),
						...Object.fromEntries(
							variants.map((variant) => [
								variant.path,
								{
									id: variant.id,
									price: variant.price.trim() ? Number(variant.price) : null,
								},
							]),
						),
					};
					const current = variants.find((variant) => variant.current);
					const previousBase = Number(dialog.input.component.basePrice || 0);
					const previousSales = Number(dialog.input.component.salesPrice || 0);
					const profileCoefficient =
						previousBase > 0 && previousSales >= 0
							? previousSales / previousBase
							: 1;
					patchSnapshots(dialog.input.component, {
						pricing,
						...(current?.price.trim()
							? {
									basePrice: Number(current.price),
									salesPrice: Number(current.price) * profileCoefficient,
								}
							: {}),
					});
					await refreshCatalog();
					setDialog({ kind: "closed" });
				}}
			/>
		),
	};
}

function WorkflowComponentAdminDialogs(props: {
	dialog: AdminDialogState;
	setDialog: (state: AdminDialogState) => void;
	pending: boolean;
	onSaveDetails: (values: {
		title: string;
		productCode: string | null;
		img: string | null;
	}) => Promise<void>;
	onSaveVisibility: (variations: VisibilityGroup[]) => Promise<void>;
	onSaveSection: (value: {
		overrideMode: boolean;
		noHandle: boolean;
		hasSwing: boolean;
	}) => Promise<void>;
	onSavePricing: (variants: PricingVariant[]) => Promise<void>;
}) {
	const close = () => props.setDialog({ kind: "closed" });
	if (props.dialog.kind === "closed") return null;
	if (props.dialog.kind === "details") {
		return (
			<DetailsDialog
				component={props.dialog.input.component}
				pending={props.pending}
				onClose={close}
				onSave={props.onSaveDetails}
			/>
		);
	}
	if (props.dialog.kind === "visibility") {
		return (
			<VisibilityDialog
				components={props.dialog.input.components}
				routeData={props.dialog.input.routeData}
				pending={props.pending}
				onClose={close}
				onSave={props.onSaveVisibility}
			/>
		);
	}
	if (props.dialog.kind === "section") {
		return (
			<SectionOverrideDialog
				component={props.dialog.input.component}
				pending={props.pending}
				onClose={close}
				onSave={props.onSaveSection}
			/>
		);
	}
	return (
		<PricingDialog
			input={props.dialog.input}
			pending={props.pending}
			onClose={close}
			onSave={props.onSavePricing}
		/>
	);
}

function DialogShell(props: {
	title: string;
	description: string;
	pending: boolean;
	onClose: () => void;
	onSave: () => void;
	children: React.ReactNode;
}) {
	return (
		<Dialog open onOpenChange={(open) => !open && props.onClose()}>
			<DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
				<DialogHeader>
					<DialogTitle>{props.title}</DialogTitle>
					<DialogDescription>{props.description}</DialogDescription>
				</DialogHeader>
				{props.children}
				<DialogFooter>
					<Button
						variant="outline"
						disabled={props.pending}
						onClick={props.onClose}
					>
						Cancel
					</Button>
					<Button disabled={props.pending} onClick={props.onSave}>
						{props.pending ? "Saving…" : "Save"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

function DetailsDialog(props: {
	component: WorkflowComponentRecord;
	pending: boolean;
	onClose: () => void;
	onSave: (value: {
		title: string;
		productCode: string | null;
		img: string | null;
	}) => void;
}) {
	const [title, setTitle] = useState(String(props.component.title || ""));
	const [productCode, setProductCode] = useState(
		String(props.component.productCode || ""),
	);
	const [img, setImg] = useState(String(props.component.img || ""));
	return (
		<DialogShell
			title="Component Details"
			description="Edit the shared component catalog details."
			pending={props.pending}
			onClose={props.onClose}
			onSave={() =>
				props.onSave({
					title: title.trim(),
					productCode: productCode.trim() || null,
					img: img || null,
				})
			}
		>
			<div className="grid gap-4">
				<FileUploader
					src={img || null}
					label="Component Image"
					folder="dyke"
					width={120}
					height={120}
					onUpload={(assetId) => setImg(String(assetId || ""))}
				/>
				<div className="grid gap-2">
					<Label htmlFor="workflow-component-title">Component name</Label>
					<Input
						id="workflow-component-title"
						value={title}
						onChange={(event) => setTitle(event.target.value)}
					/>
				</div>
				<div className="grid gap-2">
					<Label htmlFor="workflow-component-code">Product code</Label>
					<Input
						id="workflow-component-code"
						value={productCode}
						onChange={(event) => setProductCode(event.target.value)}
					/>
				</div>
			</div>
		</DialogShell>
	);
}

function VisibilityDialog(props: {
	components: WorkflowComponentRecord[];
	routeData: WorkflowRouteData | null;
	pending: boolean;
	onClose: () => void;
	onSave: (groups: VisibilityGroup[]) => void;
}) {
	const steps = routeSteps(props.routeData);
	const keySequence = useRef(0);
	const nextKey = () => `visibility-${keySequence.current++}`;
	const [groups, setGroups] = useState<EditableVisibilityGroup[]>(() =>
		initialVisibility(props.components, nextKey),
	);
	const firstStep = steps.find((step) => step.components.length);
	function addGroup() {
		if (!firstStep?.components[0]?.uid) return;
		setGroups((current) => [
			...current,
			{
				key: nextKey(),
				rules: [
					{
						key: nextKey(),
						stepUid: firstStep.uid,
						operator: "is",
						componentsUid: [String(firstStep.components[0].uid)],
					},
				],
			},
		]);
	}
	return (
		<DialogShell
			title="Component Visibility"
			description={`${props.components.length} component${props.components.length === 1 ? "" : "s"}: groups are OR; rules inside each group are AND.`}
			pending={props.pending}
			onClose={props.onClose}
			onSave={() =>
				props.onSave(
					groups.map((group) => ({
						rules: group.rules.map(({ key: _key, ...rule }) => rule),
					})),
				)
			}
		>
			<div className="grid gap-3">
				{groups.length ? (
					groups.map((group, groupIndex) => (
						<div key={group.key} className="rounded-md border p-3">
							<div className="mb-3 flex items-center justify-between">
								<Badge variant="secondary">OR group {groupIndex + 1}</Badge>
								<Button
									type="button"
									size="sm"
									variant="ghost"
									onClick={() =>
										setGroups((current) =>
											current.filter((_entry, index) => index !== groupIndex),
										)
									}
								>
									Remove group
								</Button>
							</div>
							<div className="grid gap-3">
								{group.rules.map((rule, ruleIndex) => {
									const targetStep = steps.find(
										(step) => step.uid === rule.stepUid,
									);
									return (
										<div
											key={rule.key}
											className="grid gap-2 rounded border p-3 md:grid-cols-[1fr_110px_1.5fr_auto]"
										>
											<select
												aria-label="Rule step"
												className="h-10 rounded-md border bg-background px-3 text-sm"
												value={rule.stepUid}
												onChange={(event) =>
													setGroups((current) =>
														current.map((entry, gi) =>
															gi !== groupIndex
																? entry
																: {
																		...entry,
																		rules: entry.rules.map((candidate, ri) =>
																			ri !== ruleIndex
																				? candidate
																				: {
																						...candidate,
																						stepUid: event.target.value,
																						componentsUid: [],
																					},
																		),
																	},
														),
													)
												}
											>
												{steps.map((step) => (
													<option key={step.uid} value={step.uid}>
														{step.title}
													</option>
												))}
											</select>
											<select
												aria-label="Rule operator"
												className="h-10 rounded-md border bg-background px-3 text-sm"
												value={rule.operator}
												onChange={(event) =>
													setGroups((current) =>
														current.map((entry, gi) =>
															gi !== groupIndex
																? entry
																: {
																		...entry,
																		rules: entry.rules.map((candidate, ri) =>
																			ri !== ruleIndex
																				? candidate
																				: {
																						...candidate,
																						operator: event.target
																							.value as VisibilityRule["operator"],
																					},
																		),
																	},
														),
													)
												}
											>
												<option value="is">is</option>
												<option value="isNot">is not</option>
											</select>
											<div className="grid gap-1">
												{targetStep?.components.map((component) => {
													const uid = String(component.uid || "");
													return (
														<div
															key={uid}
															className="flex items-center gap-2 text-sm"
														>
															<Checkbox
																aria-label={`Use ${String(component.title || uid)} in visibility rule`}
																checked={rule.componentsUid.includes(uid)}
																onCheckedChange={(checked) =>
																	setGroups((current) =>
																		current.map((entry, gi) =>
																			gi !== groupIndex
																				? entry
																				: {
																						...entry,
																						rules: entry.rules.map(
																							(candidate, ri) =>
																								ri !== ruleIndex
																									? candidate
																									: {
																											...candidate,
																											componentsUid: checked
																												? [
																														...candidate.componentsUid,
																														uid,
																													]
																												: candidate.componentsUid.filter(
																														(value) =>
																															value !== uid,
																													),
																										},
																						),
																					},
																		),
																	)
																}
															/>
															{component.title || uid}
														</div>
													);
												})}
											</div>
											<Button
												type="button"
												size="sm"
												variant="ghost"
												onClick={() =>
													setGroups((current) =>
														current
															.map((entry, gi) =>
																gi !== groupIndex
																	? entry
																	: {
																			...entry,
																			rules: entry.rules.filter(
																				(_candidate, ri) => ri !== ruleIndex,
																			),
																		},
															)
															.filter((entry) => entry.rules.length),
													)
												}
											>
												Remove
											</Button>
										</div>
									);
								})}
								<Button
									type="button"
									size="sm"
									variant="outline"
									onClick={() =>
										firstStep?.components[0]?.uid &&
										setGroups((current) =>
											current.map((entry, index) =>
												index !== groupIndex
													? entry
													: {
															...entry,
															rules: [
																...entry.rules,
																{
																	key: nextKey(),
																	stepUid: firstStep.uid,
																	operator: "is",
																	componentsUid: [
																		String(firstStep.components[0].uid),
																	],
																},
															],
														},
											),
										)
									}
								>
									Add AND rule
								</Button>
							</div>
						</div>
					))
				) : (
					<p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
						No rules: these components are always visible.
					</p>
				)}
				<Button
					type="button"
					variant="outline"
					disabled={!firstStep}
					onClick={addGroup}
				>
					Add OR group
				</Button>
			</div>
		</DialogShell>
	);
}

function SectionOverrideDialog(props: {
	component: WorkflowComponentRecord;
	pending: boolean;
	onClose: () => void;
	onSave: (value: {
		overrideMode: boolean;
		noHandle: boolean;
		hasSwing: boolean;
	}) => void;
}) {
	const initial = objectRecord(props.component.sectionOverride);
	const [value, setValue] = useState({
		overrideMode: Boolean(initial.overrideMode),
		noHandle: Boolean(initial.noHandle),
		hasSwing: initial.hasSwing !== false,
	});
	return (
		<DialogShell
			title="Section Setting Override"
			description="Override handle and swing behavior for this catalog component."
			pending={props.pending}
			onClose={props.onClose}
			onSave={() => props.onSave(value)}
		>
			<div className="grid gap-3">
				{(
					[
						["overrideMode", "Activate override"],
						["noHandle", "Single-handle / no-handle"],
						["hasSwing", "Enable swing settings"],
					] as const
				).map(([key, label]) => (
					<div
						key={key}
						className="flex items-center justify-between rounded-md border p-3 text-sm"
					>
						<span>{label}</span>
						<Checkbox
							aria-label={label}
							checked={value[key]}
							disabled={key !== "overrideMode" && !value.overrideMode}
							onCheckedChange={(checked) =>
								setValue((current) => ({ ...current, [key]: Boolean(checked) }))
							}
						/>
					</div>
				))}
			</div>
		</DialogShell>
	);
}

function PricingDialog(props: {
	input: ActionInput;
	pending: boolean;
	onClose: () => void;
	onSave: (variants: PricingVariant[]) => void;
}) {
	const [variants, setVariants] = useState(() =>
		buildWorkflowComponentPricingVariants(props.input),
	);
	return (
		<DialogShell
			title="Component Price"
			description="Edit default or dependency-bucket base costs. The active sale combination is highlighted."
			pending={props.pending}
			onClose={props.onClose}
			onSave={() => props.onSave(variants)}
		>
			<div className="grid gap-2">
				{variants.length ? (
					variants.map((variant, index) => (
						<div
							key={variant.path}
							className={`flex items-center gap-3 rounded-md border p-3 ${variant.current ? "border-emerald-400 bg-emerald-50" : ""}`}
						>
							<div className="flex flex-1 flex-wrap gap-1">
								{variant.titles.map((title) => (
									<Badge key={title} variant="outline">
										{title}
									</Badge>
								))}
								{variant.current ? <Badge>Current combination</Badge> : null}
							</div>
							<Label className="sr-only" htmlFor={`workflow-price-${index}`}>
								Base cost for {variant.titles.join(", ")}
							</Label>
							<Input
								id={`workflow-price-${index}`}
								className="w-32"
								type="number"
								step="0.01"
								value={variant.price}
								onChange={(event) =>
									setVariants((current) =>
										current.map((entry, entryIndex) =>
											entryIndex === index
												? { ...entry, price: event.target.value }
												: entry,
										),
									)
								}
							/>
						</div>
					))
				) : (
					<p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
						No dependency variants are available for this component.
					</p>
				)}
			</div>
		</DialogShell>
	);
}
