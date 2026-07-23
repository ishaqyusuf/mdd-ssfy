import { describe, expect, it } from "bun:test";
import {
  composeDealerSalesFormQuotePricingSnapshot,
  composeDealerSalesFormQuoteSaveInput,
  composeSalesFormPricingSnapshot,
  composeSalesFormRecord,
  composeSalesFormSavePayload,
  resolveDealerSalesFormStructuredLineTotal,
} from ".";

describe("sales form composer", () => {
  it("normalizes records and save payloads without owning surface side effects", () => {
    const record = composeSalesFormRecord(
      {
        type: "order",
        salesId: 10,
        slug: "order-10",
        version: "v1",
        form: {
          customerId: "20",
          paymentMethod: "Credit Card",
        },
        lineItems: [
          {
            uid: "line-1",
            title: "Line 1",
            qty: 2,
            unitPrice: 50,
          },
        ],
        extraCosts: [],
        summary: {
          taxRate: 10,
        },
      },
      {
        surface: "www",
        pricing: {
          mode: "coefficient",
          profile: {
            coefficient: 1,
          },
        },
      },
    );

    const payload = composeSalesFormSavePayload(record, {
      surface: "www",
      autosave: false,
      pricing: {
        mode: "coefficient",
        profile: {
          coefficient: 1,
        },
      },
    });

    expect(record.form.customerId).toBe(20);
    expect(record.extraCosts.some((cost) => cost.type === "Labor")).toBe(true);
    expect(payload.autosave).toBe(false);
    expect(payload.summary.subTotal).toBe(100);
    expect(payload.summary.taxTotal).toBe(10);
    expect(payload.summary.grandTotal).toBe(110);
    expect(payload.summary.totalWithCcc).toBeGreaterThan(110);
  });

  it("keeps coefficient pricing isolated from dealer sales percentage", () => {
    const snapshot = composeSalesFormPricingSnapshot({
      config: {
        surface: "www",
        pricing: {
          mode: "coefficient",
          profile: {
            id: 1,
            label: "Internal",
            coefficient: 1.5,
            salesPercentage: 80,
          },
        },
      },
      taxRate: 10,
      lineItems: [
        {
          uid: "line-1",
          qty: 2,
          unitPrice: 100,
        },
      ],
    });

    expect(snapshot.source).toBe("sales_form_coefficient_pricing");
    expect(snapshot.profile).toEqual({
      id: 1,
      label: "Internal",
      coefficient: 1.5,
    });
    expect(snapshot.summary.subTotal).toBe(300);
    expect(snapshot.summary.grandTotal).toBe(330);
  });

  it("uses the item type as the save title when the editable title is blank", () => {
    const payload = composeSalesFormSavePayload(
      {
        type: "order",
        salesId: 10,
        slug: "order-10",
        version: "v1",
        form: {
          customerId: 20,
        },
        lineItems: [
          {
            uid: "line-1",
            title: "",
            qty: 1,
            unitPrice: 25,
            formSteps: [
              {
                step: {
                  title: "Item Type",
                },
                value: "Garage",
              },
            ],
          },
        ],
        extraCosts: [],
        summary: {
          taxRate: 0,
        },
      },
      {
        surface: "www",
        autosave: false,
        pricing: {
          mode: "coefficient",
          profile: {
            coefficient: 1,
          },
        },
      },
    );

    expect(payload.lineItems[0]?.title).toBe("Garage");
  });

  it("keeps dealership customer-profile percentage pricing explicit and separate from internal coefficient", () => {
    const snapshot = composeSalesFormPricingSnapshot({
      config: {
        surface: "dealership",
        pricing: {
          mode: "percentage",
          internalProfile: {
            id: 10,
            label: "Office",
            coefficient: 0.67,
          },
          dealerProfile: {
            id: 20,
            label: "Retail",
            coefficient: 99,
            salesPercentage: 20,
          },
        },
      },
      taxRate: 10,
      createdAt: "2026-05-20T10:00:00.000Z",
      lineItems: [
        {
          uid: "line-1",
          title: "Door",
          qty: 2,
          unitPrice: 100,
        },
      ],
    });

    expect(snapshot.source).toBe("sales_form_dual_pricing");
    expect(snapshot.profiles.internal).toEqual({
      id: 10,
      label: "Office",
      coefficient: 0.67,
    });
    expect(snapshot.profiles.dealer).toEqual({
      id: 20,
      label: "Retail",
      coefficient: 99,
      salesPercentage: 20,
    });
    expect(snapshot.internalPricing.grandTotal).toBe(327.8);
    expect(snapshot.dealerPricing.grandTotal).toBe(393.36);
    expect(snapshot.lines[0]).toMatchObject({
      internalUnitPrice: 149,
      dealerUnitPrice: 178.8,
    });
  });

  it("builds dealer quote snapshots from titled API profiles", () => {
    const snapshot = composeDealerSalesFormQuotePricingSnapshot({
      taxRate: 10,
      createdAt: "2026-05-20T10:00:00.000Z",
      internalProfile: {
        id: 10,
        title: "Office",
        coefficient: 0.67,
      },
      dealerProfile: {
        id: 20,
        title: "Retail",
        coefficient: 99,
        salesPercentage: 20,
      },
      lineItems: [
        {
          uid: "dealer-line-1",
          title: "Door",
          qty: 2,
          unitPrice: 100,
        },
      ],
    });

    expect(snapshot.source).toBe("sales_form_dual_pricing");
    expect(snapshot.profiles.internal.label).toBe("Office");
    expect(snapshot.profiles.dealer.label).toBe("Retail");
    expect(snapshot.internalPricing.grandTotal).toBe(327.8);
    expect(snapshot.dealerPricing.grandTotal).toBe(393.36);
  });

  it("keeps dealer quote shelf line totals aligned with shelf rows when saving", () => {
    const shelfLine = {
      uid: "dealer-line-1",
      title: "Shelf Items",
      description: "",
      qty: 2,
      unitPrice: 6.94,
      lineTotal: 25.66,
      meta: {},
      formSteps: [],
      shelfItems: [
        {
          uid: "shelf-product-1",
          description: "PC 3.5X3.5 5/8R, PRIMED HINGE",
          qty: 2,
          unitPrice: 6.94,
          totalPrice: 13.88,
          meta: {
            basePrice: 3.75,
            salesPrice: 6.94,
          },
        },
      ],
      housePackageTool: null,
    };

    expect(resolveDealerSalesFormStructuredLineTotal(shelfLine)).toBe(13.88);

    const payload = composeDealerSalesFormQuoteSaveInput({
      record: {
        id: 23562,
        type: "quote",
        salesId: 23562,
        orderId: "00002DPP",
        status: "Draft",
        version: "23562",
        updatedAt: null,
        form: {
          customerId: 3154,
          customerProfileId: 6,
          po: "PH27-QA-20260629-EDIT",
          paymentTerm: "None",
          deliveryOption: "pickup",
        },
        lineItems: [shelfLine],
        extraCosts: [],
        summary: {
          taxRate: 0,
        },
      },
      id: 23562,
      customerProfileId: 6,
      lineTotalsByUid: {
        "dealer-line-1": 25.66,
      },
    });

    expect(payload?.lineItems[0]?.lineTotal).toBe(13.88);
    expect(payload?.lineItems[0]?.unitPrice).toBe(6.94);
  });
});
