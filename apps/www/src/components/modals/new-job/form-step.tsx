import { _trpc } from "@/components/static-trpc";
import { useJobFormParams } from "@/hooks/use-job-form-params";
import { StepTitle } from "./step-title";

export function FormStep({}) {
    const { setParams, ...params } = useJobFormParams();

    return (
        <>
            <StepTitle title="Job Details" />
        </>
    );
}

