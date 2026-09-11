import type { createAssignmentSchema } from "@/actions/schema";
import { useAuth } from "@/hooks/use-auth";
import { useSalesOverviewQuery } from "@/hooks/use-sales-overview-query";
import { useTaskTrigger } from "@/hooks/use-task-trigger";
import { Button } from "@gnd/ui/button";
import { Calendar } from "@gnd/ui/calendar";
import { Menu } from "@gnd/ui/custom/menu";
import { Icons } from "@gnd/ui/icons";
import { Label } from "@gnd/ui/label";
import { DropdownMenu, Tabs } from "@gnd/ui/namespace";
import { Separator } from "@gnd/ui/separator";
import { toast } from "@gnd/ui/use-toast";
import { sum } from "@gnd/utils";
import {
	createProductionDueDate,
	productionCalendarPartsFromLocalDate,
} from "@sales/production-date";
import type { UpdateSalesControl } from "@sales/schema";
import { useEffect, useMemo, useRef, useState } from "react";
import type z from "zod";
import { useProduction } from "./context";
import { useProductionItem } from "./production-item-context";
import {
	type ProductionBulkAction,
	getProductionActionFeedback,
	getProductionDeleteConfirmation,
	getProductionOrderDueDate,
	hasProductionRefreshFailure,
} from "./production-item-menu-model";

const productionActionItemClassName =
    "min-w-[250px] whitespace-nowrap [&>svg]:size-4 [&>svg]:shrink-0";

