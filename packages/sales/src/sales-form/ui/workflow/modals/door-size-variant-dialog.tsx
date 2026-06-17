/** @jsxImportSource react */
"use client";

import { useEffect, useMemo, useState } from "react";
import { Icons } from "@gnd/ui/icons";
import { Button } from "@gnd/ui/button";
import { Checkbox } from "@gnd/ui/checkbox";
import { Label } from "@gnd/ui/label";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@gnd/ui/dialog";

import { widthList } from "../../../../filter-constants";
import { normalizeSalesFormTitle } from "../../../domain";

type DoorSizeVariantRule = {
	stepUid: string | null;
	operator: "is" | "isNot";
	componentsUid: string[];
};

type DoorSizeVariantGroup = {
	rules: DoorSizeVariantRule[];
	widthList: string[];
};

function normalizeDoorSizeVariantGroups(value: any): DoorSizeVariantGroup[] {
	if (!Array.isArray(value)) return [];
	return value.map((group: any) => ({
		rules:
			Array.isArray(group?.rules) && group.rules.length
				? group.rules.map((rule: any) => ({
						stepUid: rule?.stepUid ? String(rule.stepUid) : null,
						operator:
							String(rule?.operator || "is") === "isNot" ? "isNot" : "is",
						componentsUid: Array.isArray(rule?.componentsUid)
							? rule.componentsUid
									.map((entry: any) => String(entry || "").trim())
									.filter(Boolean)
							: [],
					}))
				: [{ stepUid: null, operator: "is", componentsUid: [] }],
		widthList: Array.isArray(group?.widthList)
			? group.widthList
					.map((entry: any) => String(entry || "").trim())
					.filter(Boolean)
			: [],
	}));
}

function blankDoorSizeVariantGroup(): DoorSizeVariantGroup {
	return {
		rules: [{ stepUid: null, operator: "is", componentsUid: [] }],
		widthList: [],
	};
}

interface DoorSizeVariantDialogProps {
	open: boolean;
	onOpenChange: (next: boolean) => void;
	routeData: any;
	steps: any[];
	initialVariations?: any;
	onSave: (variations: DoorSizeVariantGroup[]) => void | Promise<void>;
}

