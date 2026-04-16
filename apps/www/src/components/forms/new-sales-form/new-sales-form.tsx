"use client";

import { triggerEvent } from "@/actions/events";
import { resetSalesStatAction } from "@/actions/reset-sales-stat";
import { _modal } from "@/components/common/modal/provider";
import { useTaskTrigger } from "@/hooks/use-task-trigger";
import { Button } from "@gnd/ui/button";
import { toast } from "@gnd/ui/use-toast";
import type { CreateSalesHistorySchemaTask } from "@jobs/schema";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
	useNewSalesFormBootstrapQuery,
	useNewSalesFormGetQuery,
	useSaveFinalNewSalesFormMutation,
} from "./api";
import {
	type NewSalesFormRecoverySnapshot,
	clearRecoverySnapshot,
	createPayloadFingerprint,
	getRecoveryStorageKey,
	readRecoverySnapshot,
	writeRecoverySnapshot,
} from "./local-recovery";
import { toSaveDraftInput } from "./mappers";
import { HeaderActions } from "./sections/header-actions";
import { useNewSalesFormStore } from "./store";
import { useNewSalesFormAutoSave } from "./use-auto-save";

interface Props {
	mode: "create" | "edit";
	type: "order" | "quote";
	slug?: string;
}

const ItemWorkflowPanel = dynamic(
	() =>
		import("./sections/item-workflow-panel").then(
			(mod) => mod.ItemWorkflowPanel,
		),
	{
		loading: () => <WorkflowPanelSkeleton />,
	},
);

const InvoiceSummarySidebar = dynamic(
	() =>
		import("./sections/invoice-summary-sidebar").then(
			(mod) => mod.InvoiceSummarySidebar,
		),
	{
		loading: () => null,
	},
);

function currency(value?: number | null) {
	return new Intl.NumberFormat("en-US", {
		style: "currency",
		currency: "USD",
	}).format(Number(value || 0));
}

function getErrorMessage(error: unknown, fallback: string) {
	if (error instanceof Error && error.message) return error.message;
	return fallback;
}

function WorkflowPanelSkeleton() {
	return (
		<div className="grid gap-4">
			<div className="rounded-xl border bg-card p-4">
				<div className="h-5 w-44 animate-pulse rounded bg-muted" />
				<div className="mt-3 h-4 w-72 animate-pulse rounded bg-muted" />
			</div>
			<div className="rounded-xl border bg-card p-4">
				<div className="h-10 w-full animate-pulse rounded bg-muted" />
				<div className="mt-4 grid gap-3">
					<div className="h-20 w-full animate-pulse rounded bg-muted" />
					<div className="h-20 w-full animate-pulse rounded bg-muted" />
					<div className="h-20 w-full animate-pulse rounded bg-muted" />
				</div>
			</div>
		</div>
	);
}

