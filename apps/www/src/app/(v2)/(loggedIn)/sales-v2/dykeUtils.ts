import { DykeItemForm } from "./type";

export default {
    newItem(
        index,
        rootBlock
    ): {
        item: { [id in string]: DykeItemForm };
        block: { [id in string]: any };
    } {
        return {
            item: {
                [index]: {
                    meta: {
                        configIndex: 0,
                        config: {},
                    },
                    // shelfItems: [
                    //     // {
                    //     //     categoryIds: [],
                    //     //     categoryId: undefined,
                    //     //     products: [
                    //     //         {
                    //     //             data: {
                    //     //                 meta: {
                    //     //                     categoryIds: [],
                    //     //                 },
                    //     //             } as any,
                    //     //         },
                    //     //     ],
                    //     // },
                    // ],
                } as DykeItemForm as any,
            },
            block: {
                [index]: {
                    blocks: [rootBlock],
                    openedStepIndex: 0,
                },
            },
        };
    },
};
