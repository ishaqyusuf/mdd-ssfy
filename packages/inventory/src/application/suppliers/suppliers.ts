import type { Db } from "@gnd/db";

type SupplierVariantLike = {
  supplierUid?: string | null;
  variantUid?: string | null;
  meta?: {
    size?: string | null;
    pricingKey?: string | null;
  } | null;
  inventoryVariant?: {
    uid?: string | null;
  } | null;
  supplier?: {
    uid?: string | null;
  } | null;
  costPrice?: number | null;
  salesPrice?: number | null;
  preferred?: boolean | null;
  active?: boolean | null;
};

export function buildLegacyDoorSupplierPricingKeys(input: {
  supplierUid?: string | null;
  size?: string | null;
  depValues?: Array<string | null | undefined>;
}) {
  const supplierUid = String(input.supplierUid || "").trim();
  const size = String(input.size || "").trim();
  const depValues = (input.depValues || [])
    .map((value) => String(value || "").trim())
    .filter(Boolean);

  const keys = new Set<string>();

  if (supplierUid && size) {
    keys.add(`${size} & ${supplierUid}`);
    keys.add(`${supplierUid}-${size}`);
    keys.add(`${size}-${supplierUid}`);
  }

  if (supplierUid) {
    keys.add(supplierUid);
  }

  if (supplierUid && depValues.length) {
    keys.add([supplierUid, ...depValues].join("-"));
    keys.add([...depValues, supplierUid].join("-"));
  }

  return Array.from(keys);
}

export function resolveSupplierVariantPricing(input: {
  supplierUid?: string | null;
  size?: string | null;
  supplierVariants?: Array<SupplierVariantLike | null | undefined> | null;
}) {
  const supplierUid = String(input.supplierUid || "").trim();
  if (!supplierUid) return null;
  const size = String(input.size || "").trim();

  const variants = (input.supplierVariants || []).filter(
    (variant): variant is SupplierVariantLike =>
      Boolean(variant) && variant?.active !== false,
  );

  const matchedBySize = variants.find((variant) => {
    const directUid = String(variant?.supplierUid || "").trim();
    const nestedUid = String(variant?.supplier?.uid || "").trim();
    if (directUid !== supplierUid && nestedUid !== supplierUid) return false;
    if (!size) return true;

    const variantUid = String(
      variant?.variantUid || variant?.inventoryVariant?.uid || "",
    ).trim();
    const metaSize = String(variant?.meta?.size || "").trim();
    const pricingKey = String(variant?.meta?.pricingKey || "").trim();

    return (
      metaSize === size ||
      variantUid === size ||
      pricingKey.includes(size)
    );
  });
  const matched =
    matchedBySize ||
    variants.find((variant) => {
      const directUid = String(variant?.supplierUid || "").trim();
      const nestedUid = String(variant?.supplier?.uid || "").trim();
      return directUid === supplierUid || nestedUid === supplierUid;
    });

  if (!matched) return null;

  return {
    supplierUid,
    size: size || null,
    costPrice:
      matched.costPrice == null ? null : Number(matched.costPrice || 0),
    salesPrice:
      matched.salesPrice == null ? null : Number(matched.salesPrice || 0),
    preferred: Boolean(matched.preferred),
  };
}

export function parseDykeSupplierPricingKey(
  rawKey: string | null | undefined,
  supplierUids: Array<string | null | undefined>,
) {
  const pricingKey = String(rawKey || "").trim();
  if (!pricingKey) return null;

  const uniqueSupplierUids = Array.from(
    new Set(
      supplierUids
        .map((value) => String(value || "").trim())
        .filter(Boolean),
    ),
  ).sort((a, b) => b.length - a.length);

  for (const supplierUid of uniqueSupplierUids) {
    if (pricingKey === supplierUid) {
      return {
        supplierUid,
        variantUid: "",
        size: null,
        pricingKey,
      };
    }

    const suffix = ` & ${supplierUid}`;
    if (pricingKey.endsWith(suffix)) {
      const variantUid = pricingKey.slice(0, -suffix.length).trim();
      return {
        supplierUid,
        variantUid,
        size: variantUid.includes("x") ? variantUid : null,
        pricingKey,
      };
    }

    const prefix = `${supplierUid}-`;
    if (pricingKey.startsWith(prefix)) {
      const variantUid = pricingKey.slice(prefix.length).trim();
      return {
        supplierUid,
        variantUid,
        size: variantUid.includes("x") ? variantUid : null,
        pricingKey,
      };
    }

    const postfix = `-${supplierUid}`;
    if (pricingKey.endsWith(postfix)) {
      const variantUid = pricingKey.slice(0, -postfix.length).trim();
      return {
        supplierUid,
        variantUid,
        size: variantUid.includes("x") ? variantUid : null,
        pricingKey,
      };
    }
  }

  return null;
}

type ImportedSupplierVariantPrice = {
  supplierUid: string;
  inventoryVariantId: number;
  variantUid?: string | null;
  pricingKey?: string | null;
  size?: string | null;
  costPrice?: number | null;
  salesPrice?: number | null;
  supplierSku?: string | null;
  preferred?: boolean | null;
  active?: boolean | null;
};

