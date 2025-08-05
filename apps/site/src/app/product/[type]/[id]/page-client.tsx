"use client";

import { useState, useEffect } from "react";
import { ArrowLeft, Share2, Truck, Shield, RotateCcw } from "lucide-react";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { ProductImageGallery } from "@/components/product-image-gallery";
import { ProductVariants } from "@/components/product-variants";
import { ProductSizeSelector } from "@/components/product-size-selector";
import { ProductQuantitySelector } from "@/components/product-quantity-selector";
import { ProductActions } from "@/components/product-actions";
import { ProductAddons } from "@/components/product-addons";
import { ProductReviews } from "@/components/product-reviews";
import { ProductSpecifications } from "@/components/product-specifications";
import { RelatedProducts } from "@/components/related-products";
import { Button } from "@gnd/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@gnd/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@gnd/ui/tabs";
import { Badge } from "@gnd/ui/badge";
import { useCartStore } from "@/lib/cart-store";
import { images, getVariantImage } from "@/lib/images";
import Link from "next/link";

// Mock product data with real images
const productData = {
  id: 1,
  name: "Craftsman Style Interior Door",
  price: 299.99,
  originalPrice: 349.99,
  description:
    "This beautiful craftsman-style interior door combines traditional design with modern craftsmanship. Made from premium solid wood with a rich finish that complements any home decor.",
  longDescription:
    "Our Craftsman Style Interior Door is meticulously crafted from premium solid wood, featuring the distinctive horizontal rail design that defines the craftsman aesthetic. Each door is carefully constructed using traditional joinery techniques combined with modern precision manufacturing to ensure lasting durability and beauty. The rich, hand-applied finish highlights the natural wood grain while providing protection against daily wear. This door is perfect for homeowners looking to add character and warmth to their interior spaces while maintaining the timeless appeal of craftsman design.",
  badge: "Best Seller",
  inStock: true,
  rating: 4.8,
  totalReviews: 24,
  images: [
    images.products.craftsmanDoor,
    images.categories.interiorDoors.images[1],
    images.categories.interiorDoors.images[2],
    images.categories.interiorDoors.images[3],
  ],
  variants: [
    { id: "natural", name: "Natural Oak", image: getVariantImage("natural") },
    {
      id: "walnut",
      name: "Dark Walnut",
      image: getVariantImage("walnut"),
      price: 50,
    },
    {
      id: "cherry",
      name: "Cherry",
      image: getVariantImage("cherry"),
      price: 75,
    },
    {
      id: "white",
      name: "Painted White",
      image: getVariantImage("white"),
      price: 25,
    },
  ],
  sizes: [
    { id: "24x80", name: '24" x 80"', dimensions: '24" W x 80" H', price: 0 },
    { id: "28x80", name: '28" x 80"', dimensions: '28" W x 80" H', price: 25 },
    { id: "30x80", name: '30" x 80"', dimensions: '30" W x 80" H', price: 35 },
    { id: "32x80", name: '32" x 80"', dimensions: '32" W x 80" H', price: 45 },
    { id: "36x80", name: '36" x 80"', dimensions: '36" W x 80" H', price: 55 },
  ],
  specifications: [
    { label: "Material", value: "Solid Oak Wood" },
    { label: "Thickness", value: '1-3/8"' },
    { label: "Style", value: "Craftsman/Mission" },
    { label: "Core", value: "Solid Wood" },
    { label: "Finish", value: "Pre-finished" },
    { label: "Warranty", value: "5 Years" },
    { label: "Fire Rating", value: "20 Minutes" },
    { label: "Installation", value: "Professional Recommended" },
  ],
  addons: [
    {
      id: "hardware-set",
      name: "Premium Hardware Set",
      description: "Includes hinges, handle, and lock set in matching finish",
      price: 89.99,
      image: images.addons.hardwareSet,
    },
    {
      id: "installation",
      name: "Professional Installation",
      description: "Expert installation service with 1-year warranty",
      price: 150.0,
      image: images.addons.installation,
    },
    {
      id: "trim-kit",
      name: "Matching Trim Kit",
      description: "Complete trim package for professional finish",
      price: 45.99,
      image: images.addons.trimKit,
    },
  ],
  reviews: [
    {
      id: "1",
      author: "John D.",
      rating: 5,
      date: "2 weeks ago",
      title: "Excellent Quality Door",
      content:
        "This door exceeded my expectations. The craftsmanship is outstanding and the finish is beautiful. Installation was straightforward and it fits perfectly.",
      helpful: 12,
      verified: true,
    },
    {
      id: "2",
      author: "Sarah M.",
      rating: 4,
      date: "1 month ago",
      title: "Great value for money",
      content:
        "Really happy with this purchase. The door looks great and feels solid. Only minor complaint is that delivery took a bit longer than expected.",
      helpful: 8,
      verified: true,
    },
    {
      id: "3",
      author: "Mike R.",
      rating: 5,
      date: "6 weeks ago",
      title: "Perfect for our renovation",
      content:
        "We bought 6 of these doors for our home renovation. They all arrived in perfect condition and the quality is consistent across all doors.",
      helpful: 15,
      verified: true,
    },
  ],
  ratingDistribution: { 5: 18, 4: 4, 3: 1, 2: 1, 1: 0 },
};

