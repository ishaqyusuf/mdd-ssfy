import type { TRPCContext } from "@api/trpc/init";
import type { Prisma } from "@gnd/db";
import { generateRandomString, nextId } from "@gnd/utils";
import { z } from "zod";
import {
  generateInventoryCategoryUidFromShelfCategoryId,
  type InventoryCategoryTypes,
} from "@sales/utils/inventory-utils";
import type { StepComponentMeta } from "@sales/types";

let logs = {};
const log = (data) => (logs = { ...logs, ...data });
export async function migrateDykeStepToInventories(
  ctx: TRPCContext,
  stepId: number
) {
  let nextImgId = await nextId(ctx.db.imageGallery);
  const images = await ctx.db.imageGallery.findMany({
    select: {
      id: true,
      name: true,
      path: true,
      tags: true,
    },
  });
  const nextImgTagId = await nextId(ctx.db.imageTags);
  const imgTags = images.map((a) => a.tags).flat();
  const inventoryImagesToCreate: any[] = [];
  const imgGalerriesToCreate: any[] = [];
  function addImageToList({ img, inventoryId, name }) {
    const existing = images.find((a) => a.path === img);
    if (existing) {
      inventoryImagesToCreate.push({
        inventoryId,
        imageGalleryId: existing?.id,
      });
    } else {
      let image = {
        path: img,
        name,
        bucket: "inventory",
        id: nextImgId++,
      };
      imgGalerriesToCreate.push(image);
      inventoryImagesToCreate.push({
        inventoryId,
        imageGalleryId: image?.id,
      });
    }
  }
  try {
    const step = await ctx.db.dykeSteps.findUniqueOrThrow({
      where: {
        id: stepId,
      },
      select: {
        uid: true,
        title: true,

        stepProducts: {
          where: {
            deletedAt: null,
          },
          select: {
            product: {
              select: {
                title: true,
                img: true,
              },
            },
            door: {
              select: {
                title: true,
                img: true,
              },
            },
            meta: true,
            img: true,
            name: true,
            uid: true,
          },
        },
        priceSystem: {
          where: {
            deletedAt: null,
          },
          select: {
            stepProductUid: true,
            dependenciesUid: true,
            price: true,
            step: {
              select: {
                uid: true,
              },
            },
          },
        },
      },
    });
    const widthUids: string[] = [];
    const heightUids: string[] = [];
    step.priceSystem = step.priceSystem.map((ps) => {
      // "2-4 x 8-0" validate this format
      const str = ps.dependenciesUid!;
      if (/^\d+-\d+ x \d+-\d+$/.test(str)) {
        const [w, h] = str?.replaceAll("-", "_").split(" x ");
        // console.log("Width:", w, "Height:", h);
        ps.dependenciesUid = `w${w}-h${h}`;
        widthUids.push(`w${w}`);
        heightUids.push(`h${h}`);
      }
      return ps;
    });
    let components = step.stepProducts
      .map((product) => {
        const meta: StepComponentMeta = product.meta as any;
        const variations = meta?.variations;
        return {
          ...product,
          name: product.name || product?.product?.title || product?.door?.title,
          img: product.img || product?.product?.img || product?.door?.img,
          meta,
          depsComponentUids:
            variations
              ?.map((a) => a?.rules?.map((r) => r?.componentsUid)?.flat())
              ?.flat() || [],
          depsStepUids:
            variations?.map((a) => a?.rules?.map((r) => r?.stepUid))?.flat() ||
            [],
        };
      })
      .filter((a) => a?.name?.split("")?.filter(Boolean)?.length);
    components = components
      .filter(
        (a, i) =>
          components.findIndex(
            (e) => e.name?.toLowerCase() === a?.name?.toLowerCase()
          ) == i
      )
      ?.filter((a) => a.name);
    const componentStepUids = components.map((c) => c.depsStepUids).flat();
    const psStepUids = step.priceSystem.map((c) => c.step?.uid);
    const stepsUid = Array.from(new Set([...componentStepUids, ...psStepUids]))
      .filter(Boolean)
      .map((s) => s!);
    log({ componentStepUids, psStepUids });
    log({ components });
    log({ step });
    const depsSteps = await ctx.db.dykeSteps.findMany({
      where: {
        uid: {
          in: stepsUid,
        },
      },
      include: {
        stepProducts: true,
      },
    });
    const productsList = depsSteps
      .map((a) =>
        a.stepProducts.map((p) => ({
          ...p,
          stepUid: a.uid,
        }))
      )
      .flat();
    const products: UpsertInventoriesForDykeProducts["products"] =
      // step.stepProducts
      components.map((product) => {
        const meta: StepComponentMeta = product.meta as any;
        const variations = meta?.variations;
        return {
          img: product.img,
          name: product.name,
          uid: product.uid,
          categories: variations
            ?.map((v) => v?.rules)
            ?.flat()
            // ?.filter((a) => a.operator == "is")
            .map((r) =>
              r.componentsUid?.map((uid) => ({
                stepUid: r.stepUid,
                componentUid: uid,
                operator: r.operator,
                componentName: productsList.find((p) => p.uid == uid)?.name!,
                stepTitle: depsSteps.find((s) => s.uid === r.stepUid)?.title!,
              }))
            )
            .flat()!,
          variants: step.priceSystem
            .filter((s) => s.stepProductUid === product.uid)
            .map((v) => ({
              price: v.price,
              deps: v.dependenciesUid?.split("-")?.map((uid) => ({
                componentUid: uid,
                stepUid: v.step!?.uid!,
                componentName: productsList.find((p) => p.uid == uid)?.name!,
                stepTitle: depsSteps.find((s) => s.uid === v.step?.uid)?.title!,
              }))!,
            })),
        };
      });
    const data = {
      products,
      step: {
        uid: step.uid!,
        title: step.title!,
      },
    } as UpsertInventoriesForDykeProducts;
    log({ products });
    // }
    // export async function uploadInventoriesForDykeProducts(
    //   ctx: TRPCContext,
    //   data: UpsertInventoriesForDykeProducts
    // ) {
    const deps = data.products
      .filter((a) => a.variants?.length)
      .map((a) => a.variants!?.map((b) => b.deps).flat())
      .flat()
      .filter(Boolean);
    // const stepUids = Array.from(
    //   new Set([data.step.uid, ...deps.map((a) => a.stepUid)])
    // );
    let inventoryTypes = await getInventoryTypesByUids(ctx, stepsUid);
    const missingInventoryTypeUids = stepsUid.filter(
      (uid) => !inventoryTypes.some((it) => it.uid === uid)
    );

    log({ missingInventoryTypeUids });
    log({ stepsUid });
    let nextinvTypeId = await nextId(ctx.db.inventoryCategory);
    const newInventoryTypes: Prisma.InventoryCategoryCreateManyInput[] =
      missingInventoryTypeUids.map((uid) => {
        // const product = data.products.find((p) => p.step.uid === uid);
        const step = deps.find((a) => a.stepUid === uid);
        return {
          id: nextinvTypeId++,
          uid: uid,
          title: step?.stepTitle || uid, // Use step title or fallback to UID
          // type: "component",
        };
      });
    // if (missingInventoryTypeUids.length > 0) {
    //   await ctx.db.inventoryCategory.createMany({
    //     data: newInventoryTypes,
    //   });
    //   inventoryTypes = await getInventoryTypesByUids(ctx, stepsUid);
    // }
    inventoryTypes = [...inventoryTypes, ...((newInventoryTypes || []) as any)];
    log({ newInventoryTypes });
    const productUids = data.products.map((p) => p.uid)?.filter(Boolean);
    const stepInventoryType = inventoryTypes.find((a) => a.uid == stepsUid[0]);

    // let nextinvCatVarAttrs = await nextId(ctx.db.inventory);
    // const invCatVarAttrs = deps
    //   .filter((d, di) => deps.findIndex((a) => a.stepUid === d.stepUid) == di)
    //   .map((ta) => ({
    //     id: nextinvCatVarAttrs++,
    //     inventoryCategoryId: stepInventoryType?.id!,
    //     valuesInventoryCategoryId: inventoryTypes.find(
    //       (a) => a.uid === ta.stepUid
    //     )!?.id,
    //   }));

    let inventories = await ctx.db.inventory.findMany({
      where: {
        uid: {
          in: productUids as any,
        },
      },
    });
    log({ inventories });
    const __allProducts = data.products
      .map((product) => [
        {
          uid: product.uid,
          stepUid: stepsUid[0],
          img: product.img,
          name: product.name,
        },
        ...deps?.map((d) => ({
          uid: d.componentUid,
          img: "",
          name: d.componentName,
          stepUid: d.stepUid,
        })),
      ])
      .flat();
    log({ __allProducts });
    let productsNotFound = __allProducts.filter(
      (p) => p.uid && !inventories.some((i) => i.uid === p.uid) && !!p.name
    );
    productsNotFound = productsNotFound?.filter(
      (p, pi) => productsNotFound?.findIndex((o) => o.uid === p.uid) == pi
    );
    let newInventoryId = await nextId(ctx.db.inventory);
    let newInventoryVariantId = await nextId(ctx.db.inventoryVariant);
    let newICVAId = await nextId(ctx.db.inventoryCategoryVariantAttribute);
    // let newIVAId = await nextId(ctx.db.inventoryVariantAttribute);
    // Inventory Item Sub Category Values
    // Inventory Item Sub Categories
    // let nextIiscId = await nextId(ctx.db.inventoryCategoryVariantAttribute);
    if (productsNotFound.length) {
      const inventoriesToCreate = productsNotFound
        ?.filter((p) => !!p.name)
        .map((product) => {
          const inventoryType = inventoryTypes.find(
            (t) => t.uid === product.stepUid
          );
          const typeId = inventoryType?.id;
          if (!typeId) {
            console.error(
              `!!!InventoryType not found for uid: ${data.step.uid}`
            );

            throw new Error("InventoryType not found", {
              cause: logs,
            });
          }
          const _inventoryId = newInventoryId++;
          if (product.img) {
            addImageToList({
              img: product.img,
              inventoryId: _inventoryId,
              name: product.name,
            });
          }

          // log({ [`pricings-${product.uid}`]: pricings });

          return {
            uid: product.uid as any,
            name: product.name as any,
            inventoryCategoryId: typeId as number,
            img: product.img,
            id: _inventoryId,
          } satisfies Prisma.InventoryCreateManyInput;
        });
      const inventoryId = (uid) =>
        inventoriesToCreate.find((i) => i.uid === uid)?.id!;

      // fetch all inventory pricing
      inventoriesToCreate.map((iv) => {
        const pricings = step.priceSystem.filter(
          (p) => p.stepProductUid === iv.uid!
        );

        function variantIds(duid) {
          let inventoryCategoryId =
            inventories.find((i) => i.uid == duid)?.inventoryCategoryId ||
            inventoriesToCreate?.find((i) => i.uid === duid)
              ?.inventoryCategoryId;
          let variantInventoryId =
            inventories.find((i) => i.uid == duid)?.id ||
            inventoriesToCreate?.find((b) => b.uid == duid)?.id;
          return { inventoryCategoryId, variantInventoryId };
        }
        pricings.map((p) => {
          const depsUids = p?.dependenciesUid?.split("-");
          depsUids?.map((duid) => {
            return variantIds(duid);
          });
        });
      });
      // create variants for each
      // get current pricing configuration
      // disable category not currently included in pricing configuration, this ensures price is saved.

      // Inventory Item Sub Categories
      let nextIiscId = await nextId(ctx.db.inventoryItemSubCategory);
      const iiscToCreate =
        [] as Prisma.InventoryItemSubCategoryCreateManyInput[];
      // Inventory Item Sub Category Values

      let nextIiscvId = await nextId(ctx.db.inventoryItemSubCategoryValue);
      const iiscvToCreate =
        [] as Prisma.InventoryItemSubCategoryValueCreateManyInput[];
      const ls = data.products.filter((a) =>
        productsNotFound.every((p) => p.uid != a.uid)
      );
      ls.filter((a) => a.categories?.length).map((component) => {
        component.categories?.map((category) => {
          const cid = nextIiscId++;
          const civd = nextIiscvId++;
          iiscToCreate.push({
            inventoryId: inventoryId(component.uid),
            id: cid,
          });
          iiscvToCreate.push({
            id: civd,
            inventoryId: inventoryId(component.uid),
            subCategoryId: cid,
            operator: category.operator,
          });
        });
      });
      // Inventory Category Variant Attributes.
      const icvaToCreate =
        [] as Prisma.InventoryCategoryVariantAttributeCreateManyInput[];
      // Inventory Variant Attributes.
      const ivaToCreate =
        [] as Prisma.InventoryVariantAttributeCreateManyInput[];
      const variantsToCreate = ls
        .filter((a) => a.price || (!a.price && !a.variants?.length))
        .map(
          (prod) =>
            ({
              inventoryId: inventoryId(prod.uid),
              uid: prod.uid!,
              // img: prod.img,
              id: newInventoryVariantId++,
            }) satisfies Prisma.InventoryVariantCreateManyInput
        );
      const variantPricingsToCreate = ls
        .filter((a) => a.price)
        .map(
          (prod) =>
            ({
              inventoryId: inventoriesToCreate.find((i) => i.uid === prod.uid)
                ?.id!,
              costPrice: prod.price!,
              inventoryVariantId: undefined,
            }) satisfies Prisma.InventoryVariantPricingCreateManyInput
        );
      ls.filter((a) => a.variants?.length).map((prod) =>
        prod.variants?.map((_var) => {
          const variant = {
            inventoryId: inventoriesToCreate.find((i) => i.uid === prod.uid)
              ?.id!,
            uid: prod.uid!,
            // img: prod.img,
            // variantTitle: prod.name,
            id: newInventoryVariantId++,
          } satisfies Prisma.InventoryVariantCreateManyInput;

          _var.deps.map((dep) => {
            const vicId = inventoryTypes.find(
              (it) => it.uid === dep.stepUid
            )?.id!;
            const icva = {
              inventoryCategoryId: stepInventoryType?.id!,
              valuesInventoryCategoryId: vicId,
              id: undefined,
              // id: icvaToCreate.find(a => )
            } satisfies Prisma.InventoryCategoryVariantAttributeCreateManyInput;
            let icvaId = icvaToCreate.find(
              (a) =>
                icva.inventoryCategoryId == a.inventoryCategoryId &&
                a.valuesInventoryCategoryId === icva.valuesInventoryCategoryId
            ) as any;
            if (!icvaId) {
              icvaId = newICVAId++;
              icva.id = icvaId;
              icvaToCreate.push(icva);
            }
            ivaToCreate.push({
              inventoryVariantId: variant.id,
              inventoryCategoryVariantAttributeId: icva.id!,
              valueId: inventories.find((i) => i.uid === dep.componentUid)?.id!,
            });
          });
          if (_var.price)
            variantPricingsToCreate.push({
              inventoryId: inventoriesToCreate.find((i) => i.uid === prod.uid)
                ?.id!,
              costPrice: _var.price!,
              inventoryVariantId: variant.id! as any,
            });
        })
      );
      return {
        inventoriesToCreate,
        variantsToCreate,
        variantPricingsToCreate,
        icvaToCreate,
        ivaToCreate,
        // invCatVarAttrs,
        newInventoryTypes,
        imgGalerriesToCreate,
        inventoryImagesToCreate,
        logs,
        iiscToCreate,
        iiscvToCreate,
      };
      if (newInventoryTypes.length)
        await ctx.db.inventoryCategory.createMany({
          data: newInventoryTypes,
        });
      // if (invCatVarAttrs?.length)
      //   await ctx.db.inventoryCategoryVariantAttribute.createMany({
      //     data: invCatVarAttrs,
      //     skipDuplicates: true,
      //   });
      await ctx.db.inventory.createMany({
        data: inventoriesToCreate,
      });
      await ctx.db.inventoryVariant.createMany({
        data: variantsToCreate,
      });
      await ctx.db.inventoryVariantPricing.createMany({
        data: variantPricingsToCreate,
      });
      await ctx.db.inventoryCategoryVariantAttribute.createMany({
        data: icvaToCreate,
      });
      await ctx.db.inventoryVariantAttribute.createMany({
        data: ivaToCreate,
      });
      if (imgGalerriesToCreate)
        await ctx.db.imageGallery.createMany({
          data: imgGalerriesToCreate,
        });
      if (inventoryImagesToCreate.length)
        await ctx.db.inventoryImage.createMany({
          data: inventoryImagesToCreate,
        });
      inventories = await ctx.db.inventory.findMany({
        where: {
          uid: {
            in: productUids as any,
          },
        },
        include: {
          // inventoryCategory:true,
          variantPricings: true,
          inventoryItemSubCategories: {
            include: {
              inventory: true,
              inventorySubCategory: true,
            },
          },
          variants: {
            include: {},
          },
        },
      });
    }
    return {
      inventories,
      inventoryTypes,
    };
  } catch (error) {
    log({ error });
  }
  return logs;
}
export async function getInventoryTypesByUids(
  ctx: TRPCContext,
  uids: string[]
) {
  const inventoryCategories = await ctx.db.inventoryCategory.findMany({
    where: {
      uid: {
        in: uids,
      },
    },
    select: {
      uid: true,
      title: true,
      id: true,
    },
  });
  return inventoryCategories;
}

