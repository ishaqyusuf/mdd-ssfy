"use server";

import { prisma } from "@/db";

export async function _optimizeAutoComplete() {
    // await prisma.autoCompletes.groupBy({
    // })
    // const duplicates = await prisma.autoCompletes.groupBy({
    //     by: ["type", "fieldName", "value"],
    //     having: {}
    // });
}
export async function _saveSuggestions(list: any[], type, fieldName?) {
    await prisma.autoCompletes.createMany({
        data: list
            .map((row) => {
                if (typeof row == "string") {
                    return {
                        value: row,
                        fieldName,
                        type,
                    };
                }
                if (typeof row == "object") {
                    const { fieldName: _fieldName, type: _type, value } = row;
                    return {
                        fieldName: _fieldName || fieldName,
                        type: _type || type,
                        value,
                    };
                }
                return null;
            })
            .filter((r) => r?.type && r?.value) as any,
    });
    // const duplicates = await prisma.autoCompletes.groupBy({
    //     by: ["type", "fieldName", "value"],
    //     having: {},
    // });
    // duplicates.map(d => {

    // })
}