export function NewSalesForm(props: Props) {
	const router = useRouter();
	const record = useNewSalesFormStore((s) => s.record);
	const dirty = useNewSalesFormStore((s) => s.dirty);
	const saveStatus = useNewSalesFormStore((s) => s.saveStatus);
	const lastSavedAt = useNewSalesFormStore((s) => s.lastSavedAt);
	const lastSaveError = useNewSalesFormStore((s) => s.lastSaveError);
	const hydrate = useNewSalesFormStore((s) => s.hydrate);
	const restoreLocalDraft = useNewSalesFormStore((s) => s.restoreLocalDraft);
	const addLineItem = useNewSalesFormStore((s) => s.addLineItem);
	const markSaving = useNewSalesFormStore((s) => s.markSaving);
	const markSaved = useNewSalesFormStore((s) => s.markSaved);
	const markError = useNewSalesFormStore((s) => s.markError);
	const markStale = useNewSalesFormStore((s) => s.markStale);
	const patchRecord = useNewSalesFormStore((s) => s.patchRecord);
	const editor = useNewSalesFormStore((s) => s.editor);
	const setEditor = useNewSalesFormStore((s) => s.setEditor);
	const [recoverySnapshot, setRecoverySnapshot] =
		useState<NewSalesFormRecoverySnapshot | null>(null);
	const lastHydratedLoadKeyRef = useRef<string | null>(null);
	const leaveWarningBypassedRef = useRef(false);

	const bootstrapQuery = useNewSalesFormBootstrapQuery(
		{
			type: props.type,
			customerId: null,
		},
		props.mode === "create",
	);
	const getQuery = useNewSalesFormGetQuery(
		{
			type: props.type,
			slug: props.slug || "",
		},
		props.mode === "edit" && !!props.slug,
	);

	const loadData =
		props.mode === "create" ? bootstrapQuery.data : getQuery.data;
	const isLoading =
		props.mode === "create" ? bootstrapQuery.isPending : getQuery.isPending;
	const loadError =
		props.mode === "create" ? bootstrapQuery.error : getQuery.error;

	useEffect(() => {
		if (!loadData) return;
		const loadKey = `${props.mode}:${props.type}:${String(loadData.salesId ?? "new")}:${String(loadData.slug ?? "draft")}:${String(loadData.version ?? "v0")}`;
		const shouldHydrate = !record || lastHydratedLoadKeyRef.current !== loadKey;
		if (!shouldHydrate) return;
		lastHydratedLoadKeyRef.current = loadKey;
		hydrate(loadData);
	}, [loadData, hydrate, record, props.mode, props.type]);

	const payload = useMemo(() => {
		if (!record) return null;
		return toSaveDraftInput(record, true);
	}, [record]);
	const recoveryKey = useMemo(
		() =>
			getRecoveryStorageKey({
				type: props.type,
				slug: props.slug || record?.slug || null,
				salesId: record?.salesId || null,
			}),
		[props.type, props.slug, record?.salesId, record?.slug],
	);
	const draftRecoveryKey = useMemo(
		() =>
			getRecoveryStorageKey({
				type: props.type,
			}),
		[props.type],
	);

	const clearRecoveryKeys = useCallback(
		(next?: { slug?: string | null; salesId?: string | number | null }) => {
			const keys = new Set<string>([recoveryKey, draftRecoveryKey]);
			if (next?.slug || next?.salesId) {
				keys.add(
					getRecoveryStorageKey({
						type: props.type,
						slug: next.slug || null,
						salesId: next.salesId || null,
					}),
				);
			}
			for (const key of keys) {
				clearRecoverySnapshot(key);
			}
			setRecoverySnapshot(null);
		},
		[draftRecoveryKey, props.type, recoveryKey],
	);

	const autosave = useNewSalesFormAutoSave({
		enabled: !!record && editor.autosaveEnabled,
		dirty,
		payload,
		onSaving: () => {
			markSaving();
		},
		onSaved: (resp) => {
			patchRecord({
				salesId: resp?.salesId,
				slug: resp?.slug,
				orderId: resp?.orderId,
				status: resp?.status,
			});
			markSaved({
				version: resp?.version,
				updatedAt: resp?.updatedAt || new Date().toISOString(),
			});
			clearRecoveryKeys({
				slug: resp?.slug,
				salesId: resp?.salesId,
			});
		},
		onStale: (error) => {
			markStale(getErrorMessage(error, "Version conflict detected."));
			toast({
				title: "This form is out of date",
				description: "Reload latest data before continuing.",
				variant: "destructive",
			});
		},
		onError: (error) => {
			markError(getErrorMessage(error, "Autosave failed."));
		},
	});

	const finalSave = useSaveFinalNewSalesFormMutation();
	const taskTrigger = useTaskTrigger({
		silent: true,
	});

	const handlePostSaveSuccess = useCallback(
		async (resp: {
			salesId?: number | null;
			slug?: string | null;
			orderId?: string | null;
			status?: string | null;
			version?: string | null;
			updatedAt?: string | null;
			type?: "order" | "quote" | null;
			isNew?: boolean | null;
		}) => {
			patchRecord({
				salesId: resp?.salesId,
				slug: resp?.slug,
				orderId: resp?.orderId,
				status: resp?.status,
			});
			markSaved({
				version: resp?.version,
				updatedAt: resp?.updatedAt || new Date().toISOString(),
			});
			clearRecoveryKeys({
				slug: resp?.slug,
				salesId: resp?.salesId,
			});

			if (resp?.orderId && resp?.type) {
				taskTrigger.triggerWithAuth("create-sales-history", {
					salesNo: resp.orderId,
					salesType: resp.type,
				} as CreateSalesHistorySchemaTask);
			}
			if (resp?.type === "order" && resp?.salesId && resp?.orderId) {
				await resetSalesStatAction(resp.salesId, resp.orderId);
			}
			if (resp?.salesId) {
				await triggerEvent(
					resp?.isNew ? "salesCreated" : "salesUpdated",
					resp.salesId,
				);
			}
		},
		[clearRecoveryKeys, markSaved, patchRecord, taskTrigger],
	);

	useEffect(() => {
		if (!loadData) return;
		const serverPayload = toSaveDraftInput(loadData, true);
		const serverFingerprint = createPayloadFingerprint(serverPayload);
		const snapshot =
			readRecoverySnapshot(recoveryKey) ||
			(recoveryKey !== draftRecoveryKey
				? readRecoverySnapshot(draftRecoveryKey)
				: null);
		if (!snapshot) {
			setRecoverySnapshot(null);
			return;
		}
		if (createPayloadFingerprint(snapshot.payload) === serverFingerprint) {
			setRecoverySnapshot(null);
			return;
		}
		setRecoverySnapshot(snapshot);
	}, [draftRecoveryKey, loadData, recoveryKey]);

	useEffect(() => {
		if (!dirty || !payload) return;
		const timer = setTimeout(() => {
			writeRecoverySnapshot(recoveryKey, payload);
		}, 750);
		return () => clearTimeout(timer);
	}, [dirty, payload, recoveryKey]);

	useEffect(() => {
		if (!dirty || !payload) return;

		const persistSnapshot = () => {
			writeRecoverySnapshot(recoveryKey, payload);
		};

		const handleBeforeUnload = (event: BeforeUnloadEvent) => {
			persistSnapshot();
			const shouldBlockLeave =
				!editor.autosaveEnabled ||
				saveStatus === "error" ||
				saveStatus === "stale";
			if (!shouldBlockLeave) return;
			event.preventDefault();
			event.returnValue = "";
		};

		window.addEventListener("pagehide", persistSnapshot);
		window.addEventListener("beforeunload", handleBeforeUnload);
		return () => {
			window.removeEventListener("pagehide", persistSnapshot);
			window.removeEventListener("beforeunload", handleBeforeUnload);
		};
	}, [dirty, editor.autosaveEnabled, payload, recoveryKey, saveStatus]);

	useEffect(() => {
		if (!dirty || !payload) return;
		const shouldPromptOnLeave =
			dirty &&
			(!editor.autosaveEnabled ||
				saveStatus === "error" ||
				saveStatus === "stale");
		if (!shouldPromptOnLeave) return;

		const handleDocumentClick = (event: MouseEvent) => {
			if (leaveWarningBypassedRef.current) return;
			if (event.defaultPrevented) return;
			if (event.button !== 0) return;
			if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
				return;
			}

			const target = event.target;
			if (!(target instanceof Element)) return;

			const anchor = target.closest("a[href]") as HTMLAnchorElement | null;
			if (!anchor) return;
			if (anchor.target && anchor.target !== "_self") return;
			if (anchor.hasAttribute("download")) return;

			const href = anchor.href;
			if (!href) return;

			const nextUrl = new URL(href, window.location.href);
			const currentUrl = new URL(window.location.href);
			const isSameDocumentNavigation =
				nextUrl.pathname === currentUrl.pathname &&
				nextUrl.search === currentUrl.search &&
				nextUrl.hash === currentUrl.hash;
			if (isSameDocumentNavigation) return;

			event.preventDefault();
			writeRecoverySnapshot(recoveryKey, payload);

			const confirmed = window.confirm(
				"You have unsaved changes that may not be safely persisted yet. Leave this page?",
			);
			if (!confirmed) return;

			leaveWarningBypassedRef.current = true;
			window.location.assign(nextUrl.toString());
		};

		document.addEventListener("click", handleDocumentClick, true);
		return () => {
			document.removeEventListener("click", handleDocumentClick, true);
		};
	}, [dirty, editor.autosaveEnabled, payload, recoveryKey, saveStatus]);

	const applyRecoverySnapshot = useCallback(() => {
		if (!loadData || !recoverySnapshot) return;
		restoreLocalDraft({
			...loadData,
			salesId: recoverySnapshot.payload.salesId ?? loadData.salesId,
			slug: recoverySnapshot.payload.slug ?? loadData.slug,
			version: loadData.version,
			form: recoverySnapshot.payload.meta,
			lineItems: recoverySnapshot.payload.lineItems,
			extraCosts: recoverySnapshot.payload.extraCosts,
			summary: recoverySnapshot.payload.summary,
		});
		setRecoverySnapshot(null);
		toast({
			title: "Local recovery restored",
			description: "Recovered unsaved edits from this device.",
			variant: "success",
		});
	}, [loadData, recoverySnapshot, restoreLocalDraft]);

	function validateBeforeSave() {
		if (!record?.form.customerId) {
			toast({
				title: "Customer required",
				description: "Select a customer before saving.",
				variant: "destructive",
			});
			return false;
		}
		if (!record?.lineItems?.length) {
			toast({
				title: "Line item required",
				description: "Add at least one line item before saving.",
				variant: "destructive",
			});
			return false;
		}
		return true;
	}

	async function saveDraftNow() {
		if (!validateBeforeSave()) return;
		markSaving();
		const resp = await autosave.flush();
		if (!resp) {
			markError("Unable to save draft.");
			return;
		}
		await handlePostSaveSuccess(resp);
		toast({
			title: "Draft saved",
			variant: "success",
		});
	}

	async function saveFinal() {
		if (!record) return;
		if (!validateBeforeSave()) return;
		markSaving();
		const payload = toSaveDraftInput(record, false);
		try {
			const resp = await finalSave.mutateAsync({
				...payload,
				autosave: false,
			});
			await handlePostSaveSuccess(resp);
			toast({
				title: "Saved",
				description: `${props.type} ${resp?.orderId} has been finalized.`,
				variant: "success",
			});
		} catch (error) {
			const message = getErrorMessage(error, "Unable to save.");
			if (
				String(message || "")
					.toLowerCase()
					.includes("out of date")
			) {
				markStale(message);
			} else markError(message);
			toast({
				title: "Save failed",
				description: message || "Unable to save final form.",
				variant: "destructive",
			});
		}
	}

	async function saveClose() {
		if (!validateBeforeSave()) return;
		if (dirty) {
			const resp = await autosave.flush("manual-flush");
			if (!resp) return;
			await handlePostSaveSuccess(resp);
		}
		router.push(`/sales-book/${props.type === "order" ? "orders" : "quotes"}`);
	}

	async function saveNew() {
		if (!validateBeforeSave()) return;
		if (dirty) {
			const resp = await autosave.flush("manual-flush");
			if (!resp) return;
			await handlePostSaveSuccess(resp);
		}
		router.push(
			`/sales-form/${props.type === "order" ? "create-order" : "create-quote"}`,
		);
	}

	if (isLoading || !record) {
		return (
			<div className="rounded-lg border p-8 text-sm text-muted-foreground">
				Loading sales form...
			</div>
		);
	}

	if (loadError) {
		return (
			<div className="space-y-3 rounded-lg border border-red-200 bg-red-50 p-6 text-sm text-red-700">
				<p>Unable to load sales form.</p>
				<Button
					size="sm"
					variant="outline"
					onClick={() => {
						if (props.mode === "create") bootstrapQuery.refetch();
						else getQuery.refetch();
					}}
				>
					Retry
				</Button>
			</div>
		);
	}

	return (
		<div className="relative flex min-h-0 h-[calc(100dvh-var(--header-height,5rem)-1.5rem)] max-h-[calc(100dvh-var(--header-height,5rem)-1.5rem)] overflow-hidden rounded-xl border bg-background">
			<main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
				<HeaderActions
					type={props.type}
					orderId={record.orderId}
					saveStatus={saveStatus}
					dirty={dirty}
					lastSavedAt={lastSavedAt}
					statusMessage={lastSaveError}
					isSaving={autosave.isSaving || finalSave.isPending}
					autosaveEnabled={editor.autosaveEnabled}
					stepDisplayMode={editor.stepDisplayMode}
					onAddItem={() => addLineItem()}
					onToggleStepDisplay={() =>
						setEditor({
							stepDisplayMode:
								editor.stepDisplayMode === "extended" ? "compact" : "extended",
						})
					}
					onOpenMobileSummary={() =>
						setEditor({
							showMobileSummary: !editor.showMobileSummary,
						})
					}
					onToggleAutosave={() =>
						setEditor({
							autosaveEnabled: !editor.autosaveEnabled,
						})
					}
					onSaveDraft={saveDraftNow}
					onSaveClose={saveClose}
					onSaveNew={saveNew}
					onSaveFinal={saveFinal}
					onOpenSettings={async () => {
						const { default: NewSalesFormSettingsModal } = await import(
							"@/components/modals/new-sales-form-settings-modal"
						);
						_modal.openSheet(<NewSalesFormSettingsModal />);
					}}
				/>

				<div className="flex-1 overflow-y-auto p-4 pb-28 sm:p-6 lg:p-8 lg:pb-8">
					<div className="mx-auto flex w-full max-w-6xl flex-col gap-4">
						{recoverySnapshot ? (
							<div className="flex flex-col gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 md:flex-row md:items-center md:justify-between">
								<p>
									Unsaved local edits were found from{" "}
									{new Date(recoverySnapshot.savedAt).toLocaleString()}.
								</p>
								<div className="flex items-center gap-2">
									<Button
										size="sm"
										variant="outline"
										onClick={() => {
											clearRecoveryKeys();
											toast({
												title: "Using latest saved version",
												description:
													"Local recovery was dismissed for this draft.",
												variant: "success",
											});
										}}
									>
										Dismiss
									</Button>
									<Button size="sm" onClick={applyRecoverySnapshot}>
										Restore
									</Button>
								</div>
							</div>
						) : null}
						<ItemWorkflowPanel />
					</div>
				</div>
			</main>

			<InvoiceSummarySidebar
				mobileOpen={editor.showMobileSummary}
				onClose={() =>
					setEditor({
						showMobileSummary: false,
					})
				}
			/>

			<div className="fixed inset-x-0 bottom-0 z-20 border-t bg-card p-3 shadow-[0_-4px_18px_rgba(0,0,0,0.08)] lg:hidden">
				<div className="mx-auto flex w-full max-w-lg items-center gap-3">
					<button
						type="button"
						className="flex flex-1 flex-col items-start"
						onClick={() =>
							setEditor({
								showMobileSummary: true,
							})
						}
					>
						<span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
							Review Totals
						</span>
						<span className="text-lg font-bold text-foreground">
							{currency(record.summary.grandTotal)}
						</span>
					</button>
					<Button
						className="h-11 px-4"
						onClick={() => void saveFinal()}
						disabled={autosave.isSaving || finalSave.isPending}
					>
						Finalize
					</Button>
				</div>
			</div>
		</div>
	);
}
