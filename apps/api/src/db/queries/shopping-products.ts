import type { TRPCContext } from "@api/trpc/init";
import type { ProductSearchSchema } from "@api/schemas/shopping-products";
import { composeQueryData } from "@gnd/utils/query-response";
import { getSalesSetting } from "./settings";

export async function searchProducts(
  ctx: TRPCContext,
  query: ProductSearchSchema
) {
  const { db } = ctx; // db is available but not used for mock data
  const { response, searchMeta, where } = await composeQueryData(
    query,
    // whereSales(query),
    {},
    db.salesOrders
  );
  const data = await db.dykeStepProducts.findMany({
    where: {
      step: {
        title: "Door",
      },
    },
    ...searchMeta,
    select: {
      name: true,
      img: true,
      id: true,
      uid: true,
    },
  });
  const result = await response(
    data.map((item) => {
      let price = 100;
      return {
        id: item.id,
        uid: item.uid,
        price,
        name: item.name,
        img: item.img,
        section: "Door",
        category: "Interior Doors",

        rating: 4.8,
        reviews: [
          {
            id: "r4",
            author: "Diana Prince",
            rating: 5,
            comment: "Beautiful door, excellent privacy.",
          },
          {
            id: "r5",
            author: "Clark Kent",
            rating: 5,
            comment: "Perfect for my office, very stylish.",
          },
        ],
        similarProductIds: ["1", "2"],
      };
    })
  );

  return result;
}

export async function getProductById(ctx: TRPCContext, query) {
  const {
    data: [product],
  } = await searchProducts(ctx, {
    productId: query.productID,
  });
  product?.price;
  const setting = await getSalesSetting(ctx);

  return {
    ...product,
  };
}

export async function getProductReviews(ctx: TRPCContext, query) {}
export async function getSimilarProducts(ctx: TRPCContext, query) {}
