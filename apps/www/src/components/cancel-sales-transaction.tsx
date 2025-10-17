import {
    DropdownMenuLabel,
    DropdownMenuSeparator,
} from "@gnd/ui/dropdown-menu";
import { Menu } from "./(clean-code)/menu";
import { useLoadingToast } from "@/hooks/use-loading-toast";

export function CancelSalesTransactionAction({
    customerTransactionId,
    status,
}) {
    const toast = useLoadingToast();

    function __cancel(reason) {
        // cancelTx.execute({
        //     customerTransactionId,
        //     reason,
        // });
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
