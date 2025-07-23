import { Button } from "@gnd/ui/button";
import { Card, CardContent } from "@gnd/ui/card";
import Link from "next/link";

export function PopularProducts() {
  return (
    <section className="py-12 md:py-20">
      <div className="container">
        <div className="mb-8 text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Popular Interior Doors
          </h2>
          <p className="mt-4 max-w-2xl mx-auto text-lg text-muted-foreground">
            Interior door replacements add style and function to your room
          </p>
        </div>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardContent className="p-4">
              <img
                src="/placeholder.svg"
                alt="Door 1"
                className="mb-4 h-64 w-full object-cover"
              />
              <h3 className="text-lg font-semibold">Modern Shaker Door</h3>
              <p className="text-muted-foreground">$299</p>
              <Link href="#" className="mt-4 inline-block" prefetch={false}>
                <Button>View Product</Button>
              </Link>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <img
                src="/placeholder.svg"
                alt="Door 2"
                className="mb-4 h-64 w-full object-cover"
              />
              <h3 className="text-lg font-semibold">Classic Panel Door</h3>
              <p className="text-muted-foreground">$249</p>
              <Link href="#" className="mt-4 inline-block" prefetch={false}>
                <Button>View Product</Button>
              </Link>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <img
                src="/placeholder.svg"
                alt="Door 3"
                className="mb-4 h-64 w-full object-cover"
              />
              <h3 className="text-lg font-semibold">Frosted Glass Door</h3>
              <p className="text-muted-foreground">$399</p>
              <Link href="#" className="mt-4 inline-block" prefetch={false}>
                <Button>View Product</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}
