import { Button } from "@gnd/ui/button";
import { Input } from "@gnd/ui/input";
import { Label } from "@gnd/ui/label";
import { Textarea } from "@gnd/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@gnd/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@gnd/ui/accordion";
import Image from "next/image";
import { MailIcon, PhoneIcon, MapPinIcon, ClockIcon } from "lucide-react";

export default function ContactPage() {
  return (
    <div className="container mx-auto px-4 py-8 md:py-12">
      <h1 className="text-3xl md:text-4xl font-bold mb-8 text-center">
        Contact Us
      </h1>

      <section className="grid md:grid-cols-2 gap-8 lg:gap-12 mb-12">
        {/* Contact Form */}
        <Card>
          <CardHeader>
            <CardTitle>Send us a Message</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="grid gap-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input id="name" placeholder="Your Name" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="your@example.com"
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="subject">Subject</Label>
                <Input
                  id="subject"
                  placeholder="Regarding your order, custom quote, etc."
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="message">Message</Label>
                <Textarea
                  id="message"
                  placeholder="Your message here..."
                  rows={5}
                  required
                />
              </div>
              <Button
                type="submit"
                className="w-full bg-amber-600 hover:bg-amber-700 text-white py-3 text-lg"
              >
                Send Message
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Contact Information */}
        <div className="space-y-8">
          <Card>
            <CardHeader>
              <CardTitle>Our Information</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div className="flex items-center gap-3">
                <MailIcon className="h-6 w-6 text-amber-600" />
                <div>
                  <h3 className="font-semibold">Email</h3>
                  <p className="text-gray-700 dark:text-gray-300">
                    info@millworkpro.com
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <PhoneIcon className="h-6 w-6 text-amber-600" />
                <div>
                  <h3 className="font-semibold">Phone</h3>
                  <p className="text-gray-700 dark:text-gray-300">
                    (123) 456-7890
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <MapPinIcon className="h-6 w-6 text-amber-600" />
                <div>
                  <h3 className="font-semibold">Address</h3>
                  <p className="text-gray-700 dark:text-gray-300">
                    13285 SW 131th St Miami, FL 33186
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <ClockIcon className="h-6 w-6 text-amber-600" />
                <div>
                  <h3 className="font-semibold">Store Hours</h3>
                  <p className="text-gray-700 dark:text-gray-300">
                    Mon-Fri: 7:30 AM - 4:30 PM
                  </p>
                  {/* <p className="text-gray-700 dark:text-gray-300">
                    Sat: 10:00 AM - 2:00 PM
                  </p> */}
                  <p className="text-gray-700 dark:text-gray-300">
                    Sat & Sun: Closed
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Google Map Placeholder */}
          <div className="relative h-64 w-full rounded-lg overflow-hidden shadow-lg">
            <Image
              src="/placeholder.svg?height=400&width=600&text=Google+Map+Location"
              alt="Our Location on Map"
              layout="fill"
              objectFit="cover"
            />
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="mb-12">
        <h2 className="text-2xl md:text-3xl font-bold text-center mb-6">
          Frequently Asked Questions
        </h2>
        <Accordion
          type="single"
          collapsible
          className="w-full max-w-3xl mx-auto"
        >
          <AccordionItem value="item-1">
            <AccordionTrigger>What is your return policy?</AccordionTrigger>
            <AccordionContent>
              Our return policy allows for returns within 30 days of purchase,
              provided the item is in its original condition and packaging.
              Custom orders are non-returnable. Please see our Returns &
              Exchanges page for full details.
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="item-2">
            <AccordionTrigger>
              Do you offer installation services?
            </AccordionTrigger>
            <AccordionContent>
              Yes, we offer professional installation services for all our
              products within a certain service area. Please contact us for a
              quote and to check availability in your region.
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="item-3">
            <AccordionTrigger>How can I track my order?</AccordionTrigger>
            <AccordionContent>
              Once your order has shipped, you will receive an email with
              tracking information. You can also log in to your account and view
              your order history for updates.
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="item-4">
            <AccordionTrigger>
              Can I request a custom millwork design?
            </AccordionTrigger>
            <AccordionContent>
              We specialize in custom millwork. Please use the "Request a Custom
              Quote" form on this page or visit our Custom Millwork page to
              submit your design ideas and requirements.
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </section>
    </div>
  );
}
