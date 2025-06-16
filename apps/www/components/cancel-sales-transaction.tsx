import {
    DropdownMenuLabel,
    DropdownMenuSeparator,
} from "@gnd/ui/dropdown-menu";
import { Menu } from "./(clean-code)/menu";
import { useLoadingToast } from "@/hooks/use-loading-toast";
import { cancelSalesPaymentAction } from "@/actions/cancel-sales-payment";
import { useAction } from "next-safe-action/hooks";
import { revalidateTable } from "./(clean-code)/data-table/use-infinity-data-table";

export function CancelSalesTransactionAction({
    customerTransactionId,
    status,
}) {
    const toast = useLoadingToast();
    const cancelTx = useAction(cancelSalesPaymentAction, {
        onSuccess(args) {
            toast.display({
                title: "Cancelled",
                duration: 2000,
                variant: "destructive",
            });
            revalidateTable();
            // skel?.load();
            // onDelete?.();
        },
        onExecute(args) {},
    });
    function __cancel(reason) {
        cancelTx.execute({
            customerTransactionId,
            reason,
        });
    }
    return (
        <Menu>
            <Menu.Item
                disabled={status?.toLowerCase() === "canceled"}
                SubMenu={
                    <>
                        <DropdownMenuLabel>Reason</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <Menu.Item
                            onClick={(e) => {
                                __cancel("Duplicate");
                            }}
                        >
                            Duplicate
                        </Menu.Item>
                        <Menu.Item
                            onClick={(e) => {
                                __cancel("Refund Wallet");
                            }}
                        >
                            Refund Wallet
                        </Menu.Item>
                        <Menu.Item
                            onClick={(e) => {
                                __cancel("Refund Cash");
                            }}
                        >
                            Refund Cash
                        </Menu.Item>
                        <Menu.Item
                            onClick={(e) => {
                                __cancel("-");
                            }}
                        >
                            No Reason
                        </Menu.Item>
                    </>
                }
            >
                Cancel
            </Menu.Item>
        </Menu>
    );
}
