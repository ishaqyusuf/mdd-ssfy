import { useAuth } from "@/hooks/use-auth";
import { useTaskTrigger } from "@/hooks/use-task-trigger";
import { useTRPC } from "@/trpc/client";
import { Menu } from "@gnd/ui/custom/menu";
import { ResetSalesControl } from "@sales/schema";
import { useMutation } from "node_modules/@tanstack/react-query/build/modern/useMutation";
import { useDispatch } from "./context";
import { newSalesHelper } from "@/lib/sales";

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
    const sh = newSalesHelper();
    const preview = async (dispatchId) => {
        await sh.generateTokenDispatchId(ctx.data.id, dispatchId);
        sh.openPrintLink();
    };
    return (
        <Menu>
            {/* <Menu.Item icon="calendar" onClick={changeDueDate}>
                Change due date
            </Menu.Item> */}

            <Menu.Item icon="packingList" onClick={() => preview(dispatch.id)}>
                Preview
            </Menu.Item>

            <Menu.Trash action={() => deleteDispatch(dispatch.id)}>
                Delete
            </Menu.Trash>
        </Menu>
    );
}

