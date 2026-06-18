import { describe, expect, it } from "bun:test";
import {
  buildCustomOptions,
  customComponentPriceChanged,
  customOptionToWorkflowComponent,
  stepSupportsCustomComponents,
} from "./custom-component-options";

describe("custom component options", () => {
  it("detects custom-capable steps from website and mobile metadata shapes", () => {
    expect(stepSupportsCustomComponents({ custom: true } as any)).toBe(true);
    expect(stepSupportsCustomComponents({ meta: { custom: true } } as any)).toBe(
      true,
    );
    expect(
      stepSupportsCustomComponents({
        step: { meta: { custom: true } },
      } as any),
    ).toBe(true);
    expect(
      stepSupportsCustomComponents({
        step: { metaCustom: true },
      } as any),
    ).toBe(true);
    expect(stepSupportsCustomComponents({ meta: {} } as any)).toBe(false);
  });

  it("prefers stored custom pricing over component-level sales pricing", () => {
    const [option] = buildCustomOptions([
      {
        id: 12,
        uid: "custom-a",
        title: "Custom A",
        custom: true,
        basePrice: 80,
        salesPrice: 120,
        pricing: {
          "custom-a": {
            id: 44,
            price: 35,
          },
        },
      } as any,
    ]);

    expect(option?.price).toBe(35);
    expect(option?.pricingId).toBe(44);
  });

  it("keeps dependency pricing identity for non-direct custom pricing rows", () => {
    const [option] = buildCustomOptions([
      {
        id: 12,
        uid: "custom-a",
        title: "Custom A",
        _metaData: { custom: true },
        salesPrice: 120,
        pricing: {
          "dependency-a": {
            id: 55,
            price: 40,
          },
        },
      } as any,
    ]);

    expect(option?.price).toBe(40);
    expect(option?.pricingId).toBe(55);
    expect(option?.dependenciesUid).toBe("dependency-a");
  });

  it("filters archived custom components from selectable options", () => {
    const options = buildCustomOptions([
      {
        id: 12,
        uid: "custom-a",
        title: "Custom A",
        custom: true,
        _metaData: { deletedAt: "2026-06-18" },
      } as any,
    ]);

    expect(options).toHaveLength(0);
  });

  it("detects whether an existing custom option price changed", () => {
    const [option] = buildCustomOptions([
      {
        id: 12,
        uid: "custom-a",
        title: "Custom A",
        custom: true,
        pricing: {
          "custom-a": {
            price: 35,
          },
        },
      } as any,
    ]);

    expect(customComponentPriceChanged(option, 35)).toBe(false);
    expect(customComponentPriceChanged(option, 36)).toBe(true);
  });

  it("maps an existing custom option to a selected workflow component with adjusted sales price", () => {
    const [option] = buildCustomOptions([
      {
        id: 12,
        uid: "custom-a",
        title: "Custom A",
        custom: true,
        salesPrice: 60,
        pricing: {
          "custom-a": {
            price: 40,
          },
        },
      } as any,
    ]);

    const component = customOptionToWorkflowComponent(option!, 40, 0.5);

    expect(component.uid).toBe("custom-a");
    expect(component.basePrice).toBe(40);
    expect(component.salesPrice).toBe(80);
    expect(component.custom).toBe(true);
  });
});
