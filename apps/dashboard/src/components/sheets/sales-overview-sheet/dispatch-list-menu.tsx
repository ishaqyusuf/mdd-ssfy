import { useAuth } from "@/hooks/use-auth";
import { useInvalidateQuery } from "@/hooks/use-invalidate-query";
import { useTaskTrigger } from "@/hooks/use-task-trigger";
import { printPackingSlip } from "@/modules/sales-print/application/sales-print-service";
import { useTRPC } from "@/trpc/client";
import { Menu } from "@gnd/ui/custom/menu";
import type { ResetSalesControl, UpdateSalesControl } from "@sales/schema";
import { useMutation } from "@tanstack/react-query";
import { useDispatch } from "./context";

interface Props {
	dispatch;
}

export function DispatchListMenu({ dispatch }: Props) {
	const changeDueDate = () => {};
	const auth = useAuth();
	const ctx = useDispatch();
	const { invalidateQuery } = useInvalidateQuery();
	const getTaskMeta = () => {
		const salesId = ctx.data?.id;
		const authorId = Number(auth.id || 0);
		if (!salesId || !authorId) return null;
		return {
			salesId,
			authorId,
			authorName: auth.name || "Employee",
		};
	};
	const { trigger } = useTaskTrigger({
		silent: true,
		onSuccess() {
			// sq.salesQuery.dispatchUpdated();
			const salesNo = ctx.data?.order?.orderId;
			if (!salesNo) return;
			invalidateQuery("dispatch.orderDispatchOverview", {
				salesNo,
			});
		},
	});
	const { mutate: mutateDeleteDispatch, isPending: isDeleting } = useMutation(
		useTRPC().dispatch.deleteDispatch.mutationOptions({
			onSuccess() {
				// loader.success("Deleted!.");
				// sq.salesQuery.dispatchUpdated();
				const meta = getTaskMeta();
				if (!meta) return;
				trigger({
					taskName: "reset-sales-control",
					payload: {
						meta,
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
		const meta = getTaskMeta();
		if (!meta) return;
		trigger({
			taskName: "update-sales-control",
			payload: {
				meta,
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
		const meta = getTaskMeta();
		if (!meta || !auth.can.viewMarkSalesOrderFulfilled) return;
		trigger({
			taskName: "update-sales-control",
			payload: {
				meta,
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

			{auth.can.viewMarkSalesOrderFulfilled ? (
				<Menu.Item icon="check" onClick={markAsCompleted}>
					Mark as completed
				</Menu.Item>
			) : null}

			<Menu.Trash action={() => deleteDispatch(dispatch.id)}>Delete</Menu.Trash>
		</Menu>
	);
}
