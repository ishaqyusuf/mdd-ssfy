import {
    Menu,
    MenuItem,
} from "@/components/_v1/data-table/data-table-row-actions";
import { ISalesType, SalesStatus } from "@/types/sales";

import { Button } from "@gnd/ui/button";

import { useDykeCtx, useDykeForm } from "../_hooks/form-context";
import useDykeFormSaver from "../_hooks/useDykeFormSaver";
import { sendDealerApprovalEmail } from "../../dealers/action";
import { _dispatchSalesEmailEvent } from "../../dealers/email-actions";

export default function Evaluator({}) {
    const ctx = useDykeCtx();
    const form = useDykeForm();
    const saver = useDykeFormSaver(form);
    async function _approveSales() {
        setTimeout(() => {
            form.handleSubmit((data) => {
                data.order.status = "Active" as SalesStatus;
                saver.save(data, "default", async () => {
                    await _dispatchSalesEmailEvent(
                        data.order.id,
                        data.order.type == ("order" as ISalesType)
                            ? "SALES_EVALUATED"
                            : "QUOTE_EVALUATED",
                    );
                });
            })();
        }, 100);
    }

    if (ctx.status == "Evaluating")
        return (
            <div className="">
                <Menu
                    Trigger={
                        <Button size="sm" className="h-8">
                            Evaluate
                        </Button>
                    }
                >
                    <MenuItem onClick={_approveSales}>Approve</MenuItem>
                    <MenuItem>Reject</MenuItem>
                </Menu>
            </div>
        );

    return null;
}
