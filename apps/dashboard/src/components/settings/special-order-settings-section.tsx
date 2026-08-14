"use client";

import { useTRPC } from "@/trpc/client";
import type { SpecialOrderSettings } from "@gnd/settings";
import { Alert, AlertDescription, AlertTitle } from "@gnd/ui/alert";
import { Badge } from "@gnd/ui/badge";
import { Button } from "@gnd/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@gnd/ui/card";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@gnd/ui/field";
import { Icons } from "@gnd/ui/icons";
import { Input } from "@gnd/ui/input";
import { useMutation, useQuery, useQueryClient } from "@gnd/ui/tanstack";
import { Textarea } from "@gnd/ui/textarea";
import { toast } from "@gnd/ui/use-toast";
import { useEffect, useState } from "react";
import { SettingsQueryError } from "./settings-query-error";
import { SpecialOrderOperationsPolicy } from "./special-order-operations-policy";
import { SpecialOrderPolicyHistory } from "./special-order-policy-history";
import { SpecialOrderRolloutSection } from "./special-order-rollout-section";

type PolicyDraft = {
	title: string;
	acknowledgmentText: string;
	policyText: string;
};

export function SpecialOrderSettingsSection() {
	const trpc = useTRPC();
	const queryClient = useQueryClient();
	const accessQuery = useQuery(trpc.sales.getPrintSettings.queryOptions());
	const canManage = accessQuery.data?.canManage === true;
	const managementQuery = useQuery(
		trpc.sales.getSpecialOrderSettings.queryOptions(undefined, {
			enabled: canManage,
		}),
	);
	const [settings, setSettings] = useState<SpecialOrderSettings | null>(null);
	const [draft, setDraft] = useState<PolicyDraft | null>(null);

	useEffect(() => {
		const nextDraft = managementQuery.data?.draft;
		if (managementQuery.data?.settings && !settings) {
			setSettings(managementQuery.data.settings);
		}
		if (
			nextDraft?.title &&
			nextDraft.acknowledgmentText &&
			nextDraft.policyText &&
			!draft
		) {
			setDraft({
				title: nextDraft.title,
				acknowledgmentText: nextDraft.acknowledgmentText,
				policyText: nextDraft.policyText,
			});
		}
	}, [draft, managementQuery.data, settings]);

	const invalidate = async () => {
		await Promise.all([
			queryClient.invalidateQueries({
				queryKey: trpc.sales.getSpecialOrderSettings.queryKey(),
			}),
			queryClient.invalidateQueries({
				queryKey: trpc.specialOrder.enrollmentAccess.queryKey(),
			}),
		]);
	};

	const updateSettings = useMutation(
		trpc.sales.updateSpecialOrderSettings.mutationOptions({
			async onSuccess(data) {
				setSettings(data.settings);
				await invalidate();
				toast({
					title: "Special Order settings saved",
					description:
						"Enrollment audience and enforcement settings now apply globally.",
					variant: "success",
				});
			},
			onError(error) {
				toast({
					title: "Unable to save Special Order settings",
					description: error.message,
					variant: "destructive",
				});
			},
		}),
	);

	const saveDraft = useMutation(
		trpc.sales.saveSpecialOrderPolicyDraft.mutationOptions({
			async onSuccess(data) {
				if (
					data.draft.title &&
					data.draft.acknowledgmentText &&
					data.draft.policyText
				) {
					setDraft({
						title: data.draft.title,
						acknowledgmentText: data.draft.acknowledgmentText,
						policyText: data.draft.policyText,
					});
				}
				await invalidate();
				toast({ title: "Policy draft saved", variant: "success" });
			},
			onError(error) {
				toast({
					title: "Unable to save policy draft",
					description: error.message,
					variant: "destructive",
				});
			},
		}),
	);

	const publish = useMutation(
		trpc.sales.publishSpecialOrderPolicy.mutationOptions({
			async onSuccess() {
				setDraft(null);
				setSettings(null);
				await managementQuery.refetch();
				toast({
					title: "Special Order policy published",
					description:
						"New approval requests will use this immutable policy version.",
					variant: "success",
				});
			},
			onError(error) {
				toast({
					title: "Unable to publish policy",
					description: error.message,
					variant: "destructive",
				});
			},
		}),
	);

	if (accessQuery.isError) {
		return (
			<SettingsQueryError
				title="Unable to verify settings access"
				description="Your access to Special Order settings could not be verified."
				onRetry={() => void accessQuery.refetch()}
			/>
		);
	}

	if (accessQuery.isPending) {
		return <div className="h-80 animate-pulse rounded-md border bg-muted/30" />;
	}

	if (!canManage) {
		return (
			<div className="rounded-md border bg-background p-6">
				<div className="flex items-start gap-3">
					<Icons.AlertCircle className="mt-0.5 size-5 text-muted-foreground" />
					<div>
						<h2 className="font-semibold">Super Admin access required</h2>
						<p className="mt-1 max-w-2xl text-sm text-muted-foreground">
							Only Super Admin users can manage Special Order enforcement and
							customer acknowledgment policies.
						</p>
					</div>
				</div>
			</div>
		);
	}

	if (managementQuery.isError) {
		return (
			<SettingsQueryError
				title="Unable to load special order settings"
				description="The policy configuration could not be loaded."
				onRetry={() => void managementQuery.refetch()}
			/>
		);
	}

	if (
		managementQuery.isPending ||
		!managementQuery.data ||
		!settings ||
		!draft
	) {
		return <div className="h-80 animate-pulse rounded-md border bg-muted/30" />;
	}

	const policyIsValid =
		draft.title.trim().length >= 3 &&
		draft.acknowledgmentText.trim().length >= 20 &&
		draft.policyText.trim().length >= 50;

	return (
		<div className="space-y-6">
			<Alert variant="warning">
				<Icons.AlertCircle className="size-4" />
				<AlertTitle>Launch-safe enforcement</AlertTitle>
				<AlertDescription>
					Warning Only is the default. Stronger modes apply immediately to every
					governed active Special Order, while legacy orders remain exempt.
				</AlertDescription>
			</Alert>

			<SpecialOrderRolloutSection />

			<SpecialOrderOperationsPolicy
				settings={settings}
				isSaving={updateSettings.isPending}
				onChange={setSettings}
				onSave={() =>
					updateSettings.mutate({
						releaseAudience: settings.releaseAudience,
						enforcementMode: settings.enforcementMode,
						approvalLinkLifetimeDays: settings.approvalLinkLifetimeDays,
					})
				}
			/>

			<Card>
				<CardHeader>
					<div className="flex flex-wrap items-center justify-between gap-3">
						<CardTitle>Customer acknowledgment policy</CardTitle>
						<Badge variant="outline">
							Published v{managementQuery.data.currentPolicy.version}
						</Badge>
					</div>
				</CardHeader>
				<CardContent className="space-y-6">
					<FieldGroup>
						<Field>
							<FieldLabel htmlFor="special-order-policy-title">
								Title
							</FieldLabel>
							<Input
								id="special-order-policy-title"
								value={draft.title}
								onChange={(event) =>
									setDraft((current) =>
										current
											? { ...current, title: event.target.value }
											: current,
									)
								}
							/>
						</Field>
						<Field>
							<FieldLabel htmlFor="special-order-acknowledgment">
								Required acknowledgment
							</FieldLabel>
							<Textarea
								id="special-order-acknowledgment"
								rows={3}
								value={draft.acknowledgmentText}
								onChange={(event) =>
									setDraft((current) =>
										current
											? {
													...current,
													acknowledgmentText: event.target.value,
												}
											: current,
									)
								}
							/>
						</Field>
						<Field>
							<FieldLabel htmlFor="special-order-policy-text">
								Policy wording
							</FieldLabel>
							<Textarea
								id="special-order-policy-text"
								rows={7}
								value={draft.policyText}
								onChange={(event) =>
									setDraft((current) =>
										current
											? { ...current, policyText: event.target.value }
											: current,
									)
								}
							/>
							<FieldDescription>
								Publishing creates a new immutable version. Existing approvals
								and active issued requests keep their accepted wording.
							</FieldDescription>
						</Field>
					</FieldGroup>

					<div className="rounded-md border bg-muted/20 p-5">
						<p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
							Customer preview
						</p>
						<h3 className="mt-3 text-lg font-semibold">{draft.title}</h3>
						<p className="mt-2 whitespace-pre-wrap text-sm leading-6">
							{draft.policyText}
						</p>
						<div className="mt-4 rounded-md border bg-background p-3 text-sm">
							{draft.acknowledgmentText}
						</div>
					</div>

					<div className="flex flex-wrap justify-end gap-2">
						<Button
							variant="outline"
							disabled={!policyIsValid || saveDraft.isPending}
							onClick={() => saveDraft.mutate(draft)}
						>
							Save draft
						</Button>
						<Button
							disabled={!policyIsValid || publish.isPending}
							onClick={() => publish.mutate(draft)}
						>
							Publish new version
						</Button>
					</div>
				</CardContent>
			</Card>

			<SpecialOrderPolicyHistory
				policies={managementQuery.data.history.filter(
					(
						policy,
					): policy is typeof policy & {
						id: string;
						version: number;
						title: string;
					} =>
						Boolean(policy.id) &&
						Number.isFinite(policy.version) &&
						Boolean(policy.title),
				)}
				currentPolicyId={managementQuery.data.currentPolicy.id}
			/>
		</div>
	);
}
