import { describe, expect, it } from "bun:test";
import { patchShelfSectionCategories } from "./shelf-inline-items-editor";

describe("shelf inline section categories", () => {
  it("clears products and pricing when a section category changes", () => {
    const next = patchShelfSectionCategories(
      {
        uid: "section-1",
        categoryIds: [1, 2],
        parentCategoryId: 1,
        categoryId: 2,
        subTotal: 48,
        rows: [
          {
            uid: "row-1",
            id: 7,
            categoryId: 2,
            productId: 11,
            description: "Shelf",
            qty: 2,
            unitPrice: 24,
            totalPrice: 48,
            basePrice: 20,
            salesPrice: 24,
            customPrice: 24,
            meta: { categoryIds: [1, 2], shelfParentCategoryId: 1 },
          },
        ],
      },
      [3],
    );

    expect(next.categoryIds).toEqual([3]);
    expect(next.parentCategoryId).toBe(3);
    expect(next.categoryId).toBe(3);
    expect(next.subTotal).toBe(0);
    expect(next.rows[0]).toMatchObject({
      productId: null,
      description: "",
      categoryId: 3,
      unitPrice: 0,
      totalPrice: 0,
      qty: 2,
    });
    expect(next.rows[0]?.meta).toMatchObject({
      categoryIds: [3],
      shelfParentCategoryId: 3,
    });
  });

  it("supports clearing a section category path", () => {
    const next = patchShelfSectionCategories(
      {
        uid: "section-1",
        categoryIds: [1],
        parentCategoryId: 1,
        categoryId: 1,
        subTotal: 10,
        rows: [],
      },
      [],
    );

    expect(next.categoryIds).toEqual([]);
    expect(next.parentCategoryId).toBeNull();
    expect(next.categoryId).toBeNull();
    expect(next.subTotal).toBe(0);
  });
});
