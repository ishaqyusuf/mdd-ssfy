import { useJobFormParams } from "@/hooks/use-job-form-params";
import { CustomModal } from "../custom-modal";
import { StepsDescription } from "./steps-description";
import { NewJobFooter } from "./new-job-footer";

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
            title={"Assign New Job"}
            description={<StepsDescription />}
            size={"xl"}
        >
            <CustomModal.Content className="h-[60vh] relative -mx-0"></CustomModal.Content>
            <NewJobFooter />
        </CustomModal>
    );
}

