import { useContext } from "react";
import { _revalidate } from "@/app/(v1)/_actions/_revalidate";
import { Users } from "@/db";
import { closeModal } from "@/lib/modal";
import { ArrowLeft } from "lucide-react";

import { Button } from "@gnd/ui/button";
import { ScrollArea } from "@gnd/ui/scroll-area";

import { changeJobWorkerAction } from "../_actions/change-job-worker";
import { useJobSubmitCtx } from "./use-submit-job";

export default function SelectUserField() {
    // const {resetFields} = form;
    const ctx = useJobSubmitCtx();
    async function selectContractor(contractor: Users) {
        if (ctx.id) {
            const oldUserId = ctx.getValues("job.userId");
            if (oldUserId != contractor.id)
                await changeJobWorkerAction(ctx.id, oldUserId, contractor.id);
        }
        ctx.setValue("job.userId", contractor.id);
        if (ctx.action == "change-worker") {
            await _revalidate("jobs");
            closeModal();
        } else {
            ctx.nextTab();
        }
    }
    return (
        <div className="">
            <ScrollArea className="h-[350px] pr-4">
                <div className="flex flex-col divide-y">
                    {ctx?.contractors.data?.map((user) => (
                        <Button
                            onClick={() => selectContractor(user)}
                            // onClick={async () => {
                            //     if (data?.changeWorker) {
                            //         await _changeWorker(
                            //             data?.data?.id,
                            //             data?.data?.userId,
                            //             user?.id
                            //         );
                            //         toast.success("Worker changed!");
                            //         closeModal();
                            //         return;
                            //     }
                            //     form.setValue("userId", user.id as any);
                            //     _setTab("tasks");
                            // }}
                            variant={"ghost"}
                            key={user.id}
                            className=""
                        >
                            <p className="flex w-full">{user.name}</p>
                        </Button>
                    ))}
                </div>
            </ScrollArea>
        </div>
    );
}
