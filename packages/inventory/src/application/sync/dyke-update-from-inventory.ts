import type { Db } from "@gnd/db";
import {
  buildLegacyDoorSupplierPricingKeys,
  parseDykeSupplierPricingKey,
} from "../suppliers/suppliers";
import type {
  InventoryToDykeSyncPayload,
  InventoryToDykeSyncResult,
  SyncSkip,
} from "../../schema";

export type DykeUpdateFromInventoryInput = {
  inventoryCategoryId?: number | null;
  inventoryId?: number | null;
  syncTitle?: boolean;
  syncImage?: boolean;
};

function resolveGenericVariantPrice(pricing: {
  price?: number | null;
  costPrice?: number | null;
} | null | undefined) {
  return pricing?.costPrice ?? pricing?.price ?? null;
}

async function syncCategory(
  db: Db,
  inventoryCategoryId: number,
  mode: "compare" | "sync",
) {
  let created = 0;
  let updated = 0;
  let archived = 0;
  const skipped: SyncSkip[] = [];

  const category = await db.inventoryCategory.findUnique({
    where: { id: inventoryCategoryId },
    select: { id: true, uid: true, title: true, deletedAt: true },
  });

  if (!category?.uid) {
    skipped.push({
      entity: "category",
      inventoryId: inventoryCategoryId,
      uid: null,
      reason: "inventory category missing uid",
    });
    return { created, updated, archived, skipped };
  }

  const existingStep = await db.dykeSteps.findFirst({
    where: { uid: category.uid },
    select: { id: true, title: true, deletedAt: true },
  });

  const isDeleted = !!category.deletedAt;

  if (!existingStep) {
    if (isDeleted) {
      return { created, updated, archived, skipped };
    }
    if (mode === "sync") {
      try {
        await db.dykeSteps.create({
          data: {
            uid: category.uid,
            title: category.title ?? undefined,
          },
        });
        created += 1;
      } catch (error: any) {
        if (
          error?.code === "P2002" ||
          error?.meta?.target?.includes("uid")
        ) {
          created += 1;
        } else {
          skipped.push({
            entity: "category",
            uid: category.uid,
            reason: `create_failed: ${String(error?.message ?? error)}`,
          });
        }
      }
    }
    return { created, updated, archived, skipped };
  }

  // Handle archive
  if (isDeleted && !existingStep.deletedAt) {
    if (mode === "sync") {
      await db.dykeSteps.updateMany({
        where: { uid: category.uid, deletedAt: null },
        data: { deletedAt: new Date() },
      });
    }
    archived += 1;
    return { created, updated, archived, skipped };
  }

  // Restore if category is re-activated
  if (!isDeleted && existingStep.deletedAt) {
    if (mode === "sync") {
      await db.dykeSteps.updateMany({
        where: { uid: category.uid },
        data: { deletedAt: null },
      });
    }
    updated += 1;
    return { created, updated, archived, skipped };
  }

  // Title update
  const titleChanged = category.title !== existingStep.title;
  if (titleChanged) {
    if (mode === "sync") {
      await db.dykeSteps.updateMany({
        where: { uid: category.uid, deletedAt: null },
        data: { title: category.title },
      });
    }
    updated += 1;
  }

  return { created, updated, archived, skipped };
}

