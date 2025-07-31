import { Suspense } from "react";
import { ProductOverview } from "@/components/product-page/product-overview";

export default async function ProductPage({ params }) {
  // const product = await api.shoppingProducts.getById.query({ id: params.id });
  const id = (await params).id;
  return (
    <div className="container mx-auto px-4 py-8">
      <Suspense fallback={<div>Loading reviews...</div>}>
        <ProductOverview productId={id} />
      </Suspense>
      <Suspense fallback={<div>Loading reviews...</div>}>
        {/* <ProductReviews productId={params.id} /> */}
      </Suspense>
      <Suspense fallback={<div>Loading similar products...</div>}>
        {/* <SimilarProducts similarProductIds={product.similarProductIds} /> */}
      </Suspense>
    </div>
  );
}
