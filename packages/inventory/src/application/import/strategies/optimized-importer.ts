import { Db, Prisma } from "@gnd/db";
import { nextId, RenturnTypeAsync } from "@gnd/utils";
import { StepComponentMeta, StepMeta } from "../../../types";
import {
  parseDykeSupplierPricingKey,
  upsertImportedSupplierVariantPricing,
} from "../../suppliers/suppliers";

// ─── Table registry ───────────────────────────────────────────────────────────

type DbKeys = keyof Db;

export const TABLE_NAMES = [
  "inventoryCategory",
  "inventoryCategoryVariantAttribute",
  "inventory",
  "imageGallery",
  "imageGalleryTag",
  "inventoryImage",
  "inventoryItemSubCategory",
  "inventoryItemSubCategoryValue",
  "inventoryVariant",
  "inventoryVariantAttribute",
  "inventoryVariantPricing",
  "inventorySubCategory",
  "priceHistory",
] as const satisfies DbKeys[];

const TABLE_ID_NAMES = [
  "inventoryCategory",
  "inventoryCategoryVariantAttribute",
  "inventory",
  "inventoryItemSubCategory",
  "inventoryVariant",
  "imageGallery",
] as const satisfies DbKeys[];

type TableName = (typeof TABLE_NAMES)[number];
type TableIdNames = (typeof TABLE_ID_NAMES)[number];

// ─── Typed table slot ─────────────────────────────────────────────────────────

type TableSlot = {
  /** Only populated for tables in TABLE_ID_NAMES */
  nextId: number;
  createMany: unknown[];
  /** Prisma delegate reference — nulled out before returning result */
  table: unknown;
  tableResult?: { count: number };
  logs: Record<string, unknown>;
};

// ─── Internal state ───────────────────────────────────────────────────────────

interface ImportState {
  /** null until importComponents is called */
  stepId: number | null;
  error?: unknown;
  tables: Record<TableName, TableSlot>;
}

// ─── Normalised pricing entry used inside #generateInventoryVariants ──────────

interface PricingEntry {
  price?: number | null;
  date?: Date | string | null;
}

// ─────────────────────────────────────────────────────────────────────────────

