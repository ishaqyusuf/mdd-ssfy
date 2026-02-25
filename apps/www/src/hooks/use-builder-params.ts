import { parseAsInteger, parseAsJson, useQueryStates } from "nuqs";
import { z } from "zod";
import { useJobFormParams } from "./use-job-form-params";
import { invalidateQueries } from "./use-invalidate-query";

const builderJobPayloadSchema = z.object({
    step: z.number().nullable().optional(),
    redirectStep: z.number().nullable().optional(),
    projectId: z.number().nullable().optional(),
    jobId: z.number().nullable().optional(),
    unitId: z.number().nullable().optional(),
    taskId: z.number().nullable().optional(),
    userId: z.number().nullable().optional(),
    modelId: z.number().nullable().optional(),
});

export type BuilderJobPayload = z.infer<typeof builderJobPayloadSchema>;

export function useBuilderParams(options?: { shallow: boolean }) {
    const { setParams: setJobFormParams } = useJobFormParams();
    const [params, setParams] = useQueryStates(
        {
            openBuilderId: parseAsInteger,
            jobPayload: parseAsJson(builderJobPayloadSchema.parse),
        },
        options,
    );
    const opened = !!params.openBuilderId;

    const onClose = () => {
        const nextJobPayload = params.jobPayload;
        setParams(null).then(() => {
            if (nextJobPayload && typeof nextJobPayload === "object") {
                setJobFormParams(nextJobPayload);
                invalidateQueries("community.getBuilderTasksForProject");
            }
        });
    };

    return {
        ...params,
        setParams,
        onClose,
        opened,
    };
}

