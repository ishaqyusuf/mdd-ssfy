import { _trpc } from "@/components/static-trpc";
import { useZodForm } from "@/hooks/use-zod-form";
import { useTRPC } from "@/trpc/client";
import { RouterOutputs } from "@api/trpc/routers/_app";
import {
    getCommunityBlockSchema,
    getCommunitySchema,
} from "@community/community-template-schemas";
import { RenturnTypeAsync } from "@gnd/utils";
import { useSuspenseQuery } from "@tanstack/react-query";
import { cva } from "class-variance-authority";
import { createContext, useContext, useEffect, useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";

type TemplateBlocksContext = ReturnType<typeof createTemplateBlocksContext>;
export const TemplateBlocksContext =
    createContext<TemplateBlocksContext>(undefined);
export const TemplateBlocksProvider = TemplateBlocksContext.Provider;
export interface CreateTemplateBlocksContextProps {
    modelSlug?: string;
    print?: boolean;
}
export const createTemplateBlocksContext = (
    props: CreateTemplateBlocksContextProps,
) => {
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
        templateEditMode: !props.modelSlug,
        modelEditMode: !!props.modelSlug,
        printMode: !!props.modelSlug && props.print,
        blockInputs: blockInputData?.inputs,
        ...props,
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
    const { data: blockInput } = useSuspenseQuery(
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
        if (blockInput) form.reset(blockInput as any);
    }, [blockInput]);
    const { fields, swap } = useFieldArray({
        control: form.control,
        name: "inputConfigs",
        keyName: "_id",
    });
    return {
        form,
        blockInput,
        ...props,
        fields,
        swap,
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

type BlockInputContext = ReturnType<typeof createBlockInputContext>;
export const BlockInputContext = createContext<BlockInputContext>(undefined);
export const BlockInputProvider = BlockInputContext.Provider;
interface BlockInputProps {
    input: RouterOutputs["community"]["getCommunityBlockSchema"]["inputConfigs"][number];
    savingSort?: boolean;
    onInputUpdated?;
}
export const createBlockInputContext = (props: BlockInputProps) => {
    return {
        ...props,
        // data,
        // setData,
    };
};
export const useBlockInputContext = () => {
    const context = useContext(BlockInputContext);
    if (context === undefined) {
        throw new Error(
            "useBlockInputContext must be used within a BlockInputProvider",
        );
    }
    return context;
};

