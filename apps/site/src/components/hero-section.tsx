import { Button } from "@gnd/ui/button";
import Link from "next/link";

export function HeroSection() {
  return (
    <section className="relative h-[80vh] w-full overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
      <img
        src="/placeholder.svg"
        alt="Hero Background"
        className="h-full w-full object-cover"
      />
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center text-white">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
          Get Any Door Custom Design
        </h1>
        <p className="mt-4 max-w-2xl text-lg md:text-xl">
          From modern to classic, we have the perfect doors to elevate your
          space. Explore our wide selection of high-quality interior doors.
        </p>
        <div className="mt-8 flex gap-4">
          <Link href="#" prefetch={false}>
            <Button size="lg">Shop Now</Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
