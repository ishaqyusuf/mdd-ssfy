import { Db, Prisma } from "@gnd/db";
import {
  getCommunityBlockSchema,
  GetCommunityBlockSchema,
  getCommunitySchema,
} from "./community-template-schemas";
import {
  ModelTemplateValues,
  SchemaData,
  TemplateFormService,
} from "./services/template-form-service";
import { dotObject } from "@gnd/utils";

interface Props {
  homeIds: number[];
}
export async function generatePrintData(db: Db, props: Props) {
  const homes = await db.homes.findMany({
    where: {
      id: {
        in: props.homeIds,
      },
    },
    select: {
      lot: true,
      block: true,
      builderId: true,
      modelName: true,
      projectId: true,
      project: {
        select: {
          builder: {
            select: {
              name: true,
            },
          },
          title: true,
        },
      },
    },
  });
  const homeTemplates = await db.homeTemplates.findMany({
    where: {
      OR: homes.map(({ builderId, modelName }) => {
        const w: Prisma.HomeTemplatesWhereInput = {
          builderId,
          modelName,
        };
        return w;
      }),
    },
  });
  const communityPrints = await db.communityModels.findMany({
    where: {
      OR: homes.map(({ projectId, modelName }) => {
        const w: Prisma.CommunityModelsWhereInput = {
          projectId,
          modelName: modelName!,
        };
        return w;
      }),
    },
    select: {
      meta: true,
      modelName: true,
      id: true,
      project: {
        select: {
          title: true,
          builder: {
            select: {
              name: true,
            },
          },
        },
      },
      templateValues: {
        select: {
          uid: true,
          id: true,
          inventoryId: true,
          value: true,
          inventory: {
            select: {
              name: true,
            },
          },
          inputConfig: {
            select: {
              id: true,
            },
          },
        },
        where: {
          deletedAt: null,
        },
      },
      projectId: true,
    },
  });
  const units: { data: Info[] }[] = [];
  for (const home of homes) {
    const c = communityPrints.find(
      (ct) =>
        ct.projectId == home.projectId &&
        ct.modelName?.toLowerCase() == home.modelName?.toLowerCase()
    );
    let design = (c?.meta as any)?.design;

    const homeDesign = (
      homeTemplates.find(
        (t) =>
          home.builderId == t.builderId &&
          home.modelName?.toLowerCase() == t.modelName?.toLowerCase()
      )?.meta as any
    )?.design;

    units.push({
      data: [
        info("Project", home.project.title, 2),
        info("Builder", home.project.builder?.name, 2),
        info("Model", home.modelName, 2),
        info("Lot", home.lot, 1),
        info("Block", home.block, 1),
        ...((c?.templateValues?.length
          ? await transformBlock(db, c.templateValues)
          : legacyDesign(homeDesign, design)) as Info[]),
      ],
    });
  }
  return units;
}
const info = (label, value, cells: number, section = false) => ({
  label,
  value,
  cells: cells || 4,
  section,
});
export type Info = ReturnType<typeof info>;
const section = (label) => info(label, null, 4, true);
let schemaData: SchemaData = null as any;
let blocks: GetCommunityBlockSchema[] = [];
async function transformBlock(db: Db, inputConfigs: ModelTemplateValues) {
  if (schemaData) {
    schemaData = await getCommunitySchema(db);
    blocks = await Promise.all(
      schemaData.blocks.map(async (b) => {
        return await getCommunityBlockSchema(db, {
          id: b.id,
        });
      })
    );
  }
  return blocks
    .map((block) => {
      const tfs = new TemplateFormService(schemaData, inputConfigs, block);
      const modelForm = tfs.generateBlockForm();
      const valuedForms = modelForm.filter((a) => {
        return modelForm.some(
          (b) =>
            (b._formMeta.rowNo === a._formMeta.rowNo && b._formMeta.value) ||
            b._formMeta.selection?.label
        );
      });
      if (!valuedForms?.length) return [];
      return [
        section(block.title),
        ...valuedForms.map((mf) => {
          return info(
            mf.title,
            mf._formMeta.selection?.label || mf._formMeta.value,
            mf.columnSize as any
          );
        }),
      ];
    })
    .flat();
}
export function transformCommunityTemplate(design) {
  // if (!design) return design;
  if (
    Object.values(design).some((e) =>
      Object.values(e as any).some((ev) => typeof ev === "object")
    )
  ) {
    let newDesign = {};
    Object.entries(design).map(([sec, dt]) => {
      const secD = {};
      if (dt)
        Object.entries(dt).map(([t, { c, v }]) => {
          secD[t] = v;
        });
      newDesign[sec] = secD;
      // newDesign[k] = v.k;
    });
    return newDesign;
  }
  return design;
}
function legacyDesign(homeTemplate, communityDesign) {
  let template = communityDesign
    ? dotArray(transformCommunityTemplate(communityDesign))
    : homeTemplate;
  let design = designDotToObject(template);
  return legacyDesignSystem
    .map((section) => {
      const t = section.map((s) => {
        // if(s.value?.startsWith('='))
        if (!s.value) return s;
        const [e, k] = s.value?.split("=");
        if (k) s.value = dotObject.pick(k, design);
        return s;
      });
      return (t as any).filter(
        (a) =>
          !a.row ||
          (a.row && t.some((ts) => (ts as any).row == a.row && ts.value))
      );
    })
    .flat();
}
const f = (key, cells?, label?) =>
  info(label || key, key, !cells ? 4 : legacyCellSizeTransform[cells] || 4);
