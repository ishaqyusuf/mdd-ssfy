import { Button } from "@gnd/ui/button";
import Link from "next/link";
import { images } from "@/lib/images";

export function Hero() {
  return (
    <section className="relative bg-gradient-to-r from-amber-50 to-orange-50 py-20">
      <div className="container mx-auto px-4">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              Premium Doors & Millwork Solutions
            </h2>
            <p className="text-xl text-gray-600 mb-8">
              Discover our extensive collection of high-quality doors, hardware,
              and custom millwork. From traditional craftsmanship to modern
              designs, we have everything for your project.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link href="/search">
                <Button size="lg" className="bg-amber-700 hover:bg-amber-800">
                  Shop Now
                </Button>
              </Link>
              <Link href="/custom">
                <Button size="lg" variant="outline">
                  Request Quote
                </Button>
              </Link>
            </div>
          </div>
          <div className="relative">
            <img
              src={images.hero.main || "/placeholder.svg"}
              alt="Premium door showroom featuring custom millwork and quality craftsmanship"
              className="rounded-lg shadow-2xl w-full h-[500px] object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent rounded-lg"></div>
          </div>
        </div>
      </div>
    </section>
  );
}
