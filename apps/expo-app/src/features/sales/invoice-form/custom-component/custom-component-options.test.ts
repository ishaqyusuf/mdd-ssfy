import { describe, expect, it } from "bun:test";
import {
  buildCustomOptions,
  canProceedCustomComponentDetails,
  customComponentPriceChanged,
  customOptionToWorkflowComponent,
  findCustomOptionByTitle,
  mergeSelectedCustomComponents,
  normalizeCustomComponentTitleInput,
  orderSelectedCustomFirst,
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

  it("normalizes custom component titles like the website", () => {
    expect(normalizeCustomComponentTitleInput(" custom arch ")).toBe(
      "CUSTOM ARCH",
    );
  });

  it("uses normalized fallback copy for sparse custom options", () => {
    const [option] = buildCustomOptions([
      {
        id: 12,
        uid: "custom-a",
        title: "",
        custom: true,
      } as any,
    ]);

    expect(option?.title).toBe("CUSTOM COMPONENT");
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

    expect(option?.title).toBe("CUSTOM A");
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

  it("detects and filters custom components with string metadata", () => {
    const options = buildCustomOptions([
      {
        id: 12,
        uid: "custom-a",
        title: "Custom A",
        _metaData: JSON.stringify({ custom: true }),
        pricing: {
          "custom-a": {
            price: 35,
          },
        },
      } as any,
      {
        id: 13,
        uid: "custom-b",
        title: "Archived Custom",
        _metaData: JSON.stringify({
          custom: true,
          deletedAt: "2026-06-18",
        }),
      } as any,
    ]);

    expect(options.map((option) => option.uid)).toEqual(["custom-a"]);
    expect(options[0]?.price).toBe(35);
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

  it("matches website null and zero custom price change semantics", () => {
    const [unpricedOption] = buildCustomOptions([
      {
        id: 12,
        uid: "custom-a",
        title: "Custom A",
        custom: true,
      } as any,
    ]);
    const [zeroPriceOption] = buildCustomOptions([
      {
        id: 13,
        uid: "custom-b",
        title: "Custom B",
        custom: true,
        pricing: {
          "custom-b": {
            price: 0,
          },
        },
      } as any,
    ]);

    expect(customComponentPriceChanged(unpricedOption, null)).toBe(false);
    expect(customComponentPriceChanged(unpricedOption, 0)).toBe(true);
    expect(customComponentPriceChanged(zeroPriceOption, 0)).toBe(false);
    expect(customComponentPriceChanged(zeroPriceOption, null)).toBe(true);
  });

  it("matches typed custom titles to existing options case-insensitively", () => {
    const options = buildCustomOptions([
      {
        id: 12,
        uid: "custom-a",
        title: "Custom Arch",
        custom: true,
        pricing: {
          "custom-a": {
            price: 35,
          },
        },
      } as any,
    ]);

    expect(options[0]?.title).toBe("CUSTOM ARCH");
    expect(findCustomOptionByTitle(options, " custom arch ")?.uid).toBe(
      "custom-a",
    );
    expect(findCustomOptionByTitle(options, "Custom Shelf")).toBeNull();
  });

  it("allows selecting an unchanged existing option without requiring an upsert step id", () => {
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

    expect(
      canProceedCustomComponentDetails({
        stepId: 0,
        title: "CUSTOM A",
        selectedOption: option,
        nextPrice: 35,
      }),
    ).toBe(true);
  });

  it("requires a step id when a custom component must be created or updated", () => {
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

    expect(
      canProceedCustomComponentDetails({
        stepId: 0,
        title: "CUSTOM A",
        selectedOption: option,
        nextPrice: 36,
      }),
    ).toBe(false);
    expect(
      canProceedCustomComponentDetails({
        stepId: 12,
        title: "CUSTOM A",
        selectedOption: option,
        nextPrice: 36,
      }),
    ).toBe(true);
    expect(
      canProceedCustomComponentDetails({
        stepId: 0,
        title: "CUSTOM B",
        selectedOption: null,
        nextPrice: 36,
      }),
    ).toBe(false);
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
    expect(component.title).toBe("CUSTOM A");
    expect(component.basePrice).toBe(40);
    expect(component.salesPrice).toBe(80);
    expect(component.custom).toBe(true);
  });

  it("merges selected custom snapshots into the visible component list", () => {
    const components = [
      { uid: "standard", title: "Standard", salesPrice: 10 } as any,
    ];

    const merged = mergeSelectedCustomComponents(components, {
      meta: {
        selectedComponents: [
          {
            uid: "custom-a",
            title: "Custom A",
            custom: true,
            salesPrice: 25,
          },
        ],
      },
    } as any);

    expect(merged.map((component) => component.uid)).toEqual([
      "custom-a",
      "standard",
    ]);
  });

  it("merges selected custom snapshots from string step metadata", () => {
    const components = [
      { uid: "standard", title: "Standard", salesPrice: 10 } as any,
    ];

    const merged = mergeSelectedCustomComponents(components, {
      meta: JSON.stringify({
        selectedComponents: [
          {
            uid: "custom-a",
            title: "Custom A",
            _metaData: JSON.stringify({ custom: true }),
            salesPrice: 25,
          },
        ],
      }),
    } as any);

    expect(merged.map((component) => component.uid)).toEqual([
      "custom-a",
      "standard",
    ]);
  });

  it("merges selected custom snapshots from nested route-step metadata", () => {
    const components = [
      { uid: "standard", title: "Standard", salesPrice: 10 } as any,
    ];

    const merged = mergeSelectedCustomComponents(components, {
      step: {
        meta: JSON.stringify({
          selectedComponents: [
            {
              uid: "custom-a",
              title: "Custom A",
              _metaData: JSON.stringify({ custom: true }),
              salesPrice: 25,
            },
          ],
        }),
      },
    } as any);

    expect(merged.map((component) => component.uid)).toEqual([
      "custom-a",
      "standard",
    ]);
  });

  it("merges selected custom snapshots when outer metadata is empty and nested metadata has the selection", () => {
    const components = [
      { uid: "standard", title: "Standard", salesPrice: 10 } as any,
    ];

    const merged = mergeSelectedCustomComponents(components, {
      meta: { selectedComponents: [] },
      step: {
        meta: {
          selectedComponents: [
            {
              uid: "custom-a",
              title: "Custom A",
              custom: true,
              salesPrice: 25,
            },
          ],
        },
      },
    } as any);

    expect(merged.map((component) => component.uid)).toEqual([
      "custom-a",
      "standard",
    ]);
  });

  it("does not duplicate selected customs that are already visible", () => {
    const components = [
      { uid: "custom-a", title: "Custom A", custom: true } as any,
      { uid: "standard", title: "Standard" } as any,
    ];

    const merged = mergeSelectedCustomComponents(components, {
      meta: {
        selectedComponents: [
          { uid: "custom-a", title: "Custom A", custom: true },
        ],
      },
    } as any);

    expect(merged.map((component) => component.uid)).toEqual([
      "custom-a",
      "standard",
    ]);
  });

  it("pins selected custom components first with string step metadata", () => {
    const components = [
      { uid: "standard", title: "Standard" } as any,
      {
        uid: "custom-a",
        title: "Custom A",
        _metaData: JSON.stringify({ custom: true }),
      } as any,
    ];

    const ordered = orderSelectedCustomFirst(components, {
      meta: JSON.stringify({
        selectedProdUids: ["custom-a"],
      }),
    } as any);

    expect(ordered.map((component) => component.uid)).toEqual([
      "custom-a",
      "standard",
    ]);
  });

  it("pins selected custom components first with nested route-step metadata", () => {
    const components = [
      { uid: "standard", title: "Standard" } as any,
      {
        uid: "custom-a",
        title: "Custom A",
        _metaData: JSON.stringify({ custom: true }),
      } as any,
    ];

    const ordered = orderSelectedCustomFirst(components, {
      step: {
        meta: JSON.stringify({
          selectedProdUids: ["custom-a"],
        }),
      },
    } as any);

    expect(ordered.map((component) => component.uid)).toEqual([
      "custom-a",
      "standard",
    ]);
  });

  it("pins selected custom components first when outer selected uids are empty and nested metadata has the selection", () => {
    const components = [
      { uid: "standard", title: "Standard" } as any,
      { uid: "custom-a", title: "Custom A", custom: true } as any,
    ];

    const ordered = orderSelectedCustomFirst(components, {
      meta: { selectedProdUids: [] },
      step: {
        meta: {
          selectedProdUids: ["custom-a"],
        },
      },
    } as any);

    expect(ordered.map((component) => component.uid)).toEqual([
      "custom-a",
      "standard",
    ]);
  });
});
