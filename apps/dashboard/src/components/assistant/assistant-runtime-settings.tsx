"use client";

import { useTRPC } from "@/trpc/client";
import { Badge } from "@gnd/ui/badge";
import { Button } from "@gnd/ui/button";
import { Label } from "@gnd/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@gnd/ui/select";
import {
	useMutation,
	useQueryClient,
	useSuspenseQuery,
} from "@gnd/ui/tanstack";
import { toast } from "@gnd/ui/use-toast";
import { LoaderCircle } from "lucide-react";
import { useState } from "react";

export function AssistantRuntimeSettings() {
	const trpc = useTRPC();
	const queryClient = useQueryClient();
	const { data } = useSuspenseQuery(
		trpc.assistant.runtimeSettings.queryOptions(),
	);
	const [draft, setDraft] = useState<{
		provider: typeof data.selection.provider;
		model: string;
	} | null>(null);
	const selection = draft ?? data.selection;
	const provider = data.providers.find(
		(item) => item.id === selection.provider,
	);
	const changed =
		selection.provider !== data.selection.provider ||
		selection.model !== data.selection.model;
	const update = useMutation(
		trpc.assistant.updateRuntimeSettings.mutationOptions({
			async onSuccess() {
				setDraft(null);
				await queryClient.invalidateQueries({
					queryKey: trpc.assistant.runtimeSettings.queryKey(),
				});
				toast({ title: "Assistant AI settings updated", variant: "success" });
			},
			onError(error) {
				toast({
					title: "Unable to update Assistant AI settings",
					description: error.message,
					variant: "destructive",
				});
			},
		}),
	);

	return (
		<section className="rounded-lg border bg-card">
			<div className="flex flex-col gap-2 border-b p-5 sm:flex-row sm:items-start sm:justify-between">
				<div>
					<h2 className="font-medium">Chat provider</h2>
					<p className="mt-1 text-sm text-muted-foreground">
						Choose the AI provider and model used for new Assistant runs.
					</p>
				</div>
				<Badge
					variant={
						provider?.enabled === false
							? "destructive"
							: provider?.configured
								? "default"
								: "secondary"
					}
				>
					{provider?.enabled === false
						? "Disabled by server operator"
						: provider?.configured
						? "Credential configured"
						: "Credential missing"}
				</Badge>
			</div>
			<div className="grid gap-5 p-5 sm:grid-cols-2">
				<div className="space-y-2">
					<Label htmlFor="assistant-ai-provider">AI provider</Label>
					<Select
						value={selection.provider}
						onValueChange={(value) => {
							const next = data.providers.find((item) => item.id === value);
							if (!next) return;
							setDraft({ provider: next.id, model: next.defaultModel });
						}}
					>
						<SelectTrigger id="assistant-ai-provider">
							<SelectValue placeholder="Choose a provider" />
						</SelectTrigger>
						<SelectContent>
							{data.providers.map((item) => (
								<SelectItem
									key={item.id}
									value={item.id}
									disabled={!item.enabled}
								>
									{item.label}
									{!item.enabled
										? " · disabled"
										: item.configured
											? ""
											: " · key required"}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
					<p className="text-xs text-muted-foreground">
						API keys remain in server environment variables.
					</p>
				</div>
				<div className="space-y-2">
					<Label htmlFor="assistant-ai-model">Model</Label>
					<Select
						value={selection.model}
						onValueChange={(model) =>
							setDraft({ provider: selection.provider, model })
						}
					>
						<SelectTrigger id="assistant-ai-model">
							<SelectValue placeholder="Choose a model" />
						</SelectTrigger>
						<SelectContent>
							{provider?.models.map((model) => (
								<SelectItem key={model.id} value={model.id}>
									{model.label}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
					<p className="text-xs text-muted-foreground">
						New runs use the saved model; active runs keep their original model.
					</p>
				</div>
			</div>
			<div className="flex flex-col gap-3 border-t p-5 sm:flex-row sm:items-center sm:justify-between">
				<p className="text-sm text-muted-foreground">
					Current: {provider?.label ?? selection.provider} · {selection.model}
				</p>
				<div className="flex gap-2">
					<Button
						variant="outline"
						disabled={!changed || update.isPending}
						onClick={() => setDraft(null)}
					>
						Discard
					</Button>
					<Button
						disabled={
							!changed ||
							!provider?.enabled ||
							!provider.configured ||
							update.isPending
						}
						onClick={() =>
							update.mutate({
								...selection,
								expectedVersion: data.version,
							})
						}
					>
						{update.isPending ? (
							<LoaderCircle className="animate-spin" />
						) : null}
						Save AI settings
					</Button>
				</div>
			</div>
		</section>
	);
}
