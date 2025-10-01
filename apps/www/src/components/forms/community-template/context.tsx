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

type TemplateSchemaContext = ReturnType<typeof createTemplateSchemaContext>;
export const TemplateSchemaContext =
    createContext<TemplateSchemaContext>(undefined);
export const TemplateBlocksProvider = TemplateSchemaContext.Provider;
export interface CreateTemplateSchemaContextProps {
    modelSlug?: string;
    print?: boolean;
}
export const createTemplateSchemaContext = (
    props: CreateTemplateSchemaContextProps,
) => {
    const trpc = useTRPC();
    const { data, isPending } = useSuspenseQuery(
        trpc.community.getCommunitySchema.queryOptions({}),
    );
    const { data: modelTemplate } = useSuspenseQuery(
        trpc.community.getModelTemplate.queryOptions(
            {
                slug: props.modelSlug,
            },
            {
                enabled: !!props.modelSlug,
            },
        ),
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
        modelTemplate,
        ...props,
    };
};
export const useTemplateSchemaContext = () => {
    const context = useContext(TemplateSchemaContext);
    if (context === undefined) {
        throw new Error(
            "useTemplateSchemaContext must be used within a TemplateBlocksProvider",
        );
    }
    return context;
};

type TemplateSchemaBlock = ReturnType<typeof createTemplateSchemaBlock>;
export const TemplateSchemaBlock =
    createContext<TemplateSchemaBlock>(undefined);
export const SchemaBlockProvider = TemplateSchemaBlock.Provider;
interface SchemaBlockProps {
    blockId: number;
}
export const createTemplateSchemaBlock = (props: SchemaBlockProps) => {
    const schm = useTemplateSchemaContext();
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
        if (blockInput) {
            form.reset(blockInput as any);
        }
    }, [blockInput]);
    const { fields, swap } = useFieldArray({
        control: form.control,
        name: "inputConfigs",
        keyName: "_id",
    });
    const [sortMode, setSortMode] = useState(false);
    return {
        form,
        blockInput,
        ...props,
        fields,
        swap,
        sortMode,
        setSortMode,
    };
};
export const useTemplateSchemaBlock = () => {
    const context = useContext(TemplateSchemaBlock);
    if (context === undefined) {
        throw new Error(
            "useTemplateSchemaBlock must be used within a SchemaBlockProvider",
        );
    }
    return context;
};

type TemplateSchemaInputContext = ReturnType<
    typeof createTemplateSchemaInputContext
>;
export const TemplateSchemaInputContext =
    createContext<TemplateSchemaInputContext>(undefined);
export const BlockInputProvider = TemplateSchemaInputContext.Provider;
interface BlockInputProps {
    input: RouterOutputs["community"]["getCommunityBlockSchema"]["inputConfigs"][number];
    savingSort?: boolean;
    onInputUpdated?;
}
export const createTemplateSchemaInputContext = (props: BlockInputProps) => {
    return {
        ...props,
        // data,
        // setData,
    };
};
export const useTemplateSchemaInputContext = () => {
    const context = useContext(TemplateSchemaInputContext);
    if (context === undefined) {
        throw new Error(
            "useTemplateSchemaInputContext must be used within a BlockInputProvider",
        );
    }
    return context;
};

