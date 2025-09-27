import { useTRPC } from "@/trpc/client";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createContext, useContext } from "react";

type TemplateBlocksContext = ReturnType<typeof createTemplateBlocksContext>;
export const TemplateBlocksContext =
    createContext<TemplateBlocksContext>(undefined);
export const TemplateBlocksProvider = TemplateBlocksContext.Provider;
export const createTemplateBlocksContext = () => {
    const trpc = useTRPC();
    const { data, isPending } = useSuspenseQuery(
        trpc.community.getCommunitySchema.queryOptions({}),
    );
    return {
        ...(data || {}),
    };
};
export const useTemplateBlocksContext = () => {
    const context = useContext(TemplateBlocksContext);
    if (context === undefined) {
        throw new Error(
            "useTemplateBlocksContext must be used within a TemplateBlocksProvider",
        );
    }
    return context;
};

