import { Button } from "@gnd/ui/button";
import { Phone, Mail, MapPin } from "lucide-react";
import Link from "next/link";

export function Footer() {
  return (
    <footer className="bg-gray-900 text-white py-12">
      <div className="container mx-auto px-4">
        <div className="grid md:grid-cols-4 gap-8">
          <div>
            <h4 className="text-xl font-bold mb-4 text-amber-400">
              MillworkPro
            </h4>
            <p className="text-gray-300 mb-4">
              Your trusted partner for premium doors, hardware, and custom
              millwork solutions.
            </p>
            <div className="flex space-x-4">
              <Button
                variant="ghost"
                size="icon"
                className="text-gray-300 hover:text-white"
              >
                <svg
                  className="h-5 w-5"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z" />
                </svg>
              </Button>
            </div>
          </div>

          <div>
            <h5 className="font-semibold mb-4">Products</h5>
            <ul className="space-y-2 text-gray-300">
              <li>
                <Link
                  href="/search?category=interior-doors"
                  className="hover:text-white"
                >
                  Interior Doors
                </Link>
              </li>
              <li>
                <Link
                  href="/search?category=exterior-doors"
                  className="hover:text-white"
                >
                  Exterior Doors
                </Link>
              </li>
              <li>
                <Link
                  href="/search?category=hardware"
                  className="hover:text-white"
                >
                  Door Hardware
                </Link>
              </li>
              <li>
                <Link href="/custom" className="hover:text-white">
                  Custom Millwork
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h5 className="font-semibold mb-4">Services</h5>
            <ul className="space-y-2 text-gray-300">
              <li>
                <Link
                  href="/services/installation"
                  className="hover:text-white"
                >
                  Installation
                </Link>
              </li>
              <li>
                <Link href="/services/design" className="hover:text-white">
                  Custom Design
                </Link>
              </li>
              <li>
                <Link
                  href="/services/consultation"
                  className="hover:text-white"
                >
                  Consultation
                </Link>
              </li>
              <li>
                <Link href="/warranty" className="hover:text-white">
                  Warranty
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h5 className="font-semibold mb-4">Contact</h5>
            <div className="space-y-2 text-gray-300">
              <p className="flex items-center">
                <Phone className="h-4 w-4 mr-2" />
                (305) 278-6555
              </p>
              <p className="flex items-center">
                <Mail className="h-4 w-4 mr-2" />
                support@gndmillwork.com
              </p>
              <p className="flex items-center">
                <MapPin className="h-4 w-4 mr-2" />
                13285 SW 131th St Miami, FL 33186
              </p>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-8 pt-8 text-center">
          <p className="text-gray-400 text-sm mb-2">
            &copy; 2010-2025 GND Millwork Corp. All Rights Reserved. Use of this
            site is subject to certain{" "}
            <Link href="/terms-of-use" className="underline hover:text-white">
              Terms Of Use
            </Link>
            .
          </p>
          <p className="text-gray-400 text-sm mb-4">
            Products shown as available are normally stocked but inventory
            levels cannot be guaranteed
          </p>
          <div className="flex justify-center space-x-4 text-sm">
            <Link href="/privacy-policy" className="hover:text-white">
              Privacy and Cookie Policy
            </Link>
            <span className="text-gray-600">|</span>
            <Link href="/return-policy" className="hover:text-white">
              Return Policy
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