async function syncProduct(
  db: Db,
  inventoryId: number,
  mode: "compare" | "sync",
) {
  let created = 0;
  let updated = 0;
  let archived = 0;
  const skipped: SyncSkip[] = [];

  const inventory = await db.inventory.findUnique({
    where: { id: inventoryId },
    select: {
      id: true,
      uid: true,
      name: true,
      status: true,
      deletedAt: true,
      inventoryCategoryId: true,
      sourceStepUid: true,
      sourceComponentUid: true,
      inventoryCategory: {
        select: { uid: true, title: true },
      },
      images: {
        where: { deletedAt: null, primary: true },
        take: 1,
        select: {
          imageGallery: {
            select: { path: true },
          },
        },
      },
    },
  });

  if (!inventory?.uid) {
    skipped.push({
      entity: "product",
      inventoryId,
      uid: null,
      reason: "inventory product missing uid",
    });
    return { created, updated, archived, skipped };
  }

  // Resolve parent step identity
  const stepUid =
    inventory.inventoryCategory?.uid ?? inventory.sourceStepUid;
  if (!stepUid) {
    skipped.push({
      entity: "product",
      inventoryId,
      uid: inventory.uid,
      reason: "missing_dyke_step_identity",
    });
    return { created, updated, archived, skipped };
  }

  const parentStep = await db.dykeSteps.findFirst({
    where: { uid: stepUid, deletedAt: null },
    select: { id: true },
  });

  if (!parentStep) {
    skipped.push({
      entity: "product",
      inventoryId,
      uid: inventory.uid,
      reason: "parent_dyke_step_not_found",
    });
    return { created, updated, archived, skipped };
  }

  // Match existing Dyke product by uid
  const existingProduct = await db.dykeStepProducts.findFirst({
    where: {
      uid: inventory.uid,
      deletedAt: null,
    },
    select: { id: true, name: true, img: true },
  });

  const isDeleted = !!inventory.deletedAt || inventory.status === "archived";

  if (!existingProduct) {
    if (isDeleted) {
      return { created, updated, archived, skipped };
    }
    if (mode === "sync") {
      try {
        await db.dykeStepProducts.create({
          data: {
            uid: inventory.uid,
            name: inventory.name,
            img: inventory.images[0]?.imageGallery?.path ?? null,
            dykeStepId: parentStep.id,
          },
        });
        created += 1;
      } catch (error: any) {
        if (
          error?.code === "P2002" ||
          error?.meta?.target?.includes("uid")
        ) {
          created += 1;
        } else {
          skipped.push({
            entity: "product",
            inventoryId,
            uid: inventory.uid,
            reason: `create_failed: ${String(error?.message ?? error)}`,
          });
        }
      }
    }
    return { created, updated, archived, skipped };
  }

  // Existing product - handle archive or update
  if (isDeleted) {
    if (mode === "sync") {
      await db.dykeStepProducts.updateMany({
        where: { id: existingProduct.id },
        data: { deletedAt: new Date() },
      });
    }
    archived += 1;
    return { created, updated, archived, skipped };
  }

  const nameChanged = inventory.name !== existingProduct.name;
  const imgValue = inventory.images[0]?.imageGallery?.path ?? null;
  const imgChanged = imgValue !== (existingProduct.img ?? null);

  if (nameChanged || imgChanged) {
    if (mode === "sync") {
      await db.dykeStepProducts.updateMany({
        where: { id: existingProduct.id },
        data: {
          ...(nameChanged ? { name: inventory.name } : {}),
          ...(imgChanged ? { img: imgValue } : {}),
        },
      });
    }
    updated += 1;
  }

  return { created, updated, archived, skipped };
}

