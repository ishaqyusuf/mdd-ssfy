import { describe, expect, it } from "bun:test";
import {
  buildShelfProductBuckets,
  getVisibleShelfProducts,
  MOBILE_SHELF_PRODUCT_LIMIT,
} from "./shelf-product-options";

const categories = [
  { id: 1, name: "Hardware", parentCategoryId: null, categoryId: null },
  { id: 2, name: "Hinges", parentCategoryId: 1, categoryId: 1 },
  { id: 3, name: "Locks", parentCategoryId: 1, categoryId: 1 },
] as any[];

describe("shelf product options", () => {
  it("returns category-scoped products capped for mobile rendering", () => {
    const products = Array.from(
      { length: MOBILE_SHELF_PRODUCT_LIMIT + 5 },
      (_, index) => ({
        id: index + 1,
        title: `Hinge ${index + 1}`,
        categoryId: 2,
        parentCategoryId: 1,
      }),
    ) as any[];
    const buckets = buildShelfProductBuckets(products);

    const result = getVisibleShelfProducts({
      categories,
      productBuckets: buckets,
      categoryIds: [1],
    });

    expect(result.totalCount).toBe(MOBILE_SHELF_PRODUCT_LIMIT + 5);
    expect(result.visibleProducts).toHaveLength(MOBILE_SHELF_PRODUCT_LIMIT);
    expect(result.hasMoreProducts).toBe(true);
  });

  it("dedupes products that match both parent and leaf category buckets", () => {
    const buckets = buildShelfProductBuckets([
      {
        id: 1,
        title: "Ball Bearing Hinge",
        categoryId: 2,
        parentCategoryId: 1,
      } as any,
    ]);

    const result = getVisibleShelfProducts({
      categories,
      productBuckets: buckets,
      categoryIds: [1],
    });

    expect(result.visibleProducts.map((product) => product.id)).toEqual([1]);
  });

  it("filters visible products by search text", () => {
    const buckets = buildShelfProductBuckets([
      { id: 1, title: "Ball Bearing Hinge", categoryId: 2 } as any,
      { id: 2, title: "Mortise Lock", categoryId: 3 } as any,
    ]);

    const result = getVisibleShelfProducts({
      categories,
      productBuckets: buckets,
      categoryIds: [1],
      query: "lock",
    });

    expect(result.visibleProducts.map((product) => product.title)).toEqual([
      "Mortise Lock",
    ]);
    expect(result.hasMoreProducts).toBe(false);
  });

  it("allows global product search before a category is selected", () => {
    const buckets = buildShelfProductBuckets([
      { id: 1, title: "Ball Bearing Hinge", categoryId: 2 } as any,
      { id: 2, title: "Mortise Lock", categoryId: 3 } as any,
    ]);

    const result = getVisibleShelfProducts({
      categories,
      productBuckets: buckets,
      categoryIds: [],
      query: "hinge",
    });

    expect(result.visibleProducts.map((product) => product.title)).toEqual([
      "Ball Bearing Hinge",
    ]);
  });
});
