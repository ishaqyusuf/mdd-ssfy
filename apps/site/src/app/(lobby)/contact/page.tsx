"use client";

import { useTRPC } from "@/trpc/client";
import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from "@gnd/ui/accordion";
import { Button } from "@gnd/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@gnd/ui/card";
import { Icons } from "@gnd/ui/icons";
import { Input } from "@gnd/ui/input";
import { Label } from "@gnd/ui/label";
import { Textarea } from "@gnd/ui/textarea";
import { toast } from "@gnd/ui/use-toast";
import { useMutation } from "@tanstack/react-query";
import type { FormEvent } from "react";

export default function ContactPage() {
	const trpc = useTRPC();
	const submit = useMutation(
		trpc.storefrontCommerce.inquiry.submit.mutationOptions({
			onSuccess(data) {
				document.querySelector<HTMLFormElement>("#contact-form")?.reset();
				toast({ title: "Message received", description: data.message });
			},
			onError(error) {
				toast({
					title: "Unable to send message",
					description: error.message,
					variant: "destructive",
				});
			},
		}),
	);
	const onSubmit = (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		const form = event.currentTarget;
		const data = new FormData(form);
		submit.mutate({
			type: "CONTACT",
			name: String(data.get("name") || ""),
			email: String(data.get("email") || ""),
			phone: null,
			subject: String(data.get("subject") || ""),
			message: String(data.get("message") || ""),
			projectTypes: [],
			budget: null,
			website: String(data.get("website") || ""),
		});
	};
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
						<form id="contact-form" className="grid gap-6" onSubmit={onSubmit}>
							<input
								type="text"
								name="website"
								tabIndex={-1}
								autoComplete="off"
								className="hidden"
								aria-hidden="true"
							/>
							<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
								<div className="space-y-2">
									<Label htmlFor="name">Name</Label>
									<Input
										id="name"
										name="name"
										placeholder="Your Name"
										required
									/>
								</div>
								<div className="space-y-2">
									<Label htmlFor="email">Email</Label>
									<Input
										id="email"
										name="email"
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
									name="subject"
									placeholder="Regarding your order, custom quote, etc."
									required
								/>
							</div>
							<div className="space-y-2">
								<Label htmlFor="message">Message</Label>
								<Textarea
									id="message"
									name="message"
									placeholder="Your message here..."
									rows={5}
									required
								/>
							</div>
							<Button
								type="submit"
								disabled={submit.isPending}
								className="w-full bg-amber-600 hover:bg-amber-700 text-white py-3 text-lg"
							>
								{submit.isPending ? "Sending…" : "Send Message"}
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
								<Icons.MailIcon className="h-6 w-6 text-amber-600" />
								<div>
									<h3 className="font-semibold">Email</h3>
									<p className="text-gray-700 dark:text-gray-300">
										support@gndmillwork.com
									</p>
								</div>
							</div>
							<div className="flex items-center gap-3">
								<Icons.PhoneIcon className="h-6 w-6 text-amber-600" />
								<div>
									<h3 className="font-semibold">Phone</h3>
									<p className="text-gray-700 dark:text-gray-300">
										(305) 278-6555
									</p>
								</div>
							</div>
							<div className="flex items-center gap-3">
								<Icons.MapPinIcon className="h-6 w-6 text-amber-600" />
								<div>
									<h3 className="font-semibold">Address</h3>
									<p className="text-gray-700 dark:text-gray-300">
										13285 SW 131th St Miami, FL 33186
									</p>
								</div>
							</div>
							<div className="flex items-center gap-3">
								<Icons.ClockIcon className="h-6 w-6 text-amber-600" />
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

					<div className="flex h-64 w-full items-center justify-center overflow-hidden rounded-lg border bg-muted/30 p-8 text-center shadow-sm">
						<div>
							<Icons.MapPinIcon className="mx-auto mb-3 h-8 w-8 text-amber-600" />
							<p className="font-semibold">GND Millwork</p>
							<p className="mt-1 text-sm text-muted-foreground">
								13285 SW 131st St, Miami, FL 33186
							</p>
						</div>
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
