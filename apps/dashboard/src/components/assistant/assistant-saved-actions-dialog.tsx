"use client";

import { useTRPCClient } from "@/trpc/client";
import { Button } from "@gnd/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@gnd/ui/dialog";
import { Input } from "@gnd/ui/input";
import { Textarea } from "@gnd/ui/textarea";
import {
	ChevronDown,
	ChevronUp,
	Copy,
	Pencil,
	Play,
	Plus,
	Trash2,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

type SavedAction = {
	id: string;
	name: string;
	kind: string;
	promptTemplate: string | null;
	toolId: string | null;
	toolVersion: number | null;
	effect: string | null;
	inputTemplate: unknown;
	parameterDefinitions: unknown;
	outputBindings: unknown;
	version: number;
	lastRunStatus: string | null;
	lastRunAt: Date | string | null;
	compatibility: {
		status: "current" | "unavailable" | "retired";
		repair?: {
			toolId: string;
			toolVersion: number;
			title: string;
		} | null;
	};
};

type Preference = {
	responseStyle: "concise" | "balanced" | "explanatory";
	responseDetail: "brief" | "standard" | "detailed";
	chartPresentation: "auto" | "table" | "bar" | "line" | "area";
	version: number;
};

type Memory = {
	id: string;
	content: string;
	version: number;
};

type PendingApproval = {
	proposalId: string;
	approvalToken: string;
	expiresAt: Date | string;
	review: {
		title: string;
		effect: string;
		targetRevision: string | null;
		parameters: unknown;
		diff: {
			summary: string;
			changes: string[];
		};
	};
};

const defaultPreference: Preference = {
	responseStyle: "balanced",
	responseDetail: "standard",
	chartPresentation: "auto",
	version: 1,
};

function parameterDefinitions(value: unknown) {
	if (!Array.isArray(value)) return [];
	return value.flatMap((item) => {
		if (
			!item ||
			typeof item !== "object" ||
			!("key" in item) ||
			!("label" in item)
		) {
			return [];
		}
		return [
			{
				key: String(item.key),
				label: String(item.label),
				type: "type" in item ? String(item.type) : "string",
				required: "required" in item ? item.required !== false : true,
			},
		];
	});
}

export function AssistantSavedActionsDialog({
	open,
	mode,
	conversationId,
	suggestedRunId,
	onOpenChange,
	onUsePrompt,
	onConversationChanged,
	onSuggestionSaved,
}: {
	open: boolean;
	mode: "favorites" | "preferences";
	conversationId: string | null;
	suggestedRunId: string | null;
	onOpenChange: (open: boolean) => void;
	onUsePrompt: (prompt: string) => void;
	onConversationChanged: () => void;
	onSuggestionSaved: () => void;
}) {
	const client = useTRPCClient();
	const [actions, setActions] = useState<SavedAction[]>([]);
	const [preferences, setPreferences] = useState<Preference>(defaultPreference);
	const [memories, setMemories] = useState<Memory[]>([]);
	const [name, setName] = useState("");
	const [prompt, setPrompt] = useState("");
	const [saveKind, setSaveKind] = useState<"prompt_shortcut" | "recipe">(
		"prompt_shortcut",
	);
	const [recipeInput, setRecipeInput] = useState("{}");
	const [recipeParameters, setRecipeParameters] = useState("[]");
	const [recipeOutputs, setRecipeOutputs] = useState("[]");
	const [memory, setMemory] = useState("");
	const [parameters, setParameters] = useState<Record<string, string>>({});
	const [editingId, setEditingId] = useState<string | null>(null);
	const [notice, setNotice] = useState<string | null>(null);
	const [pendingApproval, setPendingApproval] =
		useState<PendingApproval | null>(null);
	const [busy, setBusy] = useState(false);

	const load = useCallback(async () => {
		try {
			setNotice(null);
			const [saved, preference, memoryRows] = await Promise.all([
				client.assistant.savedActions.query(),
				client.assistant.preferences.query(),
				client.assistant.memories.query(),
			]);
			setActions(saved as SavedAction[]);
			setPreferences(preference as Preference);
			setMemories(memoryRows as Memory[]);
		} catch {
			setNotice("Assistant favorites and preferences could not be loaded.");
		}
	}, [client]);

	useEffect(() => {
		if (open) void load();
	}, [load, open]);

	const suggestedName = useMemo(
		() => (suggestedRunId ? "Save the last successful action" : null),
		[suggestedRunId],
	);

	const resetEditor = () => {
		setName("");
		setPrompt("");
		setSaveKind("prompt_shortcut");
		setRecipeInput("{}");
		setRecipeParameters("[]");
		setRecipeOutputs("[]");
		setEditingId(null);
	};

	const saveFavorite = async () => {
		if (
			!name.trim() ||
			(!prompt.trim() && !suggestedRunId && saveKind === "prompt_shortcut")
		)
			return;
		setBusy(true);
		try {
			if (editingId) {
				const current = actions.find(({ id }) => id === editingId);
				if (!current) return;
				await client.assistant.updateSavedAction.mutate({
					id: current.id,
					expectedVersion: current.version,
					name: name.trim(),
					...(current.kind === "prompt_shortcut"
						? { promptTemplate: prompt.trim() }
						: {
								inputTemplate: JSON.parse(recipeInput),
								parameterDefinitions: JSON.parse(recipeParameters),
								outputBindings: JSON.parse(recipeOutputs),
							}),
				});
			} else if (suggestedRunId && !prompt.trim()) {
				if (saveKind === "recipe") {
					await client.assistant.saveActionFromRun.mutate({
						runId: suggestedRunId,
						name: name.trim(),
						kind: "recipe",
						inputTemplate: JSON.parse(recipeInput),
						parameterDefinitions: JSON.parse(recipeParameters),
						outputBindings: JSON.parse(recipeOutputs),
					});
				} else {
					await client.assistant.saveActionFromRun.mutate({
						runId: suggestedRunId,
						name: name.trim(),
						kind: "prompt_shortcut",
					});
				}
				onSuggestionSaved();
			} else {
				await client.assistant.createSavedAction.mutate({
					kind: "prompt_shortcut",
					name: name.trim(),
					promptTemplate: prompt.trim(),
				});
			}
			resetEditor();
			setNotice("Favorite saved.");
			await load();
		} catch (error) {
			setNotice(
				error instanceof Error ? error.message : "Favorite could not be saved.",
			);
		} finally {
			setBusy(false);
		}
	};

	const run = async (action: SavedAction) => {
		setBusy(true);
		try {
			const typedParameters = Object.fromEntries(
				parameterDefinitions(action.parameterDefinitions).flatMap(
					(definition) => {
						const value = parameters[`${action.id}:${definition.key}`];
						if (!definition.required && !value) return [];
						return [
							[
								definition.key,
								definition.type === "number" ? Number(value) : (value ?? ""),
							],
						];
					},
				),
			);
			const result = await client.assistant.executeSavedAction.mutate({
				id: action.id,
				parameters: typedParameters,
				...(conversationId ? { conversationId } : {}),
			});
			if (result.status === "prompt_ready") {
				onUsePrompt(result.prompt);
				onOpenChange(false);
			} else if (result.status === "requires_approval") {
				setPendingApproval({
					proposalId: result.proposalId,
					approvalToken: result.approvalToken,
					expiresAt: result.expiresAt,
					review: result.review,
				});
				setNotice("A fresh approval proposal was created for this run.");
			} else if (result.status === "repair_required") {
				setNotice("This recipe needs review before it can run.");
			} else if (result.status === "completed" || result.status === "failed") {
				onConversationChanged();
				onOpenChange(false);
			}
			await load();
		} catch (error) {
			setNotice(
				error instanceof Error ? error.message : "Favorite could not run.",
			);
		} finally {
			setBusy(false);
		}
	};

	const decideApproval = async (decision: "approve" | "reject") => {
		if (!pendingApproval) return;
		setBusy(true);
		try {
			const result = await client.assistant.decideProposal.mutate({
				proposalId: pendingApproval.proposalId,
				approvalToken: pendingApproval.approvalToken,
				confirmationRequestId: crypto.randomUUID(),
				decision,
			});
			setNotice(
				result.status === "succeeded"
					? "Approved action completed."
					: result.status === "rejected"
						? "Approval declined."
						: result.status === "unknown"
							? "The outcome is being checked. The action will not be repeated."
							: `Approval status: ${result.status}.`,
			);
			if (!["processing", "unknown"].includes(result.status))
				setPendingApproval(null);
			await load();
		} catch (error) {
			setNotice(
				error instanceof Error
					? error.message
					: "Approval could not be processed.",
			);
		} finally {
			setBusy(false);
		}
	};

	const move = async (index: number, direction: -1 | 1) => {
		const target = index + direction;
		if (target < 0 || target >= actions.length) return;
		const ordered = [...actions];
		const current = ordered[index];
		const replacement = ordered[target];
		if (!current || !replacement) return;
		ordered[index] = replacement;
		ordered[target] = current;
		setActions(ordered);
		try {
			await client.assistant.reorderSavedActions.mutate({
				items: ordered.map(({ id, version }) => ({
					id,
					expectedVersion: version,
				})),
			});
			await load();
		} catch {
			setNotice("Favorite order changed elsewhere. Reloading.");
			await load();
		}
	};

	const savePreferences = async () => {
		setBusy(true);
		try {
			const result = await client.assistant.updatePreferences.mutate({
				responseStyle: preferences.responseStyle,
				responseDetail: preferences.responseDetail,
				chartPresentation: preferences.chartPresentation,
				expectedVersion: preferences.version,
			});
			setPreferences(result as Preference);
			setNotice("Assistant preferences saved.");
		} catch (error) {
			setNotice(
				error instanceof Error
					? error.message
					: "Preferences could not be saved.",
			);
		} finally {
			setBusy(false);
		}
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-2xl">
				<DialogHeader>
					<DialogTitle>
						{mode === "favorites"
							? "Favorite actions"
							: "Assistant preferences"}
					</DialogTitle>
					<DialogDescription>
						{mode === "favorites"
							? "Run prompt shortcuts or versioned recipes. Business changes always create a new approval."
							: "Choose how answers appear and manage the personal details you explicitly asked the assistant to remember."}
					</DialogDescription>
				</DialogHeader>
				{notice ? (
					<output className="block rounded-md bg-muted px-3 py-2 text-sm">
						{notice}
					</output>
				) : null}
				{pendingApproval ? (
					<section className="space-y-3 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm dark:border-amber-900 dark:bg-amber-950/30">
						<div>
							<strong>Review required</strong>
							<p className="text-muted-foreground">
								{pendingApproval.review.diff.summary} Expires{" "}
								{new Date(pendingApproval.expiresAt).toLocaleTimeString()}.
							</p>
						</div>
						<dl className="grid gap-2 rounded-md border bg-background p-3 sm:grid-cols-[8rem_1fr]">
							<dt className="text-muted-foreground">Action</dt>
							<dd className="font-medium">{pendingApproval.review.title}</dd>
							<dt className="text-muted-foreground">Effect</dt>
							<dd className="capitalize">{pendingApproval.review.effect}</dd>
							{pendingApproval.review.targetRevision ? (
								<>
									<dt className="text-muted-foreground">Record revision</dt>
									<dd className="break-all font-mono text-xs">
										{pendingApproval.review.targetRevision}
									</dd>
								</>
							) : null}
						</dl>
						<div className="space-y-1">
							<p className="font-medium">Parameters</p>
							<pre className="max-h-48 overflow-auto rounded-md border bg-background p-3 text-xs">
								{JSON.stringify(pendingApproval.review.parameters, null, 2)}
							</pre>
						</div>
						{pendingApproval.review.diff.changes.length ? (
							<ul className="list-disc space-y-1 pl-5 text-muted-foreground">
								{pendingApproval.review.diff.changes.map((change) => (
									<li key={change}>{change}</li>
								))}
							</ul>
						) : null}
						<div className="flex justify-end gap-2">
							<Button
								type="button"
								variant="outline"
								disabled={busy}
								onClick={() => void decideApproval("reject")}
							>
								Decline
							</Button>
							<Button
								type="button"
								disabled={busy}
								onClick={() => void decideApproval("approve")}
							>
								Confirm action
							</Button>
						</div>
					</section>
				) : null}
				{mode === "favorites" ? (
					<div className="space-y-5">
						<div className="space-y-2">
							{actions.map((action, index) => (
								<div key={action.id} className="rounded-lg border p-3">
									<div className="flex items-start gap-2">
										<div className="min-w-0 flex-1">
											<strong className="text-sm">{action.name}</strong>
											<p className="truncate text-xs text-muted-foreground">
												{action.kind === "prompt_shortcut"
													? action.promptTemplate
													: `${action.toolId}@${action.toolVersion} · ${action.effect}`}
											</p>
											{action.compatibility.status !== "current" ? (
												<p className="mt-1 text-xs text-amber-700">
													Needs review
													{action.compatibility.repair
														? `: ${action.compatibility.repair.title}`
														: ""}
												</p>
											) : action.lastRunStatus ? (
												<p className="mt-1 text-xs text-muted-foreground">
													Last run: {action.lastRunStatus}
													{action.lastRunAt
														? ` · ${new Date(action.lastRunAt).toLocaleString()}`
														: ""}
												</p>
											) : null}
										</div>
										<Button
											size="icon"
											variant="ghost"
											aria-label={`Run ${action.name}`}
											disabled={
												busy || action.compatibility.status !== "current"
											}
											onClick={() => void run(action)}
										>
											<Play size={15} />
										</Button>
										<Button
											size="icon"
											variant="ghost"
											aria-label={`Edit ${action.name}`}
											onClick={() => {
												setEditingId(action.id);
												setName(action.name);
												setPrompt(action.promptTemplate ?? "");
												setSaveKind(
													action.kind === "recipe"
														? "recipe"
														: "prompt_shortcut",
												);
												setRecipeInput(
													JSON.stringify(action.inputTemplate ?? {}, null, 2),
												);
												setRecipeParameters(
													JSON.stringify(
														action.parameterDefinitions ?? [],
														null,
														2,
													),
												);
												setRecipeOutputs(
													JSON.stringify(action.outputBindings ?? [], null, 2),
												);
											}}
										>
											<Pencil size={15} />
										</Button>
										<Button
											size="icon"
											variant="ghost"
											aria-label={`Duplicate ${action.name}`}
											onClick={() =>
												void client.assistant.duplicateSavedAction
													.mutate({
														id: action.id,
														name: `${action.name} copy`,
													})
													.then(load)
													.catch(() =>
														setNotice("Favorite could not be duplicated."),
													)
											}
										>
											<Copy size={15} />
										</Button>
										<Button
											size="icon"
											variant="ghost"
											aria-label={`Move ${action.name} up`}
											disabled={index === 0}
											onClick={() => void move(index, -1)}
										>
											<ChevronUp size={15} />
										</Button>
										<Button
											size="icon"
											variant="ghost"
											aria-label={`Move ${action.name} down`}
											disabled={index === actions.length - 1}
											onClick={() => void move(index, 1)}
										>
											<ChevronDown size={15} />
										</Button>
										<Button
											size="icon"
											variant="ghost"
											aria-label={`Remove ${action.name}`}
											onClick={() =>
												void client.assistant.removeSavedAction
													.mutate({
														id: action.id,
														expectedVersion: action.version,
													})
													.then(load)
													.catch(() =>
														setNotice(
															"Favorite changed elsewhere. Reload and retry.",
														),
													)
											}
										>
											<Trash2 size={15} />
										</Button>
									</div>
									{action.kind === "recipe"
										? parameterDefinitions(action.parameterDefinitions).map(
												(definition) => (
													<Input
														key={definition.key}
														className="mt-2"
														type={
															definition.type === "number"
																? "number"
																: definition.type === "date"
																	? "date"
																	: "text"
														}
														aria-label={definition.label}
														placeholder={
															definition.type === "relative_date"
																? "today, start_of_month, or days_ago:30"
																: definition.label
														}
														value={
															parameters[`${action.id}:${definition.key}`] ?? ""
														}
														onChange={(event) =>
															setParameters((current) => ({
																...current,
																[`${action.id}:${definition.key}`]:
																	event.target.value,
															}))
														}
													/>
												),
											)
										: null}
								</div>
							))}
							{!actions.length ? (
								<p className="py-6 text-center text-sm text-muted-foreground">
									No favorite actions yet.
								</p>
							) : null}
						</div>
						<div className="space-y-2 border-t pt-4">
							<p className="text-sm font-medium">
								{suggestedName ??
									(editingId ? "Edit favorite" : "Add prompt shortcut")}
							</p>
							<Input
								aria-label="Favorite name"
								placeholder="Favorite name"
								value={name}
								onChange={(event) => setName(event.target.value)}
							/>
							{suggestedRunId && !editingId ? (
								<label className="block text-sm">
									Save as
									<select
										className="mt-1 w-full rounded-md border bg-background p-2"
										value={saveKind}
										onChange={(event) =>
											setSaveKind(
												event.target.value as "prompt_shortcut" | "recipe",
											)
										}
									>
										<option value="prompt_shortcut">Prompt shortcut</option>
										<option value="recipe">Deterministic recipe</option>
									</select>
								</label>
							) : null}
							{suggestedRunId && !prompt ? (
								saveKind === "recipe" ? (
									<div className="space-y-2">
										<p className="text-xs text-muted-foreground">
											Recipe JSON is validated and bound to the verified tool
											version. Use {`{"$parameter":"query"}`} for a parameter
											value.
										</p>
										<Textarea
											aria-label="Recipe input template"
											placeholder="Input template JSON"
											value={recipeInput}
											onChange={(event) => setRecipeInput(event.target.value)}
										/>
										<Textarea
											aria-label="Recipe parameters"
											placeholder="Parameter definitions JSON"
											value={recipeParameters}
											onChange={(event) =>
												setRecipeParameters(event.target.value)
											}
										/>
										<Textarea
											aria-label="Recipe output bindings"
											placeholder="Output bindings JSON"
											value={recipeOutputs}
											onChange={(event) => setRecipeOutputs(event.target.value)}
										/>
									</div>
								) : (
									<p className="text-xs text-muted-foreground">
										The server will reuse the prompt only after verifying a
										durable successful tool outcome.
									</p>
								)
							) : saveKind === "recipe" ? (
								<div className="space-y-2">
									<Textarea
										aria-label="Recipe input template"
										value={recipeInput}
										onChange={(event) => setRecipeInput(event.target.value)}
									/>
									<Textarea
										aria-label="Recipe parameters"
										value={recipeParameters}
										onChange={(event) =>
											setRecipeParameters(event.target.value)
										}
									/>
									<Textarea
										aria-label="Recipe output bindings"
										value={recipeOutputs}
										onChange={(event) => setRecipeOutputs(event.target.value)}
									/>
								</div>
							) : (
								<Textarea
									aria-label="Favorite prompt"
									placeholder="Prompt to append and run"
									value={prompt}
									onChange={(event) => setPrompt(event.target.value)}
								/>
							)}
							<Button
								disabled={busy || !name.trim()}
								onClick={() => void saveFavorite()}
							>
								<Plus size={15} /> Save favorite
							</Button>
						</div>
					</div>
				) : (
					<div className="space-y-5">
						<div className="grid gap-3 sm:grid-cols-3">
							<label className="text-sm">
								Answer style
								<select
									className="mt-1 w-full rounded-md border bg-background p-2"
									value={preferences.responseStyle}
									onChange={(event) =>
										setPreferences((current) => ({
											...current,
											responseStyle: event.target
												.value as Preference["responseStyle"],
										}))
									}
								>
									<option value="concise">Concise</option>
									<option value="balanced">Balanced</option>
									<option value="explanatory">Explanatory</option>
								</select>
							</label>
							<label className="text-sm">
								Detail
								<select
									className="mt-1 w-full rounded-md border bg-background p-2"
									value={preferences.responseDetail}
									onChange={(event) =>
										setPreferences((current) => ({
											...current,
											responseDetail: event.target
												.value as Preference["responseDetail"],
										}))
									}
								>
									<option value="brief">Brief</option>
									<option value="standard">Standard</option>
									<option value="detailed">Detailed</option>
								</select>
							</label>
							<label className="text-sm">
								Charts
								<select
									className="mt-1 w-full rounded-md border bg-background p-2"
									value={preferences.chartPresentation}
									onChange={(event) =>
										setPreferences((current) => ({
											...current,
											chartPresentation: event.target
												.value as Preference["chartPresentation"],
										}))
									}
								>
									<option value="auto">Automatic</option>
									<option value="table">Table</option>
									<option value="bar">Bar</option>
									<option value="line">Line</option>
									<option value="area">Area</option>
								</select>
							</label>
						</div>
						<Button disabled={busy} onClick={() => void savePreferences()}>
							Save preferences
						</Button>
						<div className="space-y-2 border-t pt-4">
							<h3 className="text-sm font-medium">Personal memory</h3>
							<p className="text-xs text-muted-foreground">
								Only details you add here are remembered. Remove any item at any
								time.
							</p>
							{memories.map((item) => (
								<div
									key={item.id}
									className="flex items-center gap-2 rounded-md border p-2 text-sm"
								>
									<span className="flex-1">{item.content}</span>
									<Button
										size="icon"
										variant="ghost"
										aria-label="Remove memory"
										onClick={() =>
											void client.assistant.removeMemory
												.mutate({ id: item.id, expectedVersion: item.version })
												.then(load)
												.catch(() =>
													setNotice(
														"Memory changed elsewhere. Reload and retry.",
													),
												)
										}
									>
										<Trash2 size={15} />
									</Button>
								</div>
							))}
							<div className="flex gap-2">
								<Input
									aria-label="New memory"
									placeholder="Example: Prefer order totals without tax"
									value={memory}
									onChange={(event) => setMemory(event.target.value)}
								/>
								<Button
									disabled={!memory.trim()}
									onClick={() =>
										void client.assistant.createMemory
											.mutate({ content: memory.trim() })
											.then(() => {
												setMemory("");
												return load();
											})
											.catch(() => setNotice("Memory could not be saved."))
									}
								>
									<Plus size={15} /> Add
								</Button>
							</div>
						</div>
					</div>
				)}
			</DialogContent>
		</Dialog>
	);
}
