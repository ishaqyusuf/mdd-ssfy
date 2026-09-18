"use client";

import { SalesRequestGuidanceSection } from "@/components/sales-request/sales-request-guidance-section";
import { useTRPC } from "@/trpc/client";
import type {
	SalesRequestAIProvider,
	SalesRequestAIProviderOption,
	SalesRequestAISelection,
} from "@gnd/settings";
import { Button } from "@gnd/ui/button";
import { Label } from "@gnd/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@gnd/ui/select";
import { Spinner } from "@gnd/ui/spinner";
import { useMutation, useQuery, useQueryClient } from "@gnd/ui/tanstack";
import { toast } from "@gnd/ui/use-toast";
import { useState } from "react";
import { SalesRequestAIRulesSection } from "./sales-request-ai-rules-section";
import { SalesRequestInterpretationWarningsSection } from "./sales-request-interpretation-warnings-section";
import {
	type SalesRequestMailboxPolicyDraft,
	SalesRequestMailboxSettingsSection,
} from "./sales-request-mailbox-settings-section";
import {
	type SalesRequestPilotDraft,
	SalesRequestPilotSettingsSection,
} from "./sales-request-pilot-settings-section";
import { SalesRequestProviderDiagnosticsSection } from "./sales-request-provider-diagnostics-section";
import { SalesSettingsRouteSkeleton } from "./sales-settings-route-skeleton";
import { SettingsCard } from "./settings-card";
import { SettingsQueryError } from "./settings-query-error";

type ConfiguredProviderOption = SalesRequestAIProviderOption & {
	configured: boolean;
};

function findProvider(
	providers: readonly ConfiguredProviderOption[],
	provider: string,
) {
	return providers.find((option) => option.id === provider);
}

function getModelOptions(
	providers: readonly ConfiguredProviderOption[],
	provider: SalesRequestAIProvider,
	currentModel?: string,
) {
	const configured = findProvider(providers, provider)?.models ?? [];
	if (
		!currentModel ||
		configured.some((option) => option.id === currentModel)
	) {
		return configured;
	}
	return [
		{
			id: currentModel,
			label: `${currentModel} (currently configured)`,
			supportsImages: false,
		},
		...configured,
	];
}

