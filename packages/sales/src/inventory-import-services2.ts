import { Db, Prisma } from "@gnd/db";
import { nextId, RenturnTypeAsync } from "@gnd/utils";
import { StepComponentMeta, StepMeta } from "./types";

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
  // FIX #4 / #5 – stepId typed as number | null; all mutable state declared
  // explicitly so a re-entrant call resets cleanly.
  #state: ImportState = {
    stepId: null,
    tables: {} as Record<TableName, TableSlot>,
  };

  // These are reset at the top of importComponents before the awaits so a
  // partial failure on a prior call never leaks stale data (FIX #4).
  #stepData: RenturnTypeAsync<typeof this.initStepData> | null = null;
  #inventoryPreData: RenturnTypeAsync<typeof this.loadInventoryPreData> | null =
    null;

  // FIX #7 – guard against concurrent calls on the same instance
  #running = false;

  constructor(private readonly db: Db) {}

  // ─── Public API ─────────────────────────────────────────────────────────────

  public async importComponents(stepId: number): Promise<void> {
    // FIX #7 – reject concurrent invocations on the same instance
    if (this.#running) {
      throw new Error(
        "InventoryImportService: importComponents is already running. " +
          "Create a new instance for concurrent imports.",
      );
    }
    this.#running = true;

    try {
      // FIX #4 – reset ALL state before doing any async work
      this.#stepData = null;
      this.#inventoryPreData = null;
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

  // FIX #12 – deep-clone tables so nulling .table doesn't mutate live state
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
            uid: true,
            name: true,
            product: { select: { title: true, img: true } },
            door: { select: { title: true, img: true } },
          },
          where: { uid: { in: priceSystemComponentUids } },
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

    // FIX #6 – correct Width/Height conditional: include the title string only
    // when the corresponding uid list is NON-empty (was inverted with ||)
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

    const data = { inventories, componentUids, inventoryCategories };
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
        const v = {
          id: this.#nextId("inventoryCategoryVariantAttribute"),
          inventoryCategoryId: this.getCategoryId(uid)!,
          valuesInventoryCategoryId: this.getCategoryId(puid)!,
        } satisfies Prisma.InventoryCategoryVariantAttributeCreateManyInput;
        if (v.inventoryCategoryId && v.valuesInventoryCategoryId) {
          this.#addCreateData("inventoryCategoryVariantAttribute", v);
        }
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
        } satisfies Prisma.InventoryCreateManyInput);
      }

      if (component) {
        const inventoryCategoryId = this.getCategoryId(stepData.step.uid);
        this.#addCreateData("inventory", {
          uid,
          name: component.name!,
          inventoryCategoryId: inventoryCategoryId!,
          id: inventoryId,
        } satisfies Prisma.InventoryCreateManyInput);
        this.#prepareInventorySubCategories(
          uid,
          component.subCategoriesComponentsUid,
        );
      }
    }
  }

  // FIX #10 – made private (was public)
  #prepareInventorySubCategories(uid: string, depsUids: string[]) {
    const id = this.inventoryIdByUid(uid);
    for (const duid of depsUids) {
      const depId = this.inventoryIdByUid(duid);
      if (!depId) continue;
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

        // FIX #2 – .map (not .filter) to project to { price, date }
        const pricingEntries: PricingEntry[] = priceList.map((a) => ({
          price: a.price,
          date: a.createdAt,
        }));

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
      for (const partUid of variantUid.split("-")) {
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
        // FIX #3 – index into pricings[], not into p (the current entry)
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

    let id =
      this.#state.tables.inventoryCategoryVariantAttribute.createMany.find(
        (a: any) =>
          a.valuesInventoryCategoryId === valuesInventoryCategoryId &&
          a.inventoryCategoryId === inventoryCategoryId,
      ) as { id?: number } | undefined;

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

      let imgId: number | undefined = images.find((i) => i.path === img)?.id;
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
      if (imgId && inventoryId) {
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
          // FIX #8 – removed skipDuplicates so collisions surface as errors
          // rather than silently dropping rows
          const res = await (tx[tableName] as any).createMany({
            data: slot.createMany,
          });
          slot.tableResult = res;
          this.#log(tableName, "uploadStatus", "completed...");
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

  // FIX #10 – getCategoryId kept public as it's legitimately used by callers
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

  // FIX #1 – write into odata.logs[logKey], not odata[logKey]
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
