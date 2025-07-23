import { Icons } from "@gnd/ui/custom/icons";
import { Button } from "@gnd/ui/button";
import { Input } from "@gnd/ui/input";
import Link from "next/link";

export function Footer() {
  return (
    <footer className="bg-muted py-8 md:py-12">
      <div className="container">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          <div>
            <h4 className="text-lg font-semibold">GND Millwork</h4>
            <p className="mt-2 text-muted-foreground">
              13285 SW 131TH ST
              <br />
              Miami, Fl 33186
            </p>
            <p className="mt-2 text-muted-foreground">
              Phone: (305) 278-6555
              <br />
              Email: support@gndmillwork.com
            </p>
          </div>
          <div>
            <h4 className="text-lg font-semibold">
              Sign Up For Exclusive Offers
            </h4>
            <div className="mt-4 flex gap-2">
              <Input type="email" placeholder="Enter your email" />
              <Button>Submit</Button>
            </div>
          </div>
          <div>
            <h4 className="text-lg font-semibold">Follow Us</h4>
            <div className="mt-4 flex gap-4">
              <Link href="#" prefetch={false}>
                <Icons.Facebook className="h-6 w-6" />
              </Link>
              <Link href="#" prefetch={false}>
                <Icons.X className="h-6 w-6" />
              </Link>
              <Link href="#" prefetch={false}>
                <Icons.Instagram className="h-6 w-6" />
              </Link>
            </div>
          </div>
        </div>
        <div className="mt-8 border-t pt-8 text-center text-sm text-muted-foreground">
          <p>
            © 2010-2020 GND Millwork Corp. All Rights Reserved. Use of this
            site is subject to certain Terms Of Use.
          </p>
          <div className="mt-2 flex justify-center gap-4">
            <Link href="#" className="hover:underline" prefetch={false}>
              Privacy and Cookie Policy
            </Link>
            <Link href="#" className="hover:underline" prefetch={false}>
              Return Policy
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
