"use client";

import { Header } from "@/components/header";
import { Hero } from "@/components/hero";
import { ProductCard } from "@/components/product-card-1";
import { CategoryCard } from "@/components/category-card-1";
import { Footer } from "@/components/footer";
import { images } from "@/lib/images";

const categories = [
  {
    name: "Interior Doors",
    image: images.categories.interiorDoors.images[0],
    description: "Premium interior doors for residential and commercial use",
    count: "150+ products",
    href: "/search?category=interior-doors",
  },
  {
    name: "Exterior Doors",
    image: images.categories.exteriorDoors.images[0],
    description: "Weather-resistant exterior doors and entry systems",
    count: "80+ products",
    href: "/search?category=exterior-doors",
  },
  {
    name: "Door Hardware",
    image: images.categories.doorHardware.images[0],
    description: "Handles, locks, hinges, and accessories",
    count: "200+ products",
    href: "/search?category=hardware",
  },
  {
    name: "Custom Millwork",
    image: images.categories.customMillwork.images[0],
    description: "Bespoke millwork solutions and trim packages",
    count: "Custom orders",
    href: "/custom",
  },
];

const featuredProducts = [
  {
    id: 1,
    name: "Craftsman Style Interior Door",
    price: "$299.99",
    originalPrice: "$349.99",
    image: images.products.craftsmanDoor,
    rating: 4.8,
    reviews: 24,
    badge: "Best Seller",
  },
  {
    id: 2,
    name: "Solid Oak Exterior Door",
    price: "$899.99",
    image: images.products.oakExteriorDoor,
    rating: 4.9,
    reviews: 18,
    badge: "Premium",
  },
  {
    id: 3,
    name: "Modern Barn Door Kit",
    price: "$449.99",
    image: images.products.barnDoorKit,
    rating: 4.7,
    reviews: 31,
    badge: "Trending",
  },
  {
    id: 4,
    name: "French Door Set",
    price: "$1,299.99",
    image: images.products.frenchDoors,
    rating: 4.9,
    reviews: 12,
    badge: "New",
  },
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <Hero />

      {/* Categories Section */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h3 className="text-3xl font-bold text-gray-900 mb-4">
              Shop by Category
            </h3>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Browse our comprehensive selection of doors and millwork
              components, carefully curated for quality and craftsmanship.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {categories.map((category, index) => (
              <CategoryCard key={index} {...category} />
            ))}
          </div>
        </div>
      </section>

      {/* Featured Products */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h3 className="text-3xl font-bold text-gray-900 mb-4">
              Featured Products
            </h3>
            <p className="text-gray-600">
              Our most popular doors and components
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {featuredProducts.map((product) => (
              <ProductCard key={product.id} {...product} />
            ))}
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h3 className="text-3xl font-bold text-gray-900 mb-4">
              Why Choose MillworkPro?
            </h3>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-8 h-8 text-amber-700"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <h4 className="text-xl font-semibold mb-2">Quality Guaranteed</h4>
              <p className="text-gray-600">
                All products backed by our comprehensive warranty and quality
                assurance.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-8 h-8 text-amber-700"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
              </div>
              <h4 className="text-xl font-semibold mb-2">Fast Delivery</h4>
              <p className="text-gray-600">
                Quick turnaround times with free delivery within 50 miles.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-8 h-8 text-amber-700"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                  />
                </svg>
              </div>
              <h4 className="text-xl font-semibold mb-2">
                Expert Installation
              </h4>
              <p className="text-gray-600">
                Professional installation services available for all products.
              </p>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
