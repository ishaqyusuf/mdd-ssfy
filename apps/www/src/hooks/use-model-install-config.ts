import { useQuery } from "@tanstack/react-query";
import { createContext, useContext, useEffect } from "react";
import { useCommunityInstallCostParams } from "./use-community-install-cost-params";
import { useTRPC } from "@/trpc/client";
import { _trpc } from "@/components/static-trpc";

type ModelInstallConfigContextProps = ReturnType<
    typeof useCreateModelInstallConfigContext
>;
export const ModelInstallConfigContext =
    createContext<ModelInstallConfigContextProps>(undefined as any);
export const ModelInstallConfigProvider = ModelInstallConfigContext.Provider;
export const useCreateModelInstallConfigContext = () => {
    const { setParams, ...params } = useCommunityInstallCostParams();
    const {
        editCommunityModelInstallCostId,
        selectedBuilderTaskId,
        openToSide,
        mode,
    } = params;
    const isV2 = mode === "v2";
    const trpc = useTRPC();
    const { data, isPending, error } = useQuery(
        trpc.community.communityInstallCostForm.queryOptions(
            {
                projectId: editCommunityModelInstallCostId,
            },
            {
                enabled: !!editCommunityModelInstallCostId && !isV2,
            },
        ),
    );
    const {
        data: dataV2,
        isPending: isPendingV2,
        error: errorV2,
    } = useQuery(
        trpc.community.getModelBuilderTasks.queryOptions(
            {
                modelId: editCommunityModelInstallCostId,
            },
            {
                enabled: !!editCommunityModelInstallCostId && isV2,
            },
        ),
    );
    useEffect(() => {
        const firstTaskId = dataV2?.builderTasks?.[0]?.id;
        if (!selectedBuilderTaskId && firstTaskId) {
            setParams({
                selectedBuilderTaskId: firstTaskId,
            });
        }
    }, [selectedBuilderTaskId, dataV2]);
    return {
        data,
        isPending: isPending || isPendingV2,
        dataV2,
        isV2,
        params,
        setParams,
    };
};
export const useModelInstallConfigContext = () => {
    const context = useContext(ModelInstallConfigContext);
    if (context === undefined) {
        throw new Error(
            "useModelInstallConfigContext must be used within a ModelInstallConfigProvider",
        );
    }
    return context;
};

type BuilderModelInstallsContextProps = ReturnType<
    typeof useCreateBuilderModelInstallsContext
>;
export const BuilderModelInstallsContext =
    createContext<BuilderModelInstallsContextProps>(undefined as any);
export const BuilderModelInstallsProvider =
    BuilderModelInstallsContext.Provider;
export const useCreateBuilderModelInstallsContext = (
    modelInstallConfigCtx: ReturnType<
        typeof useCreateModelInstallConfigContext
    >,
) => {
    const { params, dataV2, isPending, setParams } = modelInstallConfigCtx;
    const {
        data: modelData,
        isPending: modelDataPending,
        error: modelDataError,
    } = useQuery(
        _trpc.community.getModelInstallTasksByBuilderTask.queryOptions(
            {
                builderTaskId: params.selectedBuilderTaskId!,
                modelId: params.editCommunityModelInstallCostId!,
            },
            {
                enabled:
                    !!params.selectedBuilderTaskId &&
                    !!params.editCommunityModelInstallCostId,
            },
        ),
    );
    return {
        params,
        data: dataV2,
        setParams,
        modelId: params.editCommunityModelInstallCostId,
        builderTaskId: params.selectedBuilderTaskId,
        modelDataPending,
        tasks: modelData?.tasks || [],
        installCosts: modelData?.installCosts || [],
    };
};
export const useBuilderModelInstallsContext = () => {
    const context = useContext(BuilderModelInstallsContext);
    if (context === undefined) {
        throw new Error(
            "useBuilderModelInstallsContext must be used within a BuilderModelInstallsProvider",
        );
    }
    return context;
};