async function syncVariantAndPricing(
  db: Db,
  inventoryVariantId: number,
  mode: "compare" | "sync",
) {
  let pricingCreated = 0;
  let pricingUpdated = 0;
  let pricingArchived = 0;
  const variantSkips: SyncSkip[] = [];
  const pricingSkips: SyncSkip[] = [];

  const variant = await db.inventoryVariant.findUnique({
    where: { id: inventoryVariantId },
    select: {
      id: true,
      uid: true,
      status: true,
      deletedAt: true,
      inventoryId: true,
      inventory: {
        select: {
          uid: true,
          inventoryCategoryId: true,
          sourceStepUid: true,
          sourceComponentUid: true,
          inventoryCategory: {
            select: { uid: true },
          },
        },
      },
      pricing: {
        select: {
          id: true,
          price: true,
          costPrice: true,
        },
      },
      supplierVariants: {
        where: {
          deletedAt: null,
        },
        select: {
          id: true,
          supplierId: true,
          costPrice: true,
          salesPrice: true,
          meta: true,
          supplier: {
            select: { uid: true, name: true },
          },
        },
      },
      attributes: {
        select: {
          value: {
            select: {
              name: true,
              uid: true,
              sourceStepUid: true,
              sourceComponentUid: true,
            },
          },
        },
      },
    },
  });

  if (!variant) {
    variantSkips.push({
      entity: "variant",
      inventoryVariantId,
      reason: "variant_not_found",
    });
    return {
      variants: { created: 0, updated: 0, archived: 0, skipped: variantSkips },
      pricing: { created: 0, updated: 0, archived: 0, skipped: pricingSkips },
    };
  }

  // Resolve step identity
  const stepUid =
    variant.inventory?.inventoryCategory?.uid ??
    variant.inventory?.sourceStepUid;
  if (!stepUid) {
    pricingSkips.push({
      entity: "pricing",
      inventoryVariantId,
      uid: variant.uid,
      reason: "missing_dyke_step_identity_for_variant",
    });
    return {
      variants: { created: 0, updated: 0, archived: 0, skipped: variantSkips },
      pricing: { created: 0, updated: 0, archived: 0, skipped: pricingSkips },
    };
  }

  const parentStep = await db.dykeSteps.findFirst({
    where: { uid: stepUid, deletedAt: null },
    select: { id: true },
  });

  if (!parentStep) {
    pricingSkips.push({
      entity: "pricing",
      inventoryVariantId,
      uid: variant.uid,
      reason: "parent_dyke_step_not_found_for_variant",
    });
    return {
      variants: { created: 0, updated: 0, archived: 0, skipped: variantSkips },
      pricing: { created: 0, updated: 0, archived: 0, skipped: pricingSkips },
    };
  }

  const productUid =
    variant.inventory?.uid ?? variant.inventory?.sourceComponentUid;
  if (!productUid) {
    pricingSkips.push({
      entity: "pricing",
      inventoryVariantId,
      uid: variant.uid,
      reason: "missing_product_uid_for_pricing",
    });
    return {
      variants: { created: 0, updated: 0, archived: 0, skipped: variantSkips },
      pricing: { created: 0, updated: 0, archived: 0, skipped: pricingSkips },
    };
  }

  // ---- Variant archive/draft guard (FIX) ----
  const supplierVariants = variant.supplierVariants ?? [];
  const isArchived =
    variant.deletedAt != null || variant.status === "archived";

  if (isArchived) {
    const activePricingRows = await db.dykePricingSystem.findMany({
      where: {
        dykeStepId: parentStep.id,
        stepProductUid: productUid,
        deletedAt: null,
      },
      select: { id: true, dependenciesUid: true },
    });

    // Match rows owned by this variant (generic: dependenciesUid = variant.uid)
    const ownedRows = activePricingRows.filter(
      (r) => r.dependenciesUid === variant.uid,
    );

    // Also match supplier-specific rows where we can identify them
    const supplierCandidateKeys: string[] = [];
    for (const sv of supplierVariants) {
      const svMeta = sv.meta as Record<string, any> | null | undefined;
      const originalKey: string | null =
        typeof svMeta?.pricingKey === "string" && svMeta.pricingKey.trim()
          ? svMeta.pricingKey.trim()
          : null;
      if (originalKey) supplierCandidateKeys.push(originalKey);

      const supplierUid = sv.supplier?.uid;
      if (supplierUid) {
        const originalSize: string | null =
          typeof svMeta?.size === "string" && svMeta.size.trim()
            ? svMeta.size.trim()
            : null;
        const depValues = variant.attributes
          .map((a) => a.value?.uid ?? a.value?.name)
          .filter((v): v is string => !!v);
        const generatedKeys = buildLegacyDoorSupplierPricingKeys({
          supplierUid,
          size: originalSize ?? null,
          depValues: depValues.length ? depValues : undefined,
        });
        for (const k of generatedKeys) {
          if (!supplierCandidateKeys.includes(k)) supplierCandidateKeys.push(k);
        }
      }
    }

    const supplierRows = activePricingRows.filter((r) =>
      supplierCandidateKeys.includes(r.dependenciesUid ?? ""),
    );

    // Merge owned + supplier rows, deduplicate by id
    const seen = new Set<number>();
    const rowsToArchive = [...ownedRows, ...supplierRows].filter((r) => {
      if (seen.has(r.id)) return false;
      seen.add(r.id);
      return true;
    });

    if (rowsToArchive.length > 0) {
      if (mode === "sync") {
        await db.dykePricingSystem.updateMany({
          where: {
            id: { in: rowsToArchive.map((r) => r.id) },
            deletedAt: null,
          },
          data: { deletedAt: new Date() },
        });
      }
      pricingArchived += rowsToArchive.length;
    }

    return {
      variants: { created: 0, updated: 0, archived: 0, skipped: variantSkips },
      pricing: { created: 0, updated: 0, archived: pricingArchived, skipped: pricingSkips },
    };
  }

  if (variant.status === "draft") {
    pricingSkips.push({
      entity: "pricing",
      inventoryVariantId,
      uid: variant.uid,
      reason: "variant_not_published",
    });
    return {
      variants: { created: 0, updated: 0, archived: 0, skipped: variantSkips },
      pricing: { created: 0, updated: 0, archived: 0, skipped: pricingSkips },
    };
  }

  // ---- Supplier-specific pricing (Fix B) ----
  for (const sv of supplierVariants) {
    const supplierUid = sv.supplier?.uid;
    if (!supplierUid) {
      pricingSkips.push({
        entity: "pricing",
        inventoryVariantId,
        uid: variant.uid,
        reason: "supplier_missing_uid",
      });
      continue;
    }

    const effectivePrice = sv.salesPrice ?? sv.costPrice ?? null;
    if (effectivePrice == null) {
      pricingSkips.push({
        entity: "pricing",
        inventoryVariantId,
        uid: variant.uid,
        reason: "supplier_variant_no_price",
      });
      continue;
    }

    // Build candidate supplier pricing keys: originalKey first, then generated
    const svMeta = sv.meta as Record<string, any> | null | undefined;
    const originalKey: string | null =
      typeof svMeta?.pricingKey === "string" && svMeta.pricingKey.trim()
        ? svMeta.pricingKey.trim()
        : null;
    const originalSize: string | null =
      typeof svMeta?.size === "string" && svMeta.size.trim()
        ? svMeta.size.trim()
        : null;

    const depValues = variant.attributes
      .map((a) => a.value?.uid ?? a.value?.name)
      .filter((v): v is string => !!v);

    const generatedKeys = buildLegacyDoorSupplierPricingKeys({
      supplierUid,
      size: originalSize ?? null,
      depValues: depValues.length ? depValues : undefined,
    });

    // Deduplicated candidate list: originalKey first, then generated
    const candidateSet = new Set<string>();
    if (originalKey) candidateSet.add(originalKey);
    for (const k of generatedKeys) candidateSet.add(k);
    const allCandidateKeys = Array.from(candidateSet);

    // Collect all active pricing rows for this step+product
    const existingRows = await db.dykePricingSystem.findMany({
      where: {
        dykeStepId: parentStep.id,
        stepProductUid: productUid,
        deletedAt: null,
      },
      select: { id: true, dependenciesUid: true, price: true },
    });

    // Find matches among existing rows using full candidate set
    const matchingRows = existingRows.filter((row) =>
      allCandidateKeys.includes(row.dependenciesUid ?? ""),
    );

    if (matchingRows.length > 1) {
      pricingSkips.push({
        entity: "pricing",
        inventoryVariantId,
        uid: variant.uid,
        reason: "ambiguous_supplier_pricing_match",
      });
      continue;
    }

    if (matchingRows.length === 1) {
      const match = matchingRows[0]!;
      if (match.price !== effectivePrice) {
        if (mode === "sync") {
          await db.dykePricingSystem.updateMany({
            where: { id: match.id },
            data: { price: effectivePrice },
          });
        }
        pricingUpdated += 1;
      }
      continue;
    }

    // Zero matches – only create if we have an original key
    if (!originalKey) {
      pricingSkips.push({
        entity: "pricing",
        inventoryVariantId,
        uid: variant.uid,
        reason: "missing_original_supplier_pricing_key",
      });
      continue;
    }

    if (mode === "sync") {
      // Idempotency check: someone else might have created between read and write
      const alreadyExists = await db.dykePricingSystem.findFirst({
        where: {
          dykeStepId: parentStep.id,
          stepProductUid: productUid,
          dependenciesUid: originalKey,
          deletedAt: null,
        },
      });
      if (alreadyExists) {
        if (alreadyExists.price !== effectivePrice) {
          await db.dykePricingSystem.updateMany({
            where: { id: alreadyExists.id },
            data: { price: effectivePrice },
          });
          pricingUpdated += 1;
        }
        continue;
      }

      await db.dykePricingSystem.create({
        data: {
          dykeStepId: parentStep.id,
          stepProductUid: productUid,
          dependenciesUid: originalKey,
          price: effectivePrice,
        },
      });
    }
    pricingCreated += 1;
  }

  // ---- Generic pricing (Fix A routing) ----
  const variantPricing = variant.pricing;
  if (variantPricing) {
    const genericPrice = resolveGenericVariantPrice(variantPricing);

    if (genericPrice != null) {
      const targetDepsUid = variant.uid;

      const allPricingRows = await db.dykePricingSystem.findMany({
        where: {
          dykeStepId: parentStep.id,
          stepProductUid: productUid,
          deletedAt: null,
        },
        select: { id: true, dependenciesUid: true, price: true },
      });

      const matchingRows = allPricingRows.filter(
        (r) => r.dependenciesUid === targetDepsUid,
      );

      if (matchingRows.length > 1) {
        pricingSkips.push({
          entity: "pricing",
          inventoryVariantId,
          uid: variant.uid,
          reason: "ambiguous_generic_pricing_match",
        });
      } else if (matchingRows.length === 1) {
        const match = matchingRows[0]!;
        if (match.price !== genericPrice) {
          if (mode === "sync") {
            await db.dykePricingSystem.updateMany({
              where: { id: match.id },
              data: { price: genericPrice },
            });
          }
          pricingUpdated += 1;
        }
      } else {
        let createGenericPricing = true;
        if (mode === "sync") {
          const alreadyExists = await db.dykePricingSystem.findFirst({
            where: {
              dykeStepId: parentStep.id,
              stepProductUid: productUid,
              dependenciesUid: targetDepsUid,
              deletedAt: null,
            },
          });
          if (alreadyExists) {
            createGenericPricing = false;
            if (alreadyExists.price !== genericPrice) {
              await db.dykePricingSystem.updateMany({
                where: { id: alreadyExists.id },
                data: { price: genericPrice },
              });
              pricingUpdated += 1;
            }
          } else {
            await db.dykePricingSystem.create({
              data: {
                dykeStepId: parentStep.id,
                stepProductUid: productUid,
                dependenciesUid: targetDepsUid,
                price: genericPrice,
              },
            });
          }
        }
        if (createGenericPricing) {
          pricingCreated += 1;
        }
      }
    }
  }

  return {
    variants: {
      created: 0,
      updated: 0,
      archived: 0,
      skipped: variantSkips,
    },
    pricing: {
      created: pricingCreated,
      updated: pricingUpdated,
      archived: pricingArchived,
      skipped: pricingSkips,
    },
  };
}