export function DoorSizeVariantDialog(props: DoorSizeVariantDialogProps) {
	const [groups, setGroups] = useState<DoorSizeVariantGroup[]>(
		normalizeDoorSizeVariantGroups(props.initialVariations),
	);

	useEffect(() => {
		if (!props.open) return;
		setGroups(normalizeDoorSizeVariantGroups(props.initialVariations));
	}, [props.initialVariations, props.open]);

	const availableSteps = useMemo(() => {
		const lineScopedSteps = (props.steps || [])
			.map((step: any) => {
				const uid = String(step?.step?.uid || "").trim();
				if (!uid) return null;
				const routeStep = props.routeData?.stepsByUid?.[uid] || null;
				return routeStep || step?.step || null;
			})
			.filter(Boolean);
		const configuredSteps = lineScopedSteps.length
			? lineScopedSteps
			: Array.isArray(props.routeData?.steps)
				? props.routeData.steps
				: Object.keys(props.routeData?.stepsById || {})
						.map((id) => Number(id))
						.filter((id) => Number.isFinite(id))
						.sort((a, b) => a - b)
						.map((id) => {
							const uid = props.routeData?.stepsById?.[id];
							return uid ? props.routeData?.stepsByUid?.[uid] : null;
						});
		return configuredSteps
			.filter(Boolean)
			.filter((step: any) => normalizeSalesFormTitle(step?.title) !== "door")
			.map((step: any) => ({
				uid: String(step?.uid || ""),
				title: String(step?.title || "").trim(),
				components: Array.isArray(step?.components) ? step.components : [],
			}))
			.filter((step: any) => step.uid && step.title);
	}, [props.routeData, props.steps]);

	const availableStepMap = useMemo(
		() => new Map(availableSteps.map((step: any) => [step.uid, step])),
		[availableSteps],
	);

	return (
		<Dialog open={props.open} onOpenChange={props.onOpenChange}>
			<DialogContent
				onOpenAutoFocus={(event) => event.preventDefault()}
				className="flex h-[80dvh] max-h-[720px] w-[calc(100vw-1rem)] max-w-2xl flex-col overflow-hidden p-0"
			>
				<div className="flex min-h-0 flex-1 flex-col bg-[radial-gradient(circle_at_top_right,rgba(14,165,233,0.16),transparent_45%),linear-gradient(180deg,#f8fafc_0%,#ffffff_100%)]">
					<DialogHeader className="shrink-0 border-b border-slate-200 px-6 py-5">
						<DialogTitle>Door Size Variant</DialogTitle>
						<DialogDescription>
							Control which widths are available for each door-height path.
						</DialogDescription>
					</DialogHeader>
					<div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-6 py-5">
						{!groups.length ? (
							<div className="rounded-2xl border border-dashed border-slate-300 bg-white/80 p-8 text-center text-sm text-slate-500">
								No variant rules yet. Add a group to define which widths should
								appear for matching step selections.
							</div>
						) : (
							groups.map((group, groupIndex) => (
								<section
									key={`door-size-variant-group-${groupIndex}`}
									className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
								>
									<div className="flex items-center gap-3">
										<div>
											<p className="text-sm font-semibold text-slate-900">
												Variant Group {groupIndex + 1}
											</p>
											<p className="text-xs text-slate-500">
												All rules in this group must match before its widths are
												added.
											</p>
										</div>
										<Button
											size="sm"
											variant="ghost"
											className="ml-auto text-red-600"
											onClick={() =>
												setGroups((prev) =>
													prev.filter((_, index) => index !== groupIndex),
												)
											}
										>
											<Icons.Trash2 className="mr-2 size-4" />
											Remove
										</Button>
									</div>

									<div className="space-y-3">
										{group.rules.map((rule, ruleIndex) => {
											const usedStepUids = new Set(
												group.rules
													.map((entry, index) =>
														index === ruleIndex
															? null
															: String(entry?.stepUid || "").trim(),
													)
													.filter(Boolean),
											);
											const selectableSteps = availableSteps.filter(
												(step: any) =>
													!usedStepUids.has(String(step?.uid || "")) ||
													String(rule.stepUid || "") ===
														String(step?.uid || ""),
											);
											const stepOptions =
												(
													availableStepMap.get(
														String(rule.stepUid || ""),
													) as { components?: unknown[] } | undefined
												)?.components || [];
											const selectedComponents = new Set(
												rule.componentsUid || [],
											);
											return (
												<div
													key={`door-size-variant-rule-${groupIndex}-${ruleIndex}`}
													className="rounded-xl border border-slate-200 bg-slate-50/80 p-3"
												>
													<div className="grid gap-3 md:grid-cols-[1.3fr_120px_2fr_auto]">
														<div className="space-y-2">
															<Label>Step</Label>
															<select
																className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
																value={rule.stepUid || ""}
																onChange={(e) =>
																	setGroups((prev) =>
																		prev.map((entry, index) =>
																			index === groupIndex
																				? {
																						...entry,
																						rules: entry.rules.map(
																							(innerRule, innerIndex) =>
																								innerIndex === ruleIndex
																									? {
																											...innerRule,
																											stepUid:
																												e.target.value || null,
																											componentsUid: [],
																										}
																									: innerRule,
																						),
																					}
																				: entry,
																		),
																	)
																}
															>
																<option value="">Select step</option>
																{selectableSteps.map((step: any) => (
																	<option
																		key={`variant-step-${step.uid}`}
																		value={step.uid}
																	>
																		{step.title}
																	</option>
																))}
															</select>
														</div>
														<div className="space-y-2">
															<Label>Operator</Label>
															<select
																className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
																value={rule.operator}
																onChange={(e) =>
																	setGroups((prev) =>
																		prev.map((entry, index) =>
																			index === groupIndex
																				? {
																						...entry,
																						rules: entry.rules.map(
																							(innerRule, innerIndex) =>
																								innerIndex === ruleIndex
																									? {
																											...innerRule,
																											operator:
																												e.target.value ===
																												"isNot"
																													? "isNot"
																													: "is",
																										}
																									: innerRule,
																						),
																					}
																				: entry,
																		),
																	)
																}
															>
																<option value="is">is</option>
																<option value="isNot">is not</option>
															</select>
														</div>
														<div className="space-y-2">
															<Label>Components</Label>
															<div className="grid max-h-32 gap-2 overflow-y-auto rounded-xl border border-slate-200 bg-white p-2 sm:grid-cols-2">
																{stepOptions.length ? (
																	stepOptions.map((component: any) => {
																		const uid = String(component?.uid || "");
																		if (!uid) return null;
																		const checked = selectedComponents.has(uid);
																		return (
																			<label
																				key={`variant-component-${groupIndex}-${ruleIndex}-${uid}`}
																				className="flex items-center gap-2 rounded-md border border-slate-200 px-2 py-1.5 text-xs"
																			>
																				<Checkbox
																					checked={checked}
																					onCheckedChange={(next) =>
																						setGroups((prev) =>
																							prev.map((entry, index) =>
																								index === groupIndex
																									? {
																											...entry,
																											rules: entry.rules.map(
																												(
																													innerRule,
																													innerIndex,
																												) =>
																													innerIndex ===
																													ruleIndex
																														? {
																																...innerRule,
																																componentsUid:
																																	next
																																		? Array.from(
																																				new Set(
																																					[
																																						...innerRule.componentsUid,
																																						uid,
																																					],
																																				),
																																			)
																																		: innerRule.componentsUid.filter(
																																				(
																																					value,
																																				) =>
																																					value !==
																																					uid,
																																			),
																															}
																														: innerRule,
																											),
																										}
																									: entry,
																							),
																						)
																					}
																				/>
																				<span>{component?.title || uid}</span>
																			</label>
																		);
																	})
																) : (
																	<p className="col-span-full text-xs text-slate-500">
																		Pick a step first to load components.
																	</p>
																)}
															</div>
														</div>
														<div className="flex items-end">
															<Button
																size="sm"
																variant="ghost"
																className="text-red-600"
																onClick={() =>
																	setGroups((prev) =>
																		prev.map((entry, index) =>
																			index === groupIndex
																				? {
																						...entry,
																						rules:
																							entry.rules.length > 1
																								? entry.rules.filter(
																										(_, innerIndex) =>
																											innerIndex !== ruleIndex,
																									)
																								: entry.rules,
																					}
																				: entry,
																		),
																	)
																}
																disabled={group.rules.length <= 1}
															>
																<Icons.Trash2 className="size-4" />
															</Button>
														</div>
													</div>
												</div>
											);
										})}
										<Button
											size="sm"
											variant="outline"
											disabled={
												group.rules.filter((rule) =>
													String(rule?.stepUid || "").trim(),
												).length >= availableSteps.length
											}
											onClick={() =>
												setGroups((prev) =>
													prev.map((entry, index) =>
														index === groupIndex
															? {
																	...entry,
																	rules: [
																		...entry.rules,
																		{
																			stepUid: null,
																			operator: "is",
																			componentsUid: [],
																		},
																	],
																}
															: entry,
													),
												)
											}
										>
											Add Filter
										</Button>
									</div>

									<div className="space-y-2">
										<div className="flex items-center justify-between gap-3">
											<Label>Widths</Label>
											<span className="text-xs text-slate-500">
												{group.widthList.length} selected
											</span>
										</div>
										<div className="flex flex-wrap gap-2 rounded-2xl border border-slate-200 bg-slate-50/70 p-3">
											{widthList.map((width) => {
												const selected = group.widthList.includes(width);
												return (
													<button
														key={`variant-width-${groupIndex}-${width}`}
														type="button"
														className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
															selected
																? "border-primary bg-primary/10 text-primary"
																: "border-slate-300 bg-white text-slate-600 hover:border-primary"
														}`}
														onClick={() =>
															setGroups((prev) =>
																prev.map((entry, index) =>
																	index === groupIndex
																		? {
																				...entry,
																				widthList: selected
																					? entry.widthList.filter(
																							(value) => value !== width,
																						)
																					: [...entry.widthList, width].sort(
																							(a, b) =>
																								widthList.indexOf(
																									a as (typeof widthList)[number],
																								) -
																								widthList.indexOf(
																									b as (typeof widthList)[number],
																								),
																						),
																			}
																		: entry,
																),
															)
														}
													>
														{width}
													</button>
												);
											})}
										</div>
									</div>
								</section>
							))
						)}
					</div>
					<DialogFooter className="shrink-0 border-t border-slate-200 px-6 py-4">
						<Button
							type="button"
							variant="outline"
							onClick={() =>
								setGroups((prev) => [...prev, blankDoorSizeVariantGroup()])
							}
						>
							Add Group
						</Button>
						<Button
							type="button"
							variant="ghost"
							onClick={() => props.onOpenChange(false)}
						>
							Cancel
						</Button>
						<Button
							type="button"
							onClick={async () => {
								await props.onSave(normalizeDoorSizeVariantGroups(groups));
								props.onOpenChange(false);
							}}
						>
							Save Variants
						</Button>
					</DialogFooter>
				</div>
			</DialogContent>
		</Dialog>
	);
}
