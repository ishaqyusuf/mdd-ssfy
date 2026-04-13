import type { Db } from "@gnd/db";
import { generateRandomString } from "@gnd/utils";
import type { DykeStepComponent } from "../../schema";

type DykeStepProductRecord = Awaited<
  ReturnType<typeof getDykeStepProductWithRelations>
>;

async function getDykeStepProductWithRelations(db: Db, id: number) {
  return db.dykeStepProducts.findUniqueOrThrow({
    where: {
      id,
    },
    include: {
      door: true,
      product: true,
      step: {
        select: {
          id: true,
          uid: true,
          title: true,
          meta: true,
        },
      },
      sorts: true,
      _count: {
        select: {
          housePackageTools: {
            where: {
              deletedAt: null,
            },
          },
          salesDoors: {
            where: {
              deletedAt: null,
            },
          },
          stepForms: {
            where: {
              deletedAt: null,
            },
          },
        },
      },
    },
  });
}

function buildDykeStepComponentDto(
  component: NonNullable<DykeStepProductRecord>,
  pricingByDependency: Record<string, { id: number; price: number | null }>,
) {
  const componentUid = component.uid || "";
  const meta =
    component.meta && typeof component.meta === "object" && !Array.isArray(component.meta)
      ? (component.meta as Record<string, any>)
      : {};
  const stepMeta =
    component.step?.meta &&
    typeof component.step.meta === "object" &&
    !Array.isArray(component.step.meta)
      ? (component.step.meta as Record<string, any>)
      : {};
  const priceStepDeps = Array.isArray(stepMeta.priceStepDeps)
    ? stepMeta.priceStepDeps
        .map((uid: unknown) => String(uid || ""))
        .filter(Boolean)
    : [];
  const defaultPrice = Number(pricingByDependency?.[componentUid]?.price);

  return {
    uid: componentUid,
    sortIndex: component.sortIndex,
    id: component.id,
    title: component.name || component.door?.title || component.product?.title,
    img: component.img || component.product?.img || component.door?.img,
    productId: component.product?.id || component.door?.id,
    variations: Array.isArray(meta.variations) ? meta.variations : [],
    sectionOverride: meta.sectionOverride,
    salesPrice: Number.isFinite(defaultPrice) ? defaultPrice : null,
    basePrice: Number.isFinite(defaultPrice) ? defaultPrice : null,
    stepId: component.dykeStepId,
    stepUid: component.step?.uid || null,
    priceStepDeps,
    pricing: pricingByDependency,
    productCode: component.productCode,
    redirectUid: component.redirectUid,
    _metaData: {
      sorts: (component.sorts || []).map(({ sortIndex, stepComponentId, uid }) => ({
        sortIndex,
        stepComponentId,
        uid,
      })),
      custom: component.custom,
      visible: false,
      priceId: null,
      sortId: null,
      sortIndex: null,
      sortUid: null,
    },
    isDeleted: !!component.deletedAt,
    statistics:
      Number(component._count?.housePackageTools || 0) +
      Number(component._count?.salesDoors || 0) +
      Number(component._count?.stepForms || 0),
  };
}

async function getPricingByComponentUid(db: Db, componentUid: string) {
  const pricingRows = await db.dykePricingSystem.findMany({
    where: {
      deletedAt: null,
      stepProductUid: componentUid,
    },
    select: {
      id: true,
      stepProductUid: true,
      dependenciesUid: true,
      price: true,
    },
  });

  return pricingRows.reduce<Record<string, { id: number; price: number | null }>>(
    (acc, row) => {
      const depKey = row.dependenciesUid || row.stepProductUid || "";
      if (!depKey) return acc;
      acc[depKey] = {
        id: row.id,
        price: row.price,
      };
      return acc;
    },
    {},
  );
}

export async function saveDykeStepComponent(db: Db, input: DykeStepComponent) {
  const { id, stepId, productCode, ...data } = input;

  if (!id && !stepId) {
    throw new Error("stepId is required when creating a Dyke step component");
  }

  const component = id
    ? await db.dykeStepProducts.update({
        where: {
          id,
        },
        data: {
          ...data,
        },
        select: {
          id: true,
          dykeStepId: true,
        },
      })
    : await db.dykeStepProducts.create({
        data: {
          uid: generateRandomString(5),
          ...data,
          step: {
            connect: {
              id: stepId!,
            },
          },
        },
        select: {
          id: true,
          dykeStepId: true,
        },
      });

  const hydrated = await getDykeStepProductWithRelations(db, component.id);
  const pricing = await getPricingByComponentUid(db, hydrated.uid || "");

  return {
    component: buildDykeStepComponentDto(hydrated, pricing),
    stepId: hydrated.dykeStepId,
    componentId: hydrated.id,
    componentUid: hydrated.uid || "",
  };
}