export async function syncInventoryToDyke(
  db: Db,
  payload: InventoryToDykeSyncPayload,
): Promise<InventoryToDykeSyncResult> {
  const mode = payload.mode ?? "sync";

  const result: InventoryToDykeSyncResult = {
    mode,
    source: payload.source ?? "repair",
    category: { created: 0, updated: 0, archived: 0, skipped: [] },
    products: { created: 0, updated: 0, archived: 0, skipped: [] },
    variants: { created: 0, updated: 0, archived: 0, skipped: [] },
    pricing: { created: 0, updated: 0, archived: 0, skipped: [] },
  };

  // Category sync
  if (payload.inventoryCategoryId) {
    const catResult = await syncCategory(
      db,
      payload.inventoryCategoryId,
      mode,
    );
    result.category = {
      created: catResult.created,
      updated: catResult.updated,
      archived: catResult.archived,
      skipped: catResult.skipped,
    };
  }

  // Product sync
  if (payload.inventoryId) {
    result.products = await syncProduct(db, payload.inventoryId, mode);
  }

  // Variant + pricing sync
  if (payload.inventoryVariantId) {
    const vpResult = await syncVariantAndPricing(
      db,
      payload.inventoryVariantId,
      mode,
    );
    result.variants = {
      ...vpResult.variants,
      skipped: [...result.variants.skipped, ...vpResult.variants.skipped],
    };
    result.pricing = {
      ...vpResult.pricing,
      skipped: [...result.pricing.skipped, ...vpResult.pricing.skipped],
    };
  }

  return result;
}