const c = (key, label) => f(key, "2,1", label);
const legacySection = (node, sectionTitle, rows: Info[][]) => {
  return [
    info("Deadbolt", "=deadbold", 4),
    section(sectionTitle),
    ...rows
      .map((r, ri) =>
        r.map((c) => ({
          ...c,
          value: `=${node}.${c.value}`,
          row: ri + 1,
        }))
      )
      .flat(),
  ];
};
const legacyCellSizeTransform = {
  "2,10": 4,
  "2,4": 2,
  "2,1": 1,
  "2,2": 2,
  "2,6": 4,
};
///styler
function styler(fn) {
  return {
    fill: (c, label?) => fn(c, "2,10", label),
    half: (c, label?) => fn(c, "2,4", label),
    t3: (c, label?) => fn(c, "2,6", label),
    o3: (c, label?) => fn(c, "2,2", label),
  };
}
const s = styler(f);
const legacyDesignSystem = [
  //Exterrior
  legacySection("entry", "Exterior Door", [
    [f("material", "2,10")],
    [f("layer", "2,4"), f("bore", "2,4")],
    [f("sixEight", "2,4", "6/8"), f("eightZero", "2,4", "8/0")],
    [f("orientation", "2,4", "Handle"), f("others", "2,4", "Type")],
    [f("sideDoor", "2,10")],
  ]),
  legacySection("garageDoor", "Garage Door", [
    [f("type")],
    [f("material")],
    [f("ph", "2,10", "Garage PH")],
    [f("single")],
    [f("frame")],
    [f("bore", "2,4"), f("doorHeight", "2,4", "Height")],
    [f("doorSize", "2,4", "Size"), f("orientation", "2,4", "Handle")],
    [f("doorSize1", "2,4", "Size"), f("orientation1", "2,4", "Handle")],
  ]),
  legacySection("interiorDoor", "Interior Door", [
    [f("doorSize1", "2,4", "Size"), f("orientation1", "2,4", "Handle")],
    [f("style", "2,4", "Style"), f("jambSize", "2,4")],
    [f("casingStyle", "2,4"), f("doorType", "2,4")],
    [f("height1", "2,4", "Height"), f("height2", "2,4", "Height")],
    [
      c("oneSix1Lh", "1/6 LH"),
      c("oneSix1Rh", "1/6 RH"),
      c("oneSix2Lh", "1/6 LH"),
      c("oneSix2Rh", "1/6 RH"),
    ],
    [
      c("two1Lh", "2/0 LH"),
      c("two1Rh", "2/0 RH"),
      c("two2Lh", "2/0 LH"),
      c("two2Rh", "2/0 RH"),
    ],
    [
      c("twoFour1Lh", "2/4 LH"),
      c("twoFour1Rh", "2/4 RH"),
      c("twoFour2Lh", "2/4 LH"),
      c("twoFour2Rh", "2/4 RH"),
    ],
    [
      c("twoSix1Lh", "2/6 LH"),
      c("twoSix1Rh", "2/6 RH"),
      c("twoSix2Lh", "2/6 LH"),
      c("twoSix2Rh", "2/6 RH"),
    ],
    [
      c("twoEight1Lh", "2/8 LH"),
      c("twoEight1Rh", "2/8 RH"),
      c("twoEight2Lh", "2/8 LH"),
      c("twoEight2Rh", "2/8 RH"),
    ],
    [
      c("twoTen1Lh", "2/10 LH"),
      c("twoTen1Rh", "2/10 RH"),
      c("twoTen2Lh", "2/10 LH"),
      c("twoTen2Rh", "2/10 RH"),
    ],
    [
      c("three1Lh", "3/0 LH"),
      c("three1Rh", "3/0 RH"),
      c("three2Lh", "3/0 LH"),
      c("three2Rh", "3/0 RH"),
    ],
  ]),
  legacySection("doubleDoor", "Double Door", [
    [f("sixLh", "2,4", "6/0 LH"), f("sixRh", "2,4", "6/0 RH")],
    [f("fiveEightLh", "2,4", "5/8 LH"), f("fiveEightRh", "2,4", "5/8 LH")],
    [f("fiveFourLh", "2,4", "5/4 LH"), f("fiveFourRh", "2,4", "5/4 RH")],
    [f("fiveLh", "2,4", "5/0 LH"), f("fiveRh", "2,4", "5/0 RH")],
    [f("fourLh", "2,4", "4/0 LH"), f("fourRh", "2,4", "4/0 RH")],
    [f("mirrored", "2,4", "Mirrored Bifold"), f("swingDoor", "2,4")],
    [f("specialDoor", "2,4"), f("others", "2,4", "Bypass")],
    [f("pocketDoor", "2,4"), f("specialDoor2", "2,4", "Others")],
    [f("specialDoor3", "2,4", "Others"), f("specialDoor4", "2,4", "Others")],
  ]),
  legacySection("bifoldDoor", "Bifold Door", [
    [f("style")],
    [s.half("four", "4/0"), s.half("one", "1/0")],
    //   [s.half("fourEight"), s.half("one", "1/0")],
    [s.half("fourEight", "4/8"), s.half("oneSix", "1/6")],
    [s.half("five", "5/0"), s.half("oneEight", "1/8")],
    [s.half("six", "6/0"), s.half("two", "2/0")],
    [s.half("twoFourLl", "2/4 LL"), s.half("twoFour", "2/4")],
    [s.half("twoSixLl", "2/6 LL"), s.half("twoSix", "2/6")],
    [s.half("twoEightLl", "2/8 LL"), s.half("twoEight", "2/8")],
    [s.half("threeLl", "3/0 LL"), s.half("three", "3/0")],
    [s.half("palosQty", "Palos")],
    [f("crown", "2,10")],
    [s.t3("casing", "Baseboard"), s.o3("qty", "Quantity")],
    [s.t3("scuttle", "Scuttle Cover"), s.o3("scuttleQty", "Quantity")],
    [s.t3("casingStyle"), s.o3("casingQty", "Quantity")],
    [s.t3("bifoldOther1", "Other"), s.o3("bifoldOther1Qty", "Quantity")],
    [s.t3("bifoldOther2", "Other"), s.o3("bifoldOther2Qty", "Quantity")],
  ]),
  legacySection("lockHardware", "Lock & Hardware", [
    [s.fill("brand")],
    [s.half("handleSet"), s.half("doorStop")],
    [s.half("dummy"), s.half("doorViewer")],
    [s.half("deadbolt"), s.half("wStripper", "W. Stripper")],
    [s.half("passage"), s.half("hinges")],
    [s.half("privacy"), s.half("hookAye", "Hook & Aye")],
  ]),
  legacySection("decoShutters", "Deco Shutters", [
    [s.fill("model")],
    [s.half("size1")],
    [s.half("size2")],
  ]),
];
export function dotArray(obj, parentKey = "", removeEmptyArrays = false) {
  let result = {};
  if (!obj) obj = {};
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      const newKey = parentKey ? `${parentKey}.${key}` : key;

      if (typeof obj[key] === "object" && !Array.isArray(obj[key])) {
        const nested = dotArray(obj[key], newKey);
        result = { ...result, ...nested };
      } else {
        if (
          !(
            Array.isArray(obj[key]) &&
            obj[key]?.length == 0 &&
            removeEmptyArrays
          )
        )
          result[newKey] = obj[key];
      }
    }
  }

  return result;
}
export function designDotToObject(object) {
  // return toDotNotation(object);
  let tr = {};
  Object.entries(object).map(([k, v]) => {
    const [k1, k2] = k.split(".").map(camelCaseKey) as any;
    if (k1 && k2) {
      if (!tr[k1]) tr[k1] = {};
      tr[k1][k2] = v;
    }
  });
  return tr;
}
const camelCaseKey = (key) =>
  key.replace(/_([a-zA-Z0-9])/g, (_, c) => c.toUpperCase());
