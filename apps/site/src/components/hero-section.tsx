import { Button } from "@gnd/ui/button";
import Image from "next/image";
import Link from "next/link";

export function HeroSection() {
  const images = [
    "https://gndmillwork.com/wp-content/uploads/2020/07/interior-bedroom-door-with-modern-home-luxury-mia-vetro-modern-interior-door-wenge.jpg",
    "https://gndmillwork.com/wp-content/uploads/2020/07/modern-doors-fashion_C2en_1252.jpg",
    "https://gndmillwork.com/wp-content/uploads/2020/07/solutions-sliding_doors-02.jpg",
  ];

  return (
    <section className="relative h-[150vh] w-full overflow-hidden">
      <div className="absolute inset-0 bg-black/60" />
      <div className="grid h-full w-full grid-cols-2 grid-rows-2 gap-2">
        <div className="col-span-1 row-span-1 relative">
          <Image
            src={images[0]}
            alt="Hero Background 1"
            layout="fill"
            objectFit="cover"
            className="rounded-lg"
          />
        </div>
        <div className="col-span-1 row-span-1 relative">
          <Image
            src={images[1]}
            alt="Hero Background 2"
            layout="fill"
            objectFit="cover"
            className="rounded-lg"
          />
        </div>
        <div className="col-span-2 row-span-1 relative">
          <Image
            src={images[2]}
            alt="Hero Background 3"
            layout="fill"
            objectFit="cover"
            className="rounded-lg"
          />
        </div>
      </div>
      <div className="absolute inset-0 z-10 flex flex-col items-center justify-center text-center text-primary-foreground">
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