// ---- Legacy wrapper preserved for compatibility ----
export async function dykeUpdateFromInventory(
  db: Db,
  input: DykeUpdateFromInventoryInput,
) {
  const syncTitle = input.syncTitle ?? true;
  const syncImage = input.syncImage ?? true;
  const summary = {
    categoryUpdated: 0,
    productsUpdated: 0,
    skipped: [] as string[],
  };

  if (input.inventoryCategoryId) {
    const category = await db.inventoryCategory.findUnique({
      where: { id: input.inventoryCategoryId },
      select: { id: true, uid: true, title: true },
    });

    if (!category?.uid) {
      summary.skipped.push("inventory category missing uid");
    } else {
      const result = await db.dykeSteps.updateMany({
        where: { uid: category.uid },
        data: syncTitle ? { title: category.title } : {},
      });
      summary.categoryUpdated += result.count || 0;
    }
  }

  if (input.inventoryId) {
    const inventory = await db.inventory.findUnique({
      where: { id: input.inventoryId },
      select: {
        id: true,
        uid: true,
        name: true,
        images: {
          where: { deletedAt: null, primary: true },
          take: 1,
          select: {
            imageGallery: {
              select: { path: true },
            },
          },
        },
      },
    });

    if (!inventory?.uid) {
      summary.skipped.push("inventory product missing uid");
    } else {
      const result = await db.dykeStepProducts.updateMany({
        where: { uid: inventory.uid },
        data: {
          ...(syncTitle ? { name: inventory.name } : {}),
          ...(syncImage
            ? { img: inventory.images[0]?.imageGallery?.path ?? undefined }
            : {}),
        },
      });
      summary.productsUpdated += result.count || 0;
    }
  }

  return summary;
}
