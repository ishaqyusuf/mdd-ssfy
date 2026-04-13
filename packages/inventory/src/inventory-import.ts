import { Db } from "@gnd/db";
import { InventoryImport } from "./schema";
import { resolveActiveInventoryImportScope } from "./application/import/resolve-active-inventory-import-scope";

export async function inventoryImport(db: Db, data: InventoryImport) {
  const scope = await resolveActiveInventoryImportScope(db);
  const query = data.q?.trim().toLowerCase() || "";
  const categories = await db.dykeSteps.findMany({
    where:
      data.scope === "all"
        ? {}
        : {
            uid: {
              in: scope.activeStepUids,
            },
          },
    select: {
      uid: true,
      id: true,
      title: true,
      _count: {
        select: {
          stepProducts: {
            where: {
              deletedAt: null,
            },
          },
        },
      },
      stepProducts: {
        where: {
          deletedAt: null,
        },
        select: {
          custom: true,
        },
      },
    },
    orderBy: {
      title: "asc",
    },
  });
  const importedInventories = await db.inventory.findMany({
    where: {
      deletedAt: null,
      ...(data.scope === "all"
        ? {}
        : {
            sourceStepUid: {
              in: scope.activeStepUids,
            },
          }),
    },
    select: {
      id: true,
      uid: true,
      inventoryCategoryId: true,
      ...( {
        sourceStepUid: true,
        sourceCustom: true,
      } as any ),
    },
  });
  const inventoryCategories = await db.inventoryCategory.findMany({
    where: {
      uid: {
        in: [
          ...categories.map((c) => c.uid!),
        ],
      },
    },
    select: {
      uid: true,
      _count: {
        select: {
          inventories: {
            where: {
              deletedAt: null,
            },
          },
        },
      },
    },
  });
  const importedByStepUid = new Map<
    string,
    {
      standardImportedCount: number;
      customImportedCount: number;
    }
  >();

  for (const inventory of importedInventories as Array<{
    sourceStepUid?: string | null;
    sourceCustom?: boolean | null;
  }>) {
    const stepUid = inventory.sourceStepUid || null;
    if (!stepUid) continue;
    const current = importedByStepUid.get(stepUid) || {
      standardImportedCount: 0,
      customImportedCount: 0,
    };
    if (inventory.sourceCustom) current.customImportedCount += 1;
    else current.standardImportedCount += 1;
    importedByStepUid.set(stepUid, current);
  }

  const staleCustomImported = (importedInventories as Array<{
    sourceStepUid?: string | null;
    sourceCustom?: boolean | null;
  }>).filter(
    (inventory) =>
      !!inventory.sourceCustom &&
      !!inventory.sourceStepUid &&
      scope.excludedStepUids.includes(inventory.sourceStepUid),
  ).length;

  function inventoryInfo(uid) {
    const i = inventoryCategories.find((a) => a.uid === uid);
    const imported = importedByStepUid.get(uid || "");
    return {
      categoryUid: i?.uid,
      totalInventories: i?._count?.inventories,
      importedStandardCount: imported?.standardImportedCount || 0,
      importedCustomCount: imported?.customImportedCount || 0,
    };
  }
  const response = {
    data: categories
      .map((c) => {
        const standardProducts = c.stepProducts.filter(
          (product) => !product.custom,
        ).length;
        const customProducts = c.stepProducts.filter((product) =>
          Boolean(product.custom),
        ).length;

        return {
          id: c.id,
          uid: c.uid,
          title: c.title,
          totalProducts: c._count?.stepProducts,
          standardProducts,
          customProducts,
          ...inventoryInfo(c.uid),
          subCategory: scope.dependencyStepUids.includes(c.uid || "")
            ? "dependency"
            : "configured",
          importCategoryId: c.id,
          inScope: scope.activeStepUids.includes(c.uid || ""),
          isDependencyOnly: scope.dependencyStepUids.includes(c.uid || ""),
          isStaleImported: scope.staleImportedCategoryUids.includes(c.uid || ""),
          scopeReason: (scope.reasonsByStepUid[c.uid || ""] || []).join(", "),
        };
      })
      .filter((row) => {
        if (!query) return true;
        return (
          String(row.title || "")
            .toLowerCase()
            .includes(query) ||
          String(row.uid || "")
            .toLowerCase()
            .includes(query) ||
          String(row.scopeReason || "")
            .toLowerCase()
            .includes(query)
        );
      })
      .sort((a, b) =>
        String(a.title || a.uid || "").localeCompare(
          String(b.title || b.uid || ""),
        ),
      ),
    meta: {
      scope: data.scope,
      totalRows: categories.length,
      activeSteps: scope.activeStepUids.length,
      dependencySteps: scope.dependencyStepUids.length,
      excludedSteps: scope.excludedStepUids.length,
      staleImportedCategories: scope.staleImportedCategoryUids.length,
      standardProducts: categories.reduce(
        (sum, category) =>
          sum + category.stepProducts.filter((product) => !product.custom).length,
        0,
      ),
      customProducts: categories.reduce(
        (sum, category) =>
          sum + category.stepProducts.filter((product) => Boolean(product.custom)).length,
        0,
      ),
      importedStandardProducts: Array.from(importedByStepUid.values()).reduce(
        (sum, row) => sum + row.standardImportedCount,
        0,
      ),
      importedCustomProducts: Array.from(importedByStepUid.values()).reduce(
        (sum, row) => sum + row.customImportedCount,
        0,
      ),
      staleCustomImported,
    },
  };
  return response;
}
