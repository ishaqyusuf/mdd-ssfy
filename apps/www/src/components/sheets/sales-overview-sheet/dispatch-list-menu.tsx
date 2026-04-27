import { useAuth } from "@/hooks/use-auth";
import { useTaskTrigger } from "@/hooks/use-task-trigger";
import { printPackingSlip } from "@/modules/sales-print/application/sales-print-service";
import { useTRPC } from "@/trpc/client";
import { Menu } from "@gnd/ui/custom/menu";
import { ResetSalesControl, UpdateSalesControl } from "@sales/schema";
import { useDispatch } from "./context";
import { useMutation } from "@tanstack/react-query";
import { invalidateQuery } from "@/hooks/use-invalidate-query";

interface Props {
	dispatch;
}

export function DispatchListMenu({ dispatch }: Props) {
	const changeDueDate = () => {};
	const auth = useAuth();
	const ctx = useDispatch();
	const { trigger } = useTaskTrigger({
		silent: true,
		onSuccess() {
			// sq.salesQuery.dispatchUpdated();
			invalidateQuery("dispatch.orderDispatchOverview", {
				salesNo: ctx.data?.order?.orderId!,
			});
			console.log("triggered fallback");
		},
	});
	const { mutate: mutateDeleteDispatch, isPending: isDeleting } = useMutation(
		useTRPC().dispatch.deleteDispatch.mutationOptions({
			onSuccess() {
				// loader.success("Deleted!.");
				// sq.salesQuery.dispatchUpdated();
				trigger({
					taskName: "reset-sales-control",
					payload: {
						meta: {
							salesId: ctx.data?.id!,
							authorId: auth?.id!,
							authorName: auth?.name!,
						},
					} as ResetSalesControl,
				});
			},
		}),
	);
	const deleteDispatch = async (id) => {
		mutateDeleteDispatch({
			dispatchId: id,
		});
	};
	const preview = async (dispatchId) => {
		if (!ctx.data?.id) return;
		await printPackingSlip({
			salesIds: [ctx.data.id],
			dispatchId,
		});
	};
	const packAll = () => {
		trigger({
			taskName: "update-sales-control",
			payload: {
				meta: {
					salesId: ctx.data?.id!,
					authorId: auth?.id!,
					authorName: auth?.name!,
				},
				packItems: {
					dispatchId: dispatch.id,
					dispatchStatus: dispatch.status || "queue",
					packMode: "all",
					replaceExisting: true,
				},
			} as UpdateSalesControl,
		});
	};
	const markAsCompleted = () => {
		trigger({
			taskName: "update-sales-control",
			payload: {
				meta: {
					salesId: ctx.data?.id!,
					authorId: auth?.id!,
					authorName: auth?.name!,
				},
				markAsCompleted: {
					dispatchId: dispatch.id,
					receivedBy: auth?.name || "System",
					receivedDate: new Date(),
				},
			} as UpdateSalesControl,
		});
	};
	return (
		<Menu>
			{/* <Menu.Item icon="calendar" onClick={changeDueDate}>
                Change due date
            </Menu.Item> */}

			<Menu.Item icon="packingList" onClick={() => preview(dispatch.id)}>
				Preview
			</Menu.Item>

			<Menu.Item icon="packingList" onClick={packAll}>
				Pack all
			</Menu.Item>

			<Menu.Item icon="check" onClick={markAsCompleted}>
				Mark as completed
			</Menu.Item>

			<Menu.Trash action={() => deleteDispatch(dispatch.id)}>Delete</Menu.Trash>
		</Menu>
	);
}
