"use client";

import { ProductProvider, useProduct } from "@/hooks/use-product";
import { Button } from "@gnd/ui/button";
import { ArrowLeft, RotateCcw, Share2, Shield, Truck } from "lucide-react";
import Link from "next/link";
import { ProductImageGallery } from "@/components/product-image-gallery";
import { Badge } from "@gnd/ui/badge";
import { ProductVariants } from "../product-variants";
import { ProductQuantitySelector } from "../product-quantity-selector";
import { ProductActions } from "../product-actions";
import { ProductComponents } from "../product-components";

export function ProductClient({ categorySlug, productSlug }) {
  return (
    <ProductProvider
      args={[
        {
          categorySlug,
          productSlug,
        },
      ]}
    >
      <Content />
    </ProductProvider>
  );
}
function Content() {
  const { product } = useProduct();
  return (
    <div className="container mx-auto px-4 py-8">
      {/* Breadcrumb */}
      <div className="flex items-center space-x-2 text-sm text-gray-600 mb-6">
        <Link href="/" className="hover:text-gray-900">
          Home
        </Link>
        <span>/</span>
        <Link
          href={`/search?categorySlug=${product.category.slug}`}
          className="hover:text-gray-900"
        >
          {product.category.title}
        </Link>
        <span>/</span>
        <span className="text-gray-900">{product.name}</span>
      </div>

      {/* Back Button */}
      <Link href={`/search?categorySlug=${product.category.slug}`}>
        <Button variant="ghost" className="mb-6">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Products
        </Button>
      </Link>

      <div className="grid lg:grid-cols-2 gap-12 mb-12">
        <div>
          <ProductImageGallery />
          {/* <ProductImageCarousel images={product.images} /> */}
        </div>
        {/* Product Info */}
        <div className="space-y-6">
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                {product.badge && (
                  <Badge className="bg-amber-600">{product.badge}</Badge>
                )}
              </div>
              <Button variant="ghost" size="icon">
                <Share2 className="h-4 w-4" />
              </Button>
            </div>

            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {product.name}
            </h1>

            <div className="flex items-center space-x-4 mb-4">
              <div className="flex items-center">
                {[...Array(5)].map((_, i) => (
                  <span
                    key={i}
                    className={`text-lg ${
                      i < Math.floor(product.rating)
                        ? "text-yellow-400"
                        : "text-gray-300"
                    }`}
                  >
                    ★
                  </span>
                ))}
              </div>
              <span className="text-sm text-gray-600">
                {product.rating} ({product.reviews} reviews)
              </span>
            </div>

            <p className="text-gray-700 mb-6">{product.description}</p>
          </div>

          <ProductVariants />
          {/* <ProductSizeSelector/> */}
          {/* Quantity */}
          <ProductQuantitySelector />

          {/* Actions */}
          {/* <ProductActions
          product={productForCart}
          onAddToFavorites={toggleFavorite}
          isFavorite={isFavorite}
          inStock={currentProduct.inStock}
          price={`$${calculateTotalPrice().toFixed(2)}`}
        /> */}
          <ProductActions />
          {/* Features */}
          <div className="grid grid-cols-3 gap-4 pt-6 border-t">
            <div className="text-center">
              <Truck className="h-6 w-6 mx-auto mb-2 text-amber-600" />
              <div className="text-sm font-medium">Free Delivery</div>
              <div className="text-xs text-gray-600">Within 50 miles</div>
            </div>
            <div className="text-center">
              <Shield className="h-6 w-6 mx-auto mb-2 text-amber-600" />
              <div className="text-sm font-medium">5 Year Warranty</div>
              <div className="text-xs text-gray-600">Full coverage</div>
            </div>
            <div className="text-center">
              <RotateCcw className="h-6 w-6 mx-auto mb-2 text-amber-600" />
              <div className="text-sm font-medium">30 Day Returns</div>
              <div className="text-xs text-gray-600">Easy returns</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
