import { Menu } from "@/components/(clean-code)/menu";
import { cn } from "@/lib/utils";
import { CheckIcon, CircleCheck, CircleX } from "lucide-react";

import { DropdownMenuGroup, DropdownMenuLabel } from "@gnd/ui/dropdown-menu";

import { refreshTabData } from "../helper";
import { salesOverviewStore } from "../store";

interface Props {
    totalQty;
    produceable?: boolean;
    shippable?: boolean;
}
export function ItemControlMenu(props: Props) {
    const store = salesOverviewStore();
    async function updateItemControl(name, value: boolean) {
        if (props?.[name] != value) {
            refreshTabData(store.currentTab);
            console.log("CONTROL UPDATED");
        }
    }
    function ItemAction({ name }) {
        const current = props?.[name];
        return (
            <>
                <Menu.Item
                    className={cn(!current || "bg-green-100")}
                    Icon={CircleCheck}
                    shortCut={!current || <CheckIcon className="size-4" />}
                >
                    Yes
                </Menu.Item>
                <Menu.Item
                    className={cn(current || "bg-green-100")}
                    shortCut={current || <CheckIcon className="size-4" />}
                    Icon={CircleX}
                >
                    No
                </Menu.Item>
            </>
        );
    }
    return (
        <>
            <DropdownMenuGroup>
                <DropdownMenuLabel>Item Control Setting</DropdownMenuLabel>
                <Menu.Item
                    SubMenu={<ItemAction name="produceable" />}
                    icon={"production"}
                >
                    <span>Production</span>
                </Menu.Item>
                <Menu.Item
                    SubMenu={<ItemAction name="shippable" />}
                    icon={"delivery"}
                >
                    Delivery
                </Menu.Item>
            </DropdownMenuGroup>
        </>
    );
}
