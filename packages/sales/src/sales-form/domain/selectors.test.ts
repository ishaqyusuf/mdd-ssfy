import { describe, expect, it } from "bun:test";
import {
  findLineStepByTitle,
  getItemType,
  getSelectedDoorComponentsForLine,
  getSelectedMouldingComponentsForLine,
  isMouldingItem,
  isServiceItem,
  isShelfItem,
} from "./selectors";

describe("selectors domain", () => {
  const line = {
    formSteps: [
      {
        step: { title: "Item Type" },
        value: "Moulding",
      },
      {
        step: { title: "Door" },
        prodUid: "door-1",
        value: "Door A",
      },
      {
        step: { title: "Moulding" },
        prodUid: "m-1",
        value: "Casing",
      },
    ],
  };

  it("resolves item type and type predicates", () => {
    expect(getItemType(line)).toBe("moulding");
    expect(isMouldingItem(line)).toBe(true);
    expect(isServiceItem(line)).toBe(false);
    expect(isShelfItem(line)).toBe(false);
  });

  it("treats molding/mouldings variants as moulding item type", () => {
    const variantLine = {
      formSteps: [
        {
          step: { title: "Item Type" },
          value: "Moldings",
        },
      ],
    };
    expect(isMouldingItem(variantLine)).toBe(true);
  });

  it("finds line step by title", () => {
    const step = findLineStepByTitle(line, "Door");
    expect(step?.value).toBe("Door A");
  });

  it("extracts selected door components fallback", () => {
    const doors = getSelectedDoorComponentsForLine(line);
    expect(doors).toHaveLength(1);
    expect(doors[0].uid).toBe("door-1");
  });

  it("extracts selected moulding components fallback", () => {
    const mouldings = getSelectedMouldingComponentsForLine(line);
    expect(mouldings).toHaveLength(1);
    expect(mouldings[0].uid).toBe("m-1");
  });
});
