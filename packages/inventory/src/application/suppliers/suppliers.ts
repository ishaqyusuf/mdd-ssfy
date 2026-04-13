import type { Db } from "@gnd/db";

type SupplierVariantLike = {
  supplierUid?: string | null;
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
  supplierVariants?: Array<SupplierVariantLike | null | undefined> | null;
}) {
  const supplierUid = String(input.supplierUid || "").trim();
  if (!supplierUid) return null;

  const variants = (input.supplierVariants || []).filter(
    (variant): variant is SupplierVariantLike =>
      Boolean(variant) && variant?.active !== false,
  );

  const matched = variants.find((variant) => {
    const directUid = String(variant?.supplierUid || "").trim();
    const nestedUid = String(variant?.supplier?.uid || "").trim();
    return directUid === supplierUid || nestedUid === supplierUid;
  });

  if (!matched) return null;

  return {
    supplierUid,
    costPrice:
      matched.costPrice == null ? null : Number(matched.costPrice || 0),
    salesPrice:
      matched.salesPrice == null ? null : Number(matched.salesPrice || 0),
    preferred: Boolean(matched.preferred),
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
