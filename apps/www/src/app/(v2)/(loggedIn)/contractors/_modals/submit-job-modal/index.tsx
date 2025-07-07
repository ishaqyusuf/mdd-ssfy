import { useEffect } from "react";
import {
    useStaticContractors,
    useStaticProjects,
} from "@/_v2/hooks/use-static-data";
import { useModal } from "@/components/common/modal/provider";
import { IJobs } from "@/types/hrm";
import { useForm } from "react-hook-form";

import {
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@gnd/ui/dialog";
import { Form } from "@gnd/ui/form";

import {
    SubmitJobForm,
    SubmitJobModalContent,
    SubmitJobModalFooter,
} from "./_";
import { SubmitJobModalSubtitle, SubmitJobModalTitle } from "./_/heading";
import useSubmitJob, { JobSubmitContext } from "./_/use-submit-job";

interface Props {
    job?: IJobs;
    action?: "change-worker" | "";
}
export default function SubmitJobModal({ job = {} as any, action }: Props) {
    const modal = useModal();
    const defaultValues = {
        // initialized: false,
        costList: [],
    };
    const form = useForm<SubmitJobForm>({
        defaultValues,
    });

    const ctx = {
        ...useSubmitJob(form),
    };
    useEffect(() => {
        ctx.initialize(job as any, action);
    }, []);
    return (
        // <Dialog open={modal?.opened} onOpenChange={modal?.setShowModal}>
        <DialogContent>
            <Form {...form}>
                <JobSubmitContext.Provider value={ctx}>
                    <DialogHeader>
                        <DialogTitle>
                            {/* <span>as</span> */}
                            <SubmitJobModalTitle />
                        </DialogTitle>
                        <DialogDescription>
                            <SubmitJobModalSubtitle />
                        </DialogDescription>
                    </DialogHeader>
                    <SubmitJobModalContent />
                    <DialogFooter>
                        <SubmitJobModalFooter />
                    </DialogFooter>
                </JobSubmitContext.Provider>
            </Form>
        </DialogContent>
        // </Dialog>
    );
}