const relatedProducts = [
  {
    id: 2,
    name: "Modern Barn Door Kit",
    price: "$449.99",
    image: images.products.barnDoorKit,
    rating: 4.7,
    reviews: 31,
    badge: "Trending",
  },
  {
    id: 3,
    name: "French Door Set",
    price: "$1,299.99",
    image: images.products.frenchDoors,
    rating: 4.9,
    reviews: 12,
    badge: "New",
  },
  {
    id: 4,
    name: "Glass Panel Interior Door",
    price: "$399.99",
    image: images.products.glassPanelDoor,
    rating: 4.5,
    reviews: 15,
  },
  {
    id: 5,
    name: "Solid Oak Exterior Door",
    price: "$899.99",
    image: images.products.oakExteriorDoor,
    rating: 4.9,
    reviews: 18,
    badge: "Premium",
  },
];

interface ProductPageProps {
  params: { id: string };
}

export default function ProductPage({ params }: ProductPageProps) {
  // const { id } = await params;
  const { getTotalItems, addItem } = useCartStore();
  const [mounted, setMounted] = useState(false);
  const [selectedVariant, setSelectedVariant] = useState("natural");
  const [selectedSize, setSelectedSize] = useState("30x80");
  const [quantity, setQuantity] = useState(1);
  const [selectedAddons, setSelectedAddons] = useState<string[]>([]);
  const [isFavorite, setIsFavorite] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const currentProduct = productData;

  const calculateTotalPrice = () => {
    let total = currentProduct.price;

    // Add variant price
    const variant = currentProduct.variants.find(
      (v) => v.id === selectedVariant
    );
    if (variant?.price) total += variant.price;

    // Add size price
    const size = currentProduct.sizes.find((s) => s.id === selectedSize);
    if (size?.price) total += size.price;

    // Add addon prices
    selectedAddons.forEach((addonId) => {
      const addon = currentProduct.addons.find((a) => a.id === addonId);
      if (addon) total += addon.price;
    });

    return total * quantity;
  };

  const toggleFavorite = () => {
    setIsFavorite(!isFavorite);
  };

  const handleAddonChange = (addonId: string, selected: boolean) => {
    if (selected) {
      setSelectedAddons([...selectedAddons, addonId]);
    } else {
      setSelectedAddons(selectedAddons.filter((id) => id !== addonId));
    }
  };

  const getSelectedVariantName = () => {
    const variant = currentProduct.variants.find(
      (v) => v.id === selectedVariant
    );
    return variant?.name;
  };

  const getSelectedSizeName = () => {
    const size = currentProduct.sizes.find((s) => s.id === selectedSize);
    return size?.name;
  };

  const productForCart = {
    id: currentProduct.id,
    name: currentProduct.name,
    price: calculateTotalPrice() / quantity, // Price per unit
    image: currentProduct.images[0],
    variant: getSelectedVariantName(),
    size: getSelectedSizeName(),
  };

  if (!mounted) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <div className="text-center py-16">
            <div className="animate-pulse">Loading product...</div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header cartItems={getTotalItems()} />

      <div className="container mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <div className="flex items-center space-x-2 text-sm text-gray-600 mb-6">
          <Link href="/" className="hover:text-gray-900">
            Home
          </Link>
          <span>/</span>
          <Link href="/search" className="hover:text-gray-900">
            Products
          </Link>
          <span>/</span>
          <span className="text-gray-900">{currentProduct.name}</span>
        </div>

        {/* Back Button */}
        <Link href="/search">
          <Button variant="ghost" className="mb-6">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Products
          </Button>
        </Link>

        <div className="grid lg:grid-cols-2 gap-12 mb-12">
          {/* Product Images */}
          <div>
            <ProductImageGallery
              images={currentProduct.images}
              productName={currentProduct.name}
            />
          </div>

          {/* Product Info */}
          <div className="space-y-6">
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  {currentProduct.badge && (
                    <Badge className="bg-amber-600">
                      {currentProduct.badge}
                    </Badge>
                  )}
                </div>
                <Button variant="ghost" size="icon">
                  <Share2 className="h-4 w-4" />
                </Button>
              </div>

              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                {currentProduct.name}
              </h1>

              <div className="flex items-center space-x-4 mb-4">
                <div className="flex items-center">
                  {[...Array(5)].map((_, i) => (
                    <span
                      key={i}
                      className={`text-lg ${
                        i < Math.floor(currentProduct.rating)
                          ? "text-yellow-400"
                          : "text-gray-300"
                      }`}
                    >
                      ★
                    </span>
                  ))}
                </div>
                <span className="text-sm text-gray-600">
                  {currentProduct.rating} ({currentProduct.totalReviews}{" "}
                  reviews)
                </span>
              </div>

              <p className="text-gray-700 mb-6">{currentProduct.description}</p>
            </div>

            {/* Variants */}
            <ProductVariants
              variants={currentProduct.variants}
              selectedVariant={selectedVariant}
              onVariantChange={setSelectedVariant}
            />

            {/* Size Selection */}
            <ProductSizeSelector
              sizes={currentProduct.sizes}
              selectedSize={selectedSize}
              onSizeChange={setSelectedSize}
            />

            {/* Quantity */}
            <ProductQuantitySelector
              quantity={quantity}
              onQuantityChange={setQuantity}
            />

            {/* Actions */}
            <ProductActions
              product={productForCart}
              onAddToFavorites={toggleFavorite}
              isFavorite={isFavorite}
              inStock={currentProduct.inStock}
              price={`$${calculateTotalPrice().toFixed(2)}`}
            />

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

        {/* Add-ons */}
        <div className="mb-12">
          <ProductAddons
            addons={currentProduct.addons}
            selectedAddons={selectedAddons}
            onAddonChange={handleAddonChange}
          />
        </div>

        {/* Product Details Tabs */}
        <div className="mb-12">
          <Tabs defaultValue="description" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="description">Description</TabsTrigger>
              <TabsTrigger value="specifications">Specifications</TabsTrigger>
              <TabsTrigger value="reviews">Reviews</TabsTrigger>
            </TabsList>

            <TabsContent value="description" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Product Description</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-700 leading-relaxed">
                    {currentProduct.longDescription}
                  </p>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="specifications" className="mt-6">
              <ProductSpecifications
                specifications={currentProduct.specifications}
              />
            </TabsContent>

            <TabsContent value="reviews" className="mt-6">
              <ProductReviews
                reviews={currentProduct.reviews}
                averageRating={currentProduct.rating}
                totalReviews={currentProduct.totalReviews}
                ratingDistribution={currentProduct.ratingDistribution}
              />
            </TabsContent>
          </Tabs>
        </div>

        {/* Related Products */}
        <RelatedProducts products={relatedProducts} onAddToCart={() => {}} />
      </div>

      <Footer />
    </div>
  );
}
