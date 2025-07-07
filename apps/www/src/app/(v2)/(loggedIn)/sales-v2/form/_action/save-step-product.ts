"use server";

import { prisma } from "@/db";

import { DykeDoorType } from "../../type";
import { IStepProducts } from "../components/step-items-list/item-section/step-products";
import { generateRandomString } from "@/lib/utils";
import { transformStepProducts } from "../../dyke-utils";
export interface SaveStepProductExtra {
    _meta: {
        isMoulding: boolean;
        mouldingCategoryId?: number;
        doorType?: DykeDoorType;
        stepTitle?;
        doorQuery?;
    };
}
type Props = IStepProducts[0] & Partial<SaveStepProductExtra>;
async function saveDykeDoor(data: Props) {
    let door: any = undefined;
    if (data.product.img) {
        delete data.product.meta.svg;
        console.log("svg deleted");
    }
    if (!data.id) {
        door = await prisma.dykeDoors.create({
            data: {
                title: data.product.title as any,
                doorType: data._meta?.doorType,
                query: data._meta?.doorQuery,
                img: data.product.img,
                meta: {},
            },
        });
    } else {
        door = await prisma.dykeDoors.update({
            where: { id: data.id },
            data: {
                title: data.product.title as any,
                price: data.product.price,
                doorType: data._meta?.doorType,
                query: data._meta?.doorQuery,
                img: data.product.img,
                meta: data.product.meta as any,
            },
        });
    }
    return {
        dykeStepId: data.dykeStepId,
        dykeProductId: door.id,
        id: door.id,
        product: {
            ...door,
            value: door.title,
            meta: {
                ...door.meta,
            },
        },
    };
}
export async function updateDoorMetaAction(id, meta) {
    await prisma.dykeDoors.update({
        where: { id },
        data: { meta },
    });
}
export async function saveStepProduct(data: Props) {
    // if (!data.product.value) data.product.value = data.product.title as any;
    const doorMode = data.door != null || data.isDoor; //_meta?.stepTitle == "Door";
    // if (data._meta?.stepTitle == "Door") return await saveDykeDoor(data);

    const {
        product: {
            id: prodId,

            ...productData
        },
        dykeProductId,
        dykeStepId,
        id,
        _meta,
        _metaData,
        doorId,
        isDoor,
        ...stepData
    } = data;
    Object.entries(stepData.meta).map(([k, v]) => {
        if (v) delete stepData.meta?.deleted?.[k];
    });
    _metaData.price = productData.price;
    if (!id) {
        if (_meta?.isMoulding && !_meta.mouldingCategoryId) {
        }

        const s = await prisma.dykeStepProducts.create({
            data: {
                ...stepData,
                uid: generateRandomString(5),
                meta: stepData.meta as any,
                productCode: stepData.productCode,
                product: doorMode
                    ? undefined
                    : {
                          create: {
                              ...productData,
                              categoryId: undefined,
                              meta: productData.meta as any,
                              category: !_meta?.isMoulding
                                  ? undefined
                                  : {
                                        connectOrCreate: {
                                            where: {
                                                title: "Moulding",
                                            },
                                            create: {
                                                title: "Moulding",
                                            },
                                        },
                                    },
                          } as any,
                      },
                door: doorMode
                    ? {
                          create: {
                              title: data.product.title as any,
                              doorType: data._meta?.doorType,
                              query: data._meta?.doorQuery,
                              img: data.product.img,
                              meta: productData.meta as any,
                          },
                      }
                    : undefined,
                step: {
                    connect: {
                        id: dykeStepId,
                    },
                },
            } as any,
            include: {
                product: true,
                door: true,
            },
        });
        return { ...s, _metaData };
    } else {
        // console.log(stepData);

        const _ss = await prisma.dykeStepProducts.update({
            where: { id: id },
            data: {
                ...stepData,
                meta: stepData.meta as any,
                updatedAt: new Date(),
                deletedAt: null,
                product: doorMode
                    ? undefined
                    : {
                          update: {
                              where: {
                                  id: prodId,
                              },
                              data: {
                                  ...productData,

                                  // value: productData.title as any,
                                  meta: productData.meta as any,
                              },
                          },
                      },
                door: doorMode
                    ? {
                          update: {
                              where: { id: prodId },
                              data: {
                                  title: productData.title as any,
                                  price: productData.price,
                                  doorType: data._meta?.doorType,
                                  query: data._meta?.doorQuery,
                                  img: productData.img,
                                  meta: productData.meta as any,
                              },
                          },
                      }
                    : undefined,
            } as any,
            include: {
                product: true,
                door: true,
            },
        });
        return { ...transformStepProducts({ ..._ss }), _metaData };
    }
}
