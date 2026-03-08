import {
    parseAsBoolean,
    parseAsInteger,
    parseAsJson,
    parseAsStringEnum,
    useQueryStates,
} from "nuqs";
import { useJobFormParams } from "./use-job-form-params";
import { invalidateInfiniteQueries } from "./use-invalidate-query";

export function useCommunityInstallCostParams() {
    const { setParams: setJobFormParams } = useJobFormParams();
    const [params, setParams] = useQueryStates({
        // createModelCost: parseAsBoolean,
        // editModelCostTemplateId: parseAsInteger,
        // editModelCostId: parseAsInteger,
        editCommunityModelInstallCostId: parseAsInteger,
        mode: parseAsStringEnum(["v1", "v2"]).withDefault("v1"),
        selectedBuilderTaskId: parseAsInteger,
        requestBuilderTaskId: parseAsInteger,
        contractorId: parseAsInteger,
        jobId: parseAsInteger,
        view: parseAsStringEnum(["template-edit", "template-list"]).withDefault(
            "template-list",
        ),
        jobPayload: parseAsJson<any>(null as any),
    });
    const openToSide = params.view === "template-edit";

    const onClose = () => {
        const nextJobPayload = params.jobPayload;
        setParams(null).then(() => {
            if (nextJobPayload && typeof nextJobPayload === "object") {
                setJobFormParams(nextJobPayload);
                invalidateInfiniteQueries("community.getJobForm");
            }
        });
    };

    return {
        ...params,
        openToSide,
        setParams,
        onClose,
    };
}
