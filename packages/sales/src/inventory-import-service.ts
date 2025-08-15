import { db, Db, Prisma } from "@gnd/db";
import { nextId, RenturnTypeAsync } from "@gnd/utils";
import { StepComponentMeta, StepMeta } from "./types";

interface Data {
  stepId: null;
  error?;
  tables: {
    [key in TableName]: {
      nextId: number;
      createMany: any[];
      table;
      tableResult?: any;
      logs?: any;
    };
  };
}
type DbKeys = keyof Db;
const TABLE_NAMES = [
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
// type tableNames = "" satisfies ;
export class InventoryImportService {
  #data: Data = {
    stepId: null,
    tables: {} as any,
    // tableResults: {}
  };
  constructor(public db: Db) {}
  public async importComponents(stepId) {
    this.#data.stepId = stepId;
    this.#data.tables = {} as any;
    await this.#initTables();
    this.#stepData = await this.initStepData();
    this.#inventoryPreData = await this.loadInventoryPreData();
    this.#prepareInventoryCategories();
    this.#prepareCategoryVariants();
    this.#prepareInventories();
    await this.#prepareImages();
    this.#variantPricings();
    await this.#saveData();
  }
  async #saveData() {
    // let workingTable;
    try {
      await this.db.$transaction(async (tx) => {
        for (const v of TABLE_NAMES) {
          const createManyData = this.#data.tables[v]?.createMany;
          if (createManyData?.length) {
            this.#log(v, "uploadStatus", "starting...");
            const res = await (tx[v] as any).createMany({
              data: createManyData,
              skipDuplicates: true,
            });
            this.#data.tables[v].tableResult = res;
            this.#log(v, "uploadStatus", "completed...");
          }
        }
        // throw new Error("QUIT!!!");
      });
    } catch (error) {
      this.#data.error = error;
    }
  }
  public get allStepsUids() {
    const stepData = this.getStepData();
    const stepsUids = [stepData.step.uid, ...stepData.stepsUid];
    return Array.from(new Set(stepsUids));
  }

  public get result() {
    const data = {
      ...this.#data,
    };
    Object.entries(data.tables).map(([k, v]) => {
      v.table = null;
    });
    return {
      data,
      stepData: this.#stepData,
    };
  }
  #prepareInventories() {
    const preData = this.#inventoryPreData;
    const stepData = this.getStepData();
    for (const uid of preData.componentUids) {
      const depComponent = stepData.depsComponentsList.find(
        (a) => a.uid === uid
      );
      const component = stepData.stepProducts.find((a) => a.uid == uid);
      if (preData.inventories.find((i) => i.uid == uid)) {
        if (component) {
          this.prepareInventorySubCategories(
            uid,
            component.subCategoriesComponentsUid
          );
          // if main component, generate component data.
          // images
          // sub categories
          // variants
          // variant pricings.
        }
        return;
      }
      const inventoryId = this.#nextId("inventory");
      if (depComponent) {
        const inventoryCategoryId = this.getCategoryId(depComponent.stepUid);
        this.#addCreateData("inventory", {
          uid,
          name: depComponent?.name,
          inventoryCategoryId,
          id: inventoryId,
        } as Prisma.InventoryCreateManyInput);
      }
      if (component) {
        const inventoryCategoryId = this.getCategoryId(stepData.step.uid);
        const inventory = this.#addCreateData("inventory", {
          uid,
          name: component?.name,
          inventoryCategoryId,
          id: inventoryId,
        } as Prisma.InventoryCreateManyInput);
        // images

        // sub categories
        this.prepareInventorySubCategories(
          uid,
          component.subCategoriesComponentsUid
        );
        // variants
        // variant pricings.
      }
    }
  }
  #variantPricings() {
    const preData = this.#inventoryPreData;
    const stepData = this.getStepData();
    for (const uid of preData.componentUids) {
      const component = stepData.stepProducts.find((a) => a.uid == uid);
      if (!component) continue;
      const pricings = stepData.step.priceSystem?.filter(
        (p) => p?.stepProductUid === uid
      );
      for (let di = 0; di < pricings.length; di++) {
        const m = pricings[di]!;
        if (
          pricings.findIndex((a) => a.dependenciesUid == m?.dependenciesUid) !=
          di
        )
          continue;
        const priceList = pricings.filter(
          (a) => a.dependenciesUid == m.dependenciesUid
        );
        this.#generateInventoryVariants(
          uid,
          m.dependenciesUid!,
          priceList.filter((a) => ({
            price: a.price,
            date: a.createdAt,
          }))
        );
      }
    }
  }
  #getVariant(uid, variantUid) {
    return this.#inventories
      .find((i) => i.uid == uid)
      ?.variants?.find((v) => v.uid === variantUid);
  }
  #generateInventoryVariants(
    uid,
    variantUid: string,
    pricings: {
      price?;
      date?;
    }[]
  ) {
    const oldVariant = this.#getVariant(uid, variantUid);
    const inventoryId = this.inventoryIdByUid(uid);
    if (!oldVariant) {
      const inventoryVariantId = this.#nextId("inventoryVariant");
      this.#addCreateData("inventoryVariant", {
        inventoryId,
        uid: variantUid,
        id: inventoryVariantId,
      } as Prisma.InventoryVariantCreateManyInput);
      if (variantUid !== uid && !!variantUid)
        variantUid.split("-").map((uid) => {
          const valueInventoryId = this.inventoryIdByUid(uid);
          const { id: inventoryCategoryVariantAttributeId, ...rest } =
            this.#getInventoryCategoryVariantAttributeId(
              inventoryId,
              valueInventoryId
            );

          if (!valueInventoryId)
            this.#log(
              "inventoryVariantAttribute",
              `${uid} inventory`,
              `inventory not found!`
            );
          if (
            !inventoryCategoryVariantAttributeId
            // && inventoryId == 816
          )
            this.#log(
              "inventoryVariantAttribute",
              `i${inventoryId}-v${valueInventoryId} attribute`,
              //   "..."
              //  ...rest
              //   ""
              rest
            );

          this.#addCreateData("inventoryVariantAttribute", {
            inventoryVariantId,
            valueId: valueInventoryId,
            inventoryCategoryVariantAttributeId,
          } as Prisma.InventoryVariantAttributeCreateManyInput);
        });
      pricings?.map((p, pi) => {
        if (pi == pricings?.length - 1) {
          this.#addCreateData("inventoryVariantPricing", {
            costPrice: p?.price,
            inventoryId,
            inventoryVariantId,
          } as Prisma.InventoryVariantPricingCreateManyInput);
        }
        this.#addCreateData("priceHistory", {
          inventoryVariantId,
          newCostPrice: p?.price,
          oldCostPrice: pricings?.[pi - 1]?.price,
          effectiveFrom: p?.date,
          effectiveTo: p?.[pi + 1]?.date,
        } as Prisma.PriceHistoryCreateManyInput);
      });
    }
  }
  #getInventoryCategoryVariantAttributeId(inventoryId, attributeInventoryId) {
    const inventoryCategoryId =
      this.#inventoryCategoryIdByInventoryId(inventoryId);
    const valuesInventoryCategoryId =
      this.#inventoryCategoryIdByInventoryId(attributeInventoryId);
    let id =
      this.#data.tables.inventoryCategoryVariantAttribute.createMany.find(
        (a) =>
          a.valuesInventoryCategoryId == valuesInventoryCategoryId &&
          a.inventoryCategoryId == inventoryCategoryId
      )?.id;
    if (!id && inventoryCategoryId && valuesInventoryCategoryId) {
      id = this.#addCreateData("inventoryCategoryVariantAttribute", {
        id: this.#nextId("inventoryCategoryVariantAttribute"),
        inventoryCategoryId,
        valuesInventoryCategoryId,
      } as Prisma.InventoryCategoryVariantAttributeCreateManyInput).id;
    }
    return {
      id,
      inventoryCategoryId,
      valuesInventoryCategoryId,
    };
  }
  #inventoryCategoryIdByInventoryId(id) {
    return [
      ...this.#inventories,
      ...this.#data.tables.inventory.createMany,
    ]?.find((a) => a.id == id)?.inventoryCategoryId;
  }
  #inventoryCategoryIdByInventoryUid(uid) {
    return [
      ...this.#inventories,
      ...this.#data.tables.inventory.createMany,
    ]?.find((a) => a.uid == uid)?.inventoryCategoryId;
  }
  public inventoryIdByUid(uid) {
    return [
      ...this.#inventories,
      ...this.#data.tables.inventory.createMany,
    ]?.find((a) => a.uid == uid)?.id;
  }
  public prepareInventorySubCategories(uid, depsUids: string[]) {
    const id = this.inventoryIdByUid(uid);
    depsUids.map((duid) => {
      const depId = this.inventoryIdByUid(duid);
      if (!depId) return;
      // const depCatId = this.inventoryCategoryIdByInventoryUid(duid)
      const itemSubCategory = this.#addCreateData("inventoryItemSubCategory", {
        inventoryId: id,
        id: this.#nextId("inventoryItemSubCategory"),
      } satisfies Prisma.InventoryItemSubCategoryCreateManyInput);
      this.#addCreateData("inventoryItemSubCategoryValue", {
        inventoryId: depId,
        subCategoryId: itemSubCategory.id,
      } satisfies Prisma.InventoryItemSubCategoryValueCreateManyInput);
    });
  }
  #addCreateData<T>(table: TableName, data: T) {
    this.#data.tables[table].createMany.push(data);
    return data;
  }
  #prepareInventoryCategories() {
    const stepData = this.getStepData();
    const stepsUids = this.allStepsUids;
    const missingTypes = stepsUids.filter((u) =>
      this.#inventoryCategories.every((ic) => ic.uid !== u)
    );
    missingTypes.map((uid) => {
      const stepTitle = stepData.depsSteps?.find((a) => a.uid === uid)?.title;
      this.#data.tables.inventoryCategory.createMany.push({
        id: this.#nextId("inventoryCategory"),
        uid,
        title: stepTitle,
        type: "component",
      } as Prisma.InventoryCategoryCreateManyInput);
    });
  }
  #prepareCategoryVariants() {
    const stepData = this.getStepData();
    [stepData.step, ...stepData?.depsSteps]?.map((sp) => {
      const meta: StepMeta = sp?.meta as any;
      const priceDependenices = meta?.priceStepDeps || [];
      const uid = sp?.uid;
      if (priceDependenices.length) {
        for (const puid of priceDependenices) {
          const v = {
            id: this.#nextId("inventoryCategoryVariantAttribute"),
            inventoryCategoryId: this.getCategoryId(uid),
            valuesInventoryCategoryId: this.getCategoryId(puid),
          } as Prisma.InventoryCategoryVariantAttributeCreateManyInput;
          if (v.inventoryCategoryId && v.valuesInventoryCategoryId)
            this.#addCreateData("inventoryCategoryVariantAttribute", v);
        }
      }
    });
  }
  public getCategoryId(uid) {
    return (
      this.#inventoryCategories?.find((c) => c.uid == uid)?.id ||
      this.#data.tables.inventoryCategory.createMany?.find((s) => s.uid == uid)
        ?.id
    );
  }
  #nextId(tableName: TableIdNames) {
    return this.#data.tables[tableName].nextId++;
  }
  //   #inventoryCategories: { id: number; uid: string; title: string }[] =
  // null as any;
  //   #inventories: { id: number; uid: string }[] = null as any;
  get #inventoryCategories() {
    return this.#inventoryPreData.inventoryCategories;
  }
  get #inventories() {
    return this.#inventoryPreData.inventories;
  }
  #inventoryPreData: RenturnTypeAsync<typeof this.loadInventoryPreData> =
    null as any;
  public async loadInventoryPreData() {
    const stepData = this.getStepData();
    const stepsUids = stepData.stepsUid;
    const inventoryCategories = await this.db.inventoryCategory.findMany({
      where: {
        uid: {
          in: stepsUids,
        },
      },
      select: {
        uid: true,
        title: true,
        id: true,
      },
    });
    // this.#inventoryCategories = inventoryCategories;
    const componentUids = Array.from(
      new Set(
        [
          ...stepData?.depsComponentsList?.map((a) => a?.uid),
          ...stepData.stepProducts?.map((a) => a.uid),
        ]
          .filter((s) => !!s)
          .map((a) => a!)
      )
    );
    const inventories = await this.db.inventory.findMany({
      where: {
        uid: {
          in: componentUids,
        },
      },
      select: {
        id: true,
        uid: true,
        inventoryCategoryId: true,
        variants: {
          select: {
            id: true,
            uid: true,
            attributes: {
              select: {
                id: true,
                valueId: true,
                inventoryVariantId: true,
              },
            },
          },
        },
      },
    });
    return {
      inventories,
      componentUids,
      inventoryCategories,
    };
  }

  #stepData;
  public getStepData() {
    return this.#stepData as RenturnTypeAsync<typeof this.initStepData>;
  }

  public async initStepData() {
    const step = await this.db.dykeSteps.findUniqueOrThrow({
      where: {
        id: this.#data.stepId!,
      },
      select: {
        uid: true,
        title: true,
        meta: true,
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
            createdAt: true,
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
    let widthUids: string[] = [];
    let heightUids: string[] = [];
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
    const stepProducts = step.stepProducts.map((p) => {
      return {
        ...p,
        uid:
          step.title == "Width"
            ? `w${p.name}`
            : step.title == "Height"
              ? `h${p.name}`
              : p.uid,
      };
    });
    const priceSystemComponentUids = Array.from(
      new Set(
        step.priceSystem
          .map((p) => p.dependenciesUid?.split("-")?.filter(Boolean))
          ?.flat()
          .map((a) => a!)
      )
    );
    let components = stepProducts
      .map((product) => {
        const meta: StepComponentMeta = product.meta as any;
        const variations = meta?.variations;
        return {
          ...product,
          name: product.name || product?.product?.title || product?.door?.title,
          img: product.img || product?.product?.img || product?.door?.img,
          meta,
          subCategoriesComponentsUid:
            variations
              ?.map((a) => a?.rules?.map((r) => r?.componentsUid)?.flat())
              ?.flat() || [],
          subCategoriesStepUid:
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
    const componentStepUids = components
      .map((c) => c.subCategoriesStepUid)
      .flat();
    const psStepUids = step.priceSystem.map((c) => c.step?.uid);

    const priceDepsStepsWithComponents = await this.db.dykeSteps.findMany({
      where: {
        stepProducts: {
          some: {
            uid: {
              in: priceSystemComponentUids,
            },
          },
        },
      },
      select: {
        uid: true,
        title: true,
        stepProducts: {
          select: {
            uid: true,
            name: true,
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
          },
          where: {
            uid: {
              in: priceSystemComponentUids,
            },
          },
        },
      },
    });
    const stepsUid = Array.from(
      new Set([
        ...componentStepUids,
        ...psStepUids,
        ...priceDepsStepsWithComponents.map((a) => a.uid),
      ])
    )
      .filter(Boolean)
      .map((s) => s!);
    const depsSteps = await this.db.dykeSteps.findMany({
      where: {
        OR: [
          {
            uid: {
              in: stepsUid,
            },
          },
          {
            title: {
              in: ["Width", "Height"],
            },
          },
        ],
      },
      distinct: "title",
      include: {
        stepProducts: {
          select: {
            uid: true,
            name: true,
            product: {
              select: {
                title: true,
              },
            },
            door: {
              select: {
                title: true,
              },
            },
          },
          where: {
            deletedAt: null,
          },
        },
      },
    });
    const widthStep = depsSteps.find((a) => a.title == "Width");
    const widthStepUid = widthStep?.uid;
    const heightStep = depsSteps.find((a) => a.title == "Height");
    const heightStepUid = heightStep?.uid;

    if (widthUids.length && widthStepUid) stepsUid.push(widthStepUid);
    if (heightUids.length && heightStepUid) stepsUid.push(heightStepUid);
    const depsComponentsList = [
      ...depsSteps.map((s) => ({
        ...s,
        stepProducts: s.stepProducts.map((sp) => ({
          name: sp.name || sp.product?.title || sp?.door?.title,
          uid: sp.uid,
        })),
      })),
    ]
      .map((a) =>
        a.stepProducts.map((p) => ({
          ...p,
          stepUid: a.uid,
          uid:
            a.title == "Width"
              ? `w${p.name?.replace("-", "_")}`
              : a.title == "Height"
                ? `h${p.name?.replace("-", "_")}`
                : p.uid,
        }))
      )
      .flat();
    const addSizes = (step, uids: string[], k: "w" | "h") => {
      if (uids?.length) {
        Array.from(new Set(uids))
          .filter((wuid) => !step?.stepProducts?.find((a) => a.uid == wuid))
          .map((a) => {
            depsComponentsList.push({
              name: a!.replaceAll("_", "-").replace(k, "")!,
              stepUid: step?.uid!,
              uid: a,
            });
          });
      }
    };
    addSizes(widthStep, widthUids, "w");
    addSizes(heightStep, heightUids, "h");
    return {
      step,
      stepsUid,
      stepProducts: components,
      //   widthUids,
      //   heightUids,
      priceSystemComponentUids,
      widthStepUid,
      heightStepUid,
      depsComponentsList,
      depsSteps,
    };
  }
  #log(table: TableName, logKey, logValue) {
    const odata = this.#data.tables[table];
    if (!odata.logs) odata.logs = {};
    odata[logKey] = logValue;
  }
  async #prepareImages() {
    const images = await this.db.imageGallery.findMany({
      select: {
        id: true,
        name: true,
        path: true,
        tags: true,
        provider: true,
      },
    });
    const preData = this.#inventoryPreData;
    const stepData = this.getStepData();
    for (const uid of preData.componentUids) {
      const component = stepData.stepProducts.find((a) => a.uid == uid);
      if (!component) continue;
      const img = component.img;
      if (!img) continue;
      let imgId = images.find((i) => i.path === img)?.id;
      if (!imgId) {
        imgId = this.#addCreateData("imageGallery", {
          id: this.#nextId("imageGallery"),
          path: img,
          bucket: "dyke",
          name: component?.name,
          provider: "cloudinary",
        } as Prisma.ImageGalleryCreateManyInput).id;
      }
      const inventoryId = this.inventoryIdByUid(uid);

      if (imgId && inventoryId) {
        this.#addCreateData("inventoryImage", {
          imageGalleryId: imgId,
          inventoryId: inventoryId,
          primary: true,
        } as Prisma.InventoryImageCreateManyInput);
      }
      if (img) {
        this.#log("inventoryImage", `${img}`, { inventoryId, imgId });
      }
    }
  }
  //   get #getTableIdNames() {
  //     const names: TableName[] = [
  //       "inventoryCategory",
  //       "inventoryCategoryVariantAttribute",
  //       "inventory",
  //     ] as const;
  //     return names;
  //   }
  async #initTables() {
    // const names = TABLE_ID_NAMES;
    await Promise.all(
      TABLE_NAMES.map(async (name) => {
        this.#data.tables[name] = {
          nextId: TABLE_ID_NAMES?.includes(name as any)
            ? await nextId(this.db[name])
            : undefined!,
          createMany: [],
          table: this.db[name],
        };
      })
    );
  }
}