export async function upsertImportedSupplierVariantPricing(
  db: Pick<Db, "supplier" | "supplierVariant">,
  rows: ImportedSupplierVariantPrice[],
) {
  if (!rows.length) return { upserted: 0, unmatched: [] as string[] };

  const supplierUids = Array.from(new Set(rows.map((row) => row.supplierUid)));
  const suppliers = await db.supplier.findMany({
    where: {
      uid: { in: supplierUids },
      deletedAt: null,
    },
    select: {
      id: true,
      uid: true,
    },
  });

  const supplierByUid = new Map(
    suppliers.map((supplier) => [String(supplier.uid || "").trim(), supplier]),
  );

  let upserted = 0;
  const unmatched = new Set<string>();

  for (const row of rows) {
    const supplier = supplierByUid.get(String(row.supplierUid || "").trim());
    if (!supplier?.id) {
      unmatched.add(row.supplierUid);
      continue;
    }

    await db.supplierVariant.upsert({
      where: {
        supplierId_inventoryVariantId: {
          supplierId: supplier.id,
          inventoryVariantId: row.inventoryVariantId,
        },
      },
      update: {
        supplierSku: row.supplierSku ?? null,
        costPrice: row.costPrice ?? null,
        salesPrice: row.salesPrice ?? null,
        preferred: row.preferred ?? false,
        active: row.active ?? true,
        deletedAt: null,
        meta: {
          supplierUid: row.supplierUid,
          pricingKey: row.pricingKey ?? null,
          size: row.size ?? null,
          variantUid: row.variantUid ?? null,
          source: "dyke-import",
        },
      },
      create: {
        supplierId: supplier.id,
        inventoryVariantId: row.inventoryVariantId,
        supplierSku: row.supplierSku ?? null,
        costPrice: row.costPrice ?? null,
        salesPrice: row.salesPrice ?? null,
        preferred: row.preferred ?? false,
        active: row.active ?? true,
        meta: {
          supplierUid: row.supplierUid,
          pricingKey: row.pricingKey ?? null,
          size: row.size ?? null,
          variantUid: row.variantUid ?? null,
          source: "dyke-import",
        },
      },
    });

    upserted += 1;
  }

  return {
    upserted,
    unmatched: Array.from(unmatched),
  };
}

export async function syncInventorySuppliersFromDyke(db: Db) {
  const supplierStep = await db.dykeSteps.findFirst({
    where: {
      title: "Supplier",
    },
    select: {
      stepProducts: {
        where: {
          deletedAt: null,
        },
        select: {
          uid: true,
          name: true,
        },
      },
    },
  });

  const stepProducts = supplierStep?.stepProducts || [];
  const synced: Array<{ id: number; uid: string | null; name: string }> = [];

  for (const product of stepProducts) {
    const uid = String(product.uid || "").trim() || null;
    const name = String(product.name || "").trim();
    if (!name) continue;

    const existing = uid
      ? await db.supplier.findFirst({
          where: {
            OR: [{ uid }, { name }],
            deletedAt: null,
          },
          select: {
            id: true,
          },
        })
      : await db.supplier.findFirst({
          where: {
            name,
            deletedAt: null,
          },
          select: {
            id: true,
          },
        });

    const supplier = existing
      ? await db.supplier.update({
          where: {
            id: existing.id,
          },
          data: {
            uid: uid ?? undefined,
            name,
            deletedAt: null,
          },
          select: {
            id: true,
            uid: true,
            name: true,
          },
        })
      : await db.supplier.create({
          data: {
            uid,
            name,
          },
          select: {
            id: true,
            uid: true,
            name: true,
          },
        });

    synced.push(supplier);
  }

  return synced;
}

export async function inventorySupplierDykeReview(db: Db) {
  const dykeSuppliers = await db.dykeSteps.findFirst({
    where: {
      title: "Supplier",
      deletedAt: null,
    },
    select: {
      stepProducts: {
        where: {
          deletedAt: null,
        },
        select: {
          id: true,
          uid: true,
          name: true,
        },
        orderBy: {
          name: "asc",
        },
      },
    },
  });

  const suppliers = await db.supplier.findMany({
    where: {
      deletedAt: null,
    },
    select: {
      id: true,
      uid: true,
      name: true,
    },
    orderBy: {
      name: "asc",
    },
  });

  return (dykeSuppliers?.stepProducts || []).map((dykeSupplier) => {
    const uid = String(dykeSupplier.uid || "").trim();
    const name = String(dykeSupplier.name || "").trim();
    const matched =
      suppliers.find((supplier) => String(supplier.uid || "").trim() === uid) ||
      suppliers.find(
        (supplier) =>
          String(supplier.name || "").trim().toLowerCase() ===
          name.toLowerCase(),
      ) ||
      null;

    return {
      dykeSupplierId: dykeSupplier.id,
      dykeUid: uid || null,
      dykeName: name || null,
      supplierId: matched?.id ?? null,
      supplierUid: matched?.uid ?? null,
      supplierName: matched?.name ?? null,
      matched: Boolean(matched?.id),
    };
  });
}
