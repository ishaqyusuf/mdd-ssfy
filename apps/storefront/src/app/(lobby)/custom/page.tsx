"use client";

import type React from "react";

import { Footer } from "@/components/footer";
import { images } from "@/lib/images";
import { useTRPC } from "@/trpc/client";
import { Button } from "@gnd/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@gnd/ui/card";
import { Checkbox } from "@gnd/ui/checkbox";
import { Input } from "@gnd/ui/input";
import { Label } from "@gnd/ui/label";
import { Textarea } from "@gnd/ui/textarea";
import { toast } from "@gnd/ui/use-toast";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";

export default function CustomWorkPage() {
	const [name, setName] = useState("");
	const [email, setEmail] = useState("");
	const [phone, setPhone] = useState("");
	const [projectType, setProjectType] = useState<string[]>([]);
	const [description, setDescription] = useState("");
	const [budget, setBudget] = useState("");
	const [submissionSuccess, setSubmissionSuccess] = useState(false);
	const trpc = useTRPC();
	const submit = useMutation(
		trpc.storefrontCommerce.inquiry.submit.mutationOptions({
			onSuccess(data) {
				setSubmissionSuccess(true);
				toast({
					title: "Inquiry submitted",
					description: data.message,
				});
				setName("");
				setEmail("");
				setPhone("");
				setProjectType([]);
				setDescription("");
				setBudget("");
			},
			onError(error) {
				toast({
					title: "Unable to submit inquiry",
					description: error.message,
					variant: "destructive",
				});
			},
		}),
	);

	const handleProjectTypeChange = (type: string, checked: boolean) => {
		if (checked) {
			setProjectType((prev) => [...prev, type]);
		} else {
			setProjectType((prev) => prev.filter((t) => t !== type));
		}
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setSubmissionSuccess(false);
		submit.mutate({
			type: "CUSTOM_QUOTE",
			name,
			email,
			phone: phone || null,
			subject: "Custom millwork quote request",
			message: description,
			projectTypes: projectType,
			budget: budget || null,
			website: "",
		});
	};

	return (
		<div className="min-h-screen bg-background">
			<main className="container mx-auto px-4 py-8">
				<section className="text-center mb-12">
					<h1 className="text-4xl font-bold text-gray-900 mb-4">
						Custom Millwork Solutions
					</h1>
					<p className="text-lg text-gray-600 max-w-3xl mx-auto">
						Bring your unique vision to life with our bespoke millwork services.
						From custom doors to intricate trim and built-ins, our skilled
						craftsmen are ready to create something truly special for your home
						or project.
					</p>
				</section>

				<section className="grid lg:grid-cols-2 gap-12 mb-12">
					{/* Custom Work Process */}
					<div className="space-y-8">
						<h2 className="text-3xl font-bold text-gray-900">
							Our Custom Work Process
						</h2>
						<div className="space-y-6">
							<div className="flex items-start space-x-4">
								<div className="flex-shrink-0 w-10 h-10 bg-amber-600 text-white rounded-full flex items-center justify-center font-bold text-lg">
									1
								</div>
								<div>
									<h3 className="text-xl font-semibold mb-1">
										Consultation & Design
									</h3>
									<p className="text-gray-700">
										Share your ideas, sketches, or inspirations. We'll discuss
										your needs, materials, and budget to develop a preliminary
										design.
									</p>
								</div>
							</div>
							<div className="flex items-start space-x-4">
								<div className="flex-shrink-0 w-10 h-10 bg-amber-600 text-white rounded-full flex items-center justify-center font-bold text-lg">
									2
								</div>
								<div>
									<h3 className="text-xl font-semibold mb-1">
										Detailed Proposal & Approval
									</h3>
									<p className="text-gray-700">
										Receive a detailed proposal including 3D renderings,
										material specifications, and a precise quote. We proceed
										once you're completely satisfied.
									</p>
								</div>
							</div>
							<div className="flex items-start space-x-4">
								<div className="flex-shrink-0 w-10 h-10 bg-amber-600 text-white rounded-full flex items-center justify-center font-bold text-lg">
									3
								</div>
								<div>
									<h3 className="text-xl font-semibold mb-1">
										Craftsmanship & Production
									</h3>
									<p className="text-gray-700">
										Our skilled artisans meticulously craft your custom pieces
										using the finest materials and time-honored techniques.
									</p>
								</div>
							</div>
							<div className="flex items-start space-x-4">
								<div className="flex-shrink-0 w-10 h-10 bg-amber-600 text-white rounded-full flex items-center justify-center font-bold text-lg">
									4
								</div>
								<div>
									<h3 className="text-xl font-semibold mb-1">
										Delivery & Installation
									</h3>
									<p className="text-gray-700">
										Your custom millwork is carefully delivered and, if
										requested, professionally installed by our team to ensure a
										perfect fit.
									</p>
								</div>
							</div>
						</div>
					</div>

					{/* Custom Work Inquiry Form */}
					<Card>
						<CardHeader>
							<CardTitle>Start Your Custom Project</CardTitle>
						</CardHeader>
						<CardContent>
							{submissionSuccess ? (
								<div className="text-center py-12">
									<h3 className="text-2xl font-semibold text-green-600 mb-4">
										Inquiry Sent Successfully!
									</h3>
									<p className="text-gray-700">
										Thank you for reaching out. We've received your custom work
										inquiry and will review it shortly. Expect to hear back from
										us within 2-3 business days.
									</p>
									<Button
										onClick={() => setSubmissionSuccess(false)}
										className="mt-6 bg-amber-700 hover:bg-amber-800"
									>
										Submit Another Inquiry
									</Button>
								</div>
							) : (
								<form onSubmit={handleSubmit} className="space-y-6">
									<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
										<div className="space-y-2">
											<Label htmlFor="name">Your Name</Label>
											<Input
												id="name"
												placeholder="John Doe"
												value={name}
												onChange={(e) => setName(e.target.value)}
												required
											/>
										</div>
										<div className="space-y-2">
											<Label htmlFor="email">Email</Label>
											<Input
												id="email"
												type="email"
												placeholder="john.doe@example.com"
												value={email}
												onChange={(e) => setEmail(e.target.value)}
												required
											/>
										</div>
									</div>
									<div className="space-y-2">
										<Label htmlFor="phone">Phone (Optional)</Label>
										<Input
											id="phone"
											type="tel"
											placeholder="(123) 456-7890"
											value={phone}
											onChange={(e) => setPhone(e.target.value)}
										/>
									</div>
									<div className="space-y-2">
										<Label>Type of Project</Label>
										<div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
											{[
												"Custom Door",
												"Custom Trim/Molding",
												"Built-in Cabinetry",
												"Wall Paneling",
												"Stair Parts",
												"Other",
											].map((type) => (
												<div key={type} className="flex items-center space-x-2">
													<Checkbox
														id={type}
														checked={projectType.includes(type)}
														onCheckedChange={(checked) =>
															handleProjectTypeChange(type, checked as boolean)
														}
													/>
													<Label htmlFor={type}>{type}</Label>
												</div>
											))}
										</div>
									</div>
									<div className="space-y-2">
										<Label htmlFor="description">Project Description</Label>
										<Textarea
											id="description"
											placeholder="Describe your custom project in detail, including dimensions, desired style, and any specific requirements."
											rows={5}
											value={description}
											onChange={(e) => setDescription(e.target.value)}
											required
										/>
									</div>
									<div className="space-y-2">
										<Label htmlFor="budget">Estimated Budget (Optional)</Label>
										<Input
											id="budget"
											placeholder="$500 - $1,000"
											value={budget}
											onChange={(e) => setBudget(e.target.value)}
										/>
									</div>
									<p className="text-sm text-muted-foreground">
										Our team will request drawings or files securely after the
										initial review.
									</p>
									<Button
										type="submit"
										className="w-full bg-amber-700 hover:bg-amber-800"
										disabled={submit.isPending}
									>
										{submit.isPending ? "Submitting..." : "Submit Inquiry"}
									</Button>
								</form>
							)}
						</CardContent>
					</Card>
				</section>

				{/* Examples of Custom Work */}
				<section className="mb-12">
					<h2 className="text-3xl font-bold text-gray-900 text-center mb-8">
						Examples of Our Craftsmanship
					</h2>
					<div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
						<Card>
							<img
								src={
									images.categories.customMillwork.images[0] ||
									"/placeholder.svg"
								}
								alt="Custom Door Example"
								className="w-full h-48 object-cover rounded-t-lg"
							/>
							<CardContent className="p-4">
								<h3 className="font-semibold text-lg mb-1">
									Grand Entryway Door
								</h3>
								<p className="text-sm text-gray-600">
									A bespoke solid mahogany entry door with intricate glass
									panels.
								</p>
							</CardContent>
						</Card>
						<Card>
							<img
								src={
									images.categories.customMillwork.images[1] ||
									"/placeholder.svg"
								}
								alt="Built-in Cabinetry Example"
								className="w-full h-48 object-cover rounded-t-lg"
							/>
							<CardContent className="p-4">
								<h3 className="font-semibold text-lg mb-1">
									Library Built-in Shelving
								</h3>
								<p className="text-sm text-gray-600">
									Custom-fitted oak bookshelves and cabinetry for a home
									library.
								</p>
							</CardContent>
						</Card>
						<Card>
							<img
								src={
									images.categories.customMillwork.images[2] ||
									"/placeholder.svg"
								}
								alt="Wall Paneling Example"
								className="w-full h-48 object-cover rounded-t-lg"
							/>
							<CardContent className="p-4">
								<h3 className="font-semibold text-lg mb-1">
									Elegant Wall Paneling
								</h3>
								<p className="text-sm text-gray-600">
									Classic wainscoting and wall paneling to elevate interior
									spaces.
								</p>
							</CardContent>
						</Card>
					</div>
				</section>
			</main>
			<Footer />
		</div>
	);
}
