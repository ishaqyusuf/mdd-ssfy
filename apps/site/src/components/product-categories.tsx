import { Button } from "@gnd/ui/button";
import { Card, CardContent } from "@gnd/ui/card";
import Link from "next/link";

export function ProductCategories() {
  return (
    <section className="bg-muted py-12 md:py-20">
      <div className="container">
        <div className="mb-8 text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Door Accessories
          </h2>
          <p className="mt-4 max-w-2xl mx-auto text-lg text-muted-foreground">
            Door handles, Door knobs, Door levers.....
          </p>
        </div>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardContent className="p-4">
              <img
                src="/placeholder.svg"
                alt="Handles"
                className="mb-4 h-48 w-full object-cover"
              />
              <h3 className="text-lg font-semibold">Door Handles</h3>
              <p className="text-muted-foreground">
                Stylish and durable handles for every door.
              </p>
              <Link href="#" className="mt-4 inline-block" prefetch={false}>
                <Button>Shop Handles</Button>
              </Link>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <img
                src="/placeholder.svg"
                alt="Knobs"
                className="mb-4 h-48 w-full object-cover"
              />
              <h3 className="text-lg font-semibold">Door Knobs</h3>
              <p className="text-muted-foreground">
                A wide variety of knobs to match your style.
              </p>
              <Link href="#" className="mt-4 inline-block" prefetch={false}>
                <Button>Shop Knobs</Button>
              </Link>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <img
                src="/placeholder.svg"
                alt="Levers"
                className="mb-4 h-48 w-full object-cover"
              />
              <h3 className="text-lg font-semibold">Door Levers</h3>
              <p className="text-muted-foreground">
                Elegant and functional levers for easy access.
              </p>
              <Link href="#" className="mt-4 inline-block" prefetch={false}>
                <Button>Shop Levers</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}