export function SalesRequestGenerationSettingsPage() {
	const trpc = useTRPC();
	const queryClient = useQueryClient();
	const settingsQuery = useQuery(
		trpc.salesRequest.getAISettings.queryOptions(),
	);
	const [draft, setDraft] = useState<SalesRequestAISelection | null>(null);
	const [pilotDraft, setPilotDraft] = useState<SalesRequestPilotDraft | null>(
		null,
	);
	const [mailboxDraft, setMailboxDraft] =
		useState<SalesRequestMailboxPolicyDraft | null>(null);
	const persisted = settingsQuery.data?.settings ?? null;
	const settings = draft ?? persisted;
	const persistedPilot = settingsQuery.data?.requestGeneration.pilot ?? null;
	const persistedMailbox =
		settingsQuery.data?.requestGeneration.mailbox ?? null;

	const updateSettings = useMutation(
		trpc.salesRequest.updateAISettings.mutationOptions({
			onSuccess(data) {
				setDraft(null);
				queryClient.setQueryData(
					trpc.salesRequest.getAISettings.queryKey(),
					data,
				);
				toast({
					variant: "success",
					title: "Sales request AI settings saved",
					description:
						"New request previews will use the selected provider and model.",
				});
			},
			onError(error) {
				toast({
					variant: "destructive",
					title: "Unable to save sales request AI settings",
					description: error.message,
				});
			},
		}),
	);
	const regenerateConfiguration = useMutation(
		trpc.salesRequest.regenerateConfiguration.mutationOptions({
			onSuccess() {
				void queryClient.invalidateQueries({
					queryKey: trpc.salesRequest.getAISettings.queryKey(),
				});
				toast({
					variant: "success",
					title: "AI configuration regenerated",
					description:
						"The compact component catalog was validated and published without calling an AI provider.",
				});
			},
			onError(error) {
				void queryClient.invalidateQueries({
					queryKey: trpc.salesRequest.getAISettings.queryKey(),
				});
				toast({
					variant: "destructive",
					title: "Unable to regenerate AI configuration",
					description: error.message,
				});
			},
		}),
	);
	const updatePilotSettings = useMutation(
		trpc.salesRequest.updatePilotSettings.mutationOptions({
			async onSuccess(data) {
				setPilotDraft(null);
				await Promise.all([
					queryClient.invalidateQueries({
						queryKey: trpc.salesRequest.getAISettings.queryKey(),
					}),
					queryClient.invalidateQueries({
						queryKey: trpc.salesRequest.getPilotAccess.queryKey(),
					}),
				]);
				toast({
					variant: "success",
					title: data.changed
						? "Sales request pilot settings saved"
						: "Sales request pilot settings unchanged",
					description:
						"The named cohort and reviewer list are revisioned and now apply to the text pilot.",
				});
			},
			onError(error) {
				toast({
					variant: "destructive",
					title: "Unable to save sales request pilot settings",
					description: error.message,
				});
			},
		}),
	);
	const updateMailboxPolicy = useMutation(
		trpc.salesRequest.updateMailboxPolicy.mutationOptions({
			onSuccess() {
				setMailboxDraft(null);
				void queryClient.invalidateQueries({
					queryKey: trpc.salesRequest.getAISettings.queryKey(),
				});
				toast({
					variant: "success",
					title: "Mailbox settings saved",
				});
			},
			onError(error) {
				toast({
					variant: "destructive",
					title: "Unable to save mailbox settings",
					description: error.message,
				});
			},
		}),
	);

	if (settingsQuery.isError) {
		return (
			<SettingsQueryError
				title="Unable to load sales request AI settings"
				description="The configured provider and model could not be loaded."
				onRetry={() => void settingsQuery.refetch()}
			/>
		);
	}

	if (
		settingsQuery.isPending ||
		!persisted ||
		!settings ||
		!persistedPilot ||
		!persistedMailbox
	) {
		return <SalesSettingsRouteSkeleton cardCount={4} />;
	}

	const providers = settingsQuery.data.providers;
	if (!providers.length) {
		return (
			<SettingsQueryError
				title="No sales request AI providers are available"
				description="Configure an approved provider before choosing a request-generation model."
				onRetry={() => void settingsQuery.refetch()}
			/>
		);
	}

	const provider = settings.provider;
	const providerOption = findProvider(providers, provider);
	if (!providerOption) {
		return (
			<SettingsQueryError
				title="Sales request AI settings need attention"
				description="The persisted provider is not in the server-approved catalog."
				onRetry={() => void settingsQuery.refetch()}
			/>
		);
	}

	const modelOptions = getModelOptions(providers, provider, settings.model);
	const persistedModelOptions = getModelOptions(
		providers,
		persisted.provider,
		persisted.model,
	);
	const changed =
		settingsQuery.data.source !== "persisted" ||
		settings.provider !== persisted.provider ||
		settings.model !== persisted.model;
	const providerConfigured = providerOption.configured;

	return (
		<div className="flex flex-col gap-8">
			<SalesRequestPilotSettingsSection
				pilot={persistedPilot}
				pilotSource={settingsQuery.data.requestGeneration.pilotSource}
				featureEnabled={settingsQuery.data.requestGeneration.featureEnabled}
				draft={pilotDraft}
				isSaving={updatePilotSettings.isPending}
				onDraftChange={setPilotDraft}
				onSave={(nextPilot) => updatePilotSettings.mutate(nextPilot)}
				onDiscard={() => setPilotDraft(null)}
			/>
			<SalesRequestMailboxSettingsSection
				policy={persistedMailbox}
				draft={mailboxDraft}
				isSaving={updateMailboxPolicy.isPending}
				onDraftChange={setMailboxDraft}
				onSave={(next) => updateMailboxPolicy.mutate(next)}
				onDiscard={() => setMailboxDraft(null)}
			/>
			<SettingsCard
				title="Request generation provider"
				description="Choose the AI service and model used to turn customer requests into a New Sales Form seed."
			>
				<div className="grid gap-5 sm:grid-cols-2">
					<div className="space-y-2">
						<Label htmlFor="sales-request-ai-provider">AI provider</Label>
						<Select
							value={provider}
							onValueChange={(value) => {
								const nextProvider = findProvider(providers, value);
								if (!nextProvider) return;
								setDraft({
									provider: nextProvider.id,
									model: nextProvider.defaultModel,
								});
							}}
						>
							<SelectTrigger id="sales-request-ai-provider">
								<SelectValue placeholder="Choose a provider" />
							</SelectTrigger>
							<SelectContent>
								{providers.map((option) => (
									<SelectItem key={option.id} value={option.id}>
										{option.label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
						<p className="text-xs text-muted-foreground">
							{providerConfigured
								? "Provider credential is configured on the server. "
								: "Provider credential is missing on the server; configure it before saving. "}
							Credentials are never stored in Sales Settings.
						</p>
					</div>

					<div className="space-y-2">
						<Label htmlFor="sales-request-ai-model">Model</Label>
						<Select
							value={settings.model}
							onValueChange={(model) => setDraft({ provider, model })}
						>
							<SelectTrigger id="sales-request-ai-model">
								<SelectValue placeholder="Choose a model" />
							</SelectTrigger>
							<SelectContent>
								{modelOptions.map((option) => (
									<SelectItem key={option.id} value={option.id}>
										{option.label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
						<p className="text-xs text-muted-foreground">
							The model list is restricted to approved server-supported models.
						</p>
					</div>
				</div>
			</SettingsCard>

			<SettingsCard
				title="AI component configuration"
				description="Rebuild the price-free component catalog used for request generation. This does not call the selected AI provider."
			>
				<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
					<div className="space-y-1 text-sm">
						<p>Status: {settingsQuery.data.catalog.publication.status}</p>
						<p className="text-xs text-muted-foreground">
							Generation {settingsQuery.data.catalog.publication.generation}
							{settingsQuery.data.catalog.publication.publishedRevision
								? ` · ${settingsQuery.data.catalog.publication.publishedRevision.slice(0, 12)}`
								: " · not published yet"}
						</p>
					</div>
					<Button
						type="button"
						variant="outline"
						disabled={regenerateConfiguration.isPending}
						onClick={() => regenerateConfiguration.mutate()}
					>
						{regenerateConfiguration.isPending ? <Spinner /> : null}
						Regenerate AI configuration
					</Button>
				</div>
			</SettingsCard>

			<SalesRequestAIRulesSection />
			<SalesRequestInterpretationWarningsSection />
			<SettingsCard
				title="Saved request guidance"
				description="Manage your reusable answers to sales request questions."
			>
				<SalesRequestGuidanceSection />
			</SettingsCard>

			<SalesRequestProviderDiagnosticsSection />

			<div className="flex flex-col gap-3 border-t pt-5 sm:flex-row sm:items-center sm:justify-between">
				<p className="text-sm text-muted-foreground">
					{settingsQuery.data.source === "invalid"
						? "Repair required; suggested fallback: "
						: settingsQuery.data.source === "default"
							? "Not saved; default: "
							: "Current: "}
					{findProvider(providers, persisted.provider)?.label ??
						persisted.provider}{" "}
					·{" "}
					{persistedModelOptions.find((option) => option.id === persisted.model)
						?.label ?? persisted.model}
				</p>
				<div className="flex items-center gap-2">
					<Button
						type="button"
						variant="outline"
						disabled={!changed || updateSettings.isPending}
						onClick={() => setDraft(null)}
					>
						Discard
					</Button>
					<Button
						type="button"
						disabled={
							!changed ||
							!settings.model ||
							!providerConfigured ||
							updateSettings.isPending
						}
						onClick={() =>
							updateSettings.mutate({ provider, model: settings.model })
						}
					>
						{updateSettings.isPending ? <Spinner /> : null}
						Save AI settings
					</Button>
				</div>
			</div>
		</div>
	);
}
