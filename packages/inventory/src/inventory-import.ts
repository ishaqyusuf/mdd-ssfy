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
    },
    orderBy: {
      title: "asc",
    },
  });
  const inventories = await db.inventoryCategory.findMany({
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
  function inventoryInfo(uid) {
    const i = inventories.find((a) => a.uid === uid);
    return {
      categoryUid: i?.uid,
      totalInventories: i?._count?.inventories,
    };
  }
  const response = {
    data: categories
      .map((c) => ({
        id: c.id,
        uid: c.uid,
        title: c.title,
        totalProducts: c._count?.stepProducts,
        ...inventoryInfo(c.uid),
        subCategory: scope.dependencyStepUids.includes(c.uid || "")
          ? "dependency"
          : "configured",
        importCategoryId: c.id,
        inScope: scope.activeStepUids.includes(c.uid || ""),
        isDependencyOnly: scope.dependencyStepUids.includes(c.uid || ""),
        isStaleImported: scope.staleImportedCategoryUids.includes(c.uid || ""),
        scopeReason: (scope.reasonsByStepUid[c.uid || ""] || []).join(", "),
      }))
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
    },
  };
  return response;
}
