"use client";

import { useTRPCClient } from "@/trpc/client";
import { Button } from "@gnd/ui/button";
import { Checkbox } from "@gnd/ui/checkbox";
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
	BellOff,
	Check,
	GitMerge,
	Inbox,
	LoaderCircle,
	MessageSquarePlus,
	RefreshCw,
	UserRoundCheck,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { assistantFeatureRequestDecision } from "./assistant-feature-request-decision";

const featureRequestStatuses = [
	"submitted",
	"analyzing",
	"needs_clarification",
	"triaged",
	"planned",
	"building",
	"testing",
	"available",
	"duplicate",
	"declined",
	"cancelled",
] as const;
type FeatureRequestStatus = (typeof featureRequestStatuses)[number];
type TriageStatus = Exclude<
	FeatureRequestStatus,
	"submitted" | "analyzing" | "available" | "duplicate"
>;

type RequestRow = {
	id: string;
	summary: string;
	status: FeatureRequestStatus;
	category: string;
	capabilityKey: string | null;
	analysisStatus: string;
	analysis: unknown;
	assignedToUserId: number | null;
	updatedAt: Date | string;
	subscriptions?: Array<{ id: string }>;
	_count?: { submissions: number; subscriptions: number };
};

type InitialRequest = {
	summary: string;
	runId: string | null;
	messageId: string | null;
} | null;

const statusLabels: Record<FeatureRequestStatus, string> = {
	submitted: "Submitted",
	analyzing: "Analyzing",
	needs_clarification: "Needs clarification",
	triaged: "Triaged",
	planned: "Planned",
	building: "Building",
	testing: "Testing",
	available: "Available",
	duplicate: "Duplicate",
	declined: "Declined",
	cancelled: "Cancelled",
};

