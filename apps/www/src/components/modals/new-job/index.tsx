import { useJobFormParams } from "@/hooks/use-job-form-params";
import { CustomModal } from "../custom-modal";

export function NewJobModal() {
    const { setParams, opened, ...params } = useJobFormParams();

    return (
        <CustomModal
            className=""
            open={opened}
            onOpenChange={(open) => {
                if (!open) {
                    setParams(null);
                }
            }}
            title="Create New Job"
            description="Select a project to create a new job."
        ></CustomModal>
    );
}