export class InventoryImportService {
  // Fixed: state is fully declared and stepId is nullable so each run resets
  // cleanly without leaking partial state across calls.
  #state: ImportState = {
    stepId: null,
    tables: {} as Record<TableName, TableSlot>,
  };

  // Fixed: reset cached step/preload data before async work so a partial
  // failure on a prior call never leaks stale state into the next run.
  #stepData: RenturnTypeAsync<typeof this.initStepData> | null = null;
  #inventoryPreData: RenturnTypeAsync<typeof this.loadInventoryPreData> | null =
    null;

  // Fixed: guard against concurrent calls on the same importer instance.
  #running = false;
  #pendingSupplierVariantUpserts: Array<{
    supplierUid: string;
    inventoryVariantId: number;
    variantUid: string;
    pricingKey: string;
    size?: string | null;
    costPrice?: number | null;
  }> = [];

  constructor(private readonly db: Db) {}

  // ─── Public API ─────────────────────────────────────────────────────────────

  public async importComponents(stepId: number): Promise<void> {
    // Fixed: reject concurrent invocations on the same importer instance.
    if (this.#running) {
      throw new Error(
        "InventoryImportService: importComponents is already running. " +
          "Create a new instance for concurrent imports.",
      );
    }
    this.#running = true;

    try {
      // Fixed: reset all state before any awaited work begins.
      this.#stepData = null;
      this.#inventoryPreData = null;
      this.#pendingSupplierVariantUpserts = [];
      this.#state = {
        stepId,
        tables: {} as Record<TableName, TableSlot>,
      };

      await this.#initTables();
      this.#stepData = await this.initStepData();
      this.#inventoryPreData = await this.loadInventoryPreData();
      this.#prepareInventoryCategories();
      this.#prepareCategoryVariants();
      this.#prepareInventories();
      await this.#prepareImages();
      this.#variantPricings();
      await this.#saveData();
    } finally {
      this.#running = false;
    }
  }

  public get allStepsUids(): string[] {
    const stepData = this.#requireStepData();
    const stepsUids = [stepData.step.uid, ...stepData.stepsUid];
    return Array.from(new Set(stepsUids)).filter(Boolean) as string[];
  }

  // Fixed: deep-clone table metadata so result serialization does not mutate
  // the live importer state by nulling delegate references in place.
  public get result() {
    const clonedTables = Object.fromEntries(
      Object.entries(this.#state.tables).map(([key, slot]) => [
        key,
        { ...slot, table: null },
      ]),
    ) as Record<TableName, Omit<TableSlot, "table"> & { table: null }>;

    return {
      data: {
        ...this.#state,
        tables: clonedTables,
      },
      stepData: this.#stepData,
    };
  }

  // ─── Step data ───────────────────────────────────────────────────────────────

  public async initStepData() {
    const stepId = this.#state.stepId;
    if (stepId === null) throw new Error("stepId is not set");

    const step = await this.db.dykeSteps.findUniqueOrThrow({
      where: { id: stepId },
      select: {
        uid: true,
        title: true,
        meta: true,
        stepProducts: {
          where: {
            deletedAt: null,
            uid: { not: null },
            OR: [
              { name: { not: null } },
              { product: { title: { not: null } } },
            ],
          },
          select: {
            custom: true,
            product: { select: { title: true, img: true } },
            door: { select: { title: true, img: true } },
            meta: true,
            img: true,
            name: true,
            uid: true,
          },
        },
        priceSystem: {
          where: { deletedAt: null },
          select: {
            createdAt: true,
            stepProductUid: true,
            dependenciesUid: true,
            price: true,
            step: { select: { uid: true } },
          },
        },
      },
    });

    let widthUids: string[] = [];
    let heightUids: string[] = [];

    step.priceSystem = step.priceSystem.map((ps) => {
      if (!ps.dependenciesUid) ps.dependenciesUid = ps.stepProductUid;
      const str = ps.dependenciesUid!;
      // "2-4 x 8-0" → "w2_4-h8_0"
      if (/^\d+-\d+ x \d+-\d+$/.test(str)) {
        const [w, h] = str.replaceAll("-", "_").split(" x ");
        ps.dependenciesUid = `w${w}-h${h}`;
        widthUids.push(`w${w}`);
        heightUids.push(`h${h}`);
      }
      return ps;
    });

    const stepProducts = step.stepProducts.map((p) => ({
      ...p,
      uid:
        step.title === "Width"
          ? `w${p.name}`
          : step.title === "Height"
            ? `h${p.name}`
            : p.uid,
    }));

    const priceSystemComponentUids = Array.from(
      new Set(
        step.priceSystem
          .flatMap((p) => p.dependenciesUid?.split("-") ?? [])
          .filter(Boolean) as string[],
      ),
    );

    let components = stepProducts
      .map((product) => {
        const meta = product.meta as StepComponentMeta;
        const variations = meta?.variations;
        return {
          ...product,
          name: product.name || product?.product?.title || product?.door?.title,
          img: product.img || product?.product?.img || product?.door?.img,
          meta,
          subCategoriesComponentsUid:
            variations
              ?.flatMap((a) => a?.rules?.flatMap((r) => r?.componentsUid ?? []))
              ?.filter(Boolean) ?? [],
          subCategoriesStepUid:
            variations
              ?.flatMap((a) => a?.rules?.map((r) => r?.stepUid))
              ?.filter(Boolean) ?? [],
        };
      })
      .filter((a) => a?.name?.trim().length);

    // deduplicate by name (case-insensitive)
    components = components.filter(
      (a, i) =>
        components.findIndex(
          (e) => e.name?.toLowerCase() === a?.name?.toLowerCase(),
        ) === i,
    );

    const componentStepUids = components.flatMap((c) => c.subCategoriesStepUid);
    const psStepUids = step.priceSystem.map((c) => c.step?.uid);

    const priceDepsStepsWithComponents = await this.db.dykeSteps.findMany({
      where: {
        stepProducts: { some: { uid: { in: priceSystemComponentUids } } },
      },
          select: {
            uid: true,
            title: true,
            stepProducts: {
              select: {
                custom: true,
                uid: true,
                name: true,
                product: { select: { title: true, img: true } },
                door: { select: { title: true, img: true } },
              },
          where: { uid: { in: priceSystemComponentUids }, deletedAt: null },
        },
      },
    });

    const stepsUid = Array.from(
      new Set([
        ...componentStepUids,
        ...psStepUids,
        ...priceDepsStepsWithComponents.map((a) => a.uid),
      ]),
    )
      .filter(Boolean)
      .map((s) => s!);

    // Fixed: only include Width/Height title lookups when those dependency
    // uid lists are actually present.
    const sizeTitleFilter = [
      widthUids.length ? "Width" : null,
      heightUids.length ? "Height" : null,
    ].filter(Boolean) as string[];

    const depsSteps = await this.db.dykeSteps.findMany({
      where:
        sizeTitleFilter.length === 0
          ? { uid: { in: stepsUid } }
          : {
              OR: [
                { uid: { in: stepsUid } },
                { title: { in: sizeTitleFilter } },
              ],
            },
      distinct: "title",
      include: {
        stepProducts: {
          select: {
            custom: true,
            uid: true,
            name: true,
            product: { select: { title: true } },
            door: { select: { title: true } },
          },
          where: { deletedAt: null },
        },
      },
    });

    const widthStep = depsSteps.find((a) => a.title === "Width");
    const widthStepUid = widthStep?.uid;
    const heightStep = depsSteps.find((a) => a.title === "Height");
    const heightStepUid = heightStep?.uid;

    if (widthUids.length && widthStepUid) stepsUid.push(widthStepUid);
    if (heightUids.length && heightStepUid) stepsUid.push(heightStepUid);

    const depsComponentsList = depsSteps.flatMap((s) =>
      s.stepProducts.map((sp) => ({
        name: sp.name || sp.product?.title || sp?.door?.title,
        stepUid: s.uid,
        custom: !!sp.custom,
        uid:
          s.title === "Width"
            ? `w${sp.name?.replace("-", "_")}`
            : s.title === "Height"
              ? `h${sp.name?.replace("-", "_")}`
              : sp.uid,
      })),
    );

    const addSizes = (
      sizeStep: typeof widthStep,
      uids: string[],
      prefix: "w" | "h",
    ) => {
      if (!uids.length || !sizeStep) return;
      Array.from(new Set(uids))
        .filter((uid) => !sizeStep.stepProducts.find((a) => a.uid === uid))
        .forEach((uid) => {
          depsComponentsList.push({
            name: uid.replaceAll("_", "-").replace(prefix, ""),
            stepUid: sizeStep.uid!,
            custom: false,
            uid,
          });
        });
    };

    addSizes(widthStep, widthUids, "w");
    addSizes(heightStep, heightUids, "h");

    return {
      step,
      stepsUid,
      stepProducts: components,
      widthUids,
      heightUids,
      priceSystemComponentUids,
      widthStepUid,
      heightStepUid,
      depsComponentsList,
      depsSteps,
    };
  }

  // ─── Pre-data loader ─────────────────────────────────────────────────────────

  public async loadInventoryPreData() {
    const stepData = this.#requireStepData();
    const stepsUids = stepData.stepsUid;

    const inventoryCategories = await this.db.inventoryCategory.findMany({
      where: { uid: { in: stepsUids } },
      select: { uid: true, title: true, id: true },
    });

    const stepProdUids = stepData.stepProducts.map((a) => a.uid);
    const componentUids = Array.from(
      new Set(
        [
          ...stepData.depsComponentsList.map((a) => a.uid),
          ...stepProdUids,
        ].filter(Boolean) as string[],
      ),
    );

    const inventories = await this.db.inventory.findMany({
      where: { uid: { in: componentUids } },
      select: {
        id: true,
        uid: true,
        inventoryCategoryId: true,
        variants: {
          select: {
            id: true,
            uid: true,
            attributes: {
              select: { id: true, valueId: true, inventoryVariantId: true },
            },
          },
        },
      },
    });

    const inventoryIds = inventories.map((inventory) => inventory.id);

    const inventoryCategoryVariantAttributes =
      await this.db.inventoryCategoryVariantAttribute.findMany({
        where: {
          OR: [
            {
              inventoryCategoryId: {
                in: inventoryCategories.map((category) => category.id),
              },
            },
            {
              valuesInventoryCategoryId: {
                in: inventoryCategories.map((category) => category.id),
              },
            },
          ],
        },
        select: {
          id: true,
          inventoryCategoryId: true,
          valuesInventoryCategoryId: true,
        },
      });

    const inventoryItemSubCategories =
      inventoryIds.length === 0
        ? []
        : await this.db.inventoryItemSubCategory.findMany({
            where: {
              inventoryId: { in: inventoryIds },
              deletedAt: null,
            },
            select: {
              inventoryId: true,
              value: {
                select: {
                  inventoryId: true,
                },
              },
            },
          });

    const inventoryImages =
      inventoryIds.length === 0
        ? []
        : await this.db.inventoryImage.findMany({
            where: {
              inventoryId: { in: inventoryIds },
              deletedAt: null,
            },
            select: {
              inventoryId: true,
              imageGalleryId: true,
            },
          });

    const data = {
      inventories,
      componentUids,
      inventoryCategories,
      inventoryCategoryVariantAttributes,
      inventoryItemSubCategories,
      inventoryImages,
      suppliers: await this.db.supplier.findMany({
        where: {
          deletedAt: null,
          uid: {
            not: null,
          },
        },
        select: {
          id: true,
          uid: true,
        },
      }),
    };
    (this.#state as any as Record<string, unknown>).inventoryLoadedData = data;
    return data;
  }

  // ─── Category / variant attribute preparation ────────────────────────────────

  #prepareInventoryCategories() {
    const stepData = this.#requireStepData();
    const stepsUids = this.allStepsUids;
    const missingUids = stepsUids.filter((u) =>
      this.#inventoryCategories.every((ic) => ic.uid !== u),
    );
    for (const uid of missingUids) {
      const stepTitle =
        uid === stepData.step.uid
          ? stepData.step.title
          : stepData.depsSteps.find((a) => a.uid === uid)?.title;
      if (stepTitle) {
        this.#addCreateData("inventoryCategory", {
          id: this.#nextId("inventoryCategory"),
          uid,
          title: stepTitle,
          type: "component",
        } satisfies Prisma.InventoryCategoryCreateManyInput);
      }
    }
  }

  #prepareCategoryVariants() {
    const stepData = this.#requireStepData();
    for (const sp of [stepData.step, ...stepData.depsSteps]) {
      const meta = sp?.meta as StepMeta;
      const priceDependencies = meta?.priceStepDeps ?? [];
      const uid = sp?.uid;
      if (!priceDependencies.length) continue;
      for (const puid of priceDependencies) {
        const inventoryCategoryId = this.getCategoryId(uid);
        const valuesInventoryCategoryId = this.getCategoryId(puid);
        if (!inventoryCategoryId || !valuesInventoryCategoryId) continue;
        this.#ensureInventoryCategoryVariantAttributeId(
          inventoryCategoryId,
          valuesInventoryCategoryId,
        );
      }
    }
  }

  // ─── Inventory preparation ───────────────────────────────────────────────────

  #prepareInventories() {
    const preData = this.#requirePreData();
    const stepData = this.#requireStepData();

    for (const uid of preData.componentUids) {
      const component = stepData.stepProducts.find((a) => a.uid === uid);
      const depComponent = stepData.depsComponentsList.find(
        (a) => a.uid === uid,
      );
      if (!depComponent && !component) continue;

      // already exists — only need to wire sub-categories for main components
      if (preData.inventories.find((i) => i.uid === uid)) {
        if (component) {
          this.#prepareInventorySubCategories(
            uid,
            component.subCategoriesComponentsUid,
          );
        }
        continue;
      }

      const inventoryId = this.#nextId("inventory");

      if (depComponent && !component) {
        const inventoryCategoryId = this.getCategoryId(depComponent.stepUid);
        this.#addCreateData("inventory", {
          uid,
          name: depComponent.name!,
          inventoryCategoryId: inventoryCategoryId!,
          id: inventoryId,
          productKind: "component",
          sourceStepUid: depComponent.stepUid,
          sourceComponentUid: uid,
          sourceCustom: !!depComponent.custom,
        } satisfies Prisma.InventoryCreateManyInput);
      }

      if (component) {
        const inventoryCategoryId = this.getCategoryId(stepData.step.uid);
        const hasMeaningfulPrice = stepData.step.priceSystem.some(
          (pricing) =>
            pricing.stepProductUid === uid && Number(pricing.price || 0) > 0,
        );
        this.#addCreateData("inventory", {
          uid,
          name: component.name!,
          inventoryCategoryId: inventoryCategoryId!,
          id: inventoryId,
          productKind: hasMeaningfulPrice ? "inventory" : "component",
          sourceStepUid: stepData.step.uid,
          sourceComponentUid: uid,
          sourceCustom: !!component.custom,
        } satisfies Prisma.InventoryCreateManyInput);
        this.#prepareInventorySubCategories(
          uid,
          component.subCategoriesComponentsUid,
        );
      }
    }
  }

  // Fixed: keep this helper private; external callers should use the public
  // lookup helpers instead of mutating subcategory generation indirectly.
  #prepareInventorySubCategories(uid: string, depsUids: string[]) {
    const id = this.inventoryIdByUid(uid);
    for (const duid of depsUids) {
      const depId = this.inventoryIdByUid(duid);
      if (!id || !depId || this.#hasInventorySubCategoryLink(id, depId)) continue;
      const itemSubCategory = this.#addCreateData("inventoryItemSubCategory", {
        inventoryId: id!,
        id: this.#nextId("inventoryItemSubCategory"),
      } satisfies Prisma.InventoryItemSubCategoryCreateManyInput);
      this.#addCreateData("inventoryItemSubCategoryValue", {
        inventoryId: depId,
        subCategoryId: (itemSubCategory as { id: number }).id,
      } satisfies Prisma.InventoryItemSubCategoryValueCreateManyInput);
    }
  }

  // ─── Variant & pricing preparation ──────────────────────────────────────────

  #variantPricings() {
    const preData = this.#requirePreData();
    const stepData = this.#requireStepData();
    const supplierUids = preData.suppliers.map((supplier) => supplier.uid);

    for (const uid of preData.componentUids) {
      const component = stepData.stepProducts.find((a) => a.uid === uid);
      if (!component) continue;

      const pricings = stepData.step.priceSystem.filter(
        (p) => p.stepProductUid === uid,
      );

      for (let di = 0; di < pricings.length; di++) {
        const m = pricings[di]!;
        // skip duplicate dependenciesUid groups — only process the first occurrence
        if (
          pricings.findIndex((a) => a.dependenciesUid === m.dependenciesUid) !==
          di
        )
          continue;

        const priceList = pricings.filter(
          (a) => a.dependenciesUid === m.dependenciesUid,
        );

        // Fixed: project pricing history entries with .map so price/date are
        // preserved instead of accidentally filtering values out.
        const pricingEntries: PricingEntry[] = priceList.map((a) => ({
          price: a.price,
          date: a.createdAt,
        }));

        const supplierPricing = parseDykeSupplierPricingKey(
          m.dependenciesUid!,
          supplierUids,
        );
        if (supplierPricing?.supplierUid) {
          const normalizedVariantUid = supplierPricing.variantUid || uid;
          this.#generateInventoryVariants(uid, normalizedVariantUid, []);
          const inventoryVariantId = this.#inventoryVariantIdByUid(
            uid,
            normalizedVariantUid,
          );
          const latestPrice = pricingEntries.at(-1)?.price;
          if (inventoryVariantId && latestPrice != null) {
            this.#pendingSupplierVariantUpserts.push({
              supplierUid: supplierPricing.supplierUid,
              inventoryVariantId,
              variantUid: normalizedVariantUid,
              pricingKey: supplierPricing.pricingKey,
              size: supplierPricing.size,
              costPrice: latestPrice,
            });
          }
          continue;
        }

        this.#generateInventoryVariants(
          uid,
          m.dependenciesUid!,
          pricingEntries,
        );
      }
    }
  }

  #getVariant(uid: string, variantUid: string) {
    return this.#inventories
      .find((i) => i.uid === uid)
      ?.variants?.find((v) => v.uid === variantUid);
  }

  #generateInventoryVariants(
    uid: string,
    variantUid: string,
    pricings: PricingEntry[],
  ) {
    const oldVariant = this.#getVariant(uid, variantUid);
    const inventoryId = this.inventoryIdByUid(uid);
    if (oldVariant) return;

    const inventoryVariantId = this.#nextId("inventoryVariant");
    this.#addCreateData("inventoryVariant", {
      inventoryId: inventoryId!,
      uid: variantUid,
      id: inventoryVariantId,
    } satisfies Prisma.InventoryVariantCreateManyInput);

    // compound variantUid ("uid1-uid2") encodes the attribute combination
    if (variantUid !== uid && variantUid) {
      const seenAttributeUids = new Set<string>();
      for (const partUid of variantUid.split("-")) {
        if (!partUid || seenAttributeUids.has(partUid)) continue;
        seenAttributeUids.add(partUid);
        const valueInventoryId = this.inventoryIdByUid(partUid);
        const { id: inventoryCategoryVariantAttributeId, ...rest } =
          this.#getInventoryCategoryVariantAttributeId(
            inventoryId,
            valueInventoryId,
          );

        if (!valueInventoryId) {
          this.#log(
            "inventoryVariantAttribute",
            `${partUid} inventory`,
            "inventory not found!",
          );
        }
        if (!inventoryCategoryVariantAttributeId) {
          this.#log(
            "inventoryVariantAttribute",
            `i${inventoryId}-v${valueInventoryId} attribute`,
            rest,
          );
        }

        this.#addCreateData("inventoryVariantAttribute", {
          inventoryVariantId,
          valueId: valueInventoryId,
          inventoryCategoryVariantAttributeId,
        } satisfies Prisma.InventoryVariantAttributeCreateManyInput);
      }
    }

    for (let pi = 0; pi < pricings.length; pi++) {
      const p = pricings[pi]!;

      // only the last entry becomes the live pricing record
      if (pi === pricings.length - 1) {
        this.#addCreateData("inventoryVariantPricing", {
          costPrice: p.price,
          inventoryId,
          inventoryVariantId,
        } satisfies Prisma.InventoryVariantPricingCreateManyInput);
      }

      this.#addCreateData("priceHistory", {
        inventoryVariantId,
        newCostPrice: p.price,
        oldCostPrice: pricings[pi - 1]?.price,
        effectiveFrom: p.date!,
        // Fixed: compute the next effective date from the pricing array, not
        // from the current pricing entry object.
        effectiveTo: pricings[pi + 1]?.date,
      } satisfies Prisma.PriceHistoryCreateManyInput);
    }
  }

  #getInventoryCategoryVariantAttributeId(
    inventoryId: number | undefined,
    attributeInventoryId: number | undefined,
  ) {
    const inventoryCategoryId =
      this.#inventoryCategoryIdByInventoryId(inventoryId);
    const valuesInventoryCategoryId =
      this.#inventoryCategoryIdByInventoryId(attributeInventoryId);

    return this.#ensureInventoryCategoryVariantAttributeId(
      inventoryCategoryId,
      valuesInventoryCategoryId,
    );
  }

  #ensureInventoryCategoryVariantAttributeId(
    inventoryCategoryId: number | undefined,
    valuesInventoryCategoryId: number | undefined,
  ) {

    let id =
      this.#requirePreData().inventoryCategoryVariantAttributes.find(
        (a) =>
          a.valuesInventoryCategoryId === valuesInventoryCategoryId &&
          a.inventoryCategoryId === inventoryCategoryId,
      ) ??
      (this.#state.tables.inventoryCategoryVariantAttribute.createMany.find(
        (a: any) =>
          a.valuesInventoryCategoryId === valuesInventoryCategoryId &&
          a.inventoryCategoryId === inventoryCategoryId,
      ) as { id?: number } | undefined);

    if (!id?.id && inventoryCategoryId && valuesInventoryCategoryId) {
      const created = this.#addCreateData("inventoryCategoryVariantAttribute", {
        id: this.#nextId("inventoryCategoryVariantAttribute"),
        inventoryCategoryId,
        valuesInventoryCategoryId,
      } satisfies Prisma.InventoryCategoryVariantAttributeCreateManyInput);
      return {
        id: (created as { id: number }).id,
        inventoryCategoryId,
        valuesInventoryCategoryId,
      };
    }

    return { id: id?.id, inventoryCategoryId, valuesInventoryCategoryId };
  }

  // ─── Images ──────────────────────────────────────────────────────────────────

  async #prepareImages() {
    const images = await this.db.imageGallery.findMany({
      select: { id: true, name: true, path: true, tags: true, provider: true },
    });

    const preData = this.#requirePreData();
    const stepData = this.#requireStepData();

    for (const uid of preData.componentUids) {
      const component = stepData.stepProducts.find((a) => a.uid === uid);
      if (!component) continue;
      const img = component.img;
      if (!img) continue;

      let imgId: number | undefined =
        images.find((i) => i.path === img)?.id ??
        (
          this.#state.tables.imageGallery.createMany.find(
            (gallery: any) => gallery.path === img,
          ) as { id?: number } | undefined
        )?.id;
      if (!imgId) {
        imgId = (
          this.#addCreateData("imageGallery", {
            id: this.#nextId("imageGallery"),
            path: img,
            bucket: "dyke",
            name: component.name!,
            provider: "cloudinary",
          } satisfies Prisma.ImageGalleryCreateManyInput) as { id: number }
        ).id;
      }

      const inventoryId = this.inventoryIdByUid(uid);
      if (
        imgId &&
        inventoryId &&
        !this.#hasInventoryImageLink(inventoryId, imgId)
      ) {
        this.#addCreateData("inventoryImage", {
          imageGalleryId: imgId,
          inventoryId,
          primary: true,
        } satisfies Prisma.InventoryImageCreateManyInput);
      }

      this.#log("inventoryImage", img, { inventoryId, imgId });
    }
  }

  // ─── Persist ─────────────────────────────────────────────────────────────────

  async #saveData() {
    try {
      await this.db.$transaction(async (tx) => {
        for (const tableName of TABLE_NAMES) {
          const slot = this.#state.tables[tableName];
          if (!slot?.createMany.length) continue;

          this.#log(tableName, "uploadStatus", "starting...");
          // Fixed: do not use skipDuplicates here. Collisions should surface so
          // the importer can be hardened explicitly instead of silently losing rows.
          const res = await (tx[tableName] as any).createMany({
            data: slot.createMany,
          });
          slot.tableResult = res;
          this.#log(tableName, "uploadStatus", "completed...");
        }

        if (this.#pendingSupplierVariantUpserts.length) {
          await upsertImportedSupplierVariantPricing(
            tx as unknown as Pick<Db, "supplier" | "supplierVariant">,
            this.#pendingSupplierVariantUpserts,
          );
        }
      });
    } catch (error) {
      this.#state.error = error;
      throw error; // re-throw so callers know the import failed
    }
  }

  // ─── Table initialisation ────────────────────────────────────────────────────

  async #initTables() {
    await Promise.all(
      TABLE_NAMES.map(async (name) => {
        this.#state.tables[name] = {
          nextId: TABLE_ID_NAMES.includes(name as TableIdNames)
            ? await nextId(this.db[name])
            : (undefined as unknown as number),
          createMany: [],
          table: this.db[name],
          logs: {},
        };
      }),
    );
  }

  // ─── Lookup helpers ──────────────────────────────────────────────────────────

  // Fixed: this stays public because callers outside the internal prep helpers
  // legitimately use it to resolve category ids by uid.
  public getCategoryId(uid: string | undefined | null): number | undefined {
    if (!uid) return undefined;
    return (
      this.#inventoryCategories.find((c) => c.uid === uid)?.id ??
      (
        this.#state.tables.inventoryCategory.createMany.find(
          (s: any) => s.uid === uid,
        ) as { id?: number } | undefined
      )?.id
    );
  }

  public inventoryIdByUid(uid: string | undefined | null): number | undefined {
    if (!uid) return undefined;
    return this.#allInventories.find((a) => a.uid === uid)?.id;
  }

  #inventoryVariantIdByUid(
    inventoryUid: string,
    variantUid: string,
  ): number | undefined {
    const existingInventory = this.#requirePreData().inventories.find(
      (inventory) => inventory.uid === inventoryUid,
    );
    const existingVariant = existingInventory?.variants.find(
      (variant) => variant.uid === variantUid,
    );
    if (existingVariant?.id) return existingVariant.id;

    const inventoryId = this.inventoryIdByUid(inventoryUid);
    const pendingVariant = (
      this.#state.tables.inventoryVariant.createMany as Array<{
        id?: number;
        inventoryId?: number;
        uid?: string;
      }>
    ).find(
      (variant) =>
        variant.inventoryId === inventoryId && variant.uid === variantUid,
    );
    return pendingVariant?.id;
  }

  #inventoryCategoryIdByInventoryId(
    id: number | undefined,
  ): number | undefined {
    if (id === undefined) return undefined;
    return this.#allInventories.find((a) => a.id === id)?.inventoryCategoryId;
  }

  #inventoryCategoryIdByInventoryUid(
    uid: string | undefined,
  ): number | undefined {
    if (!uid) return undefined;
    return this.#allInventories.find((a) => a.uid === uid)?.inventoryCategoryId;
  }

  #hasInventorySubCategoryLink(inventoryId: number, valueInventoryId: number) {
    const existing = this.#requirePreData().inventoryItemSubCategories.some(
      (subCategory) =>
        subCategory.inventoryId === inventoryId &&
        subCategory.value?.inventoryId === valueInventoryId,
    );

    if (existing) return true;

    const pendingSubCategories =
      this.#state.tables.inventoryItemSubCategory.createMany as Array<{
        id: number;
        inventoryId?: number;
      }>;
    const pendingValues =
      this.#state.tables.inventoryItemSubCategoryValue.createMany as Array<{
        subCategoryId?: number;
        inventoryId?: number;
      }>;

    return pendingSubCategories.some((subCategory) => {
      if (subCategory.inventoryId !== inventoryId) return false;
      return pendingValues.some(
        (value) =>
          value.subCategoryId === subCategory.id &&
          value.inventoryId === valueInventoryId,
      );
    });
  }

  #hasInventoryImageLink(inventoryId: number, imageGalleryId: number) {
    const existing = this.#requirePreData().inventoryImages.some(
      (image) =>
        image.inventoryId === inventoryId &&
        image.imageGalleryId === imageGalleryId,
    );

    if (existing) return true;

    return (
      this.#state.tables.inventoryImage.createMany as Array<{
        inventoryId?: number;
        imageGalleryId?: number;
      }>
    ).some(
      (image) =>
        image.inventoryId === inventoryId &&
        image.imageGalleryId === imageGalleryId,
    );
  }

  /** Merges DB-loaded inventories with in-flight createMany entries */
  get #allInventories() {
    return [
      ...this.#inventories,
      ...(this.#state.tables.inventory?.createMany ?? []),
    ] as Array<{ id: number; uid: string; inventoryCategoryId: number }>;
  }

  get #inventoryCategories() {
    return this.#requirePreData().inventoryCategories;
  }

  get #inventories() {
    return this.#requirePreData().inventories;
  }

  // ─── Guard helpers ───────────────────────────────────────────────────────────

  #requireStepData() {
    if (!this.#stepData) throw new Error("stepData not initialised");
    return this.#stepData;
  }

  #requirePreData() {
    if (!this.#inventoryPreData)
      throw new Error("inventoryPreData not initialised");
    return this.#inventoryPreData;
  }

  // ─── Logging ─────────────────────────────────────────────────────────────────

  // Fixed: write log entries into slot.logs[logKey] so log state stays scoped
  // to the table slot instead of mutating the slot object shape directly.
  #log(table: TableName, logKey: string, logValue: unknown) {
    const slot = this.#state.tables[table];
    if (!slot) return;
    if (!slot.logs) slot.logs = {};
    slot.logs[logKey] = logValue;
  }

  // ─── ID counter ──────────────────────────────────────────────────────────────

  #nextId(tableName: TableIdNames): number {
    return this.#state.tables[tableName].nextId++;
  }

  // ─── Typed createMany push ───────────────────────────────────────────────────

  #addCreateData<T extends object>(table: TableName, data: T): T {
    this.#state.tables[table].createMany.push(data);
    return data;
  }
}
