import { _trpc } from "@/components/static-trpc";
import { useTRPC } from "@/trpc/client";
import { RouterOutputs } from "@api/trpc/routers/_app";
import {
    getCommunityBlockSchema,
    getCommunitySchema,
} from "@community/community-template-schemas";
import { RenturnTypeAsync } from "@gnd/utils";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createContext, useContext, useEffect, useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { TemplateFormService } from "@community/services/template-form-service";
import {
    CommunityModelStore,
    useCommunityModelStore,
} from "@/store/community-model";
import { dotObject } from "@/app/(clean-code)/_common/utils/utils";
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
    const { data: communityTemplate } = useSuspenseQuery(
        trpc.community.getModelTemplate.queryOptions(
            {
                slug: props.modelSlug,
            },
            {
                enabled: false, ///!!props.modelSlug,
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
        if (data) {
            form.reset(data as any);
        }
    }, [data]);
    return {
        ...(data || {}),
        schemaData: data,
        form,
        templateEditMode: !props.modelSlug,
        modelEditMode: !!props.modelSlug,
        printMode: !!props.modelSlug && props.print,
        blockInputs: blockInputData?.inputs,
        communityTemplate,
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
    const { communityTemplate } = schm;
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
    type Form = RenturnTypeAsync<typeof getCommunityBlockSchema> & {};
    const form = useForm<Form>({
        defaultValues: {},
    });
    const store = useCommunityModelStore();
    const _blockId = String(props.blockId);
    useEffect(() => {
        if (blockInput) {
            form.reset(blockInput as any);
            // console.log({ communityTemplate });
            if (!schm.modelSlug) return;
            const tfs = new TemplateFormService(
                schm.schemaData,
                communityTemplate,
                blockInput,
            );
            const modelForm = tfs.generateBlockForm();
            store.update(`blocks.${blockInput.uid}`, {
                ...blockInput,
                inputConfigs: modelForm,
            });
            console.log({ modelForm });
        }
    }, [blockInput]);
    const { fields, swap } = useFieldArray({
        control: form.control,
        name: "inputConfigs",
        keyName: "_id",
    });
    const { fields: modelFields } = useFieldArray({
        control: form.control,
        name: `blocks.${props.blockId}.inputConfigs` as any,
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
        modelFields,
        _blockId,
        uid: blockInput?.uid,
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
    store: CommunityModelStore;
    blockCtx: ReturnType<typeof useTemplateSchemaBlock>;
}
export const createTemplateSchemaInputContext = (props: BlockInputProps) => {
    const { _blockId, blockId, uid } = props.blockCtx;
    // return {};
    const configPath = `blocks.${uid}.inputConfigs.${props.input.index}`;
    // const store = useCommunityModelStore();
    const store = props.store;
    const ctx = {
        ...props,
        inputIndex: props.input.index,
        valuePath: `${configPath}._formMeta.value`,
        valueIdPath: `${configPath}._formMeta.inventoryId`,
    };
    return {
        ...ctx,
        value: dotObject.pick(ctx.valuePath, store),
        valueId: dotObject.pick(ctx.valueIdPath, store),
        setValue: (v) => {
            store.update(ctx.valuePath as any, +v);
            console.log(dotObject.pick(ctx.valuePath, store));
            console.log(dotObject.pick(configPath, store), props.input.index);
        },
        setValueId: (id) => store.update(ctx.valueIdPath as any, id),
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

