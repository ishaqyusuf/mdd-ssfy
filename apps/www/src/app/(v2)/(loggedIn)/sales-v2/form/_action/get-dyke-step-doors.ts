"use server";

import { DykeDoors, prisma, Prisma } from "@/db";

import { findDoorSvg } from "../../_utils/find-door-svg";
import { sortStepProducts, transformStepProducts } from "../../dyke-utils";
import { DykeDoorType, DykeProductMeta, StepProdctMeta } from "../../type";
import { IStepProducts } from "../components/step-items-list/item-section/step-products";
import { restoreDoors } from "./restore-doors";

interface Props {
    q;
    omit;
    qty;
    stepId;
    query;
    doorType?: DykeDoorType;
    final?: boolean;
}

export async function _deleteDuplicateDoorSteps(ids) {
    await prisma.dykeStepProducts.updateMany({
        where: { id: { in: ids } },
        data: {
            deletedAt: new Date(),
        },
    });
}
export async function getDykeStepDoors(stepId): Promise<IStepProducts> {
    // await restoreDoors(stepId);
    // console.log([">>>>>>>>>>>>"]);
    const whereDoor: Prisma.DykeDoorsWhereInput = {
        // query: isBifold || !query ? undefined : query,
    };
    // async function _load() {
    const stepProds = await prisma.dykeStepProducts.findMany({
        where: {
            door: {
                // ...whereDoor,
                isNot: null,
                // deletedAt: null,
            },
            deletedAt: {},
            // OR: [
            //     { deletedAt: null },
            //     {
            //         deletedAt: {
            //             not: null,
            //         },
            //     },
            // ],
        },
        // distinct: '',
        include: {
            door: true,
            product: true,
        },
    });
    // if (stepProds.length) {
    const _response = stepProds.map(transformStepProducts);

    return sortStepProducts(_response);

    // }
    return null;
}
function response(_doors: DykeDoors[], stepId) {
    return {
        result: _doors.map((door: any) => {
            // const meta =
            const prodMeta = {
                ...findDoorSvg(door.title, door.img),
                ...((door.meta as any) || {}),
            } as DykeProductMeta;

            return {
                dykeStepId: stepId,
                dykeProductId: door.id,
                id: door.id,
                isDoor: true,
                sortIndex: prodMeta.sortIndex || null,
                product: {
                    ...door,
                    value: door.title,
                    prodMeta,
                },
            };
        }) as any,
    };
}
export async function getDykeStepDoorByProductId(stepId, productId) {
    const door = await prisma.dykeDoors.findFirst({
        where: { id: productId },
    });
    if (!door) throw Error();
    return response([door], stepId).result[0];
}
