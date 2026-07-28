import { describe, expect, it } from "bun:test";
import { createDefaultLineItems } from "../mock-data";
import {
  buildInvoiceItemSections,
  isWorkflowSectionLine,
} from "./items-step-sections";

describe("invoice item sections", () => {
  it("treats the seeded first line as the active workflow section", () => {
    const [seededLine] = createDefaultLineItems();
    expect(seededLine).toBeDefined();

    const sections = buildInvoiceItemSections([seededLine!], "Invoice item");

    expect(isWorkflowSectionLine(seededLine!)).toBe(true);
    expect(sections).toHaveLength(1);
    expect(sections[0]?.hasWorkflow).toBe(true);
    expect(sections[0]?.key).toBe(`workflow:${seededLine!.uid}`);
    expect(firstStepTitle(sections[0]?.lines[0])).toBe("Item Type");
  });
});

function firstStepTitle(
  line:
    | {
        formSteps?: Array<{
          step?: { title?: string | null } | null;
        }> | null;
      }
    | null
    | undefined,
) {
  return line?.formSteps?.[0]?.step?.title;
}
