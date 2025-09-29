import { _trpc } from "@/components/static-trpc";
import { useZodForm } from "@/hooks/use-zod-form";
import { useTRPC } from "@/trpc/client";
import {
    getCommunityBlockSchema,
    getCommunitySchema,
} from "@community/community-template-schemas";
import { RenturnTypeAsync } from "@gnd/utils";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createContext, useContext, useEffect } from "react";
import { useFieldArray, useForm } from "react-hook-form";

type TemplateBlocksContext = ReturnType<typeof createTemplateBlocksContext>;
export const TemplateBlocksContext =
    createContext<TemplateBlocksContext>(undefined);
export const TemplateBlocksProvider = TemplateBlocksContext.Provider;
export const createTemplateBlocksContext = () => {
    const trpc = useTRPC();
    const { data, isPending } = useSuspenseQuery(
        trpc.community.getCommunitySchema.queryOptions({}),
    );
    const { data: blockInputData } = useSuspenseQuery(
        trpc.community.getBlockInputs.queryOptions({}),
    );
    // const form = useZodForm(getCommunitySchemaSchema, {
    //     defaultValues: {},
    // });
    type Form = RenturnTypeAsync<typeof getCommunitySchema>;
    const form = useForm<Form>({
        defaultValues: {},
    });
    useEffect(() => {
        if (data) form.reset(data as any);
    }, [data]);
    return {
        ...(data || {}),
        form,
        isReorderable: true,
        blockInputs: blockInputData?.inputs,
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

type SchemaBlockContext = ReturnType<typeof createSchemaBlockContext>;
export const SchemaBlockContext = createContext<SchemaBlockContext>(undefined);
export const SchemaBlockProvider = SchemaBlockContext.Provider;
interface SchemaBlockProps {
    blockId: number;
}
export const createSchemaBlockContext = (props: SchemaBlockProps) => {
    const { data: blockInputs } = useSuspenseQuery(
        _trpc.community.getCommunityBlockSchema.queryOptions(
            {
                id: props.blockId,
            },
            {
                enabled: !!props.blockId,
            },
        ),
    );
    type Form = RenturnTypeAsync<typeof getCommunityBlockSchema>;
    const form = useForm<Form>({
        defaultValues: {},
    });
    useEffect(() => {
        if (blockInputs) form.reset(blockInputs as any);
    }, [blockInputs]);
    const { fields, swap } = useFieldArray({
        control: form.control,
        name: "inputConfigs",
        keyName: "_id",
    });
    return {
        form,
        blockInputs,
        ...props,
        fields,
        swap,
        isReorderable: true,
    };
};
export const useSchemaBlockContext = () => {
    const context = useContext(SchemaBlockContext);
    if (context === undefined) {
        throw new Error(
            "useSchemaBlockContext must be used within a SchemaBlockProvider",
        );
    }
    return context;
};

