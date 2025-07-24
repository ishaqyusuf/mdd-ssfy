import { notFound } from "next/navigation";
import { formatPrice } from "@/lib/utils";

import { ProductImageGallery } from "@/components/product-page/product-image-gallery";
import { ProductInteraction } from "@/components/product-page/product-interaction";
import { ProductDescription } from "@/components/product-page/product-description";
import { ProductRatingsAndReviews } from "@/components/product-page/product-ratings-reviews";
import { SimilarProducts } from "@/components/product-page/similar-products";
import { Breadcrumbs } from "@/components/breadcrumbs";

interface ProductPageProps {
  params: {
    slug: string;
  };
}

export default async function ProductPage({ params }: ProductPageProps) {
  const slug = (await params).slug;
  // const product = shopProducts.find((p) => p.id === slug);

  if (!product) {
    notFound();
  }

  const breadcrumbItems = [
    { label: "Products", href: "/shop" },
    { label: product.category, href: `/shop?categories=${product.category}` },
    { label: product.name },
  ];

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-4">
        <Breadcrumbs items={breadcrumbItems} />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Product Image Gallery */}
        <ProductImageGallery imageUrl={product.imageUrl} name={product.name} />

        {/* Product Details and Interaction */}
        <div className="space-y-6">
          <h1 className="text-4xl font-bold">{product.name}</h1>
          <p className="text-2xl font-semibold text-gray-900">
            {formatPrice(product.price)}
          </p>

          <ProductInteraction product={product} />
        </div>
      </div>

      {/* Product Description */}
      <div className="mt-12">
        <ProductDescription
          description={product.description}
          longDescription={product.longDescription}
        />
      </div>

      {/* Ratings and Reviews */}
      <div className="mt-12">
        <ProductRatingsAndReviews
          rating={product.rating}
          reviews={product.reviews}
        />
      </div>

      {/* Similar Products */}
      <div className="mt-12">
        <SimilarProducts similarProductIds={product.similarProductIds} />
      </div>
    </div>
  );
}
