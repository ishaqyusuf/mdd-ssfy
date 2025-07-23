import { Briefcase, ShieldCheck, Truck } from "lucide-react";

export function Features() {
  return (
    <section className="py-12 md:py-20">
      <div className="container">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          <div className="flex flex-col items-center text-center">
            <Briefcase className="h-12 w-12 text-primary" />
            <h3 className="mt-4 text-xl font-semibold">WE ARE A MANUFACTURER</h3>
            <p className="mt-2 text-muted-foreground">
              A full capacity of a successful Manufacturer combines with a rich
              pool of verified suppliers. The result is thousands of products and
              services that are not offered elsewhere.
            </p>
          </div>
          <div className="flex flex-col items-center text-center">
            <Truck className="h-12 w-12 text-primary" />
            <h3 className="mt-4 text-xl font-semibold">NATIONWIDE INSURED</h3>
            <p className="mt-2 text-muted-foreground">
              We insure all of our shipments to assure you that your shipment
              will be damage free. All you need to do is to inspect the shipment
              at the time of delivery.
            </p>
          </div>
          <div className="flex flex-col items-center text-center">
            <ShieldCheck className="h-12 w-12 text-primary" />
            <h3 className="mt-4 text-xl font-semibold">AFFORDABLE SOLUTION</h3>
            <p className="mt-2 text-muted-foreground">
              We will either find the right door for you or we make it to your
              specs. Our facility in Kendall, FL can produce all kind of wood
              and fiberglass doors. We carry dozens of reputable brands
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}