export function ProductionItemMenu() {
    const ctx = useProductionItem();
    const { queryCtx, item } = ctx;
    const [opened, setOpened] = useState(false);
	const [menuBusy, setMenuBusy] = useState(false);
	const menuBusyRef = useRef(false);
	const updateMenuBusy = (busy: boolean) => {
		menuBusyRef.current = busy;
		setMenuBusy(busy);
	};
    return (
        <Menu
            noSize
			open={opened}
			onOpenChanged={(nextOpen) => {
				if (!nextOpen && menuBusyRef.current) return;
				setOpened(nextOpen);
			}}
            Trigger={
				<Button
					disabled={queryCtx.dispatchMode || menuBusy}
					variant="ghost"
					size="icon"
				>
                    <Icons.MoreVertical className="size-4" />
					<span className="sr-only">Production item actions</span>
                </Button>
            }
        >
            <ProductionItemMenuActions
                itemUids={[item.controlUid]}
                setOpened={setOpened}
				setMenuBusy={updateMenuBusy}
            />
        </Menu>
    );
}
export function ProductionItemMenuActions({
	itemUids = null,
	workerMode = false,
	setOpened,
	setMenuBusy,
}: {
	itemUids?: string[] | null;
	workerMode?: boolean;
	setOpened: (opened: boolean) => void;
	setMenuBusy: (busy: boolean) => void;
}) {
    const itemIds = itemUids;
    const [tab, setTab] = useState<"main" | "users" | "due-date" | "confirm">("main");
    const [action, setAction] = useState<ProductionBulkAction>();
    const [dueDate, setDueDate] = useState<Date | null>(null);
    const [assignedToId, setAssignTo] = useState<number | null>(null);
	const [isRefreshing, setIsRefreshing] = useState(false);
	const activeActionRef = useRef<ProductionBulkAction | null>(null);
	const progressToastRef = useRef<ReturnType<typeof toast> | null>(null);
    const prod = useProduction();
    const queryCtx = useSalesOverviewQuery();
	const orderDueDate = useMemo(
		() => getProductionOrderDueDate(prod.data?.order?.prodDueDate),
		[prod.data?.order?.prodDueDate],
	);
	useEffect(
		() => () => {
			progressToastRef.current?.dismiss();
			progressToastRef.current = null;
		},
		[],
	);

    const {
        assign: { pendingQty, items },
        submit: {
            items: submitItems,
            total: submitTotal,
            pendingAssignments: submitPendingAssignments,
        },
        deleteSubmit: {
			qty: deleteSubmitQty,
			items: deleteSubmitItems,
			submissionIds: deleteSubmissionIds,
		},
        deleteAssignment: {
            qty: deleteAssignmentQty,
            items: deleteAssignmentItems,
        },
    } = useMemo(() => {
        const filtered = prod.data?.items?.filter((item) =>
            !itemIds ? true : itemIds?.includes(item.controlUid),
        );
        const _items = filtered
            ?.map((item) => ({
                uid: item.controlUid,
                meta: {
                    qty: item.analytics.assignment.pending,
                    pending: item.analytics.assignment.pending,
                    itemUid: item.controlUid,
                    itemsTotal: item.qty.qty,
                    shelfItemId: item.shelfId,
                    salesId: item.salesId,
                    salesDoorId: item.doorId,
                    salesItemId: item.itemId,
                    unitLabor: item.unitLabor,
                } as z.infer<typeof createAssignmentSchema>,
            }))
            .filter((a) => a.meta.qty?.qty > 0);
        const pendingQty = sum(_items?.map((a) => a.meta.qty.qty));
        const assign = {
            pendingQty,
            items: _items,
        };
        const submit = (() => {
            const _items = filtered
                ?.map((item) => {
                    return {
                        uid: item.controlUid,
                        createAssignmentMeta: {
                            qty: item.analytics.assignment.pending,
                        } as z.infer<typeof createAssignmentSchema>,
                        submitAssignments: item.analytics.pendingSubmissions,
                    };
                })
                .filter(
                    (a) =>
						a.createAssignmentMeta?.qty?.qty || a.submitAssignments?.length,
                );
            const pendingSubmissions = sum(
				_items.map((a) => sum(a.submitAssignments.map((b) => b.qty.qty))),
            );
            const pendingAssignments = sum(
                _items.map((a) => a.createAssignmentMeta?.qty?.qty),
            );

            return {
                items: _items,
				pendingAssignments: workerMode ? 0 : pendingAssignments,
                pendingSubmissions,
				total: workerMode
					? pendingSubmissions
					: sum([pendingAssignments, pendingSubmissions]),
            };
        })();
        const deleteSubmit = (() => {
            const _items = filtered?.map((item) => {
                return {
                    uid: item.controlUid,
                    assignmentIds: item.analytics.assignment.ids,
                    itemId: item.itemId,
                    qty: item.analytics.stats?.prodCompleted?.qty,
                    deliveredQty: item.analytics.deliveredQty,
                };
            });
            return {
                qty: sum(_items, "qty"),
                items: _items,
				submissionIds: [
					...new Set(
						filtered?.flatMap((item) => item.analytics.submissionIds || []) || [],
					),
				],
            };
        })();
        const deleteAssignment = (() => {
            const _items = filtered?.map((item) => {
                const stats = item.analytics.stats;
                return {
                    uid: item.controlUid,
                    assignmentIds: item.analytics.assignment.ids,
                    itemId: item.itemId,
                    qty: stats?.prodAssigned?.qty,
                    deliveredQty: item.analytics.deliveredQty,
                    submitQty: item.analytics.submitQty,
                };
            });
            return {
                qty: sum(_items, "qty"),
                items: _items,
            };
        })();
        return {
            assign,
            submit,
            deleteSubmit,
            deleteAssignment,
        };
	}, [prod.data, itemIds, workerMode]);
    const auth = useAuth();
    const finishAction = async () => {
		const completedAction = activeActionRef.current;
		if (!completedAction) return;
		setIsRefreshing(true);
		try {
			const eventResults = await Promise.allSettled([
				queryCtx.salesQuery.assignmentSubmissionUpdated(),
			]);
			const refreshResults = await Promise.allSettled([
				prod.refetch(),
				prod.refetchReadiness(),
			]);
			progressToastRef.current?.dismiss();
			progressToastRef.current = null;
			const refreshFailed = hasProductionRefreshFailure([
				...eventResults,
				...refreshResults,
			]);
			toast(
				refreshFailed
					? {
							duration: 5000,
							variant: "destructive",
							title: `${getProductionActionFeedback(completedAction).success}, but refresh failed`,
							description: "Reopen the order to load the latest Production state.",
						}
					: {
							duration: 3500,
							variant: "success",
							title: getProductionActionFeedback(completedAction).success,
						},
			);
			setMenuBusy(false);
			setOpened(false);
			setTab("main");
			setAction(undefined);
			setAssignTo(null);
			setDueDate(null);
		} finally {
			activeActionRef.current = null;
			setIsRefreshing(false);
			setMenuBusy(false);
		}
	};
    const tsk = useTaskTrigger({
		silent: true,
		onSuccess: () => {
			void finishAction();
		},
		onError: (message) => {
			const failedAction = activeActionRef.current;
			progressToastRef.current?.dismiss();
			progressToastRef.current = null;
			activeActionRef.current = null;
			setMenuBusy(false);
			if (failedAction) {
				toast({
					duration: 3500,
					variant: "destructive",
					title: getProductionActionFeedback(failedAction).failure,
					description: message || "Please try again.",
				});
			}
		},
    });
	const isBusy =
		Boolean(activeActionRef.current) ||
		tsk.isActionPending ||
		tsk.isLoading ||
		isRefreshing;
    const submitAction = async (
		requestedAction?: ProductionBulkAction,
		assignedToOverride?: number | null,
	) => {
		const selectedAction = requestedAction || action;
		if (!selectedAction || isBusy) return;
		setAction(selectedAction);
		activeActionRef.current = selectedAction;
		setMenuBusy(true);
        const payload = () => {
            const pl = {
                meta: {
                    authorId: auth.id,
                    salesId: prod.data.orderId,
                    authorName: auth.name,
					pipelineRevision: prod.data.pipelineRevision || undefined,
                },
            } as UpdateSalesControl;

            switch (selectedAction) {
                case "submit":
                    pl.submitAll = {
						assignedToId: assignedToOverride ?? assignedToId,
						idempotencyKey: crypto.randomUUID(),
                        itemUids: submitItems.map((a) => a.uid),
                    };
                    break;
                case "assign":
                    pl.createAssignments = {
                        retries: 0,
						assignedToId: assignedToOverride ?? assignedToId,
                        dueDate: dueDate
                            ? createProductionDueDate(
                                  productionCalendarPartsFromLocalDate(dueDate),
                              )
                            : null,
                        selections: items?.map((i) => ({
                            uid: i.uid,
                            qty: i.meta.qty,
                        })),
                    };
                    break;
                case "delete.assign": {
					const deliveredQty = sum(deleteAssignmentItems, "deliveredQty");
                    const submitQty = sum(deleteAssignmentItems, "submitQty");
                    if (deliveredQty) {
						throw new Error(
							"Some assignments have been submitted and registered to dispatch.",
						);
                    }
                    if (submitQty) {
						throw new Error("Some assignments have been submitted.");
                    }
                    pl.deleteAssignments = {
                        itemIds: deleteAssignmentItems.map((a) => a.itemId),
                    };
                    break;
                }
                case "delete.submit": {
					const _deliveredQty = sum(deleteSubmitItems, "deliveredQty");
                    if (_deliveredQty) {
						throw new Error(
							"Some submissions have been registered to dispatch.",
						);
                    }
					pl.deleteSubmissions = workerMode
						? { submissionIds: deleteSubmissionIds }
						: { itemIds: deleteSubmitItems.map((a) => a.itemId) };
                    break;
                }
            }
            return pl;
        };
        try {
            const pl = payload();
			const feedback = getProductionActionFeedback(selectedAction);
			progressToastRef.current?.dismiss();
			progressToastRef.current = toast({
				duration: Number.POSITIVE_INFINITY,
				variant: "spinner",
				title: feedback.pending,
			});
            await tsk.triggerWithAuth("update-sales-control", pl);
        } catch (error) {
			progressToastRef.current?.dismiss();
			progressToastRef.current = null;
			activeActionRef.current = null;
			setMenuBusy(false);
            toast({
				title: getProductionActionFeedback(selectedAction).failure,
                description:
					error instanceof Error ? error.message : "Please try again.",
                variant: "destructive",
            });
        }
    };
	const deleteQuantity =
		action === "delete.assign"
			? deleteAssignmentQty
			: action === "delete.submit"
				? deleteSubmitQty
				: 0;
	const deleteConfirmation = action
		? getProductionDeleteConfirmation(action, deleteQuantity)
		: null;
	return (
		<div aria-busy={isBusy}>
			<Tabs.Root value={tab}>
				<Tabs.Content value="main">
					{workerMode ? null : <Menu.Item
						onClick={(event) => {
							event.preventDefault();
							setAction("assign");
							setDueDate(orderDueDate);
							setTab("users");
						}}
						Icon={Icons.UserPlus}
						disabled={isBusy || !pendingQty}
						shortCut={`QTY: ${pendingQty}`}
						className={productionActionItemClassName}
					>
						{isBusy && action === "assign"
							? getProductionActionFeedback("assign").progress
							: "Assign All"}
					</Menu.Item>}
					<Menu.Item
						shortCut={`QTY: ${submitTotal}`}
						disabled={isBusy || !submitTotal}
						Icon={Icons.CheckCircle}
						className={productionActionItemClassName}
						onClick={(event) => {
							event.preventDefault();
							setAction("submit");
							if (workerMode || !submitPendingAssignments) {
								void submitAction("submit");
							} else {
								setTab("users");
							}
						}}
					>
						{isBusy && action === "submit"
							? getProductionActionFeedback("submit").progress
							: "Submit All"}
					</Menu.Item>
					<Menu.Item
						Icon={Icons.Delete}
						onClick={(event) => {
							event.preventDefault();
							setAction("delete.submit");
							setTab("confirm");
						}}
							disabled={
								isBusy ||
								!deleteSubmitQty ||
								(workerMode && !deleteSubmissionIds.length)
							}
						shortCut={`QTY: ${deleteSubmitQty}`}
						className={productionActionItemClassName}
					>
						{isBusy && action === "delete.submit"
							? getProductionActionFeedback("delete.submit").progress
							: "Delete Submissions"}
					</Menu.Item>
					{workerMode ? null : <Menu.Item
						Icon={Icons.Delete}
						onClick={(event) => {
							event.preventDefault();
							setAction("delete.assign");
							setTab("confirm");
						}}
						disabled={isBusy || !deleteAssignmentQty}
						shortCut={`QTY: ${deleteAssignmentQty}`}
						className={productionActionItemClassName}
					>
						{isBusy && action === "delete.assign"
							? getProductionActionFeedback("delete.assign").progress
							: "Delete Assignments"}
					</Menu.Item>}
				</Tabs.Content>

				<Tabs.Content value="users">
					<div className="flex items-center gap-2 px-2">
						<Button
							size="xs"
							disabled={isBusy}
							onClick={() => setTab("main")}
							className="size-6 rounded-full p-0"
						>
							<Icons.ChevronLeft className="size-3" />
						</Button>
						<Label>Select Production Worker</Label>
					</div>
					<DropdownMenu.Separator />
					{prod.users?.map((user) => (
						<Menu.Item
							onClick={(event) => {
								event.preventDefault();
								const userId = Number(user.id);
								setAssignTo(userId);
								if (action === "submit") {
									void submitAction("submit", userId);
								} else {
									setDueDate(orderDueDate);
									setTab("due-date");
								}
							}}
							disabled={isBusy}
							shortCut={`${user.pendingProductionQty} pending`}
							icon="production"
							key={user.id}
							className="min-w-[250px] whitespace-nowrap"
						>
							{user.name}
						</Menu.Item>
					))}
				</Tabs.Content>

				<Tabs.Content value="due-date">
					<div className="flex items-center gap-4 px-4">
						<Button
							size="xs"
							disabled={isBusy}
							onClick={() => setTab("users")}
							className="size-6 rounded-full p-0"
						>
							<Icons.ChevronLeft className="size-3" />
						</Button>
						<DropdownMenu.Label>Due Date</DropdownMenu.Label>
					</div>
					<DropdownMenu.Separator />
					{orderDueDate ? (
						<p className="px-4 pt-3 text-xs text-muted-foreground">
							The order production due date is selected by default.
						</p>
					) : null}
					<Calendar
						mode="single"
						selected={dueDate || undefined}
						defaultMonth={orderDueDate || undefined}
						modifiers={{
							orderDueDate: orderDueDate ? [orderDueDate] : [],
						}}
						modifiersClassNames={{
							orderDueDate:
								"rounded-full border border-sky-400 ring-2 ring-sky-200 ring-offset-1",
						}}
						onSelect={(value) => setDueDate(value || null)}
						disabled={isBusy}
					/>
					<Button
						variant="outline"
						disabled={isBusy}
						onClick={() => setDueDate(null)}
						className="w-full"
					>
						<Icons.TimerOff className="mr-4 size-4" />
						No Due Date
					</Button>
					<Separator />
					<Button
						onClick={() => void submitAction()}
						className="w-full"
						disabled={isBusy || !assignedToId}
					>
						{isBusy && action
							? getProductionActionFeedback(action).progress
							: "Proceed"}
					</Button>
				</Tabs.Content>

				<Tabs.Content value="confirm">
					<div className="w-[280px] space-y-3 p-3">
						<div>
							<p className="text-sm font-semibold">
								{deleteConfirmation?.title}
							</p>
							<p className="mt-1 text-xs text-muted-foreground">
								{deleteConfirmation?.description}
							</p>
						</div>
						<div className="grid grid-cols-2 gap-2">
							<Button
								type="button"
								variant="outline"
								disabled={isBusy}
								onClick={() => {
									setAction(undefined);
									setTab("main");
								}}
							>
								Cancel
							</Button>
							<Button
								type="button"
								variant="destructive"
								disabled={isBusy || !deleteConfirmation || !action}
								onClick={() => void submitAction()}
							>
								{isBusy && action
									? getProductionActionFeedback(action).progress
									: deleteConfirmation?.confirmLabel || "Delete"}
							</Button>
						</div>
					</div>
				</Tabs.Content>
			</Tabs.Root>
		</div>
	);
}
