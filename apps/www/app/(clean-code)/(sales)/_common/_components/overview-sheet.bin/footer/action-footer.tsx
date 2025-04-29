import ConfirmBtn from "@/components/_v1/confirm-btn";
import { Icons } from "@/components/_v1/icons";
import { Menu } from "@/components/(clean-code)/menu";
import { RefreshCcw } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@gnd/ui/button";

import {
    deleteSalesUseCase,
    restoreDeleteUseCase,
} from "../../../use-case/sales-use-case";
import { useSalesOverview } from "../overview-provider";
import { CopyAction } from "./copy.action";
import { MoveAction } from "./move.action";
import { PayAction } from "./pay.action";
import { PrintAction } from "./print.action";

export default function ActionFooter({}) {
    const ctx = useSalesOverview();

    return (
        <div className="sbg-muted absolute bottom-0 flex w-full gap-4 border-t bg-white px-4 py-2 shadow-sm">
            <div className="flex-1"></div>
            <Button
                onClick={() => {
                    ctx.closeModal();
                }}
            >
                NEW SHEET
            </Button>
            <PayAction />
            <ConfirmBtn
                size="icon"
                Icon={Icons.trash}
                onClick={async () => {
                    const id = ctx.item.id;
                    await deleteSalesUseCase(id);
                    ctx.refreshList?.();
                    toast("Deleted", {
                        action: {
                            label: "Undo",
                            onClick: async () => {
                                await restoreDeleteUseCase(id);
                                ctx.refreshList?.();
                            },
                        },
                    });
                    ctx.closeModal();
                }}
                trash
                variant="destructive"
            />
            <Menu variant="outline">
                <PrintAction />
                <PrintAction pdf />
                <Menu.Item
                    Icon={RefreshCcw}
                    onClick={() => {
                        ctx.refresh().then((r) => {
                            toast.success("Refreshed");
                        });
                    }}
                >
                    Refresh
                </Menu.Item>
                <CopyAction />
                <MoveAction />
            </Menu>
        </div>
    );
}
