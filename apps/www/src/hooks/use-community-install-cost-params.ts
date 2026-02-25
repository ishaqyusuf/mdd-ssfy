import {
    parseAsBoolean,
    parseAsInteger,
    parseAsJson,
    parseAsStringEnum,
    useQueryStates,
} from "nuqs";
import { z } from "zod";

const installCostJobPayloadSchema = z.object({
    step: z.number().nullable().optional(),
    redirectStep: z.number().nullable().optional(),
    projectId: z.number().nullable().optional(),
    jobId: z.number().nullable().optional(),
    unitId: z.number().nullable().optional(),
    taskId: z.number().nullable().optional(),
    userId: z.number().nullable().optional(),
    modelId: z.number().nullable().optional(),
});

export type InstallCostJobPayload = z.infer<typeof installCostJobPayloadSchema>;

export function useCommunityInstallCostParams() {
    const [params, setParams] = useQueryStates({
        // createModelCost: parseAsBoolean,
        // editModelCostTemplateId: parseAsInteger,
        // editModelCostId: parseAsInteger,
        editCommunityModelInstallCostId: parseAsInteger,
        mode: parseAsStringEnum(["v1", "v2"]).withDefault("v1"),
        selectedBuilderTaskId: parseAsInteger,
        view: parseAsStringEnum(["template-edit", "template-list"]).withDefault(
            "template-list",
        ),
        jobPayload: parseAsJson(installCostJobPayloadSchema.parse),
    });
    const openToSide = params.view === "template-edit";
    return {
        ...params,
        openToSide,
        setParams,
    };
}