export const upsertInventoriesForDykeShelfProductsSchema = z.object({
  categoryId: z.number(),
});

export async function upsertInventoriesForDykeShelfProducts(
  ctx: TRPCContext,
  data: z.infer<typeof upsertInventoriesForDykeShelfProductsSchema>
) {
  const products = await ctx.db.dykeShelfProducts.findMany({
    where: {
      parentCategoryId: data.categoryId,
    },
    // select: {
    //   // parentCategory: true,
    // },
  });
  const parentCategory = await ctx.db.dykeShelfCategories.findUnique({
    where: {
      id: data.categoryId,
    },
  });
  const uid = generateInventoryCategoryUidFromShelfCategoryId(data.categoryId);
  const inventoryCategory =
    (await ctx.db.inventoryCategory.findFirst({
      where: {
        // uid: `shelf-${data.categoryId}`,
        uid,
      },
    })) ||
    (await ctx.db.inventoryCategory.create({
      data: {
        title: parentCategory?.name!,
        // uid: `shelf-${data.categoryId}`,
        uid,
        type: "shelf-item" as InventoryCategoryTypes,
      },
    }));
  const categories = await ctx.db.dykeShelfCategories.findMany({
    where: {
      parentCategoryId: data.categoryId,
    },
  });
  let inventorySubCategories =
    [] as Prisma.InventorySubCategoryCreateManyInput[];
  let nextInventorySubCategoryId = await nextId(ctx.db.inventorySubCategory);
  let nextInventoryVariantId = await nextId(ctx.db.inventoryVariant);
  const inventoryCategoryIdMapByDykeCategory = {};
  function createCategory(
    parentId,
    // parentInventoryCategoryId?,
    parentSubCategoryUid?
  ) {
    categories
      .filter((c) => c.categoryId == parentId)
      .map((category) => {
        const uid = generateRandomString(5);
        let icId = nextInventorySubCategoryId++;
        inventorySubCategories.push({
          id: icId,
          title: category.name,
          parentInventoryCategoryId: inventoryCategory.id,
          uid,
          parentSubCategoryUid,
          // inventoryTypeId: inventoryType.id!,
        });
        inventoryCategoryIdMapByDykeCategory[String(category.id)] = icId;
        createCategory(category.id, uid);
      });
  }
  createCategory(data.categoryId);

  const __inventories: Prisma.InventoryCreateManyInput[] = [];
  // const __inventoryVariants: Prisma.InventoryCreateManyInput[] = [];
  const __inventoryVariants: Prisma.InventoryVariantCreateManyInput[] = [];
  const __inventoryVariantPricings: Prisma.InventoryVariantPricingCreateManyInput[] =
    [];
  const invItemSubCat: Prisma.InventoryItemSubCategoryCreateManyInput[] = [];
  let nextInventoryId = await nextId(ctx.db.inventory);
  let nextInventoryPriceId = await nextId(ctx.db.inventoryVariant);
  products.map((product) => {
    let ivId = nextInventoryId++;
    let priceId = nextInventoryPriceId++;
    let variantId = nextInventoryVariantId++;
    __inventories.push({
      uid: `shelf-prod-${product.id}`,
      id: ivId,
      img: product.img,
      inventoryCategoryId: inventoryCategory.id,
      name: product.title,
    });
    const catIds = (product.meta as any)?.categoryIds || [];
    for (let i = 1; i < catIds.length; i++) {
      const cid = catIds?.[i];
      if (cid) {
        let subCatId = inventoryCategoryIdMapByDykeCategory[String(cid)];
        invItemSubCat.push({
          inventoryId: ivId,
          inventorySubCategoryId: subCatId,
        });
      }
    }
    __inventoryVariants.push({
      id: variantId,
      inventoryId: ivId,
      uid: `shelf-prod-${product.id}`,
    });
    __inventoryVariantPricings.push({
      id: priceId,
      inventoryId: ivId,
      price: product.unitPrice!,
      inventoryVariantId: variantId,
    });
  });
  return ctx.db.$transaction(
    async (tx) => {
      await tx.inventorySubCategory.createMany({
        data: inventorySubCategories,
      });
      await tx.inventory.createMany({
        data: __inventories,
      });
      await tx.inventoryVariant.createMany({
        data: __inventoryVariants,
      });
      await tx.inventoryItemSubCategory.createMany({
        data: invItemSubCat,
      });
      await tx.inventoryVariantPricing.createMany({
        data: __inventoryVariantPricings,
      });
    },
    {
      timeout: 20 * 1000,
    }
  );
}
export async function getInventoryCategoryByShelfId(
  ctx: TRPCContext,
  categoryId
) {
  const uid = generateInventoryCategoryUidFromShelfCategoryId(categoryId);
  const inventoryType = await ctx.db.inventoryCategory.findFirst({
    where: {
      uid,
    },
  });
  return inventoryType;
}
const upsertInventoriesForDykeProductsSchema = z.object({
  step: z.object({
    // id: z.number(),
    uid: z.string(),
    title: z.string(),
  }),
  products: z.array(
    z.object({
      uid: z.string().optional().nullable(),
      name: z.string().optional().nullable(),
      img: z.string().optional().nullable(),
      price: z.number().optional().nullable(),
      categories: z
        .array(
          z.object({
            stepUid: z.string(),
            componentUid: z.string(),
            operator: z.enum(["is", "isNot"]).nullable().optional(),
            stepTitle: z.string(),
            componentName: z.string(),
          })
        )
        .optional()
        .nullable(),
      variants: z
        .array(
          z.object({
            deps: z.array(
              z.object({
                stepUid: z.string(),
                componentUid: z.string(),
                stepTitle: z.string(),
                componentName: z.string(),
              })
            ),
            price: z.number().optional().nullable(),
          })
        )
        .optional()
        .nullable(),
    })
  ),
});
export type UpsertInventoriesForDykeProducts = z.infer<
  typeof upsertInventoriesForDykeProductsSchema
>;
