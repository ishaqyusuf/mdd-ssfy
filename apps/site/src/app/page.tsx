"use client";

import { Features } from "@/components/features";
import { Footer } from "@/components/footer";
import { Header } from "@/components/header";
import { HeroSection } from "@/components/hero-section";
import { PopularProducts } from "@/components/popular-products";
import { ProductCategories } from "@/components/product-categories";

export default function PageClient() {
  return (
    <div>
      <Header />
      <main>
        <HeroSection />
        <PopularProducts />
        <ProductCategories />
        <Features />
      </main>
      <Footer />
    </div>
  );
}