export function AssistantFeatureRequestsDialog(props: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	conversationId: string | null;
	initialRequest: InitialRequest;
	initialMode?: "mine" | "triage";
}) {
	const client = useTRPCClient();
	const [mode, setMode] = useState<"new" | "mine" | "triage">("mine");
	const [summary, setSummary] = useState("");
	const [releaseOptIn, setReleaseOptIn] = useState(false);
	const [mine, setMine] = useState<RequestRow[]>([]);
	const [triage, setTriage] = useState<RequestRow[]>([]);
	const [canTriage, setCanTriage] = useState(false);
	const [loading, setLoading] = useState(false);
	const [saving, setSaving] = useState(false);
	const [notice, setNotice] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [clientRequestId, setClientRequestId] = useState(() =>
		crypto.randomUUID(),
	);
	const [ownerByRequest, setOwnerByRequest] = useState<Record<string, string>>(
		{},
	);
	const [mergeByRequest, setMergeByRequest] = useState<Record<string, string>>(
		{},
	);
	const [releaseDraft, setReleaseDraft] = useState({
		requestId: "",
		capabilityKey: "",
		version: "",
		verificationId: "",
		notes: "",
	});

	const load = useCallback(async () => {
		setLoading(true);
		setError(null);
		try {
			const [myRows, access] = await Promise.all([
				client.assistant.featureRequestsMine.query(),
				client.assistant.featureRequestAdminAccess.query(),
			]);
			setMine(myRows as RequestRow[]);
			setCanTriage(access.canTriage);
			if (access.canTriage) {
				setTriage(
					(await client.assistant.featureRequestsTriage.query({
						take: 50,
					})) as RequestRow[],
				);
			}
		} catch {
			setError("Feature requests could not be loaded.");
		} finally {
			setLoading(false);
		}
	}, [client]);

	useEffect(() => {
		if (!props.open) return;
		setNotice(null);
		setError(null);
		setReleaseOptIn(false);
		setClientRequestId(crypto.randomUUID());
		if (props.initialRequest?.summary) {
			setSummary(props.initialRequest.summary);
			setMode("new");
		} else {
			setSummary("");
			setMode(props.initialMode ?? "mine");
		}
		void load();
	}, [load, props.initialMode, props.initialRequest, props.open]);

	const submit = async () => {
		if (summary.trim().length < 10 || saving) return;
		const decision = assistantFeatureRequestDecision("notify", releaseOptIn);
		if (!decision.submit) return;
		setSaving(true);
		setError(null);
		try {
			const result = await client.assistant.submitFeatureRequest.mutate({
				clientRequestId,
				summary: summary.trim(),
				releaseOptIn: decision.releaseOptIn,
				evidence: {
					source: props.initialRequest ? "assistant_card" : "assistant_menu",
					...(props.conversationId
						? { conversationId: props.conversationId }
						: {}),
					...(props.initialRequest?.runId
						? { runId: props.initialRequest.runId }
						: {}),
					...(props.initialRequest?.messageId
						? { messageId: props.initialRequest.messageId }
						: {}),
				},
			});
			if (result.status === "not_missing") {
				setError(
					result.prepared.classification === "access_denied"
						? "This is an access request. Ask an administrator for the required permission."
						: "An existing Assistant action may already handle this request.",
				);
				return;
			}
			setNotice(
				result.deduplicated
					? `Request ${result.request.id} was already saved. Developer notification remains queued.`
					: `Request ${result.request.id} was saved. Developer notification is pending.`,
			);
			setMode("mine");
			await load();
		} catch {
			setError("The request could not be saved. You can retry safely.");
		} finally {
			setSaving(false);
		}
	};

	const unsubscribe = async (requestId: string) => {
		setError(null);
		try {
			await client.assistant.unsubscribeFeatureRequest.mutate({ requestId });
			setNotice("Release notifications are off for this request.");
			await load();
		} catch {
			setError("Release notifications could not be changed.");
		}
	};

	const triageRequest = async (
		row: RequestRow,
		change: {
			status?: TriageStatus;
			assignedToUserId?: number | null;
			mergedIntoId?: string;
			reviewAnalysis?: boolean;
		},
	) => {
		setSaving(true);
		setError(null);
		try {
			await client.assistant.triageFeatureRequest.mutate({
				requestId: row.id,
				expectedUpdatedAt: new Date(row.updatedAt),
				...change,
			});
			await load();
		} catch {
			setError("The triage change could not be saved. Reload and retry.");
		} finally {
			setSaving(false);
		}
	};

	const publishRelease = async () => {
		if (
			!releaseDraft.requestId ||
			!releaseDraft.capabilityKey.trim() ||
			!releaseDraft.version.trim() ||
			!releaseDraft.verificationId.trim() ||
			!releaseDraft.notes.trim()
		)
			return;
		setSaving(true);
		setError(null);
		try {
			const result = await client.assistant.publishFeatureRelease.mutate({
				capabilityKey: releaseDraft.capabilityKey.trim(),
				version: releaseDraft.version.trim(),
				rolloutEvidence: {
					verificationId: releaseDraft.verificationId.trim(),
					verifiedAt: new Date(),
					notes: releaseDraft.notes.trim(),
				},
				requestIds: [releaseDraft.requestId],
			});
			setNotice(
				`Release ${result.release.id} is available; ${result.queuedNotices} opted-in notice${result.queuedNotices === 1 ? " is" : "s are"} queued.`,
			);
			await load();
		} catch {
			setError(
				"The release could not be published. Verify rollout evidence and request status.",
			);
		} finally {
			setSaving(false);
		}
	};

	return (
		<Dialog open={props.open} onOpenChange={props.onOpenChange}>
			<DialogContent className="max-h-[min(760px,92vh)] max-w-3xl overflow-y-auto">
				<DialogHeader>
					<DialogTitle>Assistant feature requests</DialogTitle>
					<DialogDescription>
						Submit a missing capability, follow its progress, or review the
						developer queue.
					</DialogDescription>
				</DialogHeader>

				<div className="flex flex-wrap gap-2 border-b pb-3">
					<Button
						variant={mode === "new" ? "default" : "ghost"}
						size="sm"
						onClick={() => {
							setError(null);
							setMode("new");
						}}
					>
						<MessageSquarePlus size={15} /> New request
					</Button>
					<Button
						variant={mode === "mine" ? "default" : "ghost"}
						size="sm"
						onClick={() => setMode("mine")}
					>
						<Inbox size={15} /> My requests
					</Button>
					{canTriage ? (
						<>
							<Button
								variant={mode === "triage" ? "default" : "ghost"}
								size="sm"
								onClick={() => setMode("triage")}
							>
								<UserRoundCheck size={15} /> Developer triage
							</Button>
							<Button
								variant="outline"
								size="sm"
								disabled={saving}
								onClick={() => {
									setSaving(true);
									void client.assistant.processFeatureAnalysis
										.mutate()
										.then((result) => {
											setNotice(
												result.status === "idle"
													? "The analysis queue is empty."
													: `Analysis queue: ${result.status}.`,
											);
											return load();
										})
										.catch(() =>
											setError("The analysis queue could not be processed."),
										)
										.finally(() => setSaving(false));
								}}
							>
								Run analysis queue
							</Button>
							<Button
								variant="outline"
								size="sm"
								disabled={saving}
								onClick={() => {
									setSaving(true);
									void client.assistant.processFeatureNotification
										.mutate()
										.then((result) => {
											setNotice(`Notification queue: ${result.status}.`);
											return load();
										})
										.catch(() =>
											setError(
												"The notification queue could not be processed.",
											),
										)
										.finally(() => setSaving(false));
								}}
							>
								Run delivery queue
							</Button>
						</>
					) : null}
					<Button variant="ghost" size="icon" onClick={() => void load()}>
						<RefreshCw size={15} />
						<span className="sr-only">Refresh requests</span>
					</Button>
				</div>

				{notice ? (
					<div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-950">
						{notice}
					</div>
				) : null}
				{error ? (
					<div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
						{error}
					</div>
				) : null}

				{mode === "new" ? (
					<div className="grid gap-4">
						<div className="grid gap-2">
							<label
								htmlFor="assistant-feature-summary"
								className="text-sm font-medium"
							>
								Requested feature
							</label>
							<Textarea
								id="assistant-feature-summary"
								maxLength={500}
								value={summary}
								onChange={(event) => setSummary(event.target.value)}
								placeholder="Describe the outcome you want in one sentence"
							/>
							<p className="text-xs text-muted-foreground">
								Only this summary and minimal Assistant references are sent. The
								conversation and attachments are excluded.
							</p>
						</div>
						<label
							className="flex items-start gap-3 text-sm"
							htmlFor="assistant-feature-release-opt-in"
						>
							<Checkbox
								id="assistant-feature-release-opt-in"
								checked={releaseOptIn}
								onCheckedChange={(value) => setReleaseOptIn(value === true)}
							/>
							<span>Notify me when this feature is ready to use</span>
						</label>
						<div className="flex justify-end gap-2">
							<Button
								type="button"
								variant="outline"
								onClick={() => {
									const decision = assistantFeatureRequestDecision(
										"not_now",
										releaseOptIn,
									);
									if (!decision.submit) props.onOpenChange(false);
								}}
							>
								Not now
							</Button>
							<Button
								type="button"
								disabled={saving || summary.trim().length < 10}
								onClick={() => void submit()}
							>
								{saving ? (
									<LoaderCircle className="animate-spin" size={15} />
								) : (
									<Check size={15} />
								)}
								Notify developers
							</Button>
						</div>
					</div>
				) : null}

				{mode === "mine" ? (
					<div className="grid gap-3">
						{loading ? (
							<p className="text-sm text-muted-foreground">Loading requests…</p>
						) : null}
						{!loading && !mine.length ? (
							<p className="py-8 text-center text-sm text-muted-foreground">
								No feature requests yet.
							</p>
						) : null}
						{mine.map((row) => (
							<div key={row.id} className="rounded-lg border p-4">
								<div className="flex items-start justify-between gap-4">
									<div>
										<strong className="text-sm">{row.summary}</strong>
										<p className="mt-1 text-xs text-muted-foreground">
											{statusLabels[row.status] ?? row.status} · Analysis{" "}
											{row.analysisStatus}
										</p>
									</div>
									{row.subscriptions?.length ? (
										<Button
											variant="ghost"
											size="sm"
											onClick={() => void unsubscribe(row.id)}
										>
											<BellOff size={14} /> Unsubscribe
										</Button>
									) : null}
								</div>
							</div>
						))}
					</div>
				) : null}

				{mode === "triage" && canTriage ? (
					<div className="grid gap-4">
						<div className="grid gap-3 rounded-lg border bg-muted/20 p-4">
							<div>
								<strong className="text-sm">
									Publish verified availability
								</strong>
								<p className="text-xs text-muted-foreground">
									Link one accepted request to a real capability version only
									after rollout verification.
								</p>
							</div>
							<div className="grid gap-2 md:grid-cols-3">
								<Input
									aria-label="Release request ID"
									placeholder="Request ID"
									value={releaseDraft.requestId}
									onChange={(event) =>
										setReleaseDraft((current) => ({
											...current,
											requestId: event.target.value,
										}))
									}
								/>
								<Input
									aria-label="Capability key"
									placeholder="Capability key"
									value={releaseDraft.capabilityKey}
									onChange={(event) =>
										setReleaseDraft((current) => ({
											...current,
											capabilityKey: event.target.value,
										}))
									}
								/>
								<Input
									aria-label="Release version"
									placeholder="Version"
									value={releaseDraft.version}
									onChange={(event) =>
										setReleaseDraft((current) => ({
											...current,
											version: event.target.value,
										}))
									}
								/>
								<Input
									aria-label="Rollout verification ID"
									placeholder="Verification run ID"
									value={releaseDraft.verificationId}
									onChange={(event) =>
										setReleaseDraft((current) => ({
											...current,
											verificationId: event.target.value,
										}))
									}
								/>
							</div>
							<Textarea
								aria-label="Rollout verification notes"
								placeholder="What was verified in the deployed rollout?"
								value={releaseDraft.notes}
								onChange={(event) =>
									setReleaseDraft((current) => ({
										...current,
										notes: event.target.value,
									}))
								}
							/>
							<div className="flex justify-end">
								<Button
									size="sm"
									disabled={saving}
									onClick={() => void publishRelease()}
								>
									Publish availability
								</Button>
							</div>
						</div>
						{triage.map((row) => (
							<div key={row.id} className="grid gap-3 rounded-lg border p-4">
								<div className="flex items-start justify-between gap-3">
									<div>
										<strong className="text-sm">{row.summary}</strong>
										<p className="text-xs text-muted-foreground">
											{row.category} · {row._count?.submissions ?? 0} requests ·{" "}
											{row._count?.subscriptions ?? 0} subscribers
										</p>
									</div>
									<select
										aria-label={`Status for ${row.summary}`}
										className="h-9 rounded-md border bg-background px-2 text-sm"
										value={row.status}
										disabled={row.status === "available"}
										onChange={(event) =>
											void triageRequest(row, {
												status: event.target.value as TriageStatus,
											})
										}
									>
										{[
											"submitted",
											"analyzing",
											"available",
											"duplicate",
										].includes(row.status) ? (
											<option value={row.status} disabled>
												{statusLabels[row.status]}
											</option>
										) : null}
										{Object.entries(statusLabels)
											.filter(
												([value]) =>
													![
														"submitted",
														"analyzing",
														"available",
														"duplicate",
													].includes(value),
											)
											.map(([value, label]) => (
												<option key={value} value={value}>
													{label}
												</option>
											))}
									</select>
								</div>
								<div className="grid gap-2 md:grid-cols-2">
									<Input
										aria-label={`Owner user ID for ${row.summary}`}
										placeholder="Owner user ID"
										value={ownerByRequest[row.id] ?? row.assignedToUserId ?? ""}
										onChange={(event) =>
											setOwnerByRequest((current) => ({
												...current,
												[row.id]: event.target.value,
											}))
										}
									/>
									<Input
										aria-label={`Merge target for ${row.summary}`}
										placeholder="Canonical request ID"
										value={mergeByRequest[row.id] ?? ""}
										onChange={(event) =>
											setMergeByRequest((current) => ({
												...current,
												[row.id]: event.target.value,
											}))
										}
									/>
								</div>
								<div className="flex flex-wrap gap-2">
									<Button
										size="sm"
										variant="outline"
										disabled={saving}
										onClick={() =>
											setReleaseDraft((current) => ({
												...current,
												requestId: row.id,
												capabilityKey: row.capabilityKey ?? "",
											}))
										}
									>
										Use for release
									</Button>
									<Button
										size="sm"
										variant="outline"
										disabled={saving}
										onClick={() =>
											void triageRequest(row, { status: "planned" })
										}
									>
										Accept
									</Button>
									<Button
										size="sm"
										variant="outline"
										disabled={saving}
										onClick={() =>
											void triageRequest(row, { status: "needs_clarification" })
										}
									>
										Clarify
									</Button>
									<Button
										size="sm"
										variant="outline"
										disabled={saving}
										onClick={() =>
											void triageRequest(row, { status: "declined" })
										}
									>
										Reject
									</Button>
									<Button
										size="sm"
										variant="outline"
										disabled={saving || !ownerByRequest[row.id]}
										onClick={() =>
											void triageRequest(row, {
												assignedToUserId: Number(ownerByRequest[row.id]),
											})
										}
									>
										<UserRoundCheck size={14} /> Assign
									</Button>
									<Button
										size="sm"
										variant="outline"
										disabled={saving || !mergeByRequest[row.id]?.trim()}
										onClick={() =>
											void triageRequest(row, {
												mergedIntoId: mergeByRequest[row.id]?.trim(),
											})
										}
									>
										<GitMerge size={14} /> Merge
									</Button>
									<Button
										size="sm"
										variant="outline"
										disabled={saving || row.analysisStatus !== "completed"}
										onClick={() =>
											void triageRequest(row, { reviewAnalysis: true })
										}
									>
										Review analysis
									</Button>
									{row.analysisStatus === "completed" && row.analysis ? (
										<pre className="max-h-72 w-full overflow-auto whitespace-pre-wrap rounded-md bg-muted p-3 text-xs">
											{JSON.stringify(row.analysis, null, 2)}
										</pre>
									) : null}
									{row.analysisStatus === "failed" ||
									row.analysisStatus === "retrying" ? (
										<Button
											size="sm"
											variant="outline"
											onClick={() =>
												void client.assistant.retryFeatureAnalysis
													.mutate({ requestId: row.id })
													.then(load)
											}
										>
											Retry analysis
										</Button>
									) : null}
								</div>
							</div>
						))}
					</div>
				) : null}
			</DialogContent>
		</Dialog>
	);
}
