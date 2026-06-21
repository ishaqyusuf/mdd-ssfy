import { describe, expect, it } from "bun:test";

import {
  collapseLegacyGroupedLines,
  expandGroupedLineForLegacySave,
} from "./grouping";

describe("sales form grouped line parity", () => {
  it("collapses legacy moulding siblings and preserves row identity", () => {
    const [line] = collapseLegacyGroupedLines([
      {
        id: 10,
        uid: "line-a",
        multiDykeUid: "grp-1",
        multiDyke: true,
        title: "Moulding",
        description: "Casing",
        qty: 2,
        unitPrice: 70,
        lineTotal: 140,
        meta: {},
        sourceMeta: {},
        formSteps: [
          { step: { title: "Item Type" }, value: "Moulding" },
          { step: { title: "Moulding" }, value: "Casing", prodUid: "casing" },
        ],
        housePackageTool: {
          id: 101,
          moldingId: 501,
          stepProductId: 301,
          meta: {
            priceTags: {
              moulding: {
                addon: 5,
                salesPrice: 65,
                basePrice: 40,
                price: 70,
              },
            },
          },
        },
      },
      {
        id: 11,
        uid: "line-b",
        multiDykeUid: "grp-1",
        multiDyke: false,
        title: "Moulding",
        description: "Stop",
        qty: 1,
        unitPrice: 35,
        lineTotal: 35,
        meta: {},
        sourceMeta: {},
        formSteps: [],
        housePackageTool: {
          id: 102,
          moldingId: 502,
          stepProductId: 302,
          meta: {
            priceTags: {
              moulding: {
                salesPrice: 35,
                basePrice: 20,
                price: 35,
              },
            },
          },
        },
      },
    ] as any[]);

    expect(line.title).toBe("Moulding");
    expect(line.qty).toBe(3);
    expect(line.lineTotal).toBe(175);
    expect(line.meta.mouldingRows).toHaveLength(2);
    expect(line.meta.mouldingRows[0].salesItemId).toBe(10);
    expect(line.meta.mouldingRows[0].hptId).toBe(101);
    expect(line.meta.mouldingRows[0].primaryGroupItem).toBe(true);
    expect(line.formSteps[1].meta.selectedProdUids).toEqual(["casing", "line-b"]);
  });

  it("collapses legacy service siblings and preserves tax/production flags", () => {
    const [line] = collapseLegacyGroupedLines([
      {
        id: 20,
        uid: "svc-a",
        multiDykeUid: "grp-2",
        multiDyke: true,
        title: "Services",
        description: "Install",
        qty: 1,
        unitPrice: 80,
        lineTotal: 80,
        dykeProduction: true,
        sourceMeta: { tax: true },
        meta: {},
        formSteps: [{ step: { title: "Item Type" }, value: "Services" }],
      },
      {
        id: 21,
        uid: "svc-b",
        multiDykeUid: "grp-2",
        multiDyke: false,
        title: "Services",
        description: "Delivery",
        qty: 1,
        unitPrice: 30,
        lineTotal: 30,
        dykeProduction: false,
        sourceMeta: { tax: false },
        meta: {},
        formSteps: [],
      },
    ] as any[]);

    expect(line.title).toBe("Services");
    expect(line.qty).toBe(2);
    expect(line.lineTotal).toBe(110);
    expect(line.meta.serviceRows).toHaveLength(2);
    expect(line.meta.serviceRows[0].salesItemId).toBe(20);
    expect(line.meta.serviceRows[0].taxxable).toBe(true);
    expect(line.meta.serviceRows[0].produceable).toBe(true);
  });

  it("collapses legacy service siblings with JSON metadata flags", () => {
    const [line] = collapseLegacyGroupedLines([
      {
        id: 22,
        uid: "svc-json-a",
        multiDykeUid: "grp-json",
        multiDyke: true,
        title: "Services",
        description: "Install",
        qty: 1,
        unitPrice: 80,
        lineTotal: 80,
        meta: JSON.stringify({ taxxable: true, produceable: true }),
        formSteps: [{ step: { title: "Item Type" }, value: "Services" }],
      },
    ] as any[]);

    expect(line.meta.serviceRows[0].taxxable).toBe(true);
    expect(line.meta.serviceRows[0].produceable).toBe(true);
  });

  it("expands grouped service and moulding projections for legacy save", () => {
    const serviceRows = expandGroupedLineForLegacySave({
      uid: "service-parent",
      title: "Services",
      formSteps: [{ step: { title: "Item Type" }, value: "Services" }],
      meta: JSON.stringify({
        groupUid: "svc-group",
        serviceRows: [
          { uid: "svc-1", service: "Install", qty: 1, unitPrice: 80 },
          { uid: "svc-2", service: "Delivery", qty: 1, unitPrice: 30 },
        ],
      }),
    });
    const mouldingRows = expandGroupedLineForLegacySave({
      uid: "moulding-parent",
      title: "Moulding",
      formSteps: [{ step: { title: "Item Type" }, value: "Moulding" }],
      meta: {
        groupUid: "moulding-group",
        mouldingRows: [
          { uid: "m-1", title: "Casing", qty: 2, salesPrice: 70 },
          { uid: "m-2", title: "Stop", qty: 1, salesPrice: 35 },
        ],
      },
    });

    expect(serviceRows).toHaveLength(2);
    expect(serviceRows[0].groupUid).toBe("svc-group");
    expect(serviceRows[0].primaryGroupItem).toBe(true);
    expect(serviceRows[1].primaryGroupItem).toBe(false);
    expect(mouldingRows).toHaveLength(2);
    expect(mouldingRows[0].groupUid).toBe("moulding-group");
  });
});